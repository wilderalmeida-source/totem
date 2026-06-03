import { FastifyInstance } from "fastify"
import { prisma } from '../../config/prismaDB'
export async function medicosRoute(fastify: FastifyInstance) {
    fastify.get('/clinux/medicos', async () => {
        const medicos = await prisma.medicos.findMany({ where: { NOT: { ds_guerra: null } }, select: { cd_medico: true, ds_guerra: true } })
        return (medicos)
    })
}