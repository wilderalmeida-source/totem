import { NextRequest, NextResponse } from 'next/server'
import { licenseBackend, limitedLicenseJson, requireLicenseAdmin } from '@/lib/license-admin'
import { sameOrigin } from '@/lib/patient-session-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: NextRequest) {
  const session = await requireLicenseAdmin(request)
  if (!session) return NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403, headers })
  try {
    const response = await licenseBackend('/clinux/license', 'GET', session)
    return NextResponse.json(await response.json(), { status: response.status, headers })
  } catch { return NextResponse.json({ error: 'Não foi possível consultar o backend.' }, { status: 503, headers }) }
}
export async function POST(request: NextRequest) {
  const session = await requireLicenseAdmin(request)
  if (!session || !sameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403, headers })
  }
  let body: unknown
  try { body = await limitedLicenseJson(request) }
  catch { return NextResponse.json({ error: 'Envie um arquivo JSON de licença de até 8 KB.' }, { status: 400, headers }) }
  try {
    const response = await licenseBackend('/clinux/license/activate', 'POST', session, body)
    return NextResponse.json(await response.json(), { status: response.status, headers })
  } catch { return NextResponse.json({ error: 'Não foi possível concluir a ativação. Atualize o status antes de tentar novamente.' }, { status: 503, headers }) }
}
