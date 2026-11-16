import { buscaPaciente, type Atendimento } from '@/services/api'
import { contextoEntrega } from '@/services/entregadeexames'
import type { DadosPaciente } from '@/components/modals/patientModal'

// Entrega por protocolo: confirma que o atendimento (protocolo) pertence ao ID escolhido na lista
// "Senha". Erro de ID conta tentativa (mesma regra da data) e chega aqui como exceção com a mensagem.
export async function buscarPacienteProtocolo({ cd_atendimento, cd_paciente, servico, preferencial }: {
  cd_atendimento: number
  cd_paciente: number
  servico: string
  preferencial: number
}): Promise<{ dados: DadosPaciente | null; exames: Atendimento[] | null; tentativas: number | null; invalido: string | null }> {
  const [paciente] = await buscaPaciente({ tipo: 'PROTOCOLO', cd_atendimento, cd_paciente })
  if (!paciente?.cd_paciente) return { dados: null, exames: null, tentativas: null, invalido: 'Dados incorretos.' }
  const entrega = await contextoEntrega(paciente.cd_paciente)
  return {
    dados: {
      ...paciente,
      requerSelecaoModalidade: entrega.requerSelecaoModalidade,
      ds_paciente: paciente.ds_paciente ?? paciente.ds_nome ?? '',
      servico,
      preferencial,
      tipo: 'PROTOCOLO',
    },
    exames: entrega.exames,
    tentativas: null,
    invalido: null,
  }
}
