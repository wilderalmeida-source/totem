import { auditContextHeaders, auditTotem } from './audit-client'
import { identificationValues, identificationResult } from './identification-diagnostic'
import { closingOutcome, type FlowOutcome } from './flow-outcome'
let emissionOutcome: FlowOutcome | undefined
let pending: Promise<unknown> = Promise.resolve()
let identificationVersion = 0

// Serializa identificação/renovação/encerramento para evitar cookies fora de ordem.
export function patientSessionRequest<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown, suffix = ''): Promise<T> {
  if ((method === 'POST' && !suffix) || method === 'DELETE') identificationVersion += 1
  const started = Date.now()
  const version = identificationVersion
  const operation = pending.then(async () => {
    if (suffix === '/senha') emissionOutcome = 'DESCONHECIDO'
    if (method === 'POST' && !suffix) auditTotem('identificacao_enviada_next', 'patientSession.POST', { enviado: identificationValues(body) })
    const response = await fetch(`/api/patient-session${suffix}`, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: { ...auditContextHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    })
    auditTotem('resposta_next', 'patientSession' + suffix, { method, status: response.status, durationMs: Date.now() - started })
    const data = await response.json().catch(() => null)
    if (method === 'POST' && !suffix) auditTotem('identificacao_resposta_navegador', 'patientSession.POST', {
      status: response.status, resposta: identificationResult(data), outcome: response.ok ? 'CONCLUIDO' : 'FALHOU',
    })
    if (!response.ok) {
      if (suffix === '/senha' && response.status >= 400 && response.status < 500) emissionOutcome = 'FALHOU'
      if (version === identificationVersion && ((response.status === 401 && method === 'PATCH') || (response.status === 401 && suffix))) window.dispatchEvent(new Event('patient-session-expired'))
      if (version === identificationVersion && method === 'POST' && !suffix) window.dispatchEvent(new Event('patient-session-cleared'))
      throw new Error(data?.error ?? 'Não foi possível realizar a operação.')
    }
    if ((method === 'POST' && !suffix) || method === 'PATCH') {
      if (method === 'POST' && version !== identificationVersion) throw new Error('A identificação foi substituída. Continue com a seleção atual.')
      if (version === identificationVersion) window.dispatchEvent(new CustomEvent('patient-session-active', { detail: data }))
    }
    if (suffix === '/senha' && data?.ok !== true) {
      throw new Error('Emissão não confirmada. Consulte a recepção antes de tentar novamente.')
    }
    if (suffix === '/senha') {
      emissionOutcome = 'CONCLUIDO'
      auditTotem('emissao_recebida_navegador', 'emissao', { outcome: emissionOutcome })
    }
    if (method === 'DELETE' || suffix === '/senha') {
      sessionStorage.removeItem('pacienteModalidade')
      window.dispatchEvent(new Event('patient-session-cleared'))
    }
    return data as T
  })
  pending = operation.catch(() => { auditTotem('requisicao_falhou', 'patientSession' + suffix, { method, code: 'SESSION_REQUEST_FAILED', durationMs: Date.now() - started }) })
  return operation
}

export function endPatientSession(reason = 'retorno_inicio') {
  auditTotem('sessao_encerramento_solicitado', 'sessao', { reason })
  sessionStorage.removeItem('pacienteModalidade')
  return patientSessionRequest('DELETE').then(result => {
    auditTotem('fluxo_encerrado', 'sessao', { reason, outcome: closingOutcome(reason, emissionOutcome) })
    emissionOutcome = undefined
    sessionStorage.removeItem('totemAuditSession')
    return result
  })
}
