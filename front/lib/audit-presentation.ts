import { AuditLogEntry, eventContext, eventResult, eventTitle, isTechnicalEvent } from './audit-timeline'

type Row = { label: string; value: string }
export type StageKind = 'session' | 'patient' | 'emission' | 'communication' | 'audio' | 'failure'
const services: Record<string, string> = { A: 'Pré-atendimento', B: 'Atendimento', C: 'Entrega de exames', D: 'Agendar exames' }
const types: Record<string, string> = { NOME: 'Nome', DATA: 'Data de nascimento', CPF: 'CPF', ID: 'CPF', NOMEDATA: 'Nome e data', QR: 'Código de barras' }
const confirmed = new Set(['senha_e_vinculo_confirmados', 'senha_entrega_confirmada', 'emissao_confirmada', 'emissao_recebida_navegador'])
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function text(value: unknown) { return typeof value === 'string' ? value.trim().slice(0, 200) : '' }
function date(value: unknown) {
  const s = text(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(s)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : s
}
export function patientName(log: AuditLogEntry) {
  return text(log.metadata?.nomePaciente) || text(record(record(log.metadata?.resposta).patient).ds_paciente)
}
export function hasProblem(log: AuditLogEntry) {
  const result = eventResult(log)
  return result === 'Falhou' || result === 'Sem confirmação' || result.startsWith('Erro HTTP') || /(?:falhou|rejeitad|invalido|sem_confirmacao)/.test(log.action)
}
export function stageKind(log: AuditLogEntry): StageKind {
  if (hasProblem(log)) return 'failure'
  if (/audio|speech|tcp/.test(`${log.action} ${log.step}`)) return 'audio'
  if (/emissao|senha|numero_reservado/.test(log.action)) return 'emission'
  if (/busca|paciente|identificacao|modalidade|^qr_/.test(log.action)) return 'patient'
  if (/resposta|proxy|comunicacao|operacao/.test(log.action)) return 'communication'
  return 'session'
}
export function stageTitle(log: AuditLogEntry) {
  const m = log.metadata ?? {}
  const name = patientName(log)
  switch (log.action) {
    case 'servico_selecionado': return `Serviço: ${services[String(m.servico)] ?? 'Não informado'}`
    case 'prioridade_selecionada': return `Prioridade: ${text(m.opcao) || ({ 0: 'Atendimento normal', 1: 'Preferencial', 2: 'Especial' }[Number(m.preferencial)] ?? 'Não informada')}`
    case 'tipo_busca_selecionado': return m.tipo === 'QR' ? 'Leitor de código de barras aberto' : `Busca: ${types[String(m.tipo)] ?? 'Identificação'}`
    case 'campo_busca_clicado': return `Campo: ${types[String(m.tipo)] ?? 'Identificação'}`
    case 'resultado_busca_selecionado': case 'paciente_selecionado': return name ? `Seleção: ${name}` : `Seleção: ${types[String(m.tipo)] ?? 'Paciente'}`
    case 'modal_paciente_aberto': return 'Modal aberto'
    case 'modalidade_selecionada': return `Modalidade: ${text(m.modalidadeNome) || m.modalidadeId || 'Selecionada'}`
    case 'voltar': return 'Voltar'
    case 'inicio_clicado': return 'Início'
    case 'avancar_clicado': return 'Avançar'
    case 'confirmacao_senha': return 'Confirmar envio ao Clinux'
    case 'emissao_solicitada': return 'Envio ao Clinux solicitado'
    case 'qr_lido': return 'Código de barras lido'
    case 'qr_invalido': return 'Código de barras inválido'
    case 'qr_ignorado': return 'Leitura ignorada: consulta em andamento'
    case 'qr_pesquisa_enviada': return 'Busca pelo código de barras'
    case 'qr_resposta_recebida': return Number(m.quantidade) > 0 ? 'Paciente localizado pelo código de barras' : 'Paciente não encontrado pelo código de barras'
    case 'qr_pesquisa_falhou': return 'Falha na consulta do código de barras'
    case 'identificacao_enviada_next': {
      const input = record(m.enviado)
      if (text(input.ds_paciente)) return `Busca: Nome: ${text(input.ds_paciente)}`
      if (input.cpfInformado) return 'Busca: CPF (oculto)'
      if (text(input.dt_nascimento)) return `Busca: Data: ${date(input.dt_nascimento)}`
      return 'Busca: Identificação do paciente'
    }
    case 'identificacao_retorno_backend': case 'identificacao_resposta_final': return 'Resultado da busca'
    default: return confirmed.has(log.action) ? 'Envio ao Clinux confirmado' : eventTitle(log)
  }
}
function patientRows(input: unknown): Row[] {
  const p = record(input)
  const rows: Row[] = []
  if (text(p.ds_paciente) || text(p.ds_nome)) rows.push({ label: 'Nome', value: text(p.ds_paciente) || text(p.ds_nome) })
  if (text(p.dt_nascimento)) rows.push({ label: 'Nascimento', value: date(p.dt_nascimento) })
  if (typeof p.cd_paciente === 'number') rows.push({ label: 'Cadastro', value: String(p.cd_paciente) })
  if (p.cpfInformado || p.ds_cpf) rows.push({ label: 'CPF', value: 'Informado (oculto)' })
  return rows
}
export function stageDetails(log: AuditLogEntry) {
  const m = log.metadata ?? {}
  const response = record(m.resposta)
  const rows: Row[] = []
  if (patientName(log)) rows.push({ label: 'Paciente', value: patientName(log) })
  if (log.actor) rows.push({ label: 'Responsável', value: log.actor })
  if (log.step) rows.push({ label: 'Tela / etapa', value: log.step === 'busca_complementar' ? 'Confirmação de nome e nascimento' : log.step })
  const context = eventContext(log)
  if (context) rows.push({ label: 'Informações', value: context.replace(/QR Code/g, 'Código de barras') })
  for (const key of ['enviado', 'entrada', 'selecionado']) rows.push(...patientRows(m[key]))
  rows.push(...patientRows(response.patient ?? response))
  if (typeof m.status === 'number' && m.status >= 400) rows.push({ label: 'Resposta', value: `Falha na requisição (${m.status})` })
  const raw = Array.isArray(response.amostra) ? response.amostra : Array.isArray(m.pacientes) ? m.pacientes : []
  const results = raw.slice(0, 100).map(patientRows).filter(p => p.length)
  const count = typeof response.quantidade === 'number' ? response.quantidade : typeof m.quantidade === 'number' ? m.quantidade : undefined
  return { rows, results, count, truncated: response.truncado === true || raw.length > 100 }
}
export function visibleStages(events: AuditLogEntry[]) {
  const intermediate = new Set(['identificacao_recebida', 'identificacao_enviada_backend', 'identificacao_resposta_navegador', 'emissao_encaminhada', 'emissao_recebida_backend', 'sessao_encerramento_solicitado', 'identificacao_limpeza_solicitada', 'identificacao_limpa'])
  return events.filter(e => hasProblem(e) || (!intermediate.has(e.action) && (!isTechnicalEvent(e) || stageDetails(e).results.length > 0)))
}
export function flowSummary(events: AuditLogEntry[]) {
  const commits = events.filter(e => confirmed.has(e.action) && !hasProblem(e))
  const commit = commits.at(-1)
  const names = [...new Set(events.map(patientName).filter(Boolean))]
  const audioFailure = events.some(e => hasProblem(e) && /audio|speech|tcp/.test(`${e.action} ${e.step}`))
  const rejected = events.some(e => e.action === 'emissao_rejeitada')
  const emission = events.some(e => /emissao|senha/.test(e.action))
  const status = events[0]?.category === 'ADMIN' ? 'Atividade administrativa' : commit ? 'Envio confirmado' : rejected ? 'Envio rejeitado' : emission ? 'Envio sem confirmação' : 'Sem confirmação de envio'
  const ticketEvent = [...commits].reverse().find(e => e.metadata?.nr_senha !== undefined)
  return { name: names.join(' / ') || (events[0]?.category === 'ADMIN' ? 'Atividade administrativa' : 'Paciente não identificado neste recorte'),
    status, tone: commit ? 'success' : rejected ? 'failure' : 'neutral', audioFailure, otherFailure: events.some(e => hasProblem(e) && !/audio|speech|tcp/.test(`${e.action} ${e.step}`)),
    ticket: ticketEvent ? String(ticketEvent.metadata?.nr_senha) : undefined }
}
