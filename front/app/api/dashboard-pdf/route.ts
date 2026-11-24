import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, readAdminSession } from '@/lib/admin-session'
import { sameOrigin } from '@/lib/patient-session-http'
import { recordAudit } from '@/lib/persistent-audit'
export const dynamic = 'force-dynamic'

// Registra no log que um dashboard foi exportado em PDF (quem, qual tela, quantas páginas). A senha nunca chega aqui.
export async function POST(request: NextRequest) {
  const secret = process.env.SESSION_SECRET
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const session = secret && token ? await readAdminSession(token, secret) : null
  if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const path = typeof body?.path === 'string' && /^\/[a-z0-9/_-]{0,100}$/i.test(body.path) ? body.path : null
  if (!path) return NextResponse.json({ error: 'Tela inválida.' }, { status: 400 })
  await recordAudit({ category: 'ADMIN', actor: session.sub, action: 'dashboard_pdf_exportado', step: 'analiticos', metadata: {
    path, titulo: typeof body?.titulo === 'string' ? body.titulo.slice(0, 120) : undefined,
    paginas: typeof body?.paginas === 'number' && Number.isInteger(body.paginas) ? Math.min(body.paginas, 1000) : undefined, outcome: 'CONCLUIDO',
  } })
  return new NextResponse(null, { status: 204 })
}
