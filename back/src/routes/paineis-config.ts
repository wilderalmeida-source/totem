import { FastifyInstance } from 'fastify'
import { PrismaLog } from '../../config/prismalog'
import { z } from 'zod'
import { configPainelCache } from '../lib/painel-caches'

type ServicoPainel = 'atendimento' | 'marcacao' | 'resultado'

function ipValido(ip: string) {
  const partes = ip.split('.')
  if (partes.length !== 4) return false

  return partes.every((parte) => {
    if (parte === '') return false
    const numero = Number(parte)
    return numero >= 0 && numero <= 255
  })
}

// Estrutura enviada pela tela Setup Painel. Antes qualquer JSON era gravado e quebrava o roteamento das chamadas.
const modalidades = z.array(z.number().int().positive()).max(1000).default([])
const painelSchema = z.object({
  painel: z.number().int().min(1).max(99),
  ativo: z.boolean(),
  ip: z.string().trim().max(15).optional().default(''),
  atendimento: modalidades,
  marcacao: modalidades,
  resultado: modalidades,
  universal: z.object({ atendimento: z.boolean().optional(), marcacao: z.boolean().optional(), resultado: z.boolean().optional() }).optional().default({}),
})
const configSchema = z.object({ ativo: z.boolean(), paineis: z.array(painelSchema).max(50) })
  .refine(c => new Set(c.paineis.map(p => p.painel)).size === c.paineis.length, 'Número de painel repetido.')

export async function configuracaoPaineisRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/paineis-config', async () => {
    const config = await PrismaLog.configuracao_painel.findUnique({
      where: { id: 1 },
    })

    if (!config) {
      return {
        ativo: false,
        paineis: [],
        paineisAtivos: [],
      }
    }

    const paineis = config.paineis as any[]

    return {
      ativo: config.ativo,
      paineis,
      paineisAtivos: paineis.filter((painel) => painel.ativo),
    }
  })

  fastify.post('/clinux/paineis-config', async (request, reply) => {
    const parsed = configSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message === 'Número de painel repetido.' ? 'Número de painel repetido.' : 'Configuração dos painéis inválida.' })
    }
    const { ativo } = parsed.data
    const paineis: any[] = parsed.data.paineis

    const paineisAtivos = paineis.filter((painel) => painel.ativo)


    if (ativo && paineisAtivos.length < 1) {
      return reply.code(400).send({
        error: 'É necessário ativar pelo menos 1 painel.',
      })
    }

    for (const painel of paineisAtivos) {
      if (!painel.ip || !ipValido(painel.ip)) {
        return reply.code(400).send({
          error: `Informe um IP válido para o Painel ${painel.painel}.`,
        })
      }
    }

    const servicos: ServicoPainel[] = ['atendimento', 'marcacao', 'resultado']

    for (const servico of servicos) {
      const universais = paineisAtivos.filter(
        (painel) => painel.universal?.[servico]
      )

      if (universais.length > 1) {
        return reply.code(400).send({
          error: `O serviço ${servico} possui mais de um painel universal.`,
        })
      }

      if (universais.length === 1) {
        const outrosComModalidade = paineisAtivos.some(
          (painel) =>
            painel.painel !== universais[0].painel &&
            Array.isArray(painel[servico]) &&
            painel[servico].length > 0
        )

        if (outrosComModalidade) {
          return reply.code(400).send({
            error: `O serviço ${servico} está universal, mas outro painel possui modalidades.`,
          })
        }
      }

      const usadas = new Set<number>()

      for (const painel of paineisAtivos) {
        const lista = painel[servico] ?? []

        for (const modalidadeId of lista) {
          if (usadas.has(modalidadeId)) {
            return reply.code(400).send({
              error: `A modalidade ${modalidadeId} está repetida no serviço ${servico}.`,
            })
          }

          usadas.add(modalidadeId)
        }
      }
    }

    const config = await PrismaLog.configuracao_painel.upsert({
      where: { id: 1 },
      update: {
        ativo,
        paineis,
      },
      create: {
        id: 1,
        ativo,
        paineis,
      },
    })

    configPainelCache.clear()
    await fastify.recarregarCachePainel?.()

    return reply.send({
      message: 'Configuração salva com sucesso.',
      config,
    })
  })
}
