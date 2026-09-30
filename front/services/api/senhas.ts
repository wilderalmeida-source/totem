import { apiFetch } from "./client"
import { Senha, SenhasResponse } from "./types"
import { patientSessionRequest } from '@/lib/patient-session-client'

export const buscaSenhas = async (signal?: AbortSignal): Promise<SenhasResponse> => {
  const res = await apiFetch('/clinux/senhas', {
    tags: ['pacientes'],
    signal,
  })
  if (!res.ok) throw new Error('Não foi possível carregar o histórico de senhas.')
  return res.json() as Promise<SenhasResponse>
}

export const cadastraSenha = async (data: Senha): Promise<{ ok: true }> => {
  return patientSessionRequest('POST', data, '/senha')
}
