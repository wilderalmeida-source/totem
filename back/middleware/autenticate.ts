import { hashToken } from "../config/token";
import { PrismaLog } from "../config/prismalog";

// Cache curto da validação do token: antes cada requisição fazia uma consulta ao banco de logs.
// - Token válido: 60 s (uma revogação feita direto no banco vale em até 60 s); o vencimento é sempre respeitado.
// - Token inexistente: 10 s, para que tentativas repetidas com token errado não martelem o banco.
export const TOKEN_CACHE = { okMs: 60_000, missMs: 10_000, maxEntries: 1000 };
type TokenRow = Awaited<ReturnType<typeof PrismaLog.token.findUnique>>;
type Cached = { token: TokenRow; until: number };
const cache = new Map<string, Cached>();

export function clearTokenCache() { cache.clear(); }

async function lookup(tokenHash: string, now: number) {
  const hit = cache.get(tokenHash);
  if (hit && hit.until > now) return hit.token;
  const existing = await PrismaLog.token.findUnique({ where: { tokenHash } });
  if (cache.size >= TOKEN_CACHE.maxEntries) cache.delete(cache.keys().next().value as string);
  cache.set(tokenHash, { token: existing, until: now + (existing ? TOKEN_CACHE.okMs : TOKEN_CACHE.missMs) });
  return existing;
}

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

  const existing = await lookup(tokenHash, Date.now());

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
