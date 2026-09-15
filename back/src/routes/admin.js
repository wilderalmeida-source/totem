"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const persistent_audit_1 = require("../lib/persistent-audit");
const audit_filters_1 = require("../lib/audit-filters");
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const prismalog_1 = require("../../config/prismalog");
function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString('hex');
    return `${salt}:${(0, node_crypto_1.scryptSync)(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
    const [salt, expectedHex] = stored.split(':');
    if (!salt || !expectedHex)
        return false;
    const actual = (0, node_crypto_1.scryptSync)(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && (0, node_crypto_1.timingSafeEqual)(actual, expected);
}
const strongPassword = zod_1.z.string().min(12).max(256)
    .regex(/[a-z]/, 'A senha precisa de uma letra minúscula.')
    .regex(/[A-Z]/, 'A senha precisa de uma letra maiúscula.')
    .regex(/[0-9]/, 'A senha precisa de um número.')
    .regex(/[^a-zA-Z0-9]/, 'A senha precisa de um símbolo.');
const permission = zod_1.z.enum(['ATENCAO', 'VOZ', 'DICIONARIO', 'GUICHES', 'RECEPCOES', 'PAINEIS', 'STATUS', 'LOGS', 'USUARIOS']);
const auditGroups = {
    EMISSAO: { OR: [
            { step: { in: ['emissao', 'confirmacao', 'logs.contador', 'logs.reserva_numero', 'clinico.contagem', 'clinico.maior_numero', 'clinico.gravar_senha_e_vinculo', 'clinico.gravar_senha_entrega', 'patientSession.senha', 'patientSession/senha', '/clinux/senhas'] } },
        ] },
    SESSAO: { step: { in: ['sessao', 'patientSession'] } },
    COMUNICACAO: { action: { in: ['resposta_backend', 'resposta_next', 'falha_comunicacao', 'requisicao_falhou', 'proxy_resposta', 'proxy_falhou'] } },
    AUDIO: { OR: [
            { step: { startsWith: 'audio.' } }, { step: { startsWith: 'painel.' } },
            { step: 'tcp.2345' }, { step: '/clinux/voice' },
        ] },
    PACIENTES: { OR: [
            { step: { in: ['pacientesRoute.GET', 'patientSession.POST', '/clinux/pacientes', 'busca_complementar'] } },
            { step: { startsWith: '/clinux/totem/' } },
        ] },
};
async function adminRoutes(fastify) {
    fastify.get('/clinux/audit/health', async (_request, reply) => {
        reply.header('Cache-Control', 'no-store');
        return persistent_audit_1.auditOutbox.health();
    });
    fastify.post('/clinux/admin/users/session', async (request, reply) => {
        const body = zod_1.z.object({ username: zod_1.z.string().min(1).max(100), version: zod_1.z.string() }).strict().parse(request.body);
        const user = await prismalog_1.PrismaLog.adminUser.findUnique({ where: { username: body.username } });
        if (!user?.active || user.updatedAt.toISOString() !== body.version) {
            return reply.code(401).send({ error: 'Sessao encerrada.' });
        }
        return { permissions: user.permissions, mustChangePassword: user.mustChangePassword };
    });
    fastify.post('/clinux/admin/users/verify', async (request, reply) => {
        const body = zod_1.z.object({ username: zod_1.z.string().min(1).max(100), password: zod_1.z.string().min(1).max(256) }).parse(request.body);
        const user = await prismalog_1.PrismaLog.adminUser.findUnique({ where: { username: body.username } });
        if (!user || !user.active || !verifyPassword(body.password, user.passwordHash)) {
            return reply.code(401).send({ error: 'Usuário ou senha inválidos.' });
        }
        return { username: user.username, displayName: user.displayName, mustChangePassword: user.mustChangePassword, permissions: user.permissions, version: user.updatedAt.toISOString() };
    });
    fastify.get('/clinux/admin/users', async () => prismalog_1.PrismaLog.adminUser.findMany({
        select: { id: true, username: true, displayName: true, active: true, mustChangePassword: true, permissions: true, createdAt: true, updatedAt: true },
        orderBy: { username: 'asc' },
    }));
    fastify.post('/clinux/admin/users', async (request, reply) => {
        const body = zod_1.z.object({
            username: zod_1.z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/),
            displayName: zod_1.z.string().trim().min(2).max(150),
            password: strongPassword,
            permissions: zod_1.z.array(permission).min(1),
        }).parse(request.body);
        if (body.password.toLowerCase().includes(body.username.toLowerCase()))
            return reply.code(400).send({ error: 'A senha não pode conter o usuário.' });
        const user = await prismalog_1.PrismaLog.adminUser.create({ data: { username: body.username, displayName: body.displayName, passwordHash: hashPassword(body.password), permissions: body.permissions } });
        return reply.code(201).send({ id: user.id, username: user.username, displayName: user.displayName, active: user.active, mustChangePassword: user.mustChangePassword, permissions: user.permissions });
    });
    fastify.patch('/clinux/admin/users/:id', async (request) => {
        const { id } = zod_1.z.object({ id: zod_1.z.coerce.number().int().positive() }).parse(request.params);
        const body = zod_1.z.object({ displayName: zod_1.z.string().trim().min(2).max(150).optional(), password: strongPassword.optional(), active: zod_1.z.boolean().optional(), permissions: zod_1.z.array(permission).min(1).optional() }).parse(request.body);
        return prismalog_1.PrismaLog.adminUser.update({ where: { id }, data: { displayName: body.displayName, active: body.active, permissions: body.permissions, ...(body.password ? { passwordHash: hashPassword(body.password), mustChangePassword: true } : {}) }, select: { id: true, username: true, displayName: true, active: true, mustChangePassword: true, permissions: true } });
    });
    fastify.delete('/clinux/admin/users/:id', async (request, reply) => {
        const { id } = zod_1.z.object({ id: zod_1.z.coerce.number().int().positive() }).parse(request.params);
        const user = await prismalog_1.PrismaLog.adminUser.findUnique({ where: { id }, select: { id: true, username: true } });
        if (!user)
            return reply.code(404).send({ error: 'Usuário não encontrado.' });
        await prismalog_1.PrismaLog.adminUser.delete({ where: { id } });
        return reply.code(204).send();
    });
    fastify.post('/clinux/admin/users/change-password', async (request, reply) => {
        const body = zod_1.z.object({ username: zod_1.z.string().min(1).max(100), currentPassword: zod_1.z.string().min(1).max(256), newPassword: strongPassword }).parse(request.body);
        const user = await prismalog_1.PrismaLog.adminUser.findUnique({ where: { username: body.username } });
        if (!user || !user.active || !verifyPassword(body.currentPassword, user.passwordHash))
            return reply.code(401).send({ error: 'Senha atual inválida.' });
        if (verifyPassword(body.newPassword, user.passwordHash))
            return reply.code(400).send({ error: 'A nova senha deve ser diferente da atual.' });
        if (body.newPassword.toLowerCase().includes(user.username.toLowerCase()))
            return reply.code(400).send({ error: 'A senha não pode conter o usuário.' });
        await prismalog_1.PrismaLog.adminUser.update({ where: { id: user.id }, data: { passwordHash: hashPassword(body.newPassword), mustChangePassword: false } });
        return { ok: true };
    });
    fastify.post('/clinux/audit', async (request, reply) => {
        const body = zod_1.z.object({ eventId: zod_1.z.string().uuid().optional(), createdAt: zod_1.z.string().datetime().optional(), sessionId: zod_1.z.string().max(100).optional(), actor: zod_1.z.string().max(100).optional(), category: zod_1.z.enum(['TOTEM', 'ADMIN']), action: zod_1.z.string().min(1).max(100), step: zod_1.z.string().max(100).optional(), metadata: zod_1.z.record(zod_1.z.unknown()).optional() }).parse(request.body);
        (0, persistent_audit_1.persistAudit)(body);
        return reply.code(201).send({ ok: true });
    });
    fastify.get('/clinux/audit', async (request) => {
        const query = audit_filters_1.auditQuery.parse(request.query);
        const where = {
            ...(query.category ? { category: query.category } : {}),
            ...(query.flow ? { OR: [{ sessionId: query.flow }, { metadata: { path: ['traceId'], equals: query.flow } }] } : {}),
            ...(query.device ? { metadata: { path: ['device'], equals: query.device } } : {}),
            AND: [...(0, audit_filters_1.auditExtraFilters)(query), ...(query.group ? [auditGroups[query.group]] : [])],
        };
        const [items, total] = await Promise.all([prismalog_1.PrismaLog.auditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }), prismalog_1.PrismaLog.auditLog.count({ where })]);
        return { items: items.map((item) => ({ ...item, id: item.id.toString() })), total, page: query.page };
    });
}
