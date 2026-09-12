import { NextRequest } from 'next/server'

export const TOTEM_OPERATOR_COOKIE = 'totem_operator_session'
export async function totemBackend(action: string, init: RequestInit = {}) {
  const base = process.env.LINK_API_INTERNA
  const token = process.env.TOKEN_API_INT
  if (!base || !token) throw new Error('Acesso ao totem indisponível.')
  return fetch(`${base.replace(/\/$/, '')}/clinux/totem-access/${action}`, {
    ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
  })
}
export async function checkTotemAccess(request: NextRequest) {
  const response = await totemBackend('check', { method: 'POST', body: JSON.stringify({ token: request.cookies.get(TOTEM_OPERATOR_COOKIE)?.value ?? '' }) })
  if (!response.ok) throw new Error('Acesso ao totem indisponível.')
  return await response.json() as { enabled: boolean; allowed: boolean; mustChangePin?: boolean; displayName?: string }
}
