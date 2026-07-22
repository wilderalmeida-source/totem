'use server'

const API_INTERNA = process.env.LINK_API_INTERNA
const TOKEN = `Bearer ${process.env.TOKEN_API_INT}`

type FetchOptions = RequestInit & {
  tags?: string[]
}

export const apiFetch = async (
  path: string,
  { tags, headers, ...options }: FetchOptions = {}
) => {
  if (!API_INTERNA) {
    throw new Error('LINK_API_INTERNA não configurada')
  }

  if (!process.env.TOKEN_API_INT) {
    throw new Error('TOKEN_API_INT não configurado')
  }
  if (options.body) {

  }
  const mergedHeaders = new Headers({
    'Content-Type': 'application/json',
    Authorization: TOKEN,
  })
  const mergedHeaders2 = new Headers({
    Authorization: TOKEN,
  })
  if (headers) {
    const customHeaders = new Headers(headers)

    customHeaders.forEach((value, key) => {
      mergedHeaders.set(key, value)
    })
  }

  return fetch(`${API_INTERNA}${path}`, {
    cache: 'no-cache',
    headers: options.body ? mergedHeaders : mergedHeaders2,
    ...(tags ? { next: { tags } } : {}),
    ...options,
  })
}