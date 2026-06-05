import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
export async function modalidadesRoute(fastify: FastifyInstance) {
  //modalidades
  fastify.get('/clinux/modalidades', async (request, reply) => {
    const createbody = z.object({
      cd_modalidade: z.string().optional(),
    })
    const { cd_modalidade } = createbody.parse(request.query)
    const where: any = {};
    if (cd_modalidade && cd_modalidade != null && cd_modalidade != 'null') {
      const int_modalidade = parseInt(cd_modalidade)
      if (int_modalidade == 10000) {
        where.NOT = { OR: [{ ds_modalidade: { contains: 'totem', mode: 'insensitive' } }, { ds_modalidade: { contains: 'migracao', mode: 'insensitive' } }] };
      } else {
        where.cd_modalidade = int_modalidade
      }
      const modalidades = await prisma.modalidades.findMany({
        where
      })
      if (modalidades.length < 1) {
        return reply.send([{ cd_modalidade: process.env.IDMODALIDADE }])
      }
      return reply.send(modalidades)
    }
    else {
      return reply.send([{ cd_modalidade: process.env.IDMODALIDADE }])
    }
  })
}