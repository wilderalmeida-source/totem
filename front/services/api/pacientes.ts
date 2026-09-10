import { apiFetch } from "./client"
import { Paciente } from "./types"
import { patientSessionRequest } from '@/lib/patient-session-client'

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

  if (tipo === 'ID' || tipo === 'NOMEDATA' || cd_paciente !== undefined) {
    const body = cd_paciente !== undefined ? { tipo: 'QR', cd_paciente }
      : tipo === 'ID' ? { tipo, ds_cpf, dt_nascimento } : { tipo, ds_paciente, dt_nascimento }
    const result = await patientSessionRequest<{ patient: Paciente }>('POST', body)
    return [result.patient]
  }

  const params = new URLSearchParams()
  if (ds_paciente)   params.append("ds_paciente", ds_paciente)
  if (cd_paciente)   params.append("cd_paciente", String(cd_paciente))
  if (dt_nascimento) params.append("dt_nascimento", dt_nascimento)
  if (ds_cpf)        params.append("ds_cpf", ds_cpf)
  if (tipo)          params.append("tipo", tipo)

  const res = await apiFetch(`/clinux/pacientes?${params.toString()}`, {
    tags: ['pacientes'],
  })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error ?? 'Não foi possível buscar pacientes.')
  }
  return res.json() as Promise<Paciente[]>
}

export const cadastraPaciente = async ({
  ds_paciente,
  dt_nascimento,
}: Partial<Paciente>): Promise<Paciente> => {
  const result = await patientSessionRequest<{ patient: Paciente }>('POST', { tipo: 'NEW', ds_paciente, dt_nascimento })
  return result.patient
}
