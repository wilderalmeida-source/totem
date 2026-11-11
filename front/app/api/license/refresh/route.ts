import { NextRequest, NextResponse } from 'next/server'
import { licenseBackend, requireLicenseAdmin } from '@/lib/license-admin'
import { sameOrigin } from '@/lib/patient-session-http'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  const session = await requireLicenseAdmin(request)
  if (!session || !sameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403, headers })
  try {
    const response = await licenseBackend('/clinux/license/refresh', 'POST', session, {})
    return NextResponse.json(await response.json(), { status: response.status, headers })
  } catch { return NextResponse.json({ error: 'Não foi possível atualizar o status da licença.' }, { status: 503, headers }) }
}
