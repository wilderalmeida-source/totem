import { prisma } from '../../../config/prismaDB'

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
  const cdSalaTotem = process.env.IDSALA
    ? Number(process.env.IDSALA)
    : null

  if (!cdSalaTotem) {
    throw new Error('IDSALA não configurado no .env')
  }

  return prisma.atendimentos.create({
    data: {
      cd_paciente,
      cd_sala: cdSalaTotem,
      dt_data: getHojeBrasil(),
      ds_status: 2,
    },
    include: {
      salas: true,
      exames: true,
    },
  })
}