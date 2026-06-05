'use server'

import { apiFetch } from "./client"

export const buscaDicionario = async (search?: string) => {
  const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
  const res = await apiFetch(`/clinux/voice/dictionary${q}`)
  if (res.status === 200) return res.json()
}

export const upsertDicionario = async (key: string, value: string) => {
  const res = await apiFetch('/clinux/voice/dictionary', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  })
  if (res.status === 200) return res.json()
}

export const deletaDicionario = async (key: string) => {
  const res = await apiFetch(`/clinux/voice/dictionary/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  })
  if (res.status === 200) return res.json()
}
