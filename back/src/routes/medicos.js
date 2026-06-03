"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicosRoute = medicosRoute;
const prismaDB_1 = require("../../config/prismaDB");
async function medicosRoute(fastify) {
    fastify.get('/clinux/medicos', async () => {
        const medicos = await prismaDB_1.prisma.medicos.findMany({ where: { NOT: { ds_guerra: null } }, select: { cd_medico: true, ds_guerra: true } });
        return (medicos);
    });
}
