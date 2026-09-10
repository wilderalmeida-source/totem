import { z } from 'zod'

export const SEARCH_LIMIT = 100
export const REFINE_SEARCH = 'Muitos resultados. Digite mais informações para refinar a busca.'
export const positiveId = z.string().regex(/^[1-9]\d*$/).transform(Number).refine(Number.isSafeInteger)
export const patientName = z.string().trim().min(1).max(150)
export const birthDate = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/)
  .refine(value => {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10)
  }, 'Data inválida.')
  .transform(value => new Date(value.slice(0, 10)))

export function todayBrazil() {
  return new Date(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10))
}

export const cpf = z.string().regex(/^\d{11}$/)
export const prefixName = patientName.refine(value => {
  const name = value.toUpperCase()
  return name.length >= 5 && !(name.length <= 7 && ['MARIA', 'JOAO', 'JOSÉ', 'JOSE'].some(common => name.includes(common)))
}, 'Digite mais informações para pesquisar pelo nome.')
