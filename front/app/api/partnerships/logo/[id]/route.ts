import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { PARTNERSHIPS_DIRECTORY, readPartnerships } from '@/lib/partnerships-storage'

export const runtime = 'nodejs'
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id)
  if (!id.success) return new NextResponse(null, { status: 400 })
  try {
    const logo = (await readPartnerships()).logos.find(item => item.id === id.data)
    if (!logo) return new NextResponse(null, { status: 404 })
    const image = await fs.readFile(path.join(PARTNERSHIPS_DIRECTORY, logo.file))
    return new NextResponse(new Uint8Array(image), { headers: { 'Content-Type': 'image/webp', 'Content-Length': String(image.byteLength), 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return new NextResponse(null, { status: 503 }) }
}
