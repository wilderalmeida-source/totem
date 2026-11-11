import { NextRequest, NextResponse } from 'next/server'
import { requirePanelAdmin } from '@/lib/require-panel-admin'
import { sameOrigin } from '@/lib/patient-session-http'
export const dynamic = 'force-dynamic'
async function forward(method: string, body?: unknown) {
  try {
    const base = process.env.LINK_API_INTERNA
    const token = process.env.TOKEN_API_INT
    if (!base || !token) throw Error('configuration')
    const response = await fetch(`${base}/clinux/temas-config`, { method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(8000) })
    if (!response.ok) return NextResponse.json({ error: 'Não foi possível acessar a configuração de temas. Confira a atualização do banco.' }, { status: 503 })
    return NextResponse.json(await response.json())
  } catch { return NextResponse.json({ error: 'Configuração de temas indisponível.' }, { status: 503 }) }
}
export async function GET() { return forward('GET') }
export async function PUT(request: NextRequest) {
  if (!(await requirePanelAdmin(request))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || !['theme1', 'theme2'].includes(body.theme) || !['light', 'dark'].includes(body.mode)) return NextResponse.json({ error: 'Tema inválido.' }, { status: 400 })
  return forward('PUT', { theme: body.theme, mode: body.mode })
}
