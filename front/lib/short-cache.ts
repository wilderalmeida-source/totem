// Cache de poucos segundos para checagens de acesso que vão ao backend a cada requisição
// (middleware + rota repetiam a mesma consulta). Chamadas simultâneas com a mesma chave
// compartilham uma única ida ao backend. Falhas não ficam em cache.
export function shortCache<T>(ttlMs: number, maxEntries = 500) {
  const entries = new Map<string, { until: number; value: Promise<T> }>()
  const get = (key: string, load: () => Promise<T>, now = Date.now()) => {
    const hit = entries.get(key)
    if (hit && hit.until > now) return hit.value
    if (entries.size >= maxEntries) {
      for (const [k, v] of entries) if (v.until <= now) entries.delete(k)
      if (entries.size >= maxEntries) entries.delete(entries.keys().next().value as string)
    }
    const value = load()
    entries.set(key, { until: now + ttlMs, value })
    value.catch(() => { if (entries.get(key)?.value === value) entries.delete(key) })
    return value
  }
  return Object.assign(get, { clear: () => entries.clear() })
}
