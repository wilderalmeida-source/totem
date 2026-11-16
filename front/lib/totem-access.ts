import { NextRequest } from 'next/server'
import { shortCache } from './short-cache'

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
type TotemAccess = { enabled: boolean; allowed: boolean; mustChangePin?: boolean; displayName?: string }
// 5 s: middleware e rota da mesma requisição (e cliques seguidos) reaproveitam a resposta.
// Liberar/bloquear o totem ou mudar a política passa a valer em até 5 s.
const accessCache = shortCache<TotemAccess>(5000)
export function clearTotemAccessCache() { accessCache.clear() }

export async function checkTotemAccess(request: NextRequest) {
  const token = request.cookies.get(TOTEM_OPERATOR_COOKIE)?.value ?? ''
  return accessCache(token, async () => {
    const response = await totemBackend('check', { method: 'POST', body: JSON.stringify({ token }) })
    if (!response.ok) throw new Error('Acesso ao totem indisponível.')
    return await response.json() as TotemAccess
  })
}
