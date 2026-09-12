import { auditServer } from '@/lib/flow-audit-server'
import { requireTotemOperator } from '@/lib/require-totem-operator'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { PATIENT_SESSION_COOKIE } from '@/lib/patient-session-config'
import { createPatientSession, readPatientSession, revokePatientSession, touchPatientSession } from '@/lib/patient-session-store'
import { patientBackend, patientJson, sameOrigin, sessionCookie } from '@/lib/patient-session-http'

export const runtime = 'nodejs'
const birth = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/).refine(value => {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10)
})
const name = z.string().trim().min(1).max(150)
const confirmation = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('ID'), ds_cpf: z.string().regex(/^\d{11}$/), dt_nascimento: birth }).strict(),
  z.object({ tipo: z.literal('NOMEDATA'), ds_paciente: name, dt_nascimento: birth }).strict(),
  // O QR legado é um código numérico, aceito como identificação pela operação interna.
  z.object({ tipo: z.literal('QR'), cd_paciente: z.number().int().positive().safe() }).strict(),
  z.object({ tipo: z.literal('NEW'), ds_paciente: name, dt_nascimento: birth }).strict(),
])

export async function POST(request: NextRequest) {
  const denied = await requireTotemOperator(request)
  if (denied) return denied
  if (!sameOrigin(request)) return patientJson({ error: 'Origem inválida.' }, 403)
  revokePatientSession(request.cookies.get(PATIENT_SESSION_COOKIE)?.value)
  const fail = (error: string, status: number) => sessionCookie(request, patientJson({ error }, status))
  const raw = await request.json().catch(() => null)
  const parsed = confirmation.safeParse(raw)
  const rawName = typeof raw?.ds_paciente === 'string' ? raw.ds_paciente.slice(0, 150) : undefined
  auditServer(request, parsed.success ? 'identificacao_recebida' : 'identificacao_rejeitada', 'patientSession.POST', {
    tipo: typeof raw?.tipo === 'string' ? raw.tipo.slice(0, 30) : undefined,
    nomeRecebido: rawName, tamanhoNome: rawName?.length, espacosNasPontas: rawName !== undefined && rawName !== rawName.trim(),
    nomeNormalizado: rawName?.trim(), nascimento: typeof raw?.dt_nascimento === 'string' ? raw.dt_nascimento.slice(0, 100) : undefined,
    code: parsed.success ? 'IDENTIFICATION_VALIDATED' : 'INVALID_IDENTIFICATION',
  })
  if (!parsed.success) return fail('Dados de identificação inválidos.', 400)
  try {
    const input = parsed.data
    let upstream: Response
    if (input.tipo === 'NEW') {
      upstream = await patientBackend('/clinux/pacientes', { method: 'POST', body: JSON.stringify({ ds_paciente: input.ds_paciente, dt_nascimento: input.dt_nascimento }) }, request)
    } else {
      const params = new URLSearchParams()
      if (input.tipo === 'QR') params.set('cd_paciente', String(input.cd_paciente))
      else Object.entries(input).forEach(([key, value]) => params.set(key, value))
      upstream = await patientBackend(`/clinux/pacientes?${params}`, {}, request)
    }
    if (!upstream.ok) return fail('Não foi possível confirmar o paciente.', 502)
    const body = await upstream.json()
    const patients = input.tipo === 'NEW' ? [body] : body
    if (Array.isArray(patients) && patients.length === 1 && Number.isInteger(patients[0]?.tentativas)) {
      const remaining = Math.max(0, patients[0].tentativas)
      return fail(remaining === 0 ? 'Tentativas esgotadas. Cancele e procure a recepção.' : `Dados incorretos. Tentativas restantes: ${remaining}.`, 401)
    }
    if (!Array.isArray(patients) || patients.length !== 1 || !Number.isSafeInteger(patients[0]?.cd_paciente) || patients[0].cd_paciente <= 0) {
      return fail('Paciente não confirmado. Confira os dados ou procure a recepção.', 401)
    }
    const patient = patients[0]
    const session = createPatientSession(patient.cd_paciente)
    return sessionCookie(request, patientJson({
      patient: { cd_paciente: patient.cd_paciente, ds_paciente: patient.ds_paciente, dt_nascimento: patient.dt_nascimento },
      expiresAt: session.expiresAt, absoluteExpiresAt: session.absoluteExpiresAt,
    }), session.token)
  } catch { return fail('Serviço de identificação indisponível.', 502) }
}

export async function GET(request: NextRequest) {
  const denied = await requireTotemOperator(request)
  if (denied) return denied
  const session = readPatientSession(request.cookies.get(PATIENT_SESSION_COOKIE)?.value)
  return session ? patientJson({ expiresAt: session.expiresAt, absoluteExpiresAt: session.absoluteExpiresAt }) : patientJson({ error: 'Identifique o paciente novamente.' }, 401)
}

export async function PATCH(request: NextRequest) {
  const denied = await requireTotemOperator(request)
  if (denied) return denied
  if (!sameOrigin(request)) return patientJson({ error: 'Origem inválida.' }, 403)
  const session = touchPatientSession(request.cookies.get(PATIENT_SESSION_COOKIE)?.value)
  return session ? patientJson({ expiresAt: session.expiresAt, absoluteExpiresAt: session.absoluteExpiresAt }) : patientJson({ error: 'Identifique o paciente novamente.' }, 401)
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return patientJson({ error: 'Origem inválida.' }, 403)
  revokePatientSession(request.cookies.get(PATIENT_SESSION_COOKIE)?.value)
  return sessionCookie(request, patientJson({ ok: true }))
}
