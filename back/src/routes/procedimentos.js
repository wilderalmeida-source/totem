"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.procedimentosRoute = procedimentosRoute;
const prismaDB_1 = require("../../config/prismaDB");
async function procedimentosRoute(fastify) {
    const dateInitial = new Date();
    dateInitial.setHours(0, 0, 0, 0);
    //Procedimentos para Histórico na tela inicial do totem
    fastify.get('/clinux/procedimentos', async (request, reply) => {
        const procedimentos = await prismaDB_1.prisma.procedimentos.findMany({
            where: { cd_modalidade: 5 },
            select: {
                cd_procedimento: true,
                ds_procedimento: true,
                cd_modalidade: true,
                modalidades: { select: { ds_modalidade: true } }
            },
        });
        return reply.send(procedimentos);
    });
}
