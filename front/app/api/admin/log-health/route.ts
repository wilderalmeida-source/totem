import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, readAdminSession } from '@/lib/admin-session'
import { auditOutbox } from '@/lib/persistent-audit'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const secret = process.env.SESSION_SECRET
  const session = token && secret ? await readAdminSession(token, secret) : null
  const headers = { 'Cache-Control': 'private, no-store' }
  if (!session || session.mustChangePassword || !session.permissions.some(p => p === '*' || p === 'LOGS')) {
    return NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403, headers })
  }
  let backend: unknown = { status: 'INDISPONIVEL' }
  try {
    const response = await fetch(new URL('/clinux/audit/health', process.env.LINK_API_INTERNA), {
      headers: { Authorization: `Bearer ${process.env.TOKEN_API_INT}` },
      cache: 'no-store', signal: AbortSignal.timeout(5000),
    })
    if (response.ok) backend = await response.json()
  } catch { /* Return local health even when the backend is unavailable. */ }
  return NextResponse.json({ frontend: auditOutbox.health(), backend }, { headers })
}
