import { FastifyInstance } from "fastify"
import { prisma } from '../../config/prismaDB'
export async function salaRoute(fastify: FastifyInstance) {
    fastify.get('/clinux/salas',async () => {
        const salas = await prisma.salas.findMany({ select: { cd_sala: true, ds_sala: true } })
        return (salas)
    })
}