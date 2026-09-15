import { flowAudit, auditOperation } from '../../lib/flow-audit'
import { reservarNumeroSenha } from './reservar-numero-senha.service'
import { prisma } from '../../../config/prismaDB'
import { GerarSenhaBody } from './senha.types'
import {
  getAgoraBrasil,
  getHojeBrasil,
  montarDsSenha,
  novoAtendimentoTotem,
  resolveModalidade,
  resolverIpPainelPorModalidade,
} from './senha.helpers'

export async function gerarSenhaAtendimento({
  cd_paciente,
  servico,
  preferencial,
  cd_modalidade,
}: GerarSenhaBody) {
  const dateNow = getAgoraBrasil()
  const hoje = getHojeBrasil()

  const EMPRESA = process.env.IDEMPRESA ? Number(process.env.IDEMPRESA) : 0
  const FUNCIONARIO = process.env.IDFUNCIONARIO
    ? Number(process.env.IDFUNCIONARIO)
    : 1

  const modalidadeTotem = process.env.IDMODALIDADE
    ? Number(process.env.IDMODALIDADE)
    : 0

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
  if (exameAtendimento.length === 0 || !exameAtendimento) {
    const novo = await novoAtendimentoTotem(cd_paciente)
    exameAtendimento = [novo]
    novoAtendimento = true
  }

  const atendimento = exameAtendimento[0]

  const modalidadeSenha =
    cd_modalidade ??
    atendimento.salas?.cd_modalidade ??
    modalidadeTotem

  if (!modalidadeSenha) {
    throw new Error('IDMODALIDADE não configurado no .env')
  }

  let dsModalidade = await resolveModalidade(modalidadeSenha)

  if (!dsModalidade) {
    throw new Error(`Modalidade ${modalidadeSenha} não encontrada`)
  }

  const IP_PAINEL = await resolverIpPainelPorModalidade(
    servico,
    modalidadeSenha
  )

  if (novoAtendimento && servico === 'A') {
    dsModalidade = 'ATENDIMENTO PRÉ'
  }

  const fila = novoAtendimento ? 'N' : dsModalidade[0]

  const nrSenha = await reservarNumeroSenha(hoje)

  const result = await auditOperation('clinico.gravar_senha_e_vinculo', () => prisma.$transaction(async (tx) => {
    const senha = await tx.atendimentos_senhas.create({
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

    await tx.atendimentos.updateMany({
      where: {
        cd_atendimento: {
          in: exameAtendimento.map((item) => item.cd_atendimento),
        },
      },
      data: {
        ds_senha: dsSenha,
        cd_senha: senha.cd_senha,
        dt_hora_senha: dateNow,
        cd_funcionario: FUNCIONARIO
      },
    })

    return senha
  }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 10000 }))
  flowAudit('senha_e_vinculo_confirmados', 'emissao', { cd_senha: result.cd_senha, nr_senha: result.nr_senha, atendimentos: exameAtendimento.map(item => item.cd_atendimento), outcome: 'CONCLUIDO', code: 'TICKET_COMMITTED' })
  return result
}
