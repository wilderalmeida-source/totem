export function identificationValues(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {}
  const input = value as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const key of ['tipo', 'ds_paciente', 'dt_nascimento', 'error']) {
    if (typeof input[key] === 'string') result[key] = input[key].slice(0, key === 'error' ? 300 : 150)
  }
  for (const key of ['cd_paciente', 'tentativas']) if (typeof input[key] === 'number') result[key] = input[key]
  if (typeof input.ds_paciente === 'string') {
    result.nomeVisivel = input.ds_paciente.slice(0, 150).replace(/ /g, '·').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
    result.tamanhoNome = input.ds_paciente.length
    result.truncado = input.ds_paciente.length > 150
  }
  if (typeof input.ds_cpf === 'string') result.cpfInformado = true
  return result
}

export function identificationResult(value: unknown) {
  if (Array.isArray(value)) return { formato: 'lista', quantidade: value.length, amostra: value.slice(0, 10).map(identificationValues), truncado: value.length > 10 }
  if (!value || typeof value !== 'object') return { formato: 'invalido_ou_nulo' }
  const input = value as Record<string, unknown>
  return { formato: 'objeto', ...identificationValues(input), ...(input.patient ? { patient: identificationValues(input.patient) } : {}) }
}
