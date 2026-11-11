import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export type LicenseAdmin = { sub: string; source: 'database' | 'bootstrap'; version?: string; permissions: string[] }
export function readLicenseAdminProof(proof: unknown, authorization: unknown, method: string, pathname: string, body: unknown, now = Math.floor(Date.now() / 1000)): LicenseAdmin | null {
  if (typeof proof !== 'string' || proof.length > 4096 || typeof authorization !== 'string') return null
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]
  if (!bearer) return null
  const [payload, signature, extra] = proof.split('.')
  if (!payload || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(signature)) return null
  const expected = createHmac('sha256', bearer).update(`license-admin:${payload}`).digest()
  const received = Buffer.from(signature, 'base64url')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const bodyHash = createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex')
    if (!Number.isSafeInteger(value.exp) || value.exp <= now || value.exp > now + 90 || value.method !== method ||
      value.path !== pathname || value.bodyHash !== bodyHash || typeof value.sub !== 'string' ||
      !/^[a-zA-Z0-9_.@-]{1,100}$/.test(value.sub) || !['database', 'bootstrap'].includes(value.source) ||
      !Array.isArray(value.permissions) || !value.permissions.some((p: unknown) => p === '*' || p === 'USUARIOS')) return null
    if (value.source === 'database' && typeof value.version !== 'string') return null
    if (value.source === 'bootstrap' && !value.permissions.includes('*')) return null
    return { sub: value.sub, source: value.source, version: value.version, permissions: value.permissions }
  } catch { return null }
}
