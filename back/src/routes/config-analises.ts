import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ESCOPO, TELAS, configAnaliseSchema, lerTodasConfigs, opcoesAnalise, salvarConfigAnalise } from '../lib/config-analises'

// Tela "Configurar analíticos": o que cada tela de análise considera (por ID do Clinux).
export async function configAnalisesRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/dashboard/config-analises', async () => {
    const [telas, opcoes] = await Promise.all([lerTodasConfigs(), opcoesAnalise()])
    return { telas, escopo: ESCOPO, opcoes }
  })

  fastify.put('/clinux/dashboard/config-analises/:tela', async (request, reply) => {
    const tela = z.enum(TELAS).safeParse((request.params as { tela?: string }).tela)
    if (!tela.success) return reply.code(400).send({ error: 'Tela inválida.' })
    // Corpo null = voltar ao padrão.
    const corpo = request.body === null || (request.body as { padrao?: boolean })?.padrao === true ? null : configAnaliseSchema.safeParse(request.body)
    if (corpo && !corpo.success) return reply.code(400).send({ error: 'Configuração inválida.' })
    await salvarConfigAnalise(tela.data, corpo ? corpo.data : null)
    return { ok: true, telas: await lerTodasConfigs() }
  })
}
