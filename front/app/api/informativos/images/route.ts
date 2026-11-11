import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { requirePanelAdmin } from '@/lib/require-panel-admin'
import { sameOrigin } from '@/lib/patient-session-http'
import { ensureMediaDirectory, MEDIA_DIRECTORY } from '@/lib/panel-storage'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const session = await requirePanelAdmin(request)
  if (!session || session.mustChangePassword) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 })
  if (Number(request.headers.get('content-length')) > 21 * 1024 * 1024) return NextResponse.json({ error: 'Envie até quatro imagens de 5 MB cada.' }, { status: 413 })
  try {
    const form = await request.formData()
    const files = form.getAll('files')
    if (!files.length || files.length > 4 || files.some(file => !(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024)) return NextResponse.json({ error: 'Envie até quatro imagens PNG, JPEG ou WebP, com até 5 MB cada.' }, { status: 400 })
    const converted = []
    for (const value of files) {
      const upload = value as File
      const image = sharp(Buffer.from(await upload.arrayBuffer()), { limitInputPixels: 16000000, failOn: 'error' })
      const metadata = await image.metadata()
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) return NextResponse.json({ error: 'Formato de imagem inválido.' }, { status: 400 })
      converted.push({ content: await image.rotate().resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer(), file: `notice-${randomUUID()}.webp` })
    }
    await ensureMediaDirectory()
    for (const image of converted) await fs.writeFile(path.join(MEDIA_DIRECTORY, image.file), image.content, { flag: 'wx' })
    return NextResponse.json({ images: converted.map(image => ({ file: image.file, alt: '' })) }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Não foi possível processar ou salvar as imagens.' }, { status: 400 }) }
}
