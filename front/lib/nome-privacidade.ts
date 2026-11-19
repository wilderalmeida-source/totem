// Cópia de back/src/lib/nome-privacidade.ts, usada só para a prévia na tela Temas.
// O formato real é aplicado no servidor.
export const FORMATOS_NOME = ['completo', 'primeiro_ultimo', 'abreviado', 'iniciais'] as const
export type FormatoNome = typeof FORMATOS_NOME[number]

// Partículas não viram inicial: "MARIA DOS SANTOS" -> "MARIA S."
const PARTICULAS = new Set(['DA', 'DE', 'DI', 'DO', 'DU', 'DAS', 'DOS', 'E'])

export function formatarNome(nome: string | null | undefined, formato: FormatoNome): string {
  const limpo = (nome ?? '').trim().replace(/\s+/g, ' ')
  if (!limpo || formato === 'completo') return limpo
  const partes = limpo.split(' ')
  const nomes = partes.filter((parte, i) => i === 0 || !PARTICULAS.has(parte.toUpperCase()))
  const inicial = (parte: string) => `${parte.charAt(0).toUpperCase()}.`
  if (formato === 'iniciais') return nomes.map(inicial).join(' ')
  if (nomes.length === 1) return nomes[0]
  if (formato === 'primeiro_ultimo') return `${nomes[0]} ${nomes[nomes.length - 1]}`
  return [nomes[0], ...nomes.slice(1).map(inicial)].join(' ')
}
