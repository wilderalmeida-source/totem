"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditQuery = void 0;
exports.auditExtraFilters = auditExtraFilters;
const zod_1 = require("zod");
const date = zod_1.z.string().datetime({ offset: true }).transform(value => new Date(value));
exports.auditQuery = zod_1.z.object({
    group: zod_1.z.enum(['EMISSAO', 'SESSAO', 'COMUNICACAO', 'AUDIO', 'PACIENTES']).optional(),
    category: zod_1.z.enum(['TOTEM', 'ADMIN']).optional(),
    flow: zod_1.z.string().max(100).optional(), device: zod_1.z.string().max(100).optional(),
    outcome: zod_1.z.enum(['CONCLUIDO', 'CANCELADO', 'EXPIRADO', 'FALHOU', 'DESCONHECIDO']).optional(),
    ticket: zod_1.z.coerce.number().int().positive().safe().optional(),
    from: date.optional(), to: date.optional(),
    page: zod_1.z.coerce.number().int().min(1).max(100000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
}).refine(q => !q.from || !q.to || q.from <= q.to, 'Periodo invalido');
function auditExtraFilters(query) {
    const filters = [];
    if (query.from || query.to)
        filters.push({ createdAt: { gte: query.from, lte: query.to } });
    if (query.outcome)
        filters.push({ metadata: { path: ['outcome'], equals: query.outcome } });
    if (query.ticket)
        filters.push({ metadata: { path: ['cd_senha'], equals: query.ticket } });
    return filters;
}
