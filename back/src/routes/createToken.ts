import { FastifyInstance } from "fastify"
import { generateToken, hashToken } from "../../config/token"
import { PrismaLog } from "../../config/prismalog"

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function createToken(fastify: FastifyInstance) {
  // ✅ Desabilita a herança de hooks do pai
  fastify.decorateRequest('skipAuth', true)

  fastify.get("/tokens", {
    config: { skipAuth: true } // ← flag customizada
  }, async (request, reply) => {
    const adminSecret = request.headers['x-admin-key']
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return reply.status(401).send({ error: 'Não autorizado' })
    }
    const token = generateToken(32);
    const tokenHash = hashToken(token);
    await PrismaLog.token.create({
      data: {
        tokenHash,
        name: "API",
        expiresAt: addDays(new Date(), 365),
        scope: "API-TOTEM"
      }
    })

    return reply.send({ token });
  });
}