import type { Atendimento } from '@/services/api'

export const LIMITE_EXAMES_ENTREGA = 10

/**
 * Exames mostrados no modal. Entrega (C): só os 10 mais recentes — os atendimentos já vêm do mais
 * novo para o mais antigo e os exames de cada um também. Atendimento/marcação: todos os exames do dia.
 */
export function examesParaExibir(atendimentos: Atendimento[] | null | undefined, servico: string | null | undefined) {
  const todos = (atendimentos ?? []).flatMap((atend, ai) => (atend.exames ?? []).map((exame, ei) => ({ atend, exame, ai, ei })))
  return servico === 'C' ? todos.slice(0, LIMITE_EXAMES_ENTREGA) : todos
}
