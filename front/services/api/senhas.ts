import { apiFetch } from "./client"
import { Senha, SenhasResponse } from "./types"
import { patientSessionRequest } from '@/lib/patient-session-client'

export const buscaSenhas = async (): Promise<SenhasResponse> => {
  const res = await apiFetch('/clinux/senhas', {
    tags: ['pacientes'],
  })
  return res.json() as Promise<SenhasResponse>
}

export const cadastraSenha = async (data: Senha): Promise<{ ok: true }> => {
  return patientSessionRequest('POST', data, '/senha')
}
