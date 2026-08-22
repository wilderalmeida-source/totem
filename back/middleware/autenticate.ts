import { hashToken } from "../config/token";
import { PrismaLog } from "../config/prismalog";

export async function authenticate(request: any, reply: any) {
  // ✅ Pula autenticação se a rota tiver skipAuth
  if (request.routeOptions?.config?.skipAuth) return;

  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.code(401).send({ error: "Token ausente" });
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return reply.code(401).send({ error: "Formato de token inválido" });
  }

  const token = match[1];
  const tokenHash = hashToken(token);

  const existing = await PrismaLog.token.findUnique({
    where: { tokenHash },
  });

  if (!existing) {
    return reply.code(401).send({ error: "Token inválido" });
  }

  if (existing.expiresAt < new Date()) {
    return reply.code(401).send({ error: "Token expirado" });
  }

  if (existing.revokedAt) {
    return reply.code(401).send({ error: "Token revogado" });
  }

  request.apiToken = existing;
}
