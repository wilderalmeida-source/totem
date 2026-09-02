import { prisma } from '../../../config/prismaDB'
import { GerarSenhaBody } from './senha.types'
import {
  getAgoraBrasil,
  novoAtendimentoTotem,
  resolveModalidade,
  resolverIpPainelPorModalidade,
} from './senha.helpers'

export async function gerarSenhaEntrega({
  cd_paciente,
  preferencial,
  cd_modalidade,
}: GerarSenhaBody) {
  const dateNow = getAgoraBrasil()

  const EMPRESA = process.env.IDEMPRESA ? Number(process.env.IDEMPRESA) : 0
  const FUNCIONARIO = process.env.IDFUNCIONARIO
    ? Number(process.env.IDFUNCIONARIO)
    : 1
  const modalidadeTotem = process.env.IDMODALIDADE
    ? Number(process.env.IDMODALIDADE)
    : 0

  const tresMesesAtras = new Date(dateNow)
  tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3)

  const atendimentos = await prisma.atendimentos.findMany({
    where: {
      cd_paciente,
      ds_status: 5,
      dt_data: {
        gte: tresMesesAtras,
        lte: dateNow,
      },
    },
    include: {
      salas: true,
      exames: true,
    },
    orderBy: [
      { dt_data: 'desc' },
      { dt_hora: 'desc' },
      { cd_atendimento: 'desc' },
    ],
  })

  const atendimentosComControle = atendimentos.filter(
    (item) => item.nr_controle != null
  )
  const modalidadesEncontradas = new Set(
    atendimentosComControle
      .map((item) => Number(item.salas?.cd_modalidade ?? 0))
      .filter((modalidade) => modalidade > 0)
  )

  // Se existem outras modalidades além da modalidade do Totem, o controle
  // deve vir de um exame real. A modalidade Totem só é aceita quando for a
  // única encontrada no período.
  const atendimentosElegiveis =
    modalidadeTotem > 0 && modalidadesEncontradas.size > 1
      ? atendimentosComControle.filter(
          (item) => Number(item.salas?.cd_modalidade ?? 0) !== modalidadeTotem
        )
      : atendimentosComControle

  let atendimento = atendimentosElegiveis[0]

  if (!atendimento) {
    atendimento = await novoAtendimentoTotem(cd_paciente)
  }

  const nrControle =
    atendimento.nr_controle ?? atendimento.cd_atendimento


  const modalidadeSenha =
    atendimento.salas?.cd_modalidade ?? cd_modalidade ?? modalidadeTotem

  const IP_PAINEL = await resolverIpPainelPorModalidade(
    'C',
    modalidadeSenha
  )
  const dsModalidade = await resolveModalidade(modalidadeSenha)

  return prisma.atendimentos_senhas.create({
    data: {
      dt_entrada: dateNow,
      ds_opcao: 'C',
      nr_empresa: EMPRESA,
      nr_modalidade: modalidadeSenha,
      nr_senha: nrControle % 10000,
      nr_controle: nrControle,
      sn_preferencial: preferencial !== 0,
      sn_especial: preferencial === 2,
      sn_preparo: false,
      ds_painel: IP_PAINEL,
      ds_local: dsModalidade,
      ds_fila: 'R',
      cd_funcionario: FUNCIONARIO,
    },
  })
}
