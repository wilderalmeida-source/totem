import { NextRequest, NextResponse } from 'next/server'
import { requirePanelAdmin } from '@/lib/require-panel-admin'
import { sameOrigin } from '@/lib/patient-session-http'
import { validNoticeSettings } from '@/lib/panel-notices'
export const dynamic = 'force-dynamic'
async function forward(method: string, body?: unknown, actor?: string) {
  try {
    const base = process.env.LINK_API_INTERNA, token = process.env.TOKEN_API_INT
    if (!base || !token) throw Error('configuration')
    const response = await fetch(`${base}/clinux/informativos-config`, { method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(actor ? { 'x-admin-actor': actor } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(8000) })
    if (!response.ok) return NextResponse.json({ error: 'Não foi possível acessar os informativos. Confira a atualização do banco.' }, { status: 503 })
    const value = await response.json()
    if (!validNoticeSettings(value)) throw Error('invalid response')
    return NextResponse.json({ ...value, company: process.env.EMPRESA_NOME || 'CRI' })
  } catch { return NextResponse.json({ error: 'Informativos indisponíveis.' }, { status: 503 }) }
}
export async function GET() { return forward('GET') }
export async function PUT(request: NextRequest) {
  const session = await requirePanelAdmin(request)
  if (!session || session.mustChangePassword) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!validNoticeSettings(body)) return NextResponse.json({ error: 'Confira os textos, ícones e durações (5 a 300 segundos).' }, { status: 400 })
  return forward('PUT', { enabled: body.enabled, items: body.items }, session.sub)
}
