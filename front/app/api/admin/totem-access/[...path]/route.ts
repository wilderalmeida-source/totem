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
      const drawing = qr.replace('<svg ', '<svg x="155" y="100" width="290" height="290" ')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="460" viewBox="0 0 600 460"><rect width="600" height="460" rx="24" fill="white" stroke="#2563eb" stroke-width="4"/><text x="300" y="44" text-anchor="middle" font-family="Arial" font-size="24" fill="#172033">Acesso ao Totem</text><text x="300" y="82" text-anchor="middle" font-family="Arial" font-size="20">${escape(user.displayName)}</text>${drawing}<text x="300" y="408" text-anchor="middle" font-family="Arial" font-size="18">${escape(user.username)}</text><text x="300" y="438" text-anchor="middle" font-family="Arial" font-size="13">Cartão pessoal. Informe seu PIN no totem.</text></svg>`
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
