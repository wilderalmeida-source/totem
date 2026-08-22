import { apiFetch } from "./client"

export const voiceGoogle = async (texto: string) => {
  const res = await apiFetch('/clinux/voice', {
    method: 'POST',
    body: JSON.stringify({ text: texto }),
  })
  if (!res.ok) console.warn("Falha ao chamar /clinux/voice:", await res.text())
  return res.json()
}

export const buscaVoiceStatus = async () => {
  const res = await apiFetch('/clinux/voice/stats')
  return res.json()
}

export const buscaVoiceList = async () => {
  const res = await apiFetch('/clinux/voice/voices')
  return res.json()
}

export const applyVoiceOverride = async (
  year: number,
  week: number,
  selectedVoice: string
) => {
  const res = await apiFetch('/clinux/voice/override', {
    method: 'POST',
    body: JSON.stringify({ year, week, voiceName: selectedVoice }),
  })
  return res.json()
}

export const clearVoiceOverride = async (year: number, week: number) => {
  const res = await apiFetch(`/clinux/voice/override/${year}/${week}`, {
    method: 'DELETE',
  })
  return res.json()
}

export const setVoiceRate = async (rate: number) => {
  const res = await apiFetch('/clinux/voice/rate', {
    method: 'POST',
    body: JSON.stringify({ rate }),
  })
  if (!res.ok) console.warn("Falha ao chamar /clinux/voice/rate:", await res.text())
  return res.json()
}

export const setVoiceVolume = async (volume: number) => {
  const res = await apiFetch('/clinux/voice/volume', {
    method: 'POST',
    body: JSON.stringify({ volume }),
  })
  if (!res.ok) console.warn("Falha ao chamar /clinux/voice/volume:", await res.text())
  return res.json()
}

export const playVoiceTest = async (
  voiceName: string,
  rate: number,
  volume: number
) => {
  const res = await apiFetch('/clinux/voice/play', {
    method: 'POST',
    body: JSON.stringify({ voiceName, rate, volume }),
  })
  if (res.status === 200) return res.json()
}
