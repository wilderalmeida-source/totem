import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PrismaLog } from "../../config/prismalog";

export async function guichesRoute(fastify: FastifyInstance) {
    fastify.get("/clinux/guiches", async () => {
        return PrismaLog.guiches.findMany({
            orderBy: { numero: "asc" },
        });
    });

    fastify.post("/clinux/guiches", async (request, reply) => {
        const bodySchema = z.object({
            numero: z.string().min(1),
            nome: z.string().min(1),
            ativo: z.boolean().default(true),
        });

        const body = bodySchema.parse(request.body);

        const guiche = await PrismaLog.guiches.upsert({
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
        const paramsSchema = z.object({
            id: z.coerce.number(),
        });

        const bodySchema = z.object({
            numero: z.string().min(1),
            nome: z.string().min(1),
            ativo: z.boolean(),
        });

        const { id } = paramsSchema.parse(request.params);
        const body = bodySchema.parse(request.body);

        return PrismaLog.guiches.update({
            where: { id },
            data: {
                numero: body.numero.padStart(2, "0"),
                nome: body.nome,
                ativo: body.ativo,
            },
        });
    });

    fastify.delete("/clinux/guiches/:id", async (request) => {
        const paramsSchema = z.object({
            id: z.coerce.number(),
        });

        const { id } = paramsSchema.parse(request.params);

        return PrismaLog.guiches.delete({
            where: { id },
        });
    });
}