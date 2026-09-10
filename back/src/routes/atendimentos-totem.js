"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.atendimentosTotemRoute = atendimentosTotemRoute;
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
const search_validation_1 = require("../lib/search-validation");
async function atendimentosTotemRoute(fastify) {
    // Seleção por nascimento: sem procedimentos, contatos ou observações clínicas.
    fastify.get('/clinux/totem/pacientes-com-exames', async (request, reply) => {
        const parsed = zod_1.z.object({ dt_nascimento: search_validation_1.birthDate, ds_paciente: search_validation_1.patientName.optional() }).strict().safeParse(request.query);
        if (!parsed.success)
            return reply.code(400).send({ error: 'Filtros de paciente inválidos.' });
        const { dt_nascimento, ds_paciente } = parsed.data;
        const rows = await prismaDB_1.prisma.atendimentos.findMany({
            where: {
                dt_data: (0, search_validation_1.todayBrazil)(), ds_status: { in: [2, 3, 7] }, exames: { some: {} },
                pacientes_atendimentos_cd_pacienteTopacientes: {
                    dt_nascimento,
                    ...(ds_paciente ? { ds_paciente: { contains: ds_paciente, mode: 'insensitive' } } : {}),
                },
            },
            distinct: ['cd_paciente'],
            select: { cd_atendimento: true, pacientes_atendimentos_cd_pacienteTopacientes: { select: { cd_paciente: true, ds_paciente: true } } },
            orderBy: { cd_atendimento: 'asc' }, take: search_validation_1.SEARCH_LIMIT + 1,
        });
        if (rows.length > search_validation_1.SEARCH_LIMIT)
            return reply.code(422).send({ error: search_validation_1.REFINE_SEARCH });
        return rows;
    });
    fastify.get('/clinux/totem/atendimentos', async (request, reply) => {
        const parsed = zod_1.z.object({ cd_paciente: search_validation_1.positiveId, tipo: zod_1.z.enum(['hoje', 'entrega']).default('hoje') }).strict().safeParse(request.query);
        if (!parsed.success)
            return reply.code(400).send({ error: 'Informe um paciente válido.' });
        const { cd_paciente, tipo } = parsed.data;
        const hoje = (0, search_validation_1.todayBrazil)();
        const inicio = new Date(hoje);
        if (tipo === 'entrega')
            inicio.setUTCMonth(inicio.getUTCMonth() - 3);
        const rows = await prismaDB_1.prisma.atendimentos.findMany({
            where: {
                cd_paciente,
                dt_data: { gte: inicio, lte: hoje },
                ds_status: tipo === 'entrega' ? 5 : { in: [2, 3, 7] },
                ...(tipo === 'hoje' ? { exames: { some: {} } } : {}),
            },
            select: {
                cd_atendimento: true, dt_data: true, dt_hora: true, ds_status: true,
                salas: { select: { cd_modalidade: true, dt_hora_chegada: true } },
                exames: { select: { dt_assinado: true, procedimentos_exames_cd_procedimentoToprocedimentos: { select: { ds_procedimento: true } } } },
            },
            orderBy: [{ dt_data: tipo === 'entrega' ? 'desc' : 'asc' }, { dt_hora: tipo === 'entrega' ? 'desc' : 'asc' }, { cd_atendimento: 'desc' }],
            take: tipo === 'entrega' ? 10 : search_validation_1.SEARCH_LIMIT + 1,
        });
        if (rows.length > search_validation_1.SEARCH_LIMIT)
            return reply.code(422).send({ error: 'Muitos atendimentos. Procure a recepção.' });
        return rows;
    });
}
