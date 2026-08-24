import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, readAdminSession } from '@/lib/admin-session'

export async function GET(request: NextRequest) {
  const secret = process.env.SESSION_SECRET
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const session = secret && token ? await readAdminSession(token, secret) : null
  if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  return NextResponse.json({ username: session.sub, permissions: session.permissions })
}
