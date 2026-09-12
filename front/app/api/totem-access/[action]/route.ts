import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { sameOrigin } from '@/lib/patient-session-http'
import { PATIENT_SESSION_COOKIE } from '@/lib/patient-session-config'
import { checkTotemAccess, totemBackend, TOTEM_OPERATOR_COOKIE } from '@/lib/totem-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== 'session') return new NextResponse(null, { status: 404 })
  try { return NextResponse.json(await checkTotemAccess(request), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Não foi possível verificar a liberação do totem.' }, { status: 503 }) }
}
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 })
  const { action } = await context.params
  if (!['lookup', 'login', 'change-pin', 'logout'].includes(action)) return new NextResponse(null, { status: 404 })
  let data: Record<string, unknown>
  try {
    const raw = await request.text()
    if (raw.length > 2048) return new NextResponse(null, { status: 413 })
    data = JSON.parse(raw)
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error()
  } catch { return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 }) }
  const token = request.cookies.get(TOTEM_OPERATOR_COOKIE)?.value ?? ''
  const clientKey = createHash('sha256').update(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown').digest('hex')
  const body = action === 'lookup' ? { cardId: data.cardId, clientKey }
    : action === 'login' ? { cardId: data.cardId, pin: data.pin, clientKey }
    : action === 'change-pin' ? { token, newPin: data.newPin } : { token }
  try {
    const upstream = await totemBackend(action, { method: 'POST', body: JSON.stringify(body) })
    const result = await upstream.json()
    if (!upstream.ok) return NextResponse.json({ error: result.error ?? 'Não foi possível concluir.' }, { status: upstream.status })
    const { token: issued, ...publicResult } = result
    const response = NextResponse.json(publicResult, { headers: { 'Cache-Control': 'no-store' } })
    if (issued || action === 'logout') {
      response.cookies.set(TOTEM_OPERATOR_COOKIE, issued ?? '', {
        httpOnly: true, sameSite: 'strict', path: '/',
        secure: request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https' || request.nextUrl.protocol === 'https:',
        maxAge: issued ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000)) : 0,
      })
      response.cookies.delete(PATIENT_SESSION_COOKIE)
    }
    return response
  } catch { return NextResponse.json({ error: 'Serviço de acesso indisponível. Tente novamente.' }, { status: 503 }) }
}
