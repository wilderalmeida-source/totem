"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recepcoesModalidadesRoute = recepcoesModalidadesRoute;
const zod_1 = require("zod");
const prismalog_1 = require("../../config/prismalog");
const servicoSchema = zod_1.z.enum(["B", "C", "D"]);
async function recepcoesModalidadesRoute(fastify) {
    // LISTAR - permite filtrar por serviço: ?servico=ATENDIMENTO
    fastify.get("/clinux/recepcoes-modalidades", async (request, reply) => {
        const query = zod_1.z.object({
            servico: servicoSchema.optional(),
        }).parse(request.query);
        const lista = await prismalog_1.PrismaLog.recepcoes_modalidades.findMany({
            where: query.servico ? { servico: query.servico } : undefined,
            orderBy: [
                { servico: "asc" },
                { ds_modalidade: "asc" },
            ],
        });
        return reply.send(lista);
    });
    // BUSCAR POR MODALIDADE E SERVIÇO
    fastify.get("/clinux/recepcoes-modalidades/:cd_modalidade/:servico", async (request, reply) => {
        const params = zod_1.z.object({
            cd_modalidade: zod_1.z.coerce.number(),
            servico: servicoSchema,
        }).parse(request.params);
        const recepcao = await prismalog_1.PrismaLog.recepcoes_modalidades.findUnique({
            where: {
                cd_modalidade_servico: {
                    cd_modalidade: params.cd_modalidade,
                    servico: params.servico,
                },
            },
        });
        return reply.send(recepcao);
    });
    // CADASTRAR
    fastify.post("/clinux/recepcoes-modalidades", async (request, reply) => {
        const body = zod_1.z.object({
            cd_modalidade: zod_1.z.number().int().positive(),
            ds_modalidade: zod_1.z.string().trim().min(1).max(150),
            servico: servicoSchema,
            recepcao: zod_1.z.string().trim().min(1).max(100),
            localizacao: zod_1.z.string().trim().max(100).optional(),
            ativo: zod_1.z.boolean().default(true),
        });
        const dados = body.parse(request.body);
        const cadastro = await prismalog_1.PrismaLog.recepcoes_modalidades.create({
            data: dados,
        });
        return reply.code(201).send(cadastro);
    });
    // EDITAR
    fastify.put("/clinux/recepcoes-modalidades/:id", async (request, reply) => {
        const params = zod_1.z.object({
            id: zod_1.z.coerce.number().int().positive(),
        });
        const body = zod_1.z.object({
            cd_modalidade: zod_1.z.number().int().positive(),
            ds_modalidade: zod_1.z.string().trim().min(1).max(150),
            servico: servicoSchema,
            recepcao: zod_1.z.string().trim().min(1).max(100),
            localizacao: zod_1.z.string().trim().max(100).optional(),
            ativo: zod_1.z.boolean(),
        });
        const { id } = params.parse(request.params);
        const dados = body.parse(request.body);
        const atualizado = await prismalog_1.PrismaLog.recepcoes_modalidades.update({
            where: { id },
            data: dados,
        });
        return reply.send(atualizado);
    });
    // EXCLUIR
    fastify.delete("/clinux/recepcoes-modalidades/:id", async (request, reply) => {
        const params = zod_1.z.object({
            id: zod_1.z.coerce.number().int().positive(),
        });
        const { id } = params.parse(request.params);
        await prismalog_1.PrismaLog.recepcoes_modalidades.delete({
            where: { id },
        });
        return reply.send({ success: true });
    });
}
