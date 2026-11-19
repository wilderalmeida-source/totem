import { FastifyInstance } from "fastify"
import { clientErrorDetails } from '../lib/client-error'
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
import { gerarSenhaService } from '../services/senhas/gerar-senha.service'
import { sharedHistory } from '../lib/shared-history'
import { flowAudit } from '../lib/flow-audit'
import { formatarNome, type FormatoNome } from '../lib/nome-privacidade'
import { lerPrivacidade } from '../lib/privacidade'
// Histórico público do totem: o formato do nome vem da tela Temas (padrão: primeiro e último nome).
function aplicarMascaraNome(nomeCompleto: string | null | undefined, formato: FormatoNome = 'primeiro_ultimo'): string {
  if (!nomeCompleto) return "Paciente Oculto";
  return formatarNome(nomeCompleto, formato) || "Paciente Oculto";
}
export async function senhaRoute(fastify: FastifyInstance) {
  const history = sharedHistory<unknown>()
  fastify.get('/clinux/senhas', async (request, reply) => {
    const createbody = z.object({
      filtroControle: z.string().optional(),
    })

    try {
      const { filtroControle } = createbody.parse(request.query)
      const privacidade = await lerPrivacidade()
      // A clínica escolheu não mostrar o histórico: nada de nomes sai daqui.
      if (privacidade.historicoNome === 'oculto') { reply.header('Cache-Control', 'no-store'); return reply.send({ senhas: [], senhasnr: [], oculto: true }) }
      const formato = privacidade.historicoNome
      const load = async () => {

      const dateInitial = new Date()
      dateInitial.setUTCHours(dateInitial.getUTCHours() - 3)
      dateInitial.setUTCHours(0, 1, 0, 0)

      const dateFinal = new Date()
      dateFinal.setUTCHours(dateFinal.getUTCHours() - 3)
      dateFinal.setUTCHours(23, 59, 59, 999)

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
              obj[key] = aplicarMascaraNome(obj[key], formato)
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
          ? aplicarMascaraNome(senha.ds_paciente, formato)
          : null,
      }))

      return {
        senhas,
        senhasnr,
      }
      }
      reply.header('Cache-Control', 'no-store')
      return reply.send(filtroControle ? await load() : await history(load, formato))
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Requisição inválida',
        ...clientErrorDetails(err, request.log),
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
      flowAudit('emissao_recebida_backend', 'emissao', { cd_paciente: body.cd_paciente, servico: body.servico, cd_modalidade: body.cd_modalidade })
      const senha = await gerarSenhaService(body)

      return reply.send(senha)
    } catch (err: any) {
      const code = typeof err?.code === 'string' && /^[A-Z0-9_]{1,50}$/.test(err.code) ? err.code : 'ISSUANCE_ERROR'
      flowAudit('emissao_falhou_backend', 'emissao', { code, outcome: 'DESCONHECIDO', status: 400 })
      return reply.status(400).send({
        error: 'Erro ao gerar senha',
        ...clientErrorDetails(err, request.log),
      })
    }
  })
}
