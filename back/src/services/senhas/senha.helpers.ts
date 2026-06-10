import { prisma } from '../../../config/prismaDB'
import { PrismaLog } from '../../../config/prismalog'
const FUNCIONARIO = process.env.IDFUNCIONARIO
    ? Number(process.env.IDFUNCIONARIO)
    : 1
export function getAgoraBrasil() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000)
}

export function getHojeBrasil() {
  const hoje = getAgoraBrasil()
  hoje.setHours(0, 0, 0, 0)
  return hoje
}

export function montarDsSenha(
  preferencial: number | null | undefined,
  fila: string,
  nr_senha: number | null | undefined
) {
  return `${preferencial !== 0 ? 'P' : 'N'}${fila}-${nr_senha}`
}

export async function resolveModalidade(cd_modalidade: number) {
  const modalidade = await prisma.modalidades.findFirst({
    where: { cd_modalidade },
    select: { ds_modalidade: true },
  })

  return modalidade?.ds_modalidade ?? ''
}

export async function novoAtendimentoTotem(cd_paciente: number) {
  console.log('Criando novo atendimento para paciente:', cd_paciente)
  const cdSalaTotem = Number(process.env.IDSALA)
  const cdMedicoTotem = Number(process.env.IDMEDICO)

  if (!cdSalaTotem) {
    throw new Error('IDSALA não configurado no .env')
  }

  if (!cdMedicoTotem) {
    throw new Error('IDMEDICO não configurado no .env')
  }

  return prisma.$transaction(async (tx) => {
    const atendimento = await tx.atendimentos.create({
      data: {
        cd_paciente,
        cd_sala: cdSalaTotem,
        cd_medico: cdMedicoTotem,
        dt_data: getHojeBrasil(),
        ds_status: 2,
        cd_funcionario: FUNCIONARIO
      },
      include: {
        salas: true,
        exames: true,
      },
    })

    await tx.atendimentos.update({
      where: {
        cd_atendimento: atendimento.cd_atendimento,
      },
      data: {
        nr_controle: atendimento.cd_atendimento,
        cd_funcionario: FUNCIONARIO
      },
    })

    return {
      ...atendimento,
      nr_controle: atendimento.cd_atendimento,
    }
  })
}

type ServicoPainel = 'atendimento' | 'marcacao' | 'resultado'

function servicoParaConfig(servico: string): ServicoPainel {
  if (servico === 'C') return 'resultado'
  if (servico === 'D') return 'marcacao'
  return 'atendimento'
}

export async function resolverIpPainelPorModalidade(
  servico: string,
  nr_modalidade: number
) {
  const IP_PADRAO = process.env.IPPAINEL ?? ''

  const config = await PrismaLog.configuracao_painel.findUnique({
    where: { id: 1 },
  })

  if (!config?.ativo) {
    return IP_PADRAO
  }

  const paineis = (config.paineis as any[]) ?? []
  const servicoConfig = servicoParaConfig(servico)

  const painelUniversal = paineis.find(
    (painel) =>
      painel.ativo &&
      painel.universal?.[servicoConfig] === true
  )

  if (painelUniversal?.ip) {
    return painelUniversal.ip
  }

  const painelPorModalidade = paineis.find(
    (painel) =>
      painel.ativo &&
      Array.isArray(painel[servicoConfig]) &&
      painel[servicoConfig].includes(nr_modalidade)
  )

  return painelPorModalidade?.ip ?? IP_PADRAO
}