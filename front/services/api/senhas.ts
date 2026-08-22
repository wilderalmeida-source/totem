import { apiFetch } from "./client"
import { Senha, SenhasResponse } from "./types"

export const buscaSenhas = async (): Promise<SenhasResponse> => {
  const res = await apiFetch('/clinux/senhas', {
    tags: ['pacientes'],
  })
  return res.json() as Promise<SenhasResponse>
}

export const cadastraSenha = async (data: Senha): Promise<Senha> => {
  const res = await apiFetch('/clinux/senhas', {
    tags: ['agenda'],
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.json() as Promise<Senha>
}
