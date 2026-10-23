export type AuditLogEntry = { id: string; sessionId?: string; actor?: string; category: string; action: string; step?: string; metadata?: Record<string, unknown>; createdAt: string }

const titles: Record<string, string> = {
  campo_busca_clicado: 'Campo de identificação selecionado', identificacao_confirmacao_original: 'Dados selecionados para confirmar o paciente',
  voltar: 'Voltar pressionado', inicio_clicado: 'Início pressionado', modal_cancelado: 'Modal cancelado',
  identificacao_limpa: 'Identificação limpa para continuar no mesmo atendimento',
  identificacao_limpeza_solicitada: 'Limpeza da identificação solicitada (o atendimento continua)',
  servico_selecionado: 'Serviço selecionado', tipo_busca_selecionado: 'Forma de identificação escolhida',
  prioridade_selecionada: 'Prioridade selecionada', paciente_selecionado: 'Paciente selecionado',
  modal_paciente_aberto: 'Dados do paciente exibidos para confirmação', confirmacao_senha: 'Confirmação da emissão pressionada',
  resultado_busca_selecionado: 'Resultado da pesquisa selecionado', avancar_clicado: 'Avançar pressionado',
  modalidade_selecionada: 'Modalidade selecionada', identificacao_enviada_next: 'Identificação enviada pelo totem',
  identificacao_recebida: 'Servidor recebeu a identificação', identificacao_rejeitada: 'Identificação rejeitada',
  identificacao_enviada_backend: 'Identificação encaminhada ao backend', identificacao_retorno_backend: 'Backend respondeu à identificação',
  identificacao_resposta_final: 'Resultado da identificação', identificacao_resposta_navegador: 'Totem recebeu o resultado da identificação',
  cadastro_paciente_iniciado: 'Cadastro do paciente solicitado ao Clinux', cadastro_paciente_confirmado: 'Paciente cadastrado no Clinux',
  cadastro_paciente_falhou: 'Cadastro do paciente falhou', emissao_solicitada: 'Emissão solicitada pelo totem',
  emissao_encaminhada: 'Pedido de senha enviado ao backend', emissao_recebida_backend: 'Backend recebeu o pedido de senha',
  emissao_rejeitada: 'Pedido de senha não foi encaminhado', emissao_falhou_backend: 'Backend não concluiu a emissão',
  numero_reservado: 'Número da senha reservado (ainda não é a gravação)',
  senha_e_vinculo_confirmados: 'Senha gravada e vinculada ao atendimento', senha_entrega_confirmada: 'Senha de entrega gravada',
  emissao_confirmada: 'Servidor confirmou o comprovante da senha', emissao_recebida_navegador: 'Totem recebeu a confirmação da senha',
  emissao_sem_confirmacao: 'Emissão sem confirmação — verificar no Clinux', requisicao_falhou: 'Requisição não concluída',
  operacao_falhou: 'Operação no servidor falhou', operacao_concluida: 'Operação no servidor concluída',
  sessao_encerramento_solicitado: 'Encerramento do atendimento solicitado', fluxo_encerrado: 'Atendimento encerrado',
  falha_comunicacao: 'Falha de comunicação', proxy_resposta: 'Resposta do proxy', resposta_backend: 'Resposta do backend', resposta_next: 'Resposta recebida pelo navegador',
}
const reasons: Record<string, string> = {
  PATIENT_SESSION_MISSING: 'Sessão do paciente ausente ou expirada; o pedido não foi enviado ao Clinux.',
  PATIENT_MISMATCH: 'O cadastro enviado difere do paciente identificado.',
  INVALID_TICKET_INPUT: 'Dados da senha inválidos.', ISSUANCE_BUSY: 'Já existe uma emissão em andamento ou a sessão terminou.',
  OPERATOR_ACCESS_DENIED: 'Acesso do colaborador não liberado.', INVALID_ORIGIN: 'Origem da requisição não autorizada.',
  BACKEND_TIMEOUT: 'O backend não respondeu dentro do prazo; a gravação pode ter ocorrido.',
  BACKEND_UNREACHABLE: 'Não foi possível comunicar com o backend.',
  INVALID_RECEIPT: 'Resposta sem comprovante válido de gravação.', RECEIPT_UNAVAILABLE: 'Não foi possível obter o comprovante; conferir antes de repetir.',
  BACKEND_REJECTED_ISSUANCE: 'O backend devolveu erro durante a emissão; confira os eventos dele neste fluxo.',
  P2000: 'Um valor excedeu o tamanho permitido no banco.', P2002: 'Conflito com um registro único no banco.',
  P2003: 'Referência a um cadastro inexistente no banco.', P2028: 'A transação do banco falhou ou excedeu o prazo.',
}
export function eventTitle(log: AuditLogEntry) {
  return titles[log.action] ?? log.action.replace(/[_./]+/g, ' ')
}
export function eventResult(log: AuditLogEntry) {
  const outcome = log.metadata?.outcome
  const labels: Record<string, string> = { CONCLUIDO: 'Etapa concluída', FALHOU: 'Falhou', DESCONHECIDO: 'Sem confirmação', CANCELADO: 'Cancelado', EXPIRADO: 'Expirado' }
  if (typeof outcome === 'string' && labels[outcome]) return labels[outcome]
  if (['operacao_falhou', 'requisicao_falhou', 'falha_comunicacao'].includes(log.action)) return 'Falhou'
  const status = log.metadata?.status
  return typeof status === 'number' && status >= 400 ? `Erro HTTP ${status}` : 'Registro de etapa'
}
export function eventContext(log: AuditLogEntry) {
  const m = log.metadata ?? {}
  const parts: string[] = []
  const services: Record<string, string> = { A: 'Pré-atendimento', B: 'Atendimento', C: 'Entrega de exames', D: 'Agendamento' }
  if (typeof m.servico === 'string') parts.push(services[m.servico] ?? m.servico)
  if (typeof m.nomePaciente === 'string') parts.push(`Paciente: ${m.nomePaciente}`)
  if (typeof m.opcao === 'string') parts.push(m.opcao)
  const types: Record<string, string> = { NOME: 'Nome', DATA: 'Data de nascimento', CPF: 'CPF', NOMEDATA: 'Nome e data', QR: 'QR Code' }
  if (typeof m.tipo === 'string' && types[m.tipo]) parts.push(`Seleção: ${types[m.tipo]}`)
  if (typeof m.modalidadeNome === 'string') parts.push(`Modalidade: ${m.modalidadeNome}`)
  const closingReasons: Record<string, string> = { retorno_inicio: 'Retorno ao início', voltar_date: 'Voltou da confirmação de identidade', voltar_modalidades: 'Voltou da seleção de modalidades', tela_prioridade: 'Seleção de prioridade', sessao_rejeitada: 'Sessão rejeitada pelo servidor', inatividade_ou_expiracao: 'Inatividade ou sessão expirada', sucesso: 'Finalizado após confirmação', falha_emissao: 'Finalizado após falha de emissão', fechamento_modal: 'Modal fechado', cancelar_modal: 'Cancelamento do modal' }
  if (typeof m.reason === 'string' && closingReasons[m.reason]) parts.push(closingReasons[m.reason])
  for (const [key, label] of [['cd_paciente', 'Cadastro'], ['pacienteId', 'Cadastro'], ['cd_senha', 'Código da senha'], ['nr_senha', 'Senha'], ['modalidadeId', 'Modalidade']]) {
    if (typeof m[key] === 'number') parts.push(`${label}: ${m[key]}`)
  }
  if (typeof m.durationMs === 'number') parts.push(`${(m.durationMs / 1000).toFixed(2)} s`)
  if (typeof m.code === 'string' && reasons[m.code]) parts.push(reasons[m.code])
  return parts.join(' • ')
}
export function isTechnicalEvent(log: AuditLogEntry) {
  return ['proxy_resposta', 'resposta_backend', 'resposta_next', 'operacao_concluida', 'identificacao_enviada_backend', 'identificacao_retorno_backend'].includes(log.action)
    && !(typeof log.metadata?.status === 'number' && log.metadata.status >= 400)
    && !['FALHOU', 'DESCONHECIDO'].includes(String(log.metadata?.outcome))
}
export function timelineGroups(items: AuditLogEntry[]) {
  const groups = new Map<string, AuditLogEntry[]>()
  for (const item of items) {
    const key = item.sessionId ? `flow:${item.sessionId}` : `event:${item.id}`
    const group = groups.get(key) ?? []
    group.push(item); groups.set(key, group)
  }
  return [...groups].map(([key, events]) => ({ key, events: events.sort((a, b) => {
    const byDate = Date.parse(a.createdAt) - Date.parse(b.createdAt)
    return byDate || a.id.localeCompare(b.id, undefined, { numeric: true })
  }) })).sort((a, b) => Date.parse(b.events[b.events.length - 1].createdAt) - Date.parse(a.events[a.events.length - 1].createdAt))
}
