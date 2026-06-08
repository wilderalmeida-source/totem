import { prisma } from '../../../config/prismaDB'
import { GerarSenhaBody } from './senhas.types'
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

  const atendimentos = await prisma.atendimentos.findMany({
    where: { cd_paciente },
    include: {
      salas: true,
      exames: true,
    },
    orderBy: { cd_atendimento: 'desc' },
  })

  let atendimento = atendimentos.find((item) => item.nr_controle)

  if (!atendimento) {
    atendimento = await novoAtendimentoTotem(cd_paciente)
  }
 
  const nrControle =
    atendimento.nr_controle ?? atendimento.cd_atendimento

 
  const modalidadeSenha =
    cd_modalidade ?? atendimento.salas?.cd_modalidade ?? 0
  
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