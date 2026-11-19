import { AuditLogEntry, CLOSING_REASONS, reasons } from './audit-timeline'
import { hasProblem, patientName } from './audit-presentation'

/**
 * Resumo de um atendimento do totem em 6 perguntas simples, para quem não conhece os eventos técnicos:
 * serviço > paciente > data > achou ou avançou > tela de modalidade > senha gerada.
 */
export type StepState = 'ok' | 'warn' | 'fail' | 'skip' | 'none'
export type SummaryStep = { key: string; question: string; answer: string; detail?: string; state: StepState }
export type FlowResult = { state: 'ok' | 'fail' | 'incomplete'; label: string }

const SERVICES: Record<string, string> = { A: 'Pré-atendimento', B: 'Atendimento', C: 'Entrega de exames', D: 'Agendar exames' }
const SEARCH: Record<string, string> = { NOME: 'nome', DATA: 'data de nascimento', CPF: 'CPF', ID: 'protocolo', PROTOCOLO: 'protocolo', NOMEDATA: 'nome e data', QR: 'QR Code' }
const CONFIRMED = new Set(['senha_e_vinculo_confirmados', 'senha_entrega_confirmada', 'emissao_confirmada', 'emissao_recebida_navegador'])
const EMISSION_FAILED = new Set(['emissao_rejeitada', 'emissao_falhou_backend', 'emissao_sem_confirmacao'])
const SELECTED = new Set(['paciente_selecionado', 'resultado_busca_selecionado', 'modal_paciente_aberto'])

function str(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function last<T>(items: T[], test: (item: T) => boolean) { for (let i = items.length - 1; i >= 0; i--) if (test(items[i])) return items[i]; return undefined }
function brDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
function birth(value: unknown) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(value))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }

export function flowSteps(events: AuditLogEntry[]): { steps: SummaryStep[]; result: FlowResult; name: string; service: string; startedAt: string; ticket?: string } {
  const m = (e?: AuditLogEntry) => e?.metadata ?? {}
  const first = events[0]

  // 1. Serviço
  const serviceEvent = events.find(e => e.action === 'servico_selecionado') ?? events.find(e => SERVICES[str(m(e).servico).toUpperCase()])
  const service = SERVICES[str(m(serviceEvent).servico).toUpperCase()] ?? ''
  const priority = last(events, e => e.action === 'prioridade_selecionada')
  const priorityLabel = priority ? (str(m(priority).opcao) || (Number(m(priority).preferencial) > 0 ? 'Prioritário' : 'Atendimento normal')) : ''

  // 2 e 4. Paciente e se foi encontrado
  const names = events.filter(e => SELECTED.has(e.action) || e.action === 'qr_resposta_recebida').map(patientName).filter(Boolean)
  const name = names.at(-1) ?? ''
  const selection = last(events, e => SELECTED.has(e.action) && e.action !== 'modal_paciente_aberto')
  const qrFound = last(events, e => e.action === 'qr_resposta_recebida' && Number(m(e).quantidade) > 0)
  const searchType = str(m(selection).tipo) || str(m(last(events, e => e.action === 'tipo_busca_selecionado')).tipo)
  const via = qrFound && !selection ? 'QR Code' : SEARCH[searchType.toUpperCase()]
  const advanced = events.some(e => e.action === 'avancar_clicado')
  const found = Boolean(name || selection || qrFound)
  const qrInvalid = events.some(e => e.action === 'qr_invalido' || (e.action === 'qr_resposta_recebida' && Number(m(e).quantidade) === 0))
  const sent = record(m(last(events, e => e.action === 'identificacao_enviada_next')).enviado)

  // 5. Tela de modalidade
  const modalityChosen = last(events, e => e.action === 'modalidade_selecionada')
  const modalityShown = Boolean(modalityChosen) || events.some(e => e.step === 'modalidade' || e.action === 'modalidades_exibida')

  // 6. Senha
  const commit = last(events, e => CONFIRMED.has(e.action) && !hasProblem(e))
  const ticketEvent = last(events, e => CONFIRMED.has(e.action) && m(e).nr_senha !== undefined)
  const ticket = ticketEvent ? String(m(ticketEvent).nr_senha) : undefined
  const failure = last(events, e => EMISSION_FAILED.has(e.action) || (hasProblem(e) && /emissao|senha/.test(e.action)))
  const confirmedClick = events.some(e => e.action === 'confirmacao_senha' || e.action === 'emissao_solicitada')
  const closing = last(events, e => e.action === 'fluxo_encerrado' || e.action === 'sessao_encerramento_solicitado')
  const closingText = CLOSING_REASONS[str(m(closing).reason)]

  const steps: SummaryStep[] = [
    { key: 'servico', question: 'Serviço escolhido', answer: service || 'Não registrado', detail: priorityLabel || undefined, state: service ? 'ok' : 'none' },
    { key: 'paciente', question: 'Paciente selecionado', answer: name || (advanced ? 'Nenhum (sem cadastro)' : 'Nenhum'), detail: via && found ? `Pela busca por ${via}` : undefined, state: name ? 'ok' : advanced ? 'warn' : 'none' },
    { key: 'data', question: 'Data', answer: first ? brDate(first.createdAt) : '', detail: birth(sent.dt_nascimento) ? `Nascimento digitado: ${birth(sent.dt_nascimento)}` : undefined, state: 'ok' },
    found
      ? { key: 'achou', question: 'Achou o paciente ou avançou?', answer: 'Achou o paciente', state: 'ok' }
      : advanced
        ? { key: 'achou', question: 'Achou o paciente ou avançou?', answer: 'Clicou em Avançar sem cadastro', state: 'warn' }
        : { key: 'achou', question: 'Achou o paciente ou avançou?', answer: qrInvalid ? 'Não achou (QR Code inválido ou não encontrado)' : 'Parou antes de se identificar', state: qrInvalid ? 'fail' : 'none' },
    modalityChosen
      ? { key: 'modalidade', question: 'Apareceu a tela de modalidade?', answer: `Sim, escolheu ${str(m(modalityChosen).modalidadeNome) || 'a modalidade'}`, state: 'ok' }
      : modalityShown
        ? { key: 'modalidade', question: 'Apareceu a tela de modalidade?', answer: 'Sim, mas não escolheu', state: 'warn' }
        : { key: 'modalidade', question: 'Apareceu a tela de modalidade?', answer: 'Não apareceu', state: 'skip' },
    commit
      ? { key: 'senha', question: 'Gerou a senha?', answer: ticket ? `Sim, senha ${ticket}` : 'Sim', state: 'ok' }
      : failure
        ? { key: 'senha', question: 'Gerou a senha?', answer: 'Não, deu erro', detail: reasons[str(m(failure).code)] ?? 'Confira os detalhes técnicos.', state: 'fail' }
        : { key: 'senha', question: 'Gerou a senha?', answer: confirmedClick ? 'Sem confirmação' : 'Não gerou', detail: confirmedClick ? 'Confirmou, mas a gravação não foi confirmada. Verifique no Clinux.' : closingText || 'O atendimento terminou antes da senha.', state: confirmedClick ? 'fail' : 'none' },
  ]
  const result: FlowResult = commit ? { state: 'ok', label: 'Deu certo' } : failure || confirmedClick ? { state: 'fail', label: 'Deu erro' } : { state: 'incomplete', label: 'Não concluído' }
  return { steps, result, name: name || 'Paciente não identificado', service: service || 'Serviço não registrado', startedAt: first?.createdAt ?? '', ticket }
}
