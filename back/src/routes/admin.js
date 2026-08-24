"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
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
async function adminRoutes(fastify) {
    fastify.post('/clinux/admin/users/verify', async (request, reply) => {
        const body = zod_1.z.object({ username: zod_1.z.string().min(1).max(100), password: zod_1.z.string().min(1).max(256) }).parse(request.body);
        const user = await prismalog_1.PrismaLog.adminUser.findUnique({ where: { username: body.username } });
        if (!user || !user.active || !verifyPassword(body.password, user.passwordHash)) {
            return reply.code(401).send({ error: 'Usuário ou senha inválidos.' });
        }
        return { username: user.username, displayName: user.displayName, mustChangePassword: user.mustChangePassword, permissions: user.permissions };
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
        const body = zod_1.z.object({ sessionId: zod_1.z.string().max(100).optional(), actor: zod_1.z.string().max(100).optional(), category: zod_1.z.enum(['TOTEM', 'ADMIN']), action: zod_1.z.string().min(1).max(100), step: zod_1.z.string().max(100).optional(), metadata: zod_1.z.record(zod_1.z.unknown()).optional() }).parse(request.body);
        await prismalog_1.PrismaLog.auditLog.create({ data: { ...body, metadata: body.metadata } });
        return reply.code(201).send({ ok: true });
    });
    fastify.get('/clinux/audit', async (request) => {
        const query = zod_1.z.object({ category: zod_1.z.enum(['TOTEM', 'ADMIN']).optional(), page: zod_1.z.coerce.number().int().positive().default(1), limit: zod_1.z.coerce.number().int().min(1).max(200).default(50) }).parse(request.query);
        const where = query.category ? { category: query.category } : {};
        const [items, total] = await Promise.all([prismalog_1.PrismaLog.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }), prismalog_1.PrismaLog.auditLog.count({ where })]);
        return { items: items.map((item) => ({ ...item, id: item.id.toString() })), total, page: query.page };
    });
}
