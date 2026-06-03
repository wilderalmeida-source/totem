import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
export async function documentosRoute(fastify: FastifyInstance) {
  fastify.post('/clinux/documentos', async (request, reply) => {
    const createbody = z.object({ cd_atendimento: z.number().optional().transform(value => value || undefined) })
    const { cd_atendimento } = createbody.parse(request.body)
    const documentos = await prisma.atendimentos_documentos.findMany({
      where: { cd_atendimento: cd_atendimento }, select: { atendimentos_documentos_tipos: { select: { ds_tipo: true } }, cd_documento: true, ds_arquivo: true, dt_documento: true, dt_scanner: true }
    })
    if (documentos.length < 1) {
      return reply.send([])
    } else {
      return reply.send(documentos)
    }
  })
}