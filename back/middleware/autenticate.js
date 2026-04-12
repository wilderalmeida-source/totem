"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const token_1 = require("../config/token");
const prismalog_1 = require("../config/prismalog");
async function authenticate(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        return reply.code(401).send({ error: "Token ausente" });
    }
    const token = authHeader.replace("Bearer ", "");
    const tokenHash = (0, token_1.hashToken)(token);
    const existing = await prismalog_1.PrismaLog.token.findUnique({
        where: { tokenHash },
    });
    if (!existing) {
        return reply.code(401).send({ error: "Token inválido" });
    }
    if (existing.expiresAt < new Date()) {
        return reply.code(401).send({ error: "Token expirado" });
    }
    request.apiToken = existing;
}
