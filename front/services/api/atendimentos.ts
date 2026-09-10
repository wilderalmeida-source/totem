import { apiFetch } from "./client"
import { Atendimento, AtendimentoFiltro } from "./types"

export type PacienteComExame = Pick<Atendimento, 'cd_atendimento' | 'pacientes_atendimentos_cd_pacienteTopacientes'>

export async function buscaPacientesComExames(dt_nascimento: string, nome?: string): Promise<PacienteComExame[]> {
  const params = new URLSearchParams({ dt_nascimento })
  if (nome?.trim()) params.set('ds_paciente', nome.trim())
  const response = await apiFetch(`/clinux/totem/pacientes-com-exames?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.error ?? 'Não foi possível buscar pacientes.')
  }
  return response.json()
}

export const buscaAtendimentos = async ({
  buscaMedic,
  buscaSala,
  buscaPaciente,
  buscaStatus,
  date,
  cd_paciente,
  dt_nascimento,
  tipo,
}: AtendimentoFiltro): Promise<Atendimento[]> => {
  const toDate = date?.to ?? date?.from

  const params = new URLSearchParams()
  if (buscaMedic && buscaMedic !== 'TODOS') params.append("medico", buscaMedic)
  if (buscaSala && buscaSala !== 'TODOS')   params.append("sala", buscaSala)
  if (buscaPaciente)  params.append("busca", buscaPaciente)
  if (buscaStatus && buscaStatus !== 'TODOS') params.append("status", buscaStatus)
  if (date?.from)     params.append("data_inicial", date.from.toISOString())
  if (toDate)         params.append("data_final", toDate.toISOString())
  if (cd_paciente)    params.append("cd_paciente", String(cd_paciente))
  if (dt_nascimento)  params.append("dt_nascimento", dt_nascimento)
  if (tipo)           params.append("tipo", tipo)

  const res = await apiFetch(cd_paciente
    ? '/clinux/totem/atendimentos?' + new URLSearchParams({ cd_paciente: String(cd_paciente), tipo: tipo === 'entrega' ? 'entrega' : 'hoje' })
    : '/clinux/agenda?' + params.toString(), {
    tags: ['agenda'],
  })
  if (!res.ok) {
    if (res.status === 401 && cd_paciente && typeof window !== 'undefined') window.dispatchEvent(new Event('patient-session-expired'))
    const error = await res.json().catch(() => null)
    throw new Error(error?.error ?? 'Não foi possível buscar atendimentos.')
  }
  return res.json() as Promise<Atendimento[]>
}

export const cadastraAtendimento = async ({
  cd_paciente,
}: { cd_paciente: number }): Promise<Atendimento[]> => {
  const res = await apiFetch('/clinux/agenda', {
    tags: ['agenda'],
    method: 'POST',
    body: JSON.stringify({ cd_paciente }),
  })
  return res.json() as Promise<Atendimento[]>
}

export const atualizaAtendimentos = async (
  cd_atendimento: number[],
  ds_senha?: string,
  cd_senha?: number
): Promise<Atendimento[]> => {
  const res = await apiFetch('/clinux/agenda', {
    tags: ['agenda'],
    method: 'PATCH',
    body: JSON.stringify({ cd_atendimento, cd_senha, ds_senha }),
  })
  return res.json() as Promise<Atendimento[]>
}
