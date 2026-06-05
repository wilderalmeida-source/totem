'use server'

import { cadastraPaciente, cadastraSenha, Paciente } from "@/services/api"
import { parseBRDate } from "@/lib/createDate"

type Props = {
  cd_paciente?: number
  ds_paciente?: string
  dt_nascimento?: string
  preferencial: number | null | undefined
  servico: string | null
  cd_modalidade: number | null | undefined
}

export async function sendClinux({
  cd_paciente,
  ds_paciente,
  dt_nascimento,
  preferencial,
  servico,
  cd_modalidade
}: Props) {
  if (!cd_paciente) {
    const dt = dt_nascimento
      ? parseBRDate(dt_nascimento) ?? new Date(0).toISOString()
      : new Date(0).toISOString()

    const paciente: Paciente = await cadastraPaciente({ ds_paciente, dt_nascimento: dt })
    cd_paciente = paciente.cd_paciente
  }
  if (cd_paciente) {
    await cadastraSenha({cd_paciente,servico,preferencial,cd_modalidade,})
  }
}