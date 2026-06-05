'use server'

import { apiFetch } from "./client"
import { Paciente } from "./types"

export const buscaPaciente = async ({
  ds_paciente,
  cd_paciente,
  dt_nascimento,
  ds_cpf,
  tipo,
}: {
  ds_paciente?: string
  cd_paciente?: number
  dt_nascimento?: string
  ds_cpf?: string
  tipo?: string
}): Promise<Paciente[]> => {
  if (!ds_paciente && !cd_paciente && !dt_nascimento && !ds_cpf && !tipo) return []

  const params = new URLSearchParams()
  if (ds_paciente)   params.append("ds_paciente", ds_paciente)
  if (cd_paciente)   params.append("cd_paciente", String(cd_paciente))
  if (dt_nascimento) params.append("dt_nascimento", dt_nascimento)
  if (ds_cpf)        params.append("ds_cpf", ds_cpf)
  if (tipo)          params.append("tipo", tipo)

  const res = await apiFetch(`/clinux/pacientes?${params.toString()}`, {
    tags: ['pacientes'],
  })
  return res.json() as Promise<Paciente[]>
}

export const cadastraPaciente = async ({
  ds_paciente,
  dt_nascimento,
}: Partial<Paciente>): Promise<Paciente> => {
  const res = await apiFetch('/clinux/pacientes', {
    tags: ['agenda'],
    method: 'POST',
    body: JSON.stringify({ ds_paciente, dt_nascimento }),
  })
  return res.json() as Promise<Paciente>
}
