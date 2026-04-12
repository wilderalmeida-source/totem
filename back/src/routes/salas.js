"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salaRoute = salaRoute;
const prismaDB_1 = require("../../config/prismaDB");
async function salaRoute(fastify) {
    fastify.get('/clinux/salas', async () => {
        const salas = await prismaDB_1.prisma.salas.findMany({ select: { cd_sala: true, ds_sala: true } });
        return (salas);
    });
}
