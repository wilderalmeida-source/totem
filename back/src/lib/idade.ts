/** Idade em meses completos entre o nascimento e uma data (colunas de data lidas como meia-noite UTC). */
export function idadeEmMeses(nascimento: Date, data: Date): number {
  let meses = (data.getUTCFullYear() - nascimento.getUTCFullYear()) * 12 + (data.getUTCMonth() - nascimento.getUTCMonth())
  if (data.getUTCDate() < nascimento.getUTCDate()) meses -= 1
  return meses
}
