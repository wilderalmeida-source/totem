import { apiFetch } from "./client"
import { Paciente } from "./types"
import { patientSessionRequest } from '@/lib/patient-session-client'

export const buscaPaciente = async ({
  ds_paciente,
  cd_paciente,
  cd_atendimento,
  dt_nascimento,
  ds_cpf,
  tipo,
  anos,
  meses,
}: {
  ds_paciente?: string
  cd_paciente?: number
  cd_atendimento?: number
  dt_nascimento?: string
  ds_cpf?: string
  tipo?: string
  /** Idade do paciente lida no QR (anos e meses). */
  anos?: number
  meses?: number
}, signal?: AbortSignal): Promise<Paciente[]> => {
  if (!ds_paciente && !cd_paciente && !cd_atendimento && !dt_nascimento && !ds_cpf && !tipo) return []

  // Protocolo: confirmação do ID escolhido passa pela sessão do paciente (conta tentativas).
  if (tipo === 'PROTOCOLO' && cd_paciente !== undefined && cd_atendimento !== undefined) {
    const result = await patientSessionRequest<{ patient: Paciente }>('POST', { tipo: 'PROTOCOLO', cd_atendimento, cd_paciente })
    return [result.patient]
  }
  if (tipo === 'ID' || tipo === 'NOMEDATA' || cd_paciente !== undefined) {
    const body = tipo === 'NOMEDATA' ? { tipo, ds_paciente, dt_nascimento, ...(cd_paciente !== undefined ? { cd_paciente } : {}) }
      : cd_paciente !== undefined ? { tipo: 'QR', cd_paciente, ...(anos !== undefined && meses !== undefined ? { anos, meses } : {}) }
      : tipo === 'ID' ? { tipo, ds_cpf, dt_nascimento } : { tipo, ds_paciente, dt_nascimento }
    const result = await patientSessionRequest<{ patient: Paciente }>('POST', body)
    return [result.patient]
  }

  return (await consultaPacientes({ ds_paciente, cd_paciente, cd_atendimento, dt_nascimento, ds_cpf, tipo }, signal)).pacientes
}

/** Busca pelo começo do nome. `truncada` indica que havia mais de 100 nomes e só os primeiros vieram. */
export const buscaPacientesPorPrefixo = async (ds_paciente: string, signal?: AbortSignal) =>
  consultaPacientes({ ds_paciente }, signal)

async function consultaPacientes({ ds_paciente, cd_paciente, cd_atendimento, dt_nascimento, ds_cpf, tipo }: {
  ds_paciente?: string; cd_paciente?: number; cd_atendimento?: number; dt_nascimento?: string; ds_cpf?: string; tipo?: string
}, signal?: AbortSignal): Promise<{ pacientes: Paciente[]; truncada: boolean }> {
  const params = new URLSearchParams()
  if (ds_paciente)   params.append("ds_paciente", ds_paciente)
  if (cd_paciente)   params.append("cd_paciente", String(cd_paciente))
  if (cd_atendimento) params.append("cd_atendimento", String(cd_atendimento))
  if (dt_nascimento) params.append("dt_nascimento", dt_nascimento)
  if (ds_cpf)        params.append("ds_cpf", ds_cpf)
  if (tipo)          params.append("tipo", tipo)

  const res = await apiFetch(`/clinux/pacientes?${params.toString()}`, {
    tags: ['pacientes'],
    signal,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error ?? 'Não foi possível buscar pacientes.')
  }
  return { pacientes: await res.json() as Paciente[], truncada: res.headers.get('x-result-truncated') === 'true' }
}

export const cadastraPaciente = async ({
  ds_paciente,
  dt_nascimento,
}: Partial<Paciente>): Promise<Paciente> => {
  const result = await patientSessionRequest<{ patient: Paciente }>('POST', { tipo: 'NEW', ds_paciente, dt_nascimento })
  return result.patient
}
