import { recordAudit } from '@/lib/persistent-audit'
import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
} from "@/lib/admin-session";

// Limite de tentativas por IP e por usuário. O IP vem do X-Forwarded-For, que o cliente pode trocar
// a cada tentativa; o limite por usuário não depende de cabeçalho e é o que impede a força bruta.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_KEYS = 10000;

function blocked(key: string, now: number) {
  const current = attempts.get(key);
  if (current && current.resetAt <= now) { attempts.delete(key); return false; }
  return Boolean(current && current.count >= MAX_ATTEMPTS);
}

function registerFailure(key: string, now: number) {
  if (!attempts.has(key) && attempts.size >= MAX_KEYS) {
    for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k);
    // Sem crescer sem limite com IPs forjados: descarta as entradas mais antigas.
    for (const k of attempts.keys()) { if (attempts.size < MAX_KEYS) break; attempts.delete(k); }
  }
  const previous = attempts.get(key);
  attempts.set(key, {
    count: previous && previous.resetAt > now ? previous.count + 1 : 1,
    resetAt: previous && previous.resetAt > now ? previous.resetAt : now + WINDOW_MS,
  });
}

function safeEqual(received: string, expected: string) {
  const left = createHash("sha256").update(received).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function clientAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const publicHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host");

  if (!origin || !publicHost) return false;

  try {
    return new URL(origin).host.toLowerCase() === publicHost.toLowerCase();
  } catch {
    return false;
  }
}

function isSecureRequest(request: NextRequest) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProtocol) return forwardedProtocol === "https";

  const origin = request.headers.get("origin");
  if (!origin) return request.nextUrl.protocol === "https:";

  try {
    return new URL(origin).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }

  const usernameExpected = process.env.ADMIN_USERNAME;
  const passwordExpected = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret || sessionSecret.length < 32) {
    console.error("Credenciais administrativas não configuradas com segurança.");
    return NextResponse.json(
      { error: "Login administrativo indisponível." },
      { status: 503 }
    );
  }

  const address = `ip:${clientAddress(request)}`;
  const now = Date.now();
  if (blocked(address, now)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 15 minutos." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const username =
    typeof body === "object" && body && "username" in body
      ? String(body.username).slice(0, 100)
      : "";
  const password =
    typeof body === "object" && body && "password" in body
      ? String(body.password).slice(0, 256)
      : "";

  const userKey = `user:${username.trim().toLowerCase()}`;
  if (blocked(userKey, now)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 15 minutos." },
      { status: 429 }
    );
  }

  const bootstrapValid = Boolean(
    usernameExpected && passwordExpected &&
    safeEqual(username, usernameExpected) && safeEqual(password, passwordExpected)
  );

  let authenticatedUser: { username: string; displayName?: string; mustChangePassword?: boolean; permissions?: string[]; version?: string } | null = null;
  const apiBase = process.env.LINK_API_INTERNA;
  const apiToken = process.env.TOKEN_API_INT;
  if (!bootstrapValid && apiBase && apiToken) {
    const backendResponse = await fetch(`${apiBase}/clinux/admin/users/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    }).catch(() => null);
    if (backendResponse?.ok) authenticatedUser = await backendResponse.json();
  }

  if (!authenticatedUser && !bootstrapValid) {
    registerFailure(address, now);
    registerFailure(userKey, now);
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  attempts.delete(address);
  attempts.delete(userKey);
  if (apiBase && apiToken) {
    recordAudit({ category: 'ADMIN', actor: authenticatedUser?.username ?? username, action: 'login_realizado', step: 'autenticacao' });
  }
  const mustChangePassword = authenticatedUser?.mustChangePassword === true;
  const response = NextResponse.json({ ok: true, mustChangePassword });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: await createAdminSession(authenticatedUser?.username ?? username, sessionSecret, mustChangePassword, authenticatedUser?.permissions ?? ['*'], { source: bootstrapValid ? 'bootstrap' : 'database', version: authenticatedUser?.version }),
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  return response;
}
