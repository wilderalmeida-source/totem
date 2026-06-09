import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
import { gerarSenhaService } from '../services/senhas/gerar-senha.service'
// Função para mascarar o nome mantendo apenas o Primeiro e Último visíveis
function aplicarMascaraNome(nomeCompleto: string | null | undefined): string {
  if (!nomeCompleto) return "Paciente Oculto";

  const partes = nomeCompleto.trim().split(/\s+/);

  if (partes.length === 1) {
    return partes[0];
  }

  const primeiroNome = partes[0];

  // Se tiver apenas 2 nomes (Ex: João Silva) exibe ambos.
  // Se tiver 3 ou mais, oculta o meio com asteriscos fixos.
  return `${primeiroNome} ***`;
}
export async function senhaRoute(fastify: FastifyInstance) {
  fastify.get('/clinux/senhas', async (request, reply) => {
    const createbody = z.object({
      filtroControle: z.string().optional(),
    })

    try {
      const { filtroControle } = createbody.parse(request.query)

      const dateInitial = new Date()
      dateInitial.setUTCHours(dateInitial.getUTCHours() - 3)
      dateInitial.setHours(0, 1, 0, 0)

      const dateFinal = new Date()
      dateFinal.setUTCHours(dateFinal.getUTCHours() - 3)
      dateFinal.setHours(23, 59, 59, 999)

      const senhasRawORM = await prisma.atendimentos_senhas.findMany({
        where: {
          dt_entrada: {
            gte: dateInitial,
            lte: dateFinal,
          },
          ds_opcao: {
            not: 'C',
          },
        },
        orderBy: {
          dt_entrada: 'desc',
        },
        include: {
          atendimentos: {
            select: {
              cd_atendimento: true,
              ds_senha: true,
              dt_hora_senha: true,
              cd_paciente: true,
              nr_controle: true,
              pacientes_atendimentos_cd_pacienteTopacientes: {
                select: {
                  ds_paciente: true,
                  cd_paciente: true,
                },
              },
            },
          },
        },
      })

      type SenhaEntregaResult = {
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
      }

      let senhasEntregaRaw: SenhaEntregaResult[] = []

      const tail = (filtroControle ?? '').replace(/\D/g, '')

      if (tail.length > 0) {
        const modBase = 10 ** tail.length
        const target = Number(tail)

        senhasEntregaRaw = await prisma.$queryRaw<SenhaEntregaResult[]>`
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
          LEFT JOIN atendimentos a ON a.cd_atendimento = s.nr_controle
          LEFT JOIN pacientes p ON p.cd_paciente = a.cd_paciente
          WHERE s.dt_entrada >= ${dateInitial}
            AND s.dt_entrada <= ${dateFinal}
            AND s.nr_controle IS NOT NULL
            AND s.ds_opcao = 'C'
            AND a.cd_atendimento IS NOT NULL
            AND (a.cd_atendimento % ${modBase}) = ${target}
          ORDER BY s.dt_entrada DESC
        `
      } else {
        senhasEntregaRaw = await prisma.$queryRaw<SenhaEntregaResult[]>`
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
          LEFT JOIN atendimentos a ON a.cd_atendimento = s.nr_controle
          LEFT JOIN pacientes p ON p.cd_paciente = a.cd_paciente
          WHERE s.dt_entrada >= ${dateInitial}
            AND s.dt_entrada <= ${dateFinal}
            AND s.nr_controle IS NOT NULL
            AND s.ds_opcao = 'C'
          ORDER BY s.dt_entrada DESC
        `
      }

      const mascararObjeto = (item: any) => {
        const objetoTratado = JSON.parse(JSON.stringify(item))

        const varrerEMascarar = (obj: any) => {
          for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              varrerEMascarar(obj[key])
            } else if (key === 'ds_paciente' && typeof obj[key] === 'string') {
              obj[key] = aplicarMascaraNome(obj[key])
            }
          }
        }

        varrerEMascarar(objetoTratado)

        return objetoTratado
      }

      const senhas = senhasRawORM.map(mascararObjeto)

      const senhasnr = senhasEntregaRaw.map((senha) => ({
        ...senha,
        ds_paciente: senha.ds_paciente
          ? aplicarMascaraNome(senha.ds_paciente)
          : null,
      }))

      return reply.send({
        senhas,
        senhasnr,
        senhasRawQuery: senhasEntregaRaw
      })
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Requisição inválida',
        details: err?.errors ?? String(err),
      })
    }
  })
  ////////////////////////////////////////////////CADASTRA SENHAS/////////////////////////////
  fastify.post('/clinux/senhas', async (request, reply) => {
    const createbody = z.object({
      cd_paciente: z.number(),
      servico: z.string(),
      preferencial: z.number().nullable().optional(),
      cd_modalidade: z.number().optional(),
    })

    try {
      const body = createbody.parse(request.body)
      console.log('GERAR SENHA POST:', body)
      const senha = await gerarSenhaService(body)

      return reply.send(senha)
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Erro ao gerar senha',
        details: err?.errors ?? String(err),
      })
    }
  })
}