"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modalidadesRoute = modalidadesRoute;
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
const cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutos
async function modalidadesRoute(fastify) {
    fastify.get('/clinux/modalidades', async (request, reply) => {
        const createbody = zod_1.z.object({
            cd_modalidade: zod_1.z.string().optional(),
        });
        const { cd_modalidade } = createbody.parse(request.query);
        if (!cd_modalidade || cd_modalidade === 'null') {
            return reply.send([{ cd_modalidade: process.env.IDMODALIDADE }]);
        }
        const cacheKey = `modalidades:${cd_modalidade}`;
        const cached = cache.get(cacheKey);
        if (cached && cached.expira > Date.now()) {
            return reply.send(cached.data);
        }
        const int_modalidade = parseInt(cd_modalidade);
        const where = {};
        if (int_modalidade === 10000) {
            where.NOT = {
                OR: [
                    { ds_modalidade: { contains: 'totem', mode: 'insensitive' } },
                    { ds_modalidade: { contains: 'migracao', mode: 'insensitive' } },
                ],
            };
        }
        else {
            where.cd_modalidade = int_modalidade;
        }
        const modalidades = await prismaDB_1.prisma.modalidades.findMany({
            where,
            select: {
                cd_modalidade: true,
                ds_modalidade: true,
            },
        });
        const resultado = modalidades.length < 1
            ? [{ cd_modalidade: process.env.IDMODALIDADE }]
            : modalidades;
        cache.set(cacheKey, { data: resultado, expira: Date.now() + TTL_MS });
        return reply.send(resultado);
    });
}
