import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { z } from 'zod'
import { requirePanelAdmin } from '@/lib/require-panel-admin'
import { recordAudit } from '@/lib/persistent-audit'
import { publicPartnerships } from '@/lib/partnerships'
import { appendPartnerLogo, deletePartnerLogo, PartnershipConflict, PartnershipInvalid, readPartnerships, updatePartnerships } from '@/lib/partnerships-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
function failure(error: unknown) {
  if (error instanceof PartnershipConflict) return NextResponse.json({ error: error.message }, { status: 409, headers })
  if (error instanceof PartnershipInvalid || error instanceof z.ZodError) return NextResponse.json({ error: error instanceof PartnershipInvalid ? error.message : 'Configuração inválida.' }, { status: 400, headers })
  console.error('PARTNERSHIPS_STORAGE_FAILED')
  return NextResponse.json({ error: 'Não foi possível acessar a configuração de parcerias.' }, { status: 503, headers })
}
const denied = () => NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403, headers })
export async function GET() {
  try { return NextResponse.json(publicPartnerships(await readPartnerships()), { headers }) }
  catch (error) { return failure(error) }
}
export async function PUT(request: NextRequest) {
  const session = await requirePanelAdmin(request)
  if (!session || session.mustChangePassword) return denied()
  try {
    const updated = await updatePartnerships(await request.json())
    void recordAudit({ category: 'ADMIN', actor: session.sub, action: 'parcerias_configuradas', step: 'administracao', metadata: { enabled: updated.enabled, random: updated.random, logos: updated.logos.length, revision: updated.revision } })
    return NextResponse.json(publicPartnerships(updated), { headers })
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest) {
  const session = await requirePanelAdmin(request)
  if (!session || session.mustChangePassword) return denied()
  if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) return NextResponse.json({ error: 'Envie uma imagem de até 5 MB.' }, { status: 413, headers })
  try {
    const form = await request.formData(), upload = form.get('file'), revision = form.get('revision')
    if (!(upload instanceof File) || upload.size === 0 || upload.size > 5 * 1024 * 1024 || typeof revision !== 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(upload.type)) {
      return NextResponse.json({ error: 'Envie uma imagem PNG, JPEG ou WebP de até 5 MB.' }, { status: 400, headers })
    }
    let content: Buffer
    try {
      const image = sharp(Buffer.from(await upload.arrayBuffer()), { limitInputPixels: 16000000, failOn: 'error' })
      const metadata = await image.metadata()
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1) throw new Error('INVALID_IMAGE')
      content = await image.rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer()
    } catch { return NextResponse.json({ error: 'Imagem inválida, animada ou com resolução excessiva.' }, { status: 400, headers }) }
    const name = upload.name.replace(/\.[^.]+$/, '').trim().slice(0, 100) || 'Parceiro'
    const updated = await appendPartnerLogo(revision, name, content)
    void recordAudit({ category: 'ADMIN', actor: session.sub, action: 'parceria_logo_enviada', step: 'administracao', metadata: { id: updated.logos.at(-1)?.id } })
    return NextResponse.json(publicPartnerships(updated), { status: 201, headers })
  } catch (error) { return failure(error) }
}
export async function DELETE(request: NextRequest) {
  const session = await requirePanelAdmin(request)
  if (!session || session.mustChangePassword) return denied()
  try {
    const id = z.string().uuid().parse(request.nextUrl.searchParams.get('id'))
    const revision = request.headers.get('if-match') ?? ''
    const updated = await deletePartnerLogo(revision, id)
    void recordAudit({ category: 'ADMIN', actor: session.sub, action: 'parceria_logo_excluida', step: 'administracao', metadata: { id } })
    return NextResponse.json(publicPartnerships(updated), { headers })
  } catch (error) { return failure(error) }
}
