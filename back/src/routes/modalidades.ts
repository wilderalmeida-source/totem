import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
export async function modalidadesRoute(fastify: FastifyInstance) {
  //modalidades
  fastify.get('/clinux/modalidades', async (request, reply) => {
    const createbody = z.object({
      cd_modalidade: z.string(),
    })
    const { cd_modalidade } = createbody.parse(request.query)
    const int_modalidade = parseInt(cd_modalidade)
    const modalidades = await prisma.modalidades.findMany({
      where: { cd_modalidade: int_modalidade }
    })
    if (modalidades.length < 1) {
      return reply.send([])
    }
    return reply.send(modalidades)
  })
}