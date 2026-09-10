import { auditServer } from '@/lib/flow-audit-server'
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
  if (!sameOrigin(request)) return patientJson({ error: 'Origem inválida.' }, 403)
  const token = request.cookies.get(PATIENT_SESSION_COOKIE)?.value
  const session = readPatientSession(token)
  if (!session || !token) return patientJson({ error: 'Identifique o paciente novamente.' }, 401)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return patientJson({ error: 'Dados de atendimento inválidos.' }, 400)
  if (parsed.data.cd_paciente !== undefined && parsed.data.cd_paciente !== session.patientId) {
    return patientJson({ error: 'O paciente não corresponde à identificação.' }, 403)
  }
  if (!lockPatientSession(token)) return patientJson({ error: 'Atendimento em processamento ou sessão encerrada.' }, 409)
  try {
    const upstream = await patientBackend('/clinux/senhas', {
      method: 'POST', body: JSON.stringify({ ...parsed.data, cd_paciente: session.patientId, preferencial: parsed.data.preferencial ?? 0, cd_modalidade: parsed.data.cd_modalidade ?? undefined }),
    }, request)
    if (!upstream.ok) return patientJson({ error: 'Não foi possível gerar a senha. Procure a recepção se o problema persistir.' }, 502)
    const receipt = await upstream.json().catch(() => null)
    if (!Number.isSafeInteger(receipt?.cd_senha) || receipt.cd_senha <= 0) {
      return patientJson({ error: 'Emissão não confirmada. Consulte a recepção antes de tentar novamente.' }, 502)
    }
    auditServer(request, 'emissao_confirmada', 'patientSession.senha', { cd_senha: receipt.cd_senha, code: 'TICKET_CONFIRMED' })
    revokePatientSession(token)
    return sessionCookie(request, patientJson({ ok: true }))
  } catch {
    return patientJson({ error: 'Não foi possível confirmar a emissão. Consulte a recepção antes de tentar novamente.' }, 502)
  } finally { unlockPatientSession(token) }
}
