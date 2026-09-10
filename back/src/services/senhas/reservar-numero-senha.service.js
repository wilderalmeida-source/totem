"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservarNumeroSenha = reservarNumeroSenha;
const flow_audit_1 = require("../../lib/flow-audit");
const prismaDB_1 = require("../../../config/prismaDB");
const prismalog_1 = require("../../../config/prismalog");
async function reservarNumeroSenha(hoje) {
    const periodo = { gte: hoje, lt: new Date(hoje.getTime() + 86400000) };
    // Apenas leituras no banco clinico, inclusive para a transicao no meio do dia.
    const total = await (0, flow_audit_1.auditOperation)('clinico.contagem', () => prismaDB_1.prisma.atendimentos_senhas.count({ where: { dt_entrada: periodo } }));
    const maior = await (0, flow_audit_1.auditOperation)('clinico.maior_numero', () => prismaDB_1.prisma.atendimentos_senhas.aggregate({
        where: { dt_entrada: periodo, OR: [{ ds_opcao: { not: 'C' } }, { ds_opcao: null }] },
        _max: { nr_senha: true },
    }));
    const piso = Math.max(total, maior._max.nr_senha ?? 0);
    // A reserva e confirmada nos logs antes da gravacao clinica. Nunca devolver o numero.
    const rows = await (0, flow_audit_1.auditOperation)('logs.reserva_numero', () => prismalog_1.PrismaLog.$queryRaw `
    INSERT INTO "TotemSenhaCounter" ("date", "number")
    VALUES (${hoje.toISOString().slice(0, 10)}::date, ${piso + 1})
    ON CONFLICT ("date") DO UPDATE
    SET "number" = GREATEST("TotemSenhaCounter"."number", ${piso}) + 1
    RETURNING "number"
  `);
    if (!Number.isSafeInteger(rows[0]?.number) || rows[0].number <= 0) {
        throw new Error('Falha ao reservar numero da senha');
    }
    (0, flow_audit_1.flowAudit)('numero_reservado', 'logs.contador', { number: rows[0].number, date: hoje.toISOString().slice(0, 10), code: 'NUMBER_RESERVED' });
    return rows[0].number;
}
