'use server'

import { cadastraPaciente, Paciente } from "@/services/api"
import { gerarSenha } from "@/services/gerarsenha"
import { parseBRDate } from "@/lib/createDate"

type Props = {
  cd_paciente?: number
  ds_paciente?: string
  dt_nascimento?: string
  preferencial: number | null | undefined
  servico: string | null
  cd_modalidade: number | null |undefined
}

export async function sendClinux({
  cd_paciente,
  ds_paciente,
  dt_nascimento,
  preferencial,
  servico,
}: Props) {
  let pacienteId = cd_paciente

  if (!pacienteId) {
    const dt = dt_nascimento
      ? parseBRDate(dt_nascimento) ?? new Date(0).toISOString()
      : new Date(0).toISOString()

    const paciente: Paciente = await cadastraPaciente({ ds_paciente, dt_nascimento: dt })
    pacienteId = paciente.cd_paciente
  }
  if (pacienteId) {
    await gerarSenha({ cd_paciente: pacienteId, preferencial, servico })
  }
}