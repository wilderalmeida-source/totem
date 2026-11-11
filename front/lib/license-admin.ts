import { createHash, createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { ADMIN_SESSION_COOKIE, readAdminSession, type SessionPayload } from './admin-session'

export async function requireLicenseAdmin(request: NextRequest) {
  const secret = process.env.SESSION_SECRET, cookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const session = secret && cookie ? await readAdminSession(cookie, secret) : null
  return session && !session.mustChangePassword && session.permissions.some(p => p === '*' || p === 'USUARIOS') ? session : null
}
export async function licenseBackend(path: string, method: 'GET' | 'POST', session?: SessionPayload, body?: unknown) {
  const base = process.env.LINK_API_INTERNA, token = process.env.TOKEN_API_INT
  if (!base || !token) throw new Error('LICENSE_BACKEND_UNAVAILABLE')
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  if (session) {
    const payload = Buffer.from(JSON.stringify({ sub: session.sub, source: session.source, version: session.version,
      permissions: session.permissions, exp: Math.floor(Date.now() / 1000) + 60, method, path,
      bodyHash: createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex'),
    })).toString('base64url')
    headers['x-license-admin-proof'] = `${payload}.${createHmac('sha256', token).update(`license-admin:${payload}`).digest('base64url')}`
  }
  return fetch(new URL(path, base), { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000) })
}
export async function limitedLicenseJson(request: NextRequest): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new Error('INVALID_FILE')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('INVALID_FILE')
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break
      size += part.value.length
      if (size > 8192) { await reader.cancel(); throw new Error('INVALID_FILE') }
      chunks.push(part.value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } finally { reader.releaseLock() }
}
