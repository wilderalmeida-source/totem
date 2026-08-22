import { apiFetch } from "./client"

export const tocaAtencao = async (TorP: string) => {
  const res = await apiFetch(`/clinux/atencao?TorP=${TorP}`)
  if (res.status === 200) return res.json()
}

export const gravaAtencao = async (value: string) => {
  const res = await apiFetch('/clinux/atencao', {
    method: 'POST',
    body: JSON.stringify({ text: value }),
  })
  if (res.status === 200) return res.json()
}

export const buscaTextoAtencao = async () => {
  const res = await apiFetch('/clinux/atencao/text')
  if (res.status === 200) return res.json()
}
