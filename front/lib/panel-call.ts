export type PanelCall = {
  id: string
  name: string
  guicheNumero: string
  guicheNome: string
  recepcao: string
  calledAt: string
}

/** Keep call identity and display fields together when TCP and TTS arrive separately. */
export function parsePanelCall(value: unknown): PanelCall | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const limits: Record<keyof PanelCall, number> = {
    id: 100,
    name: 200,
    guicheNumero: 30,
    guicheNome: 200,
    recepcao: 200,
    calledAt: 100,
  }
  const result = {} as PanelCall
  for (const key of Object.keys(limits) as (keyof PanelCall)[]) {
    const field = input[key]
    if (typeof field !== 'string' || field.length > limits[key]) return null
    result[key] = field.trim()
  }
  if (!result.id || !result.name) return null
  return result
}
