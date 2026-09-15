export type FlowOutcome = 'CONCLUIDO' | 'CANCELADO' | 'EXPIRADO' | 'FALHOU' | 'DESCONHECIDO'

export function closingOutcome(reason: string, emission?: FlowOutcome): FlowOutcome {
  if (emission) return emission
  if (reason === 'sucesso') return 'CONCLUIDO'
  if (reason === 'falha_emissao') return 'DESCONHECIDO'
  if (reason.includes('inatividade') || reason.includes('expiracao') || reason === 'sessao_rejeitada') return 'EXPIRADO'
  return 'CANCELADO'
}
