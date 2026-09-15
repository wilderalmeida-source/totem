import { auditOutbox } from '@/lib/persistent-audit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const apiBase = process.env.LINK_API_INTERNA
  const apiToken = process.env.TOKEN_API_INT
  if (!apiBase || !apiToken) return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.action !== 'string') return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  const payload = { category: 'TOTEM', sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 100) : undefined, action: body.action.slice(0, 100), step: typeof body.step === 'string' ? body.step.slice(0, 100) : undefined, metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : undefined }
  try {
    auditOutbox.enqueue(payload)
    return new NextResponse(null, { status: 204 })
  } catch { return NextResponse.json({ error: 'Nao foi possivel preservar o evento.' }, { status: 503 }) }
}
