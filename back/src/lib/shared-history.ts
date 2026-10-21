/** One process-wide snapshot for simultaneous kiosks; failures are never cached. */
export function sharedHistory<T>(ttlMs = 2000) {
  let pending: Promise<T> | undefined
  let cached: { value: T; expires: number } | undefined
  return (load: () => Promise<T>): Promise<T> => {
    if (pending) return pending
    if (cached && Date.now() < cached.expires) return Promise.resolve(cached.value)
    pending = Promise.resolve().then(load).then(value => {
      cached = { value, expires: Date.now() + ttlMs }
      return value
    }).finally(() => { pending = undefined })
    return pending
  }
}
