"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentosRoute = documentosRoute;
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
async function documentosRoute(fastify) {
    fastify.post('/clinux/documentos', async (request, reply) => {
        const createbody = zod_1.z.object({ cd_atendimento: zod_1.z.number().optional().transform(value => value || undefined) });
        const { cd_atendimento } = createbody.parse(request.body);
        const documentos = await prismaDB_1.prisma.atendimentos_documentos.findMany({
            where: { cd_atendimento: cd_atendimento }, select: { atendimentos_documentos_tipos: { select: { ds_tipo: true } }, cd_documento: true, ds_arquivo: true, dt_documento: true, dt_scanner: true }
        });
        if (documentos.length < 1) {
            return reply.send([]);
        }
        else {
            return reply.send(documentos);
        }
    });
}
