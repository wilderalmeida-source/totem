import { auditContext } from './flow-audit'
import { recordAudit } from './persistent-audit'


export function describePatientInput(value: unknown) {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const name = typeof input.ds_paciente === 'string' ? input.ds_paciente : undefined
  return {
    cd_paciente: typeof input.cd_paciente === 'number' ? input.cd_paciente : typeof input.cd_paciente === 'string' ? input.cd_paciente.slice(0, 100) : undefined,
    tipo: String(input.tipo ?? '').slice(0, 30),
    nome: name?.slice(0, 150),
    nomeVisivel: name?.slice(0, 150).replace(/ /g, '·').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r'),
    tamanhoNome: name?.length,
    espacosNasPontas: name !== undefined && name !== name.trim(),
    nascimento: input.dt_nascimento instanceof Date ? input.dt_nascimento.toISOString() : String(input.dt_nascimento ?? '').slice(0, 100),
    cpfInformado: input.ds_cpf !== undefined,
    tamanhoCpf: typeof input.ds_cpf === 'string' ? input.ds_cpf.length : undefined,
  }
}

export function patientDiagnostic(requestId: string, metadata: Record<string, unknown>) {
  const context = auditContext.getStore()
  recordAudit({ category: 'TOTEM', action: 'diagnostico_identificacao', step: 'pacientesRoute.GET',
    sessionId: context?.flowId ?? requestId,
    metadata: { ...metadata, requestId, device: context?.device, version: process.env.APP_VERSION ?? 'nao_informada' } })
}
