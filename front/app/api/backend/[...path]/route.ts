import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, readAdminSession } from "@/lib/admin-session";

const ALLOWED_PREFIXES = [
  "/clinux/agenda", "/clinux/arquivo", "/clinux/atencao",
  "/clinux/documentos", "/clinux/guiches", "/clinux/medicos",
  "/clinux/modalidades", "/clinux/pacientes", "/clinux/paineis-config",
  "/clinux/procedimentos", "/clinux/recepcoes-modalidades",
  "/clinux/salas", "/clinux/senhas", "/clinux/voice", "/clinux/admin", "/clinux/audit",
] as const;

function pathAllowed(pathname: string) {
  return ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function requiresAdmin(pathname: string, method: string) {
  if (pathname.startsWith("/clinux/voice/")) return true;
  if (pathname === "/clinux/atencao" && method !== "GET") return true;
  if (pathname === "/clinux/atencao/text") return true;
  if (pathname.startsWith("/clinux/guiches")) return true;
  if (pathname.startsWith("/clinux/paineis-config") && method !== "GET") return true;
  if (pathname.startsWith("/clinux/recepcoes-modalidades") && method !== "GET") return true;
  if (pathname.startsWith("/clinux/admin")) return true;
  if (pathname === "/clinux/audit" && method === "GET") return true;
  return false;
}

async function getAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  return token && secret ? readAdminSession(token, secret) : null;
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const apiBase = process.env.LINK_API_INTERNA;
  const apiToken = process.env.TOKEN_API_INT;
  if (!apiBase || !apiToken) {
    return NextResponse.json({ error: "Backend interno não configurado." }, { status: 503 });
  }

  const { path: segments } = await context.params;
  const pathname = `/${segments.join("/")}`;
  if (!pathAllowed(pathname)) {
    return NextResponse.json({ error: "Rota não permitida." }, { status: 404 });
  }

  const adminSession = await getAdminSession(request);
  if (requiresAdmin(pathname, request.method) && !adminSession) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const target = new URL(pathname, apiBase.endsWith("/") ? apiBase : `${apiBase}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers({ Authorization: `Bearer ${apiToken}` });
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("Content-Type", contentType);
  if (accept) headers.set("Accept", accept);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    for (const name of ["content-type", "content-disposition", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    if (adminSession && request.method !== "GET" && upstream.ok) {
      void fetch(new URL('/clinux/audit', apiBase), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ category: 'ADMIN', actor: adminSession.sub, action: `${request.method} ${pathname}`, step: 'administracao' }),
      }).catch(() => undefined);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error("Falha no proxy interno:", error);
    return NextResponse.json({ error: "Backend indisponível." }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
