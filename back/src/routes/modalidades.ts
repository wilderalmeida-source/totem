import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'

const cache = new Map<string, { data: any; expira: number }>()
const TTL_MS = 5 * 60 * 1000 // 5 minutos

export async function modalidadesRoute(fastify: FastifyInstance) {
  fastify.get('/clinux/modalidades', async (request, reply) => {
    const createbody = z.object({
      cd_modalidade: z.string().optional(),
    })
    const { cd_modalidade } = createbody.parse(request.query)

    if (!cd_modalidade || cd_modalidade === 'null') {
      return reply.send([{ cd_modalidade: process.env.IDMODALIDADE }])
    }

    const cacheKey = `modalidades:${cd_modalidade}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expira > Date.now()) {
      return reply.send(cached.data)
    }

    const int_modalidade = parseInt(cd_modalidade)
    const where: any = {}

    if (int_modalidade === 10000) {
      where.NOT = {
        OR: [
          { ds_modalidade: { contains: 'totem', mode: 'insensitive' } },
          { ds_modalidade: { contains: 'migracao', mode: 'insensitive' } },
        ],
      }
    } else {
      where.cd_modalidade = int_modalidade
    }

    const modalidades = await prisma.modalidades.findMany({
      where,
      select: {
        cd_modalidade: true,
        ds_modalidade: true,
      },
    })

    const resultado = modalidades.length < 1
      ? [{ cd_modalidade: process.env.IDMODALIDADE }]
      : modalidades

    cache.set(cacheKey, { data: resultado, expira: Date.now() + TTL_MS })

    return reply.send(resultado)
  })
}