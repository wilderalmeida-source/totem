import { buscaAtendimentos, Atendimento } from "@/services/api"
import { apiFetch } from './api/client'

export async function contextoEntrega(cd_paciente: number): Promise<{ exames: Atendimento[]; requerSelecaoModalidade: boolean }> {
  const params = new URLSearchParams({ cd_paciente: String(cd_paciente), tipo: 'entrega', contexto: 'true' })
  const response = await apiFetch(`/clinux/totem/atendimentos?${params}`)
  if (!response.ok) throw new Error('Não foi possível verificar os exames para entrega.')
  const result = await response.json()
  if (!Array.isArray(result.exames) || typeof result.requerSelecaoModalidade !== 'boolean') {
    throw new Error('Resposta de entrega inválida. Verifique a atualização do backend.')
  }
  return result
}

export async function entregaDeExames(cd_paciente: number): Promise<Atendimento[]> {
  const hoje = new Date()

  const tresMesesAtras = new Date(hoje)
  tresMesesAtras.setMonth(hoje.getMonth() - 3)

  return buscaAtendimentos({
    cd_paciente,
    date: { from: tresMesesAtras, to: hoje },
    buscaStatus: "5",
    tipo: "entrega",
  })
}
