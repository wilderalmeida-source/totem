import { auditServer } from '@/lib/flow-audit-server';
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, readAdminSession } from "@/lib/admin-session";
import { PATIENT_SESSION_COOKIE } from '@/lib/patient-session-config';
import { readPatientSession } from '@/lib/patient-session-store';

export const runtime = 'nodejs';

const ALLOWED_PREFIXES = [
  "/clinux/totem/atendimentos", "/clinux/totem/pacientes-com-exames", "/clinux/agenda", "/clinux/atencao",
  "/clinux/guiches", "/clinux/medicos",
  "/clinux/modalidades", "/clinux/pacientes", "/clinux/paineis-config",
  "/clinux/atrasos-config", "/clinux/midias-config",
  "/clinux/procedimentos", "/clinux/recepcoes-modalidades",
  "/clinux/salas", "/clinux/senhas", "/clinux/voice", "/clinux/admin", "/clinux/audit",
] as const;

function pathAllowed(pathname: string) {
  return ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function requiresAdmin(pathname: string, method: string) {
  if (pathname === "/clinux/agenda" || pathname.startsWith("/clinux/agenda/")) return true;
  if (pathname.startsWith("/clinux/voice/")) return true;
  if (pathname === "/clinux/atencao" && method !== "GET") return true;
  if (pathname === "/clinux/atencao/text") return true;
  if (pathname.startsWith("/clinux/guiches")) return true;
  if (pathname.startsWith("/clinux/paineis-config") && method !== "GET") return true;
  if ((pathname.startsWith("/clinux/atrasos-config") || pathname.startsWith("/clinux/midias-config")) && method !== "GET") return true;
  if (pathname.startsWith("/clinux/recepcoes-modalidades") && method !== "GET") return true;
  if (pathname.startsWith("/clinux/admin")) return true;
  if (pathname === "/clinux/audit" && method === "GET") return true;
  return false;
}

function requiredPermission(pathname: string) {
  if (pathname.startsWith('/clinux/voice/dictionary')) return 'DICIONARIO'
  if (pathname.startsWith('/clinux/voice')) return 'VOZ'
  if (pathname.startsWith('/clinux/atencao')) return 'ATENCAO'
  if (pathname.startsWith('/clinux/guiches')) return 'GUICHES'
  if (pathname.startsWith('/clinux/paineis-config')) return 'PAINEIS'
  if (pathname.startsWith('/clinux/atrasos-config') || pathname.startsWith('/clinux/midias-config')) return 'PAINEIS'
  if (pathname.startsWith('/clinux/recepcoes-modalidades')) return 'RECEPCOES'
  if (pathname.startsWith('/clinux/admin/users')) return 'USUARIOS'
  if (pathname.startsWith('/clinux/audit')) return 'LOGS'
  return null
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
  if (segments.some(segment => segment === '.' || segment === '..' || /[\\/%?#\u0000-\u001f\u007f]/.test(segment))) {
    return NextResponse.json({ error: 'Rota não permitida.' }, { status: 404 });
  }
  const pathname = `/${segments.join("/")}`;
  if (!pathAllowed(pathname)) {
    return NextResponse.json({ error: "Rota não permitida." }, { status: 404 });
  }

  const adminSession = await getAdminSession(request);
  if (requiresAdmin(pathname, request.method) && !adminSession) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const permission = requiredPermission(pathname)
  if (requiresAdmin(pathname, request.method) && permission && !adminSession?.permissions.includes('*') && !adminSession?.permissions.includes(permission)) {
    return NextResponse.json({ error: 'Acesso não permitido.' }, { status: 403 })
  }

  const target = new URL(pathname, apiBase.endsWith("/") ? apiBase : `${apiBase}/`);
  target.search = request.nextUrl.search;

  // Identificação e emissão passam pelas rotas que gerenciam a sessão do paciente.
  if ((pathname === '/clinux/pacientes' || pathname === '/clinux/senhas') && request.method !== 'GET') {
    return NextResponse.json({ error: 'Utilize o fluxo de identificação do paciente.' }, { status: 403 });
  }
  if (pathname === '/clinux/pacientes' && ['ID', 'NOMEDATA'].includes(target.searchParams.get('tipo') ?? '')) {
    return NextResponse.json({ error: 'Utilize o fluxo de identificação do paciente.' }, { status: 403 });
  }
  if (pathname === '/clinux/totem/atendimentos' || (pathname === '/clinux/pacientes' && target.searchParams.has('cd_paciente'))) {
    if (request.method !== 'GET') return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 });
    const session = readPatientSession(request.cookies.get(PATIENT_SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: 'Identifique o paciente novamente.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    const ids = target.searchParams.getAll('cd_paciente');
    if (ids.some(id => id !== String(session.patientId))) {
      return NextResponse.json({ error: 'O paciente não corresponde à identificação.' }, { status: 403 });
    }
    target.searchParams.set('cd_paciente', String(session.patientId));
  }

  const headers = new Headers({ Authorization: `Bearer ${apiToken}` });
  for (const name of ['x-flow-id', 'x-device-id']) { const value = request.headers.get(name); if (value && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value)) headers.set(name, value) }
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("Content-Type", contentType);
  if (accept) headers.set("Accept", accept);

  try {
    const started = Date.now();
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });

    auditServer(request, 'proxy_resposta', target.pathname, { status: upstream.status, durationMs: Date.now() - started });
    const responseHeaders = new Headers();
    for (const name of ["content-type", "content-disposition", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    if (pathname === '/clinux/totem/atendimentos' || pathname === '/clinux/pacientes') responseHeaders.set('Cache-Control', 'no-store');
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
