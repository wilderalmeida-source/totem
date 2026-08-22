import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSession,
} from "@/lib/admin-session";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

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

  const address = clientAddress(request);
  const now = Date.now();
  const current = attempts.get(address);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 15 minutos." },
      { status: 429 }
    );
  }
  if (current && current.resetAt <= now) attempts.delete(address);

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

  const bootstrapValid = Boolean(
    usernameExpected && passwordExpected &&
    safeEqual(username, usernameExpected) && safeEqual(password, passwordExpected)
  );

  let authenticatedUser: { username: string; displayName?: string } | null = null;
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
    const previous = attempts.get(address);
    attempts.set(address, {
      count: previous && previous.resetAt > now ? previous.count + 1 : 1,
      resetAt: previous && previous.resetAt > now ? previous.resetAt : now + WINDOW_MS,
    });
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  attempts.delete(address);
  if (apiBase && apiToken) {
    void fetch(`${apiBase}/clinux/audit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` }, body: JSON.stringify({ category: 'ADMIN', actor: authenticatedUser?.username ?? username, action: 'login_realizado', step: 'autenticacao' }) }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: await createAdminSession(authenticatedUser?.username ?? username, sessionSecret),
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  return response;
}
