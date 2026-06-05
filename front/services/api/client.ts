'use server'

const API_INTERNA = process.env.LINK_API_INTERNA
const TOKEN = `Bearer ${process.env.TOKEN_API_INT}`

const baseHeaders = {
  'Content-Type': 'application/json',
  Authorization: TOKEN,
}

type FetchOptions = RequestInit & {
  tags?: string[]
}

export const apiFetch = async (path: string, { tags, ...options }: FetchOptions = {}) =>
  fetch(`${API_INTERNA}${path}`, {
    cache: 'no-cache',
    headers: baseHeaders,
    ...(tags ? { next: { tags } } : {}),
    ...options,
  })
