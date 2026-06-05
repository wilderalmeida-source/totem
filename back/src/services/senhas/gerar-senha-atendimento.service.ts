import { prisma } from '../../../config/prismaDB'
import { GerarSenhaBody } from './senha.types'
import {
  getAgoraBrasil,
  getHojeBrasil,
  montarDsSenha,
  novoAtendimentoTotem,
  resolveModalidade,
} from './senha.helpers'

export async function gerarSenhaAtendimento({
  cd_paciente,
  servico,
  preferencial,
  cd_modalidade,
}: GerarSenhaBody) {
  const dateNow = getAgoraBrasil()
  const hoje = getHojeBrasil()

  const IP_PAINEL = process.env.IPPAINEL
  const EMPRESA = process.env.IDEMPRESA ? Number(process.env.IDEMPRESA) : 0
  const FUNCIONARIO = process.env.IDFUNCIONARIO
    ? Number(process.env.IDFUNCIONARIO)
    : 1

  const atendimentos = await prisma.atendimentos.findMany({
    where: {
      cd_paciente,
      dt_data: hoje,
    },
    include: {
      exames: true,
      salas: true,
    },
    orderBy: { cd_atendimento: 'desc' },
  })

  const statusValidos = [2, 3, 7]

  let exameAtendimento = atendimentos.filter(
    (item) =>
      item.exames.length > 0 &&
      item.ds_status != null &&
      statusValidos.includes(item.ds_status)
  )

  let novoAtendimento = false

  if (exameAtendimento.length === 0) {
    const novo = await novoAtendimentoTotem(cd_paciente)
    exameAtendimento = [novo]
    novoAtendimento = true
  }

  const atendimento = exameAtendimento[0]

  const modalidadeSenha =
    cd_modalidade ?? atendimento.salas?.cd_modalidade ?? 0

  let dsModalidade = await resolveModalidade(modalidadeSenha)

  if (novoAtendimento && servico === 'A') {
    dsModalidade = 'ATENDIMENTO PRÉ'
  }

  const fila = novoAtendimento ? 'N' : dsModalidade[0]

  const totalSenhasHoje = await prisma.atendimentos_senhas.count({
    where: {
      dt_entrada: {
        gte: hoje,
      },
    },
  })

  const nrSenha = totalSenhasHoje + 1

  const senha = await prisma.atendimentos_senhas.create({
    data: {
      dt_entrada: dateNow,
      ds_opcao: servico,
      nr_empresa: EMPRESA,
      nr_modalidade: modalidadeSenha,
      nr_senha: nrSenha,
      sn_preferencial: preferencial !== 0,
      sn_especial: preferencial === 2,
      sn_preparo: false,
      ds_painel: IP_PAINEL,
      ds_local: dsModalidade,
      ds_fila: fila,
      cd_funcionario: FUNCIONARIO,
    },
  })

  const dsSenha = montarDsSenha(preferencial, fila, senha.nr_senha)

  await prisma.atendimentos.updateMany({
    where: {
      cd_atendimento: {
        in: exameAtendimento.map((item) => item.cd_atendimento),
      },
    },
    data: {
      ds_senha: dsSenha,
      cd_senha: senha.cd_senha,
      dt_hora_senha: dateNow,
    },
  })

  return senha
}