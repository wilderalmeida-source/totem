import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS, createAdminSession, readAdminSession } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  const secret = process.env.SESSION_SECRET
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const session = secret && token ? await readAdminSession(token, secret) : null
  if (!session || !secret) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  const apiBase = process.env.LINK_API_INTERNA
  const apiToken = process.env.TOKEN_API_INT
  if (!apiBase || !apiToken) return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 })

  const backend = await fetch(`${apiBase}/clinux/admin/users/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
    body: JSON.stringify({ username: session.sub, currentPassword, newPassword }),
    cache: 'no-store',
  })
  const result = await backend.json().catch(() => ({ error: 'Não foi possível trocar a senha.' }))
  if (!backend.ok) return NextResponse.json(result, { status: backend.status })

  void fetch(`${apiBase}/clinux/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
    body: JSON.stringify({ category: 'ADMIN', actor: session.sub, action: 'senha_alterada', step: 'seguranca' }),
  }).catch(() => undefined)

  const response = NextResponse.json({ ok: true })
  response.cookies.set({ name: ADMIN_SESSION_COOKIE, value: await createAdminSession(session.sub, secret, false, session.permissions), httpOnly: true, secure: request.headers.get('x-forwarded-proto') === 'https' || request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: ADMIN_SESSION_TTL_SECONDS })
  return response
}
