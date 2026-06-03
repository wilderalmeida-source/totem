import { FastifyInstance } from "fastify"
import { prisma } from '../../config/prismaDB'
export async function procedimentosRoute(fastify: FastifyInstance) {
      const dateInitial = new Date()
      dateInitial.setHours(0, 0, 0, 0)
      //Procedimentos para Histórico na tela inicial do totem
      fastify.get('/clinux/procedimentos', async (request, reply) => {
            const procedimentos = await prisma.procedimentos.findMany({
                  where: { cd_modalidade: 5 },
                  select: {
                        cd_procedimento: true,
                        ds_procedimento: true,
                        cd_modalidade: true,
                        modalidades: { select: { ds_modalidade: true } }
                  },
            })
            return reply.send(procedimentos);
      })
}