"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pacientesRoute = pacientesRoute;
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
async function pacientesRoute(fastify) {
    fastify.get("/clinux/pacientes", async (request, reply) => {
        const bodySchema = zod_1.z.object({
            cd_paciente: zod_1.z.string().trim().optional(),
            ds_paciente: zod_1.z.string().trim().min(1).optional(),
            dt_nascimento: zod_1.z.string().trim().min(1).optional(),
            ds_cpf: zod_1.z.string().trim().min(1).optional()
        });
        try {
            const { cd_paciente, ds_paciente, dt_nascimento, ds_cpf } = bodySchema.parse(request.query ?? {});
            // Se nada foi enviado, retorne lista vazia
            if (cd_paciente === undefined && ds_paciente === undefined && dt_nascimento === undefined && ds_cpf === undefined) {
                return reply.send([]);
            }
            // Monta o where somente com os campos presentes
            const where = {};
            if (typeof cd_paciente === "string") {
                where.cd_paciente = parseInt(cd_paciente);
            }
            if (ds_paciente) {
                where.ds_paciente = { startsWith: ds_paciente, mode: "insensitive" };
            }
            if (dt_nascimento) {
                where.dt_nascimento = dt_nascimento;
            }
            if (ds_cpf) {
                where.ds_cpf = ds_cpf;
            }
            const pacientes = await prismaDB_1.prisma.pacientes.findMany({
                where,
                select: { ds_paciente: true, dt_nascimento: true, cd_paciente: true },
                orderBy: { ds_paciente: "asc" },
            });
            return reply.send(pacientes);
        }
        catch (err) {
            // Erros de validação do Zod ou outros
            return reply.status(400).send({
                error: "Requisição inválida",
                details: err?.errors ?? String(err),
            });
        }
    });
    fastify.post("/clinux/pacientes", async (request, reply) => {
        const bodySchema = zod_1.z.object({
            ds_paciente: zod_1.z.string(),
            dt_nascimento: zod_1.z.string().trim().min(1).optional()
        });
        try {
            const { ds_paciente, dt_nascimento } = bodySchema.parse(request.body ?? {});
            const pacientes = await prismaDB_1.prisma.pacientes.create({
                data: { ds_paciente: ds_paciente.toUpperCase(), dt_nascimento, cd_funcionario: 50 },
                select: { ds_paciente: true, dt_nascimento: true, cd_paciente: true },
            });
            return reply.send(pacientes);
        }
        catch (err) {
            // Erros de validação do Zod ou outros
            return reply.status(400).send({
                error: "Requisição inválida",
                details: err?.errors ?? String(err),
            });
        }
    });
}
