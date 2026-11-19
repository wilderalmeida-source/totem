import { NextRequest, NextResponse } from 'next/server'
import { requirePanelAdmin } from '@/lib/require-panel-admin'
import { sameOrigin } from '@/lib/patient-session-http'
export const dynamic = 'force-dynamic'
// Opções de privacidade (tela Temas): formato do nome no painel e no histórico e prazo de guarda dos logs.
async function forward(method: string, body?: unknown) {
  try {
    const base = process.env.LINK_API_INTERNA
    const token = process.env.TOKEN_API_INT
    if (!base || !token) throw Error('configuration')
    const response = await fetch(`${base}/clinux/privacidade-config`, { method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(8000) })
    if (!response.ok) return NextResponse.json({ error: 'Não foi possível salvar a privacidade. Confira a atualização do banco.' }, { status: 503 })
    return NextResponse.json(await response.json())
  } catch { return NextResponse.json({ error: 'Configuração de privacidade indisponível.' }, { status: 503 }) }
}
export async function GET(request: NextRequest) {
  if (!(await requirePanelAdmin(request))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  return forward('GET')
}
export async function PUT(request: NextRequest) {
  if (!(await requirePanelAdmin(request))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const painel = ['completo', 'primeiro_ultimo', 'abreviado', 'iniciais'], historico = ['primeiro_ultimo', 'abreviado', 'iniciais', 'oculto'], dias = [0, 30, 90, 180, 365]
  if (!body || !painel.includes(body.painelNome) || !historico.includes(body.historicoNome) || !dias.includes(body.logsRetencaoDias)) return NextResponse.json({ error: 'Opção de privacidade inválida.' }, { status: 400 })
  return forward('PUT', { painelNome: body.painelNome, historicoNome: body.historicoNome, logsRetencaoDias: body.logsRetencaoDias })
}
