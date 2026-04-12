import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
export async function senhaRoute(fastify: FastifyInstance) {
  // Senhas para Histórico na tela inicial do totem
  fastify.get('/clinux/senhas', async (request, reply) => {
    const createbody = z.object({
      filtroControle: z.string().optional(),
    })
    const dateInitial = new Date()
    dateInitial.setHours(-3, 0, 0, 0)
    const { filtroControle } = createbody.parse(request.query)

    const senhas = await prisma.atendimentos_senhas.findMany({
      where: { dt_entrada: { gte: dateInitial } },
      orderBy: { dt_entrada: 'desc' },
      include: {
        atendimentos: {
          select: {
            cd_atendimento: true,
            ds_senha: true,
            dt_hora_senha: true,
            cd_paciente: true,
            nr_controle: true,
            pacientes_atendimentos_cd_pacienteTopacientes: {
              select: { ds_paciente: true, cd_paciente: true },
            },
          },
        },
      },
    })

    // Normaliza o filtro (somente dígitos)
    const tail = (filtroControle ?? "").replace(/\D/g, "")
    let senhasnr: Array<{
      cd_senha: number
      nr_controle: number | null
      dt_entrada: Date
      ds_opcao: string | null
      ds_fila: string | null
      ds_local: string | null
      dt_saida: Date | null

      cd_atendimento: number | null
      a_nr_controle: number | null
      ds_senha: string | null
      dt_hora_senha: Date | null
      cd_paciente: number | null
      ds_paciente: string | null
    }> = []

    if (tail.length > 0) {
      // Com filtro: adiciona a condição do resto (%)
      const modBase = 10 ** tail.length
      const target = Number(tail)

      senhasnr = await prisma.$queryRaw`
        SELECT
          s.cd_senha,
          s.nr_controle,
          s.dt_entrada,
          s.ds_opcao,
          s.ds_fila,
          s.ds_local,
          s.dt_saida,

          a.cd_atendimento,
          a.nr_controle AS a_nr_controle,
          a.ds_senha,
          a.dt_hora_senha,
          a.cd_paciente,
          p.ds_paciente
        FROM atendimentos_senhas s
        LEFT JOIN atendimentos a ON a.nr_controle = s.nr_controle
        LEFT JOIN pacientes   p ON p.cd_paciente = a.cd_paciente
        WHERE s.dt_entrada >= ${dateInitial}
          AND a.cd_atendimento IS NOT NULL
          AND (a.cd_atendimento % ${modBase}) = ${target}
        ORDER BY s.dt_entrada DESC
      `
    } else {
      // Sem filtro: query base
      senhasnr = await prisma.$queryRaw`
        SELECT
          s.cd_senha,
          s.nr_controle,
          s.dt_entrada,
          s.ds_opcao,
          s.ds_fila,
          s.ds_local,
          s.dt_saida,

          a.cd_atendimento,
          a.nr_controle AS a_nr_controle,
          a.ds_senha,
          a.dt_hora_senha,
          a.cd_paciente,
          p.ds_paciente
        FROM atendimentos_senhas s
        LEFT JOIN atendimentos a ON a.nr_controle = s.nr_controle
        LEFT JOIN pacientes   p ON p.cd_paciente = a.cd_paciente
        WHERE s.dt_entrada >= ${dateInitial}
          AND s.nr_controle IS NOT NULL
          AND a.cd_atendimento = s.nr_controle
        ORDER BY s.dt_entrada DESC
      `
    }

    // Respostas consistentes

    return reply.send({ senhasnr, senhas })
  })

  fastify.post('/clinux/senhas', async (request, reply) => {
    const createbody = z.object({
      nr_senha: z.number().optional(),
      sn_preferencial: z.boolean(),
      ds_opcao: z.string(),
      nr_modalidade: z.number(),
      ds_local: z.string(),
      ds_fila: z.string(),
      method: z.string(),
      sn_especial: z.boolean(),
      nr_controle: z.number().optional()

    })
    const {
      ds_opcao,
      nr_modalidade,
      nr_senha,
      sn_preferencial,
      ds_fila,
      ds_local,
      nr_controle,
      sn_especial,
      method,
    } = createbody.parse(request.body)

    // Ajuste simples de fuso (UTC-3)
    const dateNow = new Date(Date.now() - 3 * 60 * 60 * 1000)

    if (method === "C") {
      const nr_senhaNew = nr_controle ? nr_controle % 10000 : null
      const senhas = await prisma.atendimentos_senhas.create({
        data: {
          dt_entrada: dateNow,
          ds_opcao,
          nr_empresa: 1,
          nr_modalidade,
          nr_senha: nr_senhaNew,
          nr_controle,
          sn_preferencial,
          sn_especial,
          sn_preparo: false,
          ds_painel: "192.168.1.103",
          ds_local,
          ds_fila,
          cd_funcionario: 50
        },
      })
      return reply.send(senhas)
    } else {
      const senhas = await prisma.atendimentos_senhas.create({
        data: {
          dt_entrada: dateNow,
          ds_opcao,
          nr_empresa: 1,
          nr_modalidade,
          nr_senha,
          sn_preferencial,
          sn_especial,
          sn_preparo: false,
          ds_painel: "192.168.1.103",
          ds_local,
          ds_fila,
          cd_funcionario: 50
        },
      })
      return reply.send(senhas)
    }
  })
}
