import { auditContextHeaders, auditTotem } from './audit-client'
let pending: Promise<unknown> = Promise.resolve()
let identificationVersion = 0

// Serializa identificação/renovação/encerramento para evitar cookies fora de ordem.
export function patientSessionRequest<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown, suffix = ''): Promise<T> {
  if ((method === 'POST' && !suffix) || method === 'DELETE') identificationVersion += 1
  const started = Date.now()
  const version = identificationVersion
  const operation = pending.then(async () => {
    const response = await fetch(`/api/patient-session${suffix}`, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: { ...auditContextHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    })
    auditTotem('resposta_next', 'patientSession' + suffix, { method, status: response.status, durationMs: Date.now() - started })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
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
  return patientSessionRequest('DELETE').then(result => { auditTotem('sessao_encerrada', 'sessao', { reason }); sessionStorage.removeItem('totemAuditSession'); return result })
}
