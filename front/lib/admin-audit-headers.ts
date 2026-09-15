import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE, readAdminSession } from './admin-session'

/** Identity comes from the validated server session, never a browser header. */
export async function adminAuditHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  const secret = process.env.SESSION_SECRET
  const session = token && secret ? await readAdminSession(token, secret) : null
  return session ? { 'x-admin-actor': session.sub } : {}
}
