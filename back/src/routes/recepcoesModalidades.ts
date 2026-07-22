import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PrismaLog } from "../../config/prismalog";

const servicoSchema = z.enum(["B", "C", "D"]);

export async function recepcoesModalidadesRoute(fastify: FastifyInstance) {

    // LISTAR - permite filtrar por serviço: ?servico=ATENDIMENTO
    fastify.get("/clinux/recepcoes-modalidades", async (request, reply) => {
        const query = z.object({
            servico: servicoSchema.optional(),
        }).parse(request.query);

        const lista = await PrismaLog.recepcoes_modalidades.findMany({
            where: query.servico ? { servico: query.servico } : undefined,
            orderBy: [
                { servico: "asc" },
                { ds_modalidade: "asc" },
            ],
        });

        return reply.send(lista);
    });

    // BUSCAR POR MODALIDADE E SERVIÇO
    fastify.get(
        "/clinux/recepcoes-modalidades/:cd_modalidade/:servico",
        async (request, reply) => {
            const params = z.object({
                cd_modalidade: z.coerce.number(),
                servico: servicoSchema,
            }).parse(request.params);

            const recepcao = await PrismaLog.recepcoes_modalidades.findUnique({
                where: {
                    cd_modalidade_servico: {
                        cd_modalidade: params.cd_modalidade,
                        servico: params.servico,
                    },
                },
            });

            return reply.send(recepcao);
        },
    );

    // CADASTRAR
    fastify.post("/clinux/recepcoes-modalidades", async (request, reply) => {
        const body = z.object({
            cd_modalidade: z.number().int().positive(),
            ds_modalidade: z.string().trim().min(1).max(150),
            servico: servicoSchema,
            recepcao: z.string().trim().min(1).max(100),
            localizacao: z.string().trim().max(100).optional(),
            ativo: z.boolean().default(true),
        });

        const dados = body.parse(request.body);

        const cadastro = await PrismaLog.recepcoes_modalidades.create({
            data: dados,
        });

        return reply.code(201).send(cadastro);
    });

    // EDITAR
    fastify.put("/clinux/recepcoes-modalidades/:id", async (request, reply) => {
        const params = z.object({
            id: z.coerce.number().int().positive(),
        });

        const body = z.object({
            cd_modalidade: z.number().int().positive(),
            ds_modalidade: z.string().trim().min(1).max(150),
            servico: servicoSchema,
            recepcao: z.string().trim().min(1).max(100),
            localizacao: z.string().trim().max(100).optional(),
            ativo: z.boolean(),
        });

        const { id } = params.parse(request.params);
        const dados = body.parse(request.body);

        const atualizado = await PrismaLog.recepcoes_modalidades.update({
            where: { id },
            data: dados,
        });

        return reply.send(atualizado);
    });

    // EXCLUIR
    fastify.delete("/clinux/recepcoes-modalidades/:id", async (request, reply) => {
        const params = z.object({
            id: z.coerce.number().int().positive(),
        });

        const { id } = params.parse(request.params);

        await PrismaLog.recepcoes_modalidades.delete({
            where: { id },
        });

        return reply.send({ success: true });
    });
}