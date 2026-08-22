import { apiFetch } from "./client"
import { Atendimento, AtendimentoFiltro } from "./types"

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
  if (date?.from)     params.append("data_inicial", date.from.toString())
  if (toDate)         params.append("data_final", toDate.toString())
  if (cd_paciente)    params.append("cd_paciente", String(cd_paciente))
  if (dt_nascimento)  params.append("dt_nascimento", dt_nascimento)
  if (tipo)           params.append("tipo", tipo)

  const res = await apiFetch(`/clinux/agenda?${params.toString()}`, {
    tags: ['agenda'],
  })
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
