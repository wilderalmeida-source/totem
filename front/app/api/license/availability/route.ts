import { NextResponse } from 'next/server'
import { licenseBackend } from '@/lib/license-admin'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const response = await licenseBackend('/clinux/license/availability', 'GET')
    if (!response.ok) throw new Error()
    const result = await response.json()
    return NextResponse.json({ allowed: result.allowed === true }, { headers })
  } catch { return NextResponse.json({ allowed: false }, { status: 503, headers }) }
}
