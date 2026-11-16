// Caches das leituras feitas a cada senha emitida (IP do painel) e a cada chamada (nome do guichê).
// Antes: uma consulta ao banco de logs em cada uso. Salvar painéis ou guichês pelo sistema limpa o
// cache na hora; os 60 s só cobrem alterações feitas direto no banco.
export function ttlCache<T>(ttlMs: number, maxEntries = 1000) {
  const entries = new Map<string, { until: number; value: Promise<T> }>()
  const get = (key: string, load: () => Promise<T>, now = Date.now()) => {
    const hit = entries.get(key)
    if (hit && hit.until > now) return hit.value
    if (entries.size >= maxEntries) entries.delete(entries.keys().next().value as string)
    const value = load()
    entries.set(key, { until: now + ttlMs, value })
    value.catch(() => { if (entries.get(key)?.value === value) entries.delete(key) })
    return value
  }
  return Object.assign(get, { clear: () => entries.clear() })
}

export const CACHE_PAINEIS_MS = 60_000
export const configPainelCache = ttlCache<unknown>(CACHE_PAINEIS_MS)
export const guicheCache = ttlCache<{ ativo: boolean; nome: string | null } | null>(CACHE_PAINEIS_MS)
