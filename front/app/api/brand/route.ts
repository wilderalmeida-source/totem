import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { z } from 'zod'
import { requirePanelAdmin } from '@/lib/require-panel-admin'
import { sameOrigin } from '@/lib/patient-session-http'
import { recordAudit } from '@/lib/persistent-audit'
import { BRAND_MODES, publicBrand } from '@/lib/brand'
import { readBrand, removeBrandLogo, saveBrandLogo, setBrandPlacement } from '@/lib/brand-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
// Qualquer tamanho enviado vira no máximo 600x200 (proporção mantida, sem ampliar imagem pequena).
// As telas ainda limitam a altura exibida; isto só evita arquivos enormes.
const MAX_WIDTH = 600, MAX_HEIGHT = 200

const denied = () => NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403, headers })
const unavailable = () => NextResponse.json({ error: 'Não foi possível acessar a logo.' }, { status: 503, headers })
const mode = z.enum(BRAND_MODES)

async function admin(request: NextRequest) {
  const session = await requirePanelAdmin(request)
  if (!session || session.mustChangePassword || !sameOrigin(request)) return null
  return session
}

// Público: as telas do totem e o painel (sem login) precisam saber qual logo mostrar.
export async function GET() {
  try { return NextResponse.json(publicBrand(await readBrand()), { headers }) }
  catch { return unavailable() }
}

export async function PUT(request: NextRequest) {
  const session = await admin(request)
  if (!session) return denied()
  const parsed = z.object({ placement: z.enum(['header', 'welcome']) }).strict().safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Posição da logo inválida.' }, { status: 400, headers })
  try {
    const updated = await setBrandPlacement(parsed.data.placement)
    void recordAudit({ category: 'ADMIN', actor: session.sub, action: 'logo_posicao_alterada', step: 'administracao', metadata: { placement: updated.placement } })
    return NextResponse.json(publicBrand(updated), { headers })
  } catch { return unavailable() }
}

export async function POST(request: NextRequest) {
  const session = await admin(request)
  if (!session) return denied()
  if (Number(request.headers.get('content-length')) > MAX_UPLOAD_BYTES + 64 * 1024) return NextResponse.json({ error: 'Envie uma imagem de até 5 MB.' }, { status: 413, headers })
  try {
    const form = await request.formData()
    const upload = form.get('file'), target = mode.safeParse(form.get('mode'))
    if (!target.success || !(upload instanceof File) || upload.size === 0 || upload.size > MAX_UPLOAD_BYTES || !['image/jpeg', 'image/png', 'image/webp'].includes(upload.type)) {
      return NextResponse.json({ error: 'Envie uma imagem PNG, JPEG ou WebP de até 5 MB.' }, { status: 400, headers })
    }
    let content: Buffer
    try {
      const input = Buffer.from(await upload.arrayBuffer())
      const metadata = await sharp(input, { limitInputPixels: 25_000_000 }).metadata()
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw new Error('INVALID_IMAGE')
      // trim: corta bordas vazias/uniformes em volta da logo, que a deixavam pequena e difícil de ver.
      const trimmed = await sharp(input, { limitInputPixels: 25_000_000, failOn: 'error' }).rotate().trim({ threshold: 10 }).toBuffer().catch(() => input)
      content = await sharp(trimmed, { limitInputPixels: 25_000_000 })
        .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 92, alphaQuality: 100 })
        .toBuffer()
    } catch { return NextResponse.json({ error: 'Imagem inválida, animada ou com resolução excessiva.' }, { status: 400, headers }) }
    const updated = await saveBrandLogo(target.data, content)
    void recordAudit({ category: 'ADMIN', actor: session.sub, action: 'logo_enviada', step: 'administracao', metadata: { mode: target.data } })
    return NextResponse.json(publicBrand(updated), { status: 201, headers })
  } catch { return unavailable() }
}

export async function DELETE(request: NextRequest) {
  const session = await admin(request)
  if (!session) return denied()
  const target = mode.safeParse(request.nextUrl.searchParams.get('mode'))
  if (!target.success) return NextResponse.json({ error: 'Modo inválido.' }, { status: 400, headers })
  try {
    const updated = await removeBrandLogo(target.data)
    void recordAudit({ category: 'ADMIN', actor: session.sub, action: 'logo_removida', step: 'administracao', metadata: { mode: target.data } })
    return NextResponse.json(publicBrand(updated), { headers })
  } catch { return unavailable() }
}
