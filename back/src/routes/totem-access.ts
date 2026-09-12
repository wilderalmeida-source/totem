import { randomBytes, randomUUID } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaLog as db } from '../../config/prismalog'
import { hashPin, verifyPin, sessionHash } from '../lib/totem-pin'

const pin = z.string().regex(/^\d{4,12}$/, 'O PIN deve ter de 4 a 12 dígitos.')
const cardId = z.string().uuid().transform(value => value.toLowerCase())
const idSchema = z.object({ id: z.coerce.number().int().positive() })
const fields = { id: true, username: true, displayName: true, cardId: true, active: true, mustChangePin: true, pinExpiresAt: true } as const
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)
const settings = () => db.totemAccessSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })
async function audit(actor: string, action: string, category = 'TOTEM') {
  await db.auditLog.create({ data: { actor, action, category, step: 'acesso_totem' } })
}
async function limit(key: string, max: number) {
  const window = Math.floor(Date.now() / 900000)
  const expiresAt = new Date((window + 1) * 900000)
  const row = await db.totemLoginAttempt.upsert({ where: { key: `${key}:${window}` }, create: { key: `${key}:${window}`, expiresAt }, update: { count: { increment: 1 } } })
  return row.count <= max
}
async function findSession(token: string) {
  if (!tokenSchema.safeParse(token).success) return null
  const session = await db.totemOperatorSession.findUnique({ where: { tokenHash: sessionHash(token) }, include: { operator: true } })
  if (!session || session.expiresAt <= new Date() || !session.operator.active || session.version !== session.operator.version) return null
  return session
}

export async function totemAccessRoutes(app: FastifyInstance) {
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof z.ZodError) return reply.code(400).send({ error: 'Dados inválidos. Confira o cartão, PIN e os campos informados.' })
    app.log.error({ code: (error as { code?: string }).code ?? 'TOTEM_ACCESS_ERROR' }, 'Falha no acesso ao totem')
    return reply.code(503).send({ error: 'Serviço de acesso indisponível.' })
  })
  app.get('/clinux/totem-access/settings', settings)
  app.put('/clinux/totem-access/settings', async (req, reply) => {
    const data = z.object({ enabled: z.boolean(), pinValidityDays: z.number().int().min(1).max(365), sessionHours: z.number().int().min(1).max(24) }).strict().parse(req.body)
    if (data.enabled && !(await db.totemOperator.count({ where: { active: true } }))) return reply.code(400).send({ error: 'Cadastre um colaborador ativo antes de habilitar o login.' })
    // Changing the policy requires a fresh operator login.
    await db.$transaction(async tx => {
      await tx.totemAccessSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data })
      await tx.totemOperatorSession.deleteMany({})
    })
    return data
  })
  app.get('/clinux/totem-access/users', () => db.totemOperator.findMany({ select: fields, orderBy: { username: 'asc' } }))
  app.post('/clinux/totem-access/users', async (req, reply) => {
    const body = z.object({ username: z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/), displayName: z.string().trim().min(2).max(150), pin, pinExpiresAt: z.string().datetime() }).strict().parse(req.body)
    if (new Date(body.pinExpiresAt) <= new Date()) return reply.code(400).send({ error: 'A validade do PIN deve estar no futuro.' })
    try {
      const user = await db.totemOperator.create({ data: { username: body.username, displayName: body.displayName, pinHash: await hashPin(body.pin), pinExpiresAt: new Date(body.pinExpiresAt) }, select: fields })
      return reply.code(201).send(user)
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return reply.code(409).send({ error: 'Usuário já cadastrado.' })
      throw e
    }
  })
  app.patch('/clinux/totem-access/users/:id', async (req, reply) => {
    const { id } = idSchema.parse(req.params)
    const body = z.object({ displayName: z.string().trim().min(2).max(150).optional(), active: z.boolean().optional(), pin: pin.optional(), pinExpiresAt: z.string().datetime().optional(), renewCard: z.boolean().optional() }).strict().parse(req.body)
    if (body.pinExpiresAt && new Date(body.pinExpiresAt) <= new Date()) return reply.code(400).send({ error: 'A validade deve estar no futuro.' })
    const policy = await settings()
    return db.totemOperator.update({ where: { id }, data: {
      displayName: body.displayName, active: body.active, version: { increment: 1 },
      ...(body.renewCard ? { cardId: randomUUID() } : {}),
      ...(body.pinExpiresAt ? { pinExpiresAt: new Date(body.pinExpiresAt) } : {}),
      ...(body.pin ? { pinHash: await hashPin(body.pin), mustChangePin: true, pinExpiresAt: body.pinExpiresAt ? new Date(body.pinExpiresAt) : new Date(Date.now() + policy.pinValidityDays * 86400000) } : {}),
    }, select: fields })
  })
  app.post('/clinux/totem-access/check', async req => {
    const { token = '' } = z.object({ token: z.string().max(100).optional() }).parse(req.body)
    const policy = await settings()
    if (!policy.enabled) return { enabled: false, allowed: true }
    const session = await findSession(token)
    const mustChangePin = Boolean(session?.restricted)
    const allowed = Boolean(session && !session.restricted && !session.operator.mustChangePin && session.operator.pinExpiresAt > new Date())
    return { enabled: true, allowed, mustChangePin, displayName: session?.operator.displayName }
  })
  app.post('/clinux/totem-access/lookup', async (req, reply) => {
    const body = z.object({ cardId, clientKey: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(req.body)
    if (!(await limit(`ip:${body.clientKey}`, 60))) return reply.code(429).send({ error: 'Muitas tentativas. Aguarde 15 minutos.' })
    const user = await db.totemOperator.findUnique({ where: { cardId: body.cardId } })
    if (!user?.active) return reply.code(401).send({ error: 'Cartão inválido ou desativado.' })
    return { displayName: user.displayName }
  })
  app.post('/clinux/totem-access/login', async (req, reply) => {
    const body = z.object({ cardId, pin, clientKey: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(req.body)
    if (!(await limit(`ip:${body.clientKey}`, 60)) || !(await limit(`card:${body.cardId}`, 5))) {
      return reply.code(429).send({ error: 'Limite de tentativas atingido. Aguarde 15 minutos.' })
    }
    const user = await db.totemOperator.findUnique({ where: { cardId: body.cardId } })
    if (!user?.active || !(await verifyPin(body.pin, user.pinHash))) {
      await audit('colaborador', 'login_totem_recusado')
      return reply.code(401).send({ error: 'Cartão ou PIN inválido.' })
    }
    const policy = await settings()
    const restricted = user.mustChangePin || user.pinExpiresAt <= new Date()
    await db.totemLoginAttempt.deleteMany({ where: { key: `card:${body.cardId}:${Math.floor(Date.now() / 900000)}` } })
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + (restricted ? 600000 : policy.sessionHours * 3600000))
    await db.totemOperatorSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })
    await db.totemLoginAttempt.deleteMany({ where: { expiresAt: { lt: new Date() } } })
    await db.totemOperatorSession.create({ data: { tokenHash: sessionHash(token), operatorId: user.id, version: user.version, restricted, expiresAt } })
    await audit(user.username, restricted ? 'troca_pin_exigida' : 'totem_liberado')
    return { token, mustChangePin: restricted, expiresAt, displayName: user.displayName }
  })
  app.post('/clinux/totem-access/change-pin', async (req, reply) => {
    const body = z.object({ token: tokenSchema, newPin: pin }).strict().parse(req.body)
    const session = await findSession(body.token)
    if (!session || !session.restricted) return reply.code(401).send({ error: 'Leia seu cartão e informe o PIN novamente.' })
    if (await verifyPin(body.newPin, session.operator.pinHash)) return reply.code(400).send({ error: 'Escolha um PIN diferente do atual.' })
    const policy = await settings()
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + policy.sessionHours * 3600000)
    const pinHash = await hashPin(body.newPin)
    const changed = await db.$transaction(async tx => {
      const result = await tx.totemOperator.updateMany({ where: { id: session.operatorId, version: session.version, active: true }, data: { pinHash, mustChangePin: false, pinExpiresAt: new Date(Date.now() + policy.pinValidityDays * 86400000), version: { increment: 1 } } })
      if (!result.count) return false
      await tx.totemOperatorSession.deleteMany({ where: { operatorId: session.operatorId } })
      await tx.totemOperatorSession.create({ data: { tokenHash: sessionHash(token), operatorId: session.operatorId, version: session.version + 1, expiresAt } })
      return true
    })
    if (!changed) return reply.code(401).send({ error: 'A conta foi alterada. Faça login novamente.' })
    await audit(session.operator.username, 'pin_alterado_totem_liberado')
    return { token, expiresAt, mustChangePin: false }
  })
  app.post('/clinux/totem-access/logout', async req => {
    const { token } = z.object({ token: z.string().max(100) }).parse(req.body)
    const session = await findSession(token)
    await db.totemOperatorSession.deleteMany({ where: { tokenHash: sessionHash(token) } })
    if (session) await audit(session.operator.username, 'totem_bloqueado')
    return { ok: true }
  })
}
