import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaLog } from '../../config/prismalog'
import { Prisma } from '../../prisma-logs/app/generated/prisma/clientLog'

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(':')
  if (!salt || !expectedHex) return false
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const strongPassword = z.string().min(12).max(256)
  .regex(/[a-z]/, 'A senha precisa de uma letra minúscula.')
  .regex(/[A-Z]/, 'A senha precisa de uma letra maiúscula.')
  .regex(/[0-9]/, 'A senha precisa de um número.')
  .regex(/[^a-zA-Z0-9]/, 'A senha precisa de um símbolo.')

const permission = z.enum(['ATENCAO', 'VOZ', 'DICIONARIO', 'GUICHES', 'RECEPCOES', 'PAINEIS', 'STATUS', 'LOGS', 'USUARIOS'])

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post('/clinux/admin/users/verify', async (request, reply) => {
    const body = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(256) }).parse(request.body)
    const user = await PrismaLog.adminUser.findUnique({ where: { username: body.username } })
    if (!user || !user.active || !verifyPassword(body.password, user.passwordHash)) {
      return reply.code(401).send({ error: 'Usuário ou senha inválidos.' })
    }
    return { username: user.username, displayName: user.displayName, mustChangePassword: user.mustChangePassword, permissions: user.permissions }
  })

  fastify.get('/clinux/admin/users', async () => PrismaLog.adminUser.findMany({
    select: { id: true, username: true, displayName: true, active: true, mustChangePassword: true, permissions: true, createdAt: true, updatedAt: true },
    orderBy: { username: 'asc' },
  }))

  fastify.post('/clinux/admin/users', async (request, reply) => {
    const body = z.object({
      username: z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/),
      displayName: z.string().trim().min(2).max(150),
      password: strongPassword,
      permissions: z.array(permission).min(1),
    }).parse(request.body)
    if (body.password.toLowerCase().includes(body.username.toLowerCase())) return reply.code(400).send({ error: 'A senha não pode conter o usuário.' })
    const user = await PrismaLog.adminUser.create({ data: { username: body.username, displayName: body.displayName, passwordHash: hashPassword(body.password), permissions: body.permissions } })
    return reply.code(201).send({ id: user.id, username: user.username, displayName: user.displayName, active: user.active, mustChangePassword: user.mustChangePassword, permissions: user.permissions })
  })

  fastify.patch('/clinux/admin/users/:id', async (request) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params)
    const body = z.object({ displayName: z.string().trim().min(2).max(150).optional(), password: strongPassword.optional(), active: z.boolean().optional(), permissions: z.array(permission).min(1).optional() }).parse(request.body)
    return PrismaLog.adminUser.update({ where: { id }, data: { displayName: body.displayName, active: body.active, permissions: body.permissions, ...(body.password ? { passwordHash: hashPassword(body.password), mustChangePassword: true } : {}) }, select: { id: true, username: true, displayName: true, active: true, mustChangePassword: true, permissions: true } })
  })

  fastify.delete('/clinux/admin/users/:id', async (request, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params)
    const user = await PrismaLog.adminUser.findUnique({ where: { id }, select: { id: true, username: true } })
    if (!user) return reply.code(404).send({ error: 'Usuário não encontrado.' })
    await PrismaLog.adminUser.delete({ where: { id } })
    return reply.code(204).send()
  })

  fastify.post('/clinux/admin/users/change-password', async (request, reply) => {
    const body = z.object({ username: z.string().min(1).max(100), currentPassword: z.string().min(1).max(256), newPassword: strongPassword }).parse(request.body)
    const user = await PrismaLog.adminUser.findUnique({ where: { username: body.username } })
    if (!user || !user.active || !verifyPassword(body.currentPassword, user.passwordHash)) return reply.code(401).send({ error: 'Senha atual inválida.' })
    if (verifyPassword(body.newPassword, user.passwordHash)) return reply.code(400).send({ error: 'A nova senha deve ser diferente da atual.' })
    if (body.newPassword.toLowerCase().includes(user.username.toLowerCase())) return reply.code(400).send({ error: 'A senha não pode conter o usuário.' })
    await PrismaLog.adminUser.update({ where: { id: user.id }, data: { passwordHash: hashPassword(body.newPassword), mustChangePassword: false } })
    return { ok: true }
  })

  fastify.post('/clinux/audit', async (request, reply) => {
    const body = z.object({ sessionId: z.string().max(100).optional(), actor: z.string().max(100).optional(), category: z.enum(['TOTEM', 'ADMIN']), action: z.string().min(1).max(100), step: z.string().max(100).optional(), metadata: z.record(z.unknown()).optional() }).parse(request.body)
    await PrismaLog.auditLog.create({ data: { ...body, metadata: body.metadata as Prisma.InputJsonValue | undefined } })
    return reply.code(201).send({ ok: true })
  })

  fastify.get('/clinux/audit', async (request) => {
    const query = z.object({ category: z.enum(['TOTEM', 'ADMIN']).optional(), page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(request.query)
    const where = query.category ? { category: query.category } : {}
    const [items, total] = await Promise.all([PrismaLog.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }), PrismaLog.auditLog.count({ where })])
    return { items: items.map((item) => ({ ...item, id: item.id.toString() })), total, page: query.page }
  })
}
