import { createPublicKey, randomBytes, verify } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { z } from 'zod'
import { readLicenseTrust, type LicenseTrust } from './license-trust'

export const licenseUpload = z.object({
  installationId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,79}$/),
  licenseId: z.string().uuid(),
  credential: z.string().regex(/^[0-9a-f]{64}$/),
}).strict()
type Credentials = z.infer<typeof licenseUpload>
type Claims = { iss: string; aud: string; sub: string; installationId: string; nonce: string;
  status: 'active' | 'blocked' | 'expired'; version: number; iat: number; nbf: number; exp: number;
  licenseExpiresAt: number; nextCheckAt: number }
type Stored = { format: 1; credentials: Credentials; token: string }
type Trust = LicenseTrust
export class LicenseError extends Error {
  constructor(public code: string, public status = 503) { super(code) }
}
type Options = { directory: string; trust?: Trust; fetcher?: typeof fetch; now?: () => number;
  persist?: (state: Stored) => Promise<void>; event?: (action: string, metadata: Record<string, unknown>) => void }

export function verifyLicenseToken(token: string, credentials: Credentials, trust: Trust, now: number, nonce?: string): Claims {
  try {
    if (typeof token !== 'string' || token.length > 8192) throw new Error()
    const parts = token.split('.')
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error()
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    if (header.alg !== 'EdDSA' || header.typ !== 'JWT' || header.kid !== trust.keyId) throw new Error()
    if (!verify(null, Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: trust.publicJwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) throw new Error()
    const claims: Claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    if (claims.iss !== trust.issuer || claims.aud !== trust.audience || claims.sub !== credentials.licenseId ||
      claims.installationId !== credentials.installationId || !['active', 'blocked', 'expired'].includes(claims.status) ||
      typeof claims.nonce !== 'string' || !/^[a-zA-Z0-9_-]{22,128}$/.test(claims.nonce) || (nonce !== undefined && claims.nonce !== nonce)) throw new Error()
    if (![claims.iat, claims.nbf, claims.exp, claims.licenseExpiresAt, claims.version, claims.nextCheckAt].every(Number.isSafeInteger) ||
      [claims.iat, claims.nbf, claims.exp, claims.licenseExpiresAt, claims.nextCheckAt].some(value => value <= 0 || value > 253402300799) ||
      claims.version < 1 || claims.iat > now + 30 || claims.nbf !== claims.iat || claims.exp <= claims.iat ||
      claims.exp - claims.iat > 604800 || claims.nextCheckAt !== claims.iat + 300 ||
      (claims.status === 'active' && claims.exp > claims.licenseExpiresAt) || (nonce !== undefined && claims.exp <= now)) throw new Error()
    return claims
  } catch { throw new LicenseError('LICENSE_SIGNATURE_INVALID') }
}

export class LicenseManager {
  private stored: Stored | null = null
  private claims: Claims | null = null
  private initialized = false
  private error: string | null = null
  private storageFailed = false
  private lastAttemptAt: number | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private refreshing: Promise<void> | null = null
  private timer?: ReturnType<typeof setInterval>
  private readonly trust: Trust | null
  private readonly fetcher: typeof fetch
  private readonly clock: () => number
  constructor(private options: Options) {
    try { this.trust = options.trust ?? readLicenseTrust() }
    catch { this.trust = null; this.error = 'LICENSE_CONFIG_INVALID' }
    this.fetcher = options.fetcher ?? fetch
    const wall = Date.now(), monotonic = performance.now()
    this.clock = options.now ?? (() => Math.floor(Math.max(Date.now(), wall + performance.now() - monotonic) / 1000))
  }
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation)
    this.queue = next.catch(() => undefined)
    return next
  }
  async initialize() {
    if (!this.trust) { this.initialized = true; return }
    try {
      const content = await readFile(path.join(this.options.directory, 'state.json'), 'utf8')
      if (content.length > 16384) throw new Error()
      const value = JSON.parse(content)
      if (value.format !== 1) throw new Error()
      const credentials = licenseUpload.parse(value.credentials)
      this.claims = verifyLicenseToken(value.token, credentials, this.trust, this.clock())
      this.stored = { format: 1, credentials, token: value.token }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.error = 'LICENSE_CACHE_INVALID'
        this.storageFailed = true
      }
    }
    this.initialized = true
  }
  start() {
    if (this.timer) return
    void this.refresh().catch(() => undefined)
    this.timer = setInterval(() => { void this.refresh().catch(() => undefined) }, 300000)
    this.timer.unref()
  }
  async stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; await this.queue }
  status() {
    const now = this.clock(), claims = this.claims
    let state: string = !this.initialized ? 'starting' : 'unconfigured'
    let allowed = false
    if (!this.trust) state = 'configuration_error'
    else if (this.storageFailed) state = 'storage_error'
    else if (claims && this.stored) {
      if (claims.iat > now + 30) state = 'clock_error'
      else if (claims.status === 'blocked') state = 'blocked'
      else if (claims.status === 'expired' || claims.licenseExpiresAt <= now) state = 'expired'
      else if (claims.exp <= now) state = 'unavailable'
      else { allowed = true; state = this.error ? 'offline' : 'active' }
    }
    return { state, allowed, installationId: this.stored?.credentials.installationId ?? null,
      licenseId: this.stored?.credentials.licenseId ?? null, version: claims?.version ?? null,
      licenseExpiresAt: claims ? new Date(claims.licenseExpiresAt * 1000).toISOString() : null,
      authorizationExpiresAt: claims ? new Date(claims.exp * 1000).toISOString() : null,
      lastValidatedAt: claims ? new Date(claims.iat * 1000).toISOString() : null,
      lastAttemptAt: this.lastAttemptAt ? new Date(this.lastAttemptAt * 1000).toISOString() : null,
      errorCode: this.error }
  }
  private async remote(credentials: Credentials) {
    const trust = this.trust
    if (!trust) throw new LicenseError('LICENSE_CONFIG_INVALID')
    this.lastAttemptAt = this.clock()
    const nonce = randomBytes(24).toString('base64url')
    let response: Response
    try {
      response = await this.fetcher(new URL('/v1/license/check', trust.url), {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credentials.credential}` },
        body: JSON.stringify({ installationId: credentials.installationId, nonce }),
        signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store',
      })
    } catch { throw new LicenseError('LICENSE_SERVER_UNREACHABLE') }
    if (!response.ok) {
      await response.body?.cancel()
      throw new LicenseError(response.status === 401 ? 'LICENSE_CREDENTIAL_INVALID' : 'LICENSE_SERVER_UNAVAILABLE', response.status === 401 ? 422 : 503)
    }
    const reader = response.body?.getReader()
    if (!reader) throw new LicenseError('LICENSE_RESPONSE_INVALID')
    let content = ''
    try {
      const chunks: Uint8Array[] = []; let size = 0
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break
        size += chunk.value.length
        if (size > 10000) { await reader.cancel(); throw new Error() }
        chunks.push(chunk.value)
      }
      content = Buffer.concat(chunks).toString('utf8')
    } catch { throw new LicenseError('LICENSE_RESPONSE_INVALID') }
    finally { reader.releaseLock() }
    let token: string
    try { token = JSON.parse(content).token } catch { throw new LicenseError('LICENSE_RESPONSE_INVALID') }
    const claims = verifyLicenseToken(token, credentials, trust, this.clock(), nonce)
    if (this.claims && this.stored?.credentials.licenseId === credentials.licenseId) {
      if (claims.version < this.claims.version || (claims.version === this.claims.version &&
        this.claims.status !== 'active' && claims.status === 'active')) throw new LicenseError('LICENSE_VERSION_INVALID')
    }
    return { token, claims }
  }
  private async persist(state: Stored) {
    if (this.options.persist) return this.options.persist(state)
    await mkdir(this.options.directory, { recursive: true, mode: 0o700 })
    const temp = path.join(this.options.directory, `state-${randomBytes(12).toString('hex')}.tmp`)
    try {
      const file = await open(temp, 'wx', 0o600)
      try { await file.writeFile(JSON.stringify(state)); await file.sync() } finally { await file.close() }
      await rename(temp, path.join(this.options.directory, 'state.json'))
      if (process.platform !== 'win32') {
        const directory = await open(this.options.directory, 'r')
        try { await directory.sync() } finally { await directory.close() }
      }
    } finally { await unlink(temp).catch(() => undefined) }
  }
  private async accept(credentials: Credentials, result: { token: string; claims: Claims }) {
    const before = this.status().state
    const stored: Stored = { format: 1, credentials, token: result.token }
    // A confirmed denial is effective immediately, even if disk persistence fails.
    if (result.claims.status !== 'active') { this.stored = stored; this.claims = result.claims }
    try { await this.persist(stored) }
    catch { this.storageFailed = true; this.error = 'LICENSE_STORAGE_FAILED'; throw new LicenseError(this.error) }
    this.stored = stored; this.claims = result.claims; this.error = null; this.storageFailed = false
    if (before !== this.status().state) this.options.event?.('licenca_estado_alterado', { state: this.status().state, version: result.claims.version })
  }
  activate(input: unknown) {
    return this.exclusive(async () => {
      const parsed = licenseUpload.safeParse(input)
      if (!parsed.success) throw new LicenseError('LICENSE_FILE_INVALID', 400)
      const result = await this.remote(parsed.data)
      if (result.claims.status !== 'active' && parsed.data.licenseId !== this.stored?.credentials.licenseId) throw new LicenseError('LICENSE_NOT_ACTIVE', 422)
      await this.accept(parsed.data, result)
      return this.status()
    })
  }
  refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing
    this.refreshing = this.exclusive(async () => {
      if (!this.stored) return
      try { await this.accept(this.stored.credentials, await this.remote(this.stored.credentials)) }
      catch (error) {
        const code = error instanceof LicenseError ? error.code : 'LICENSE_SERVER_UNAVAILABLE'
        if (this.error !== code) this.options.event?.('licenca_verificacao_falhou', { code })
        this.error = code
      }
    }).finally(() => { this.refreshing = null })
    return this.refreshing
  }
}

export function requiresLicense(method: string, pathname: string) {
  return /^\/clinux\/(pacientes|agenda|totem)(\/|$)/.test(pathname) ||
    (/^\/clinux\/senhas(\/|$)/.test(pathname) && method !== 'GET' && method !== 'HEAD')
}
