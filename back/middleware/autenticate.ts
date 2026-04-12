import { hashToken } from "../config/token";
import { PrismaLog } from "../config/prismalog";
export async function authenticate(request: any, reply: any) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.code(401).send({ error: "Token ausente" });
  }

  const token = authHeader.replace("Bearer ", "");
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

  request.apiToken = existing;
}