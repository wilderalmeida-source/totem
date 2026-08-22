type FetchOptions = RequestInit & {
  tags?: string[]
}

export const apiFetch = async (
  path: string,
  { tags, headers, ...options }: FetchOptions = {}
) => {
  const serverSide = typeof window === 'undefined'
  const apiBase = serverSide ? process.env.LINK_API_INTERNA : '/api/backend'
  const apiToken = serverSide ? process.env.TOKEN_API_INT : undefined

  if (!apiBase) throw new Error('LINK_API_INTERNA não configurada')
  if (serverSide && !apiToken) throw new Error('TOKEN_API_INT não configurado')

  const mergedHeaders = new Headers()
  if (options.body) mergedHeaders.set('Content-Type', 'application/json')
  if (apiToken) mergedHeaders.set('Authorization', `Bearer ${apiToken}`)
  if (headers) {
    const customHeaders = new Headers(headers)

    customHeaders.forEach((value, key) => {
      mergedHeaders.set(key, value)
    })
  }

  return fetch(`${apiBase}${path}`, {
    cache: 'no-cache',
    headers: mergedHeaders,
    ...(serverSide && tags ? { next: { tags } } : {}),
    ...options,
  })
}
