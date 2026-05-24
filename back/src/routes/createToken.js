"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToken = createToken;
const token_1 = require("../../config/token");
const prismalog_1 = require("../../config/prismalog");
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
async function createToken(fastify) {
    // ✅ Desabilita a herança de hooks do pai
    fastify.decorateRequest('skipAuth', true);
    fastify.get("/tokens", {
        config: { skipAuth: true } // ← flag customizada
    }, async (request, reply) => {
        const adminSecret = request.headers['x-admin-key'];
        if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
            return reply.status(401).send({ error: 'Não autorizado' });
        }
        const token = (0, token_1.generateToken)(32);
        const tokenHash = (0, token_1.hashToken)(token);
        await prismalog_1.PrismaLog.token.create({
            data: {
                tokenHash,
                name: "API",
                expiresAt: addDays(new Date(), 365),
                scope: "API-TOTEM"
            }
        });
        return reply.send({ token });
    });
}
