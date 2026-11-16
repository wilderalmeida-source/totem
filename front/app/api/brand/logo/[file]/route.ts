import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { BRAND_FILE } from '@/lib/brand'
import { BRAND_DIRECTORY } from '@/lib/brand-storage'
import { ensureImagesReady } from '@/lib/panel-storage'

export const runtime = 'nodejs'

// O nome do arquivo muda a cada envio, então a imagem pode ficar em cache por muito tempo.
export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params
  if (!BRAND_FILE.test(file)) return new NextResponse(null, { status: 404 })
  try {
    await ensureImagesReady()
    const content = await fs.readFile(path.join(BRAND_DIRECTORY, file))
    return new NextResponse(new Uint8Array(content), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return new NextResponse(null, { status: 404 }) }
}
