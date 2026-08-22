"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guichesRoute = guichesRoute;
const zod_1 = require("zod");
const prismalog_1 = require("../../config/prismalog");
async function guichesRoute(fastify) {
    fastify.get("/clinux/guiches", async () => {
        return prismalog_1.PrismaLog.guiches.findMany({
            orderBy: { numero: "asc" },
        });
    });
    fastify.post("/clinux/guiches", async (request, reply) => {
        const bodySchema = zod_1.z.object({
            numero: zod_1.z.string().min(1),
            nome: zod_1.z.string().min(1),
            ativo: zod_1.z.boolean().default(true),
        });
        const body = bodySchema.parse(request.body);
        const guiche = await prismalog_1.PrismaLog.guiches.upsert({
            where: { numero: body.numero.padStart(2, "0") },
            create: {
                numero: body.numero.padStart(2, "0"),
                nome: body.nome,
                ativo: body.ativo,
            },
            update: {
                nome: body.nome,
                ativo: body.ativo,
            },
        });
        return reply.status(201).send(guiche);
    });
    fastify.put("/clinux/guiches/:id", async (request) => {
        const paramsSchema = zod_1.z.object({
            id: zod_1.z.coerce.number(),
        });
        const bodySchema = zod_1.z.object({
            numero: zod_1.z.string().min(1),
            nome: zod_1.z.string().min(1),
            ativo: zod_1.z.boolean(),
        });
        const { id } = paramsSchema.parse(request.params);
        const body = bodySchema.parse(request.body);
        return prismalog_1.PrismaLog.guiches.update({
            where: { id },
            data: {
                numero: body.numero.padStart(2, "0"),
                nome: body.nome,
                ativo: body.ativo,
            },
        });
    });
    fastify.delete("/clinux/guiches/:id", async (request) => {
        const paramsSchema = zod_1.z.object({
            id: zod_1.z.coerce.number(),
        });
        const { id } = paramsSchema.parse(request.params);
        return prismalog_1.PrismaLog.guiches.delete({
            where: { id },
        });
    });
}
