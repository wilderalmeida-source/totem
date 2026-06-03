import { FastifyInstance } from "fastify"
import fs from 'fs'
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
export async function arquivoRoute(fastify: FastifyInstance) {
  fastify.get('/clinux/arquivo', async (request, reply) => {

    const createbody = z.object({ cd_documento: z.string().optional().transform(value => value || undefined) })
    const { cd_documento } = createbody.parse(request.query)
    if (cd_documento) {
      const arquivo = await prisma.atendimentos_documentos.findUnique({
        where: { cd_documento: parseInt(cd_documento) }
      })
      if (!arquivo) {
        return reply.send([])
      } else {
        if (arquivo.dt_documento) {
          const ano = arquivo.dt_documento.getFullYear()
          const mes = ("0" + (arquivo.dt_documento.getMonth() + 1)).slice(-2)
          const dia = ("0" + arquivo.dt_documento.getDate()).slice(-2)
          const file = fs.readFileSync(`/mnt/CLINUX/atendimentos_documentos/${ano}/${mes}/${dia}/${cd_documento}`)
          const myStream = file.buffer
          reply.type('application/pdf')
          return reply.send(file)
        }
      }
    }
  })
}