"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modalidadesRoute = modalidadesRoute;
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
async function modalidadesRoute(fastify) {
    //modalidades
    fastify.get('/clinux/modalidades', async (request, reply) => {
        const createbody = zod_1.z.object({
            cd_modalidade: zod_1.z.string().optional(),
        });
        const { cd_modalidade } = createbody.parse(request.query);
        if (cd_modalidade) {
            const int_modalidade = parseInt(cd_modalidade);
            const modalidades = await prismaDB_1.prisma.modalidades.findMany({
                where: { cd_modalidade: int_modalidade }
            });
            if (modalidades.length < 1) {
                return reply.send([]);
            }
            return reply.send(modalidades);
        }
        else {
            return reply.send([{ cd_modalidade: process.env.IDMODALIDADE }]);
        }
    });
}
