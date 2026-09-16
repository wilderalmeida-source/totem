import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { ADMIN_SESSION_COOKIE, readAdminSession } from '@/lib/admin-session'
import { totemBackend } from '@/lib/totem-access'
import { sameOrigin } from '@/lib/patient-session-http'
import { patientBackend } from '@/lib/patient-session-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const secret = process.env.SESSION_SECRET
  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const session = cookie && secret ? await readAdminSession(cookie, secret) : null
  if (!session || session.mustChangePassword) return NextResponse.json({ error: 'Faça login administrativo.' }, { status: 401 })
  if (!session.permissions.some(p => p === '*' || p === 'USUARIOS')) return NextResponse.json({ error: 'Sem permissão para gerenciar colaboradores.' }, { status: 403 })
  if (req.method !== 'GET' && !sameOrigin(req)) return new NextResponse(null, { status: 403 })
  const path = (await ctx.params).path.join('/')
  const card = /^users\/([1-9]\d*)\/card$/.exec(path)
  const allowed = (path === 'settings' && ['GET', 'PUT'].includes(req.method)) ||
    (path === 'users' && ['GET', 'POST'].includes(req.method)) ||
    (/^users\/[1-9]\d*$/.test(path) && req.method === 'PATCH') || (card && req.method === 'GET')
  if (!allowed) return new NextResponse(null, { status: 404 })
  try {
    if (card) {
      const upstream = await totemBackend('users')
      if (!upstream.ok) throw new Error()
      const users = await upstream.json() as { id: number; username: string; displayName: string; cardId: string }[]
      const user = users.find(u => u.id === Number(card[1]))
      if (!user) return new NextResponse(null, { status: 404 })
      const qr = await QRCode.toString(user.cardId, { type: 'svg', errorCorrectionLevel: 'M', margin: 4 })
      // ViewBox units correspond to millimetres. Keep the QR quiet zone intact.
      const drawing = qr.replace('<svg ', '<svg x="2" y="4" width="30" height="30" ')
      const lines = user.displayName.trim().match(/.{1,26}(?:\s|$)|\S{1,26}/g) ?? []
      const name = lines.slice(0, 5).map((line, index) => {
        const text = index === 4 && lines.length > 5 ? `${line.trim()}…` : line.trim()
        return `<text x="35" y="${11 + index * 3.5}" font-size="2.8"${text.length > 23 ? ' textLength="47" lengthAdjust="spacingAndGlyphs"' : ''}>${escape(text)}</text>`
      }).join('')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="85mm" height="38mm" viewBox="0 0 85 38"><title>${escape(user.displayName)} - ${escape(user.username)}</title><style>@page { size: 85mm 38mm; margin: 0; } text { font-family: Arial, sans-serif; fill: black; }</style><rect width="85" height="38" fill="white"/>${drawing}<text x="35" y="6" font-size="3.5" font-weight="bold">Acesso ao Totem</text>${name}<text x="35" y="30" font-size="2.8"${user.username.length > 23 ? ' textLength="47" lengthAdjust="spacingAndGlyphs"' : ''}>${escape(user.username)}</text><text x="35" y="35" font-size="2.3">Cartão pessoal. Use seu PIN.</text></svg>`
      await patientBackend('/clinux/audit', { method: 'POST', body: JSON.stringify({ category: 'ADMIN', actor: session.sub, action: 'cartao_totem_exportado', step: 'acesso_totem', metadata: { operatorId: user.id } }) })
      return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Content-Disposition': `attachment; filename="cartao-${user.username.replace(/[^a-zA-Z0-9._-]/g, '')}.svg"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
    }
    const body = req.method === 'GET' ? undefined : await req.text()
    if (body && body.length > 4096) return new NextResponse(null, { status: 413 })
    const upstream = await totemBackend(path, { method: req.method, body })
    const result = await upstream.json()
    if (req.method !== 'GET' && upstream.ok) {
      await patientBackend('/clinux/audit', { method: 'POST', body: JSON.stringify({ category: 'ADMIN', actor: session.sub, action: `${req.method} acesso_totem/${path}`, step: 'acesso_totem' }) })
    }
    return NextResponse.json(upstream.ok ? result : { error: result.error ?? 'Não foi possível salvar. Confira os campos.' }, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Serviço indisponível. Confira a conexão e a atualização do banco.' }, { status: 503 }) }
}
export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
