export type PanelCall = {
  id: string
  name: string
  guicheNumero: string
  guicheNome: string
  recepcao: string
  calledAt: string
  fullName?: string
  modalidade?: string
  localizacao?: string
}

/** Keep call identity and display fields together when TCP and TTS arrive separately. */
export function parsePanelCall(value: unknown): PanelCall | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const limits = {
    id: 100,
    name: 200,
    guicheNumero: 30,
    guicheNome: 200,
    recepcao: 200,
    calledAt: 100,
  }
  const result = {} as PanelCall
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const field = input[key]
    if (typeof field !== 'string' || field.length > limits[key]) return null
    result[key] = field.trim()
  }
  if (!result.id || !result.name) return null
  for (const key of ['fullName', 'modalidade', 'localizacao'] as const) {
    if (input[key] === undefined) continue
    if (typeof input[key] !== 'string' || input[key].length > 200) return null
    result[key] = input[key].trim()
  }
  return result
}
