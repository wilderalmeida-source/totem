import { auditServer } from '@/lib/flow-audit-server'
import { requireTotemOperator } from '@/lib/require-totem-operator'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { PATIENT_SESSION_COOKIE } from '@/lib/patient-session-config'
import { lockPatientSession, readPatientSession, revokePatientSession, unlockPatientSession } from '@/lib/patient-session-store'
import { patientBackend, patientJson, sameOrigin, sessionCookie } from '@/lib/patient-session-http'

export const runtime = 'nodejs'
const schema = z.object({
  cd_paciente: z.number().int().positive().optional(),
  servico: z.enum(['A', 'B', 'C', 'D']),
  preferencial: z.number().int().min(0).max(2).nullish(),
  cd_modalidade: z.number().int().positive().nullish(),
}).strict()

export async function POST(request: NextRequest) {
  const reject = (error: string, status: number, code: string) => {
    void auditServer(request, 'emissao_rejeitada', 'patientSession.senha', { outcome: 'FALHOU', status, code, enviadoAoBackend: false })
    return patientJson({ error }, status)
  }
  const denied = await requireTotemOperator(request)
  if (denied) {
    void auditServer(request, 'emissao_rejeitada', 'patientSession.senha', { outcome: 'FALHOU', status: denied.status, code: 'OPERATOR_ACCESS_DENIED', enviadoAoBackend: false })
    return denied
  }
  if (!sameOrigin(request)) return reject('Origem inválida.', 403, 'INVALID_ORIGIN')
  const token = request.cookies.get(PATIENT_SESSION_COOKIE)?.value
  const session = readPatientSession(token)
  if (!session || !token) return reject('Identifique o paciente novamente.', 401, 'PATIENT_SESSION_MISSING')
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return reject('Dados de atendimento inválidos.', 400, 'INVALID_TICKET_INPUT')
  if (parsed.data.cd_paciente !== undefined && parsed.data.cd_paciente !== session.patientId) {
    return reject('O paciente não corresponde à identificação.', 403, 'PATIENT_MISMATCH')
  }
  if (!lockPatientSession(token)) return reject('Atendimento em processamento ou sessão encerrada.', 409, 'ISSUANCE_BUSY')
  try {
    void auditServer(request, 'emissao_encaminhada', 'patientSession.senha', { cd_paciente: session.patientId, servico: parsed.data.servico })
    const upstream = await patientBackend('/clinux/senhas', {
      method: 'POST', body: JSON.stringify({ ...parsed.data, cd_paciente: session.patientId, preferencial: parsed.data.preferencial ?? 0, cd_modalidade: parsed.data.cd_modalidade ?? undefined }),
    }, request)
    if (!upstream.ok) {
      auditServer(request, 'emissao_sem_confirmacao', 'patientSession.senha', { outcome: 'DESCONHECIDO', status: upstream.status, code: 'BACKEND_REJECTED_ISSUANCE' })
      return patientJson({ error: 'Não foi possível gerar a senha. Procure a recepção se o problema persistir.' }, 502)
    }
    const receipt = await upstream.json().catch(() => null)
    if (!Number.isSafeInteger(receipt?.cd_senha) || receipt.cd_senha <= 0) {
      auditServer(request, 'emissao_sem_confirmacao', 'patientSession.senha', { outcome: 'DESCONHECIDO', code: 'INVALID_RECEIPT' })
      return patientJson({ error: 'Emissão não confirmada. Consulte a recepção antes de tentar novamente.' }, 502)
    }
    auditServer(request, 'emissao_confirmada', 'patientSession.senha', { cd_senha: receipt.cd_senha, outcome: 'CONCLUIDO', code: 'TICKET_CONFIRMED' })
    revokePatientSession(token)
    return sessionCookie(request, patientJson({ ok: true }))
  } catch {
    auditServer(request, 'emissao_sem_confirmacao', 'patientSession.senha', { outcome: 'DESCONHECIDO', code: 'RECEIPT_UNAVAILABLE' })
    return patientJson({ error: 'Não foi possível confirmar a emissão. Consulte a recepção antes de tentar novamente.' }, 502)
  } finally { unlockPatientSession(token) }
}
