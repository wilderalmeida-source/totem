import { NextRequest } from 'next/server'

export function flowHeaders(request: Pick<NextRequest, 'headers'>) {
  const headers: Record<string, string> = {}
  for (const name of ['x-flow-id', 'x-device-id']) {
    const value = request.headers.get(name)
    if (value && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value)) headers[name] = value
  }
  return headers
}
export function auditServer(request: Pick<NextRequest, 'headers'>, action: string, step: string, metadata: Record<string, unknown>) {
  const base = process.env.LINK_API_INTERNA, token = process.env.TOKEN_API_INT
  if (!base || !token) return
  const context = flowHeaders(request)
  void fetch(new URL('/clinux/audit', base), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ category: 'TOTEM', sessionId: context['x-flow-id'], action, step,
      metadata: { ...metadata, device: context['x-device-id'], source: 'next', version: process.env.APP_VERSION ?? 'nao_informada' } }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
  }).catch(() => undefined)
}
