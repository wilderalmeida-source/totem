'use server'

import { apiFetch } from "./client"
import { Documento } from "./types"

export const buscaDocumentos = async (
  cd_atendimento: number
): Promise<Documento[]> => {
  const res = await apiFetch('/clinux/documentos', {
    tags: ['agenda'],
    method: 'POST',
    body: JSON.stringify({ cd_atendimento }),
  })
  return res.json() as Promise<Documento[]>
}
