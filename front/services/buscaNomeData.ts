import { buscaAtendimentos, buscaPaciente, type Atendimento, type Paciente } from '@/services/api'
import { entregaDeExames } from '@/services/entregadeexames'
import type { DadosPaciente } from '@/components/modals/patientModal'

const STATUS_VALIDOS = [2, 3, 7]

interface BuscarPacienteNomeDataParams {
  ds_paciente: string
  dt_nascimento: string
  servico: string
  preferencial: number
}

interface BuscarPacienteNomeDataResult {
  dados: DadosPaciente | null
  exames: Atendimento[] | null
  tentativas: number | null
  invalido: string | null
}

export async function buscarPacienteNomeData({
  ds_paciente,
  dt_nascimento,
  servico,
  preferencial,
}: BuscarPacienteNomeDataParams): Promise<BuscarPacienteNomeDataResult> {
  const listpaciente = await buscaPaciente({
    ds_paciente,
    dt_nascimento,
    tipo: 'NOMEDATA',
  })

  if (!listpaciente || listpaciente.length === 0) {
    return {
      dados: null,
      exames: null,
      tentativas: null,
      invalido: 'Paciente não encontrado.',
    }
  }

  const paciente = listpaciente[0] as Paciente & { tentativas?: number }

  if (!paciente.cd_paciente) {
    return {
      dados: null,
      exames: null,
      tentativas: paciente.tentativas ?? null,
      invalido: 'Nome ou data de nascimento inválidos.',
    }
  }

  let exames: Atendimento[] | null = null

  if (servico === 'C') {
    const entrega = await entregaDeExames(paciente.cd_paciente)
    exames = entrega
      ? entrega.filter((item) => [5].includes(item.status ?? -999)).slice(0, 10)
      : []
  } else {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const atendimento = await buscaAtendimentos({
      cd_paciente: paciente.cd_paciente,
      date: { from: hoje },
    })

    exames = atendimento
      ? atendimento.filter(
          (item) =>
            item.exames &&
            item.exames.length > 0 &&
            item.ds_status &&
            STATUS_VALIDOS.includes(item.ds_status)
        )
      : []
  }

  return {
    dados: {
      ...paciente,
      ds_paciente: paciente.ds_paciente ?? paciente.ds_nome ?? ds_paciente,
      dt_nascimento: paciente.dt_nascimento ?? dt_nascimento,
      servico,
      preferencial,
      tipo: 'NOMEDATA',
    },
    exames,
    tentativas: null,
    invalido: null,
  }
}
