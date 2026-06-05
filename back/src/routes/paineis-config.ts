import { FastifyInstance } from "fastify";
import {PrismaLog} from "./../../config/prismalog"
export async function pacientesRoute(fastify: FastifyInstance) {
fastify.get('/paineis-config', async () => {
  const config = await PrismaLog.configuracaoPainel.findUnique({
    where: { id: 1 },
  })

  if (!config) {
    return {
      ativo: false,
      paineis: [],
    }
  }

  return {
    ativo: config.ativo,
    paineis: config.paineis,
  }
})

fastify.post('/paineis-config', async (request, reply) => {
  const { ativo, paineis } = request.body as any

  const config = await PrismaLog.configuracaoPainel.upsert({
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

  return reply.send(config)
})}