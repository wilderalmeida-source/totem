import { NextRequest, NextResponse } from 'next/server'
import { auditOutbox } from './persistent-audit'
import { auditServer, flowHeaders } from './flow-audit-server'
import { PATIENT_MAX_MS, PATIENT_SESSION_COOKIE } from './patient-session-config'

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host')
  try { return Boolean(origin && host && new URL(origin).host.toLowerCase() === host.toLowerCase()) } catch { return false }
}

export function sessionCookie(request: NextRequest, response: NextResponse, token?: string) {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  response.cookies.set(PATIENT_SESSION_COOKIE, token ?? '', {
    httpOnly: true, sameSite: 'strict', path: '/',
    secure: forwarded ? forwarded === 'https' : request.nextUrl.protocol === 'https:',
    maxAge: token ? PATIENT_MAX_MS / 1000 : 0,
  })
  return response
}

export function patientJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function patientBackend(path: string, init: RequestInit = {}, request?: NextRequest) {
  if (path === '/clinux/audit' && init.method === 'POST' && typeof init.body === 'string') {
    auditOutbox.enqueue(JSON.parse(init.body))
    return new Response(null, { status: 204 })
  }
  const base = process.env.LINK_API_INTERNA
  const token = process.env.TOKEN_API_INT
  if (!base || !token) throw new Error('Backend indisponível')
  const start = Date.now()
  try {
  const response = await fetch(new URL(path, base), {
    ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(request ? flowHeaders(request) : {}) },
    cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15000),
  })
  if (request) auditServer(request, 'resposta_backend', path.split('?')[0], { status: response.status, durationMs: Date.now() - start })
  return response
  } catch (error) {
    if (request) auditServer(request, 'falha_comunicacao', path.split('?')[0], { code: error instanceof Error && error.name === 'TimeoutError' ? 'BACKEND_TIMEOUT' : 'BACKEND_UNREACHABLE', durationMs: Date.now() - start })
    throw error
  }
}
