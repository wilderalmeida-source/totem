/** One process-wide snapshot for simultaneous kiosks; failures are never cached.
 *  `key` separa versões (ex.: formato do nome): trocar a configuração não reaproveita a resposta antiga. */
export function sharedHistory<T>(ttlMs = 2000) {
  let pending: { key: string; promise: Promise<T> } | undefined
  let cached: { key: string; value: T; expires: number } | undefined
  return (load: () => Promise<T>, key = ''): Promise<T> => {
    if (pending && pending.key === key) return pending.promise
    if (cached && cached.key === key && Date.now() < cached.expires) return Promise.resolve(cached.value)
    const promise = Promise.resolve().then(load).then(value => {
      cached = { key, value, expires: Date.now() + ttlMs }
      return value
    }).finally(() => { if (pending?.promise === promise) pending = undefined })
    pending = { key, promise }
    return promise
  }
}
