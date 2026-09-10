import { cadastraPaciente, cadastraSenha, Paciente } from "@/services/api"
import { parseBRDate } from "@/lib/createDate"

type Props = {
  cd_paciente?: number
  ds_paciente?: string
  dt_nascimento?: string
  preferencial: number | null | undefined
  servico: string | null
  cd_modalidade: number | null | undefined
  onPatientRegistered?: (patient: Paciente) => void
}

export async function sendClinux({
  cd_paciente,
  ds_paciente,
  dt_nascimento,
  preferencial,
  servico,
  cd_modalidade,
  onPatientRegistered,
}: Props) {
  if (!cd_paciente) {
    const dt = dt_nascimento
      ? parseBRDate(dt_nascimento) ?? new Date(0).toISOString()
      : new Date(0).toISOString()

    const paciente: Paciente = await cadastraPaciente({ ds_paciente, dt_nascimento: dt })
    if (!paciente?.cd_paciente || !Number.isSafeInteger(paciente.cd_paciente) || paciente.cd_paciente <= 0) {
      throw new Error('Cadastro do paciente não confirmado. Não foi possível emitir a senha.')
    }
    cd_paciente = paciente.cd_paciente
    onPatientRegistered?.(paciente)
  }
  if (!Number.isSafeInteger(cd_paciente) || !cd_paciente || cd_paciente <= 0) {
    throw new Error('Cadastro do paciente não confirmado. Não foi possível emitir a senha.')
  }
  const result = await cadastraSenha({ cd_paciente, servico, preferencial, cd_modalidade, })
  if (result?.ok !== true) throw new Error('Emissão não confirmada. Consulte a recepção antes de tentar novamente.')
  return result
}
