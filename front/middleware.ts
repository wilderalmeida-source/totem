import { NextRequest, NextResponse } from "next/server";
import { checkTotemAccess } from '@/lib/totem-access';
import {
  ADMIN_SESSION_COOKIE,
  readAdminSession,
} from "@/lib/admin-session";

const routePermissions: Array<[string, string]> = [
  ['/atencao', 'ATENCAO'], ['/configuracao', 'VOZ'], ['/dic', 'DICIONARIO'],
  ['/guiche', 'GUICHES'], ['/recepcao', 'RECEPCOES'], ['/setup-painel', 'PAINEIS'],
  ['/configuracao-atrasos', 'PAINEIS'], ['/midias', 'PAINEIS'],
  ['/status', 'STATUS'], ['/logs', 'LOGS'], ['/usuarios', 'USUARIOS'],
  ['/api/guiches', 'GUICHES'], ['/api/paineis-config', 'PAINEIS'],
  ['/acesso-totem', 'USUARIOS'],
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/api/patient-session' && request.method === 'DELETE') return NextResponse.next();
  const pages = ['/', '/totem', '/date', '/preferencial', '/modalidades'];
  const operatorApi = pathname.startsWith('/api/patient-session') ||
    /^\/api\/backend\/clinux\/(pacientes|totem)(\/|$)/.test(pathname) ||
    (pathname === '/api/backend/clinux/senhas' && request.method !== 'GET');
  if (pages.some(path => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`))) || operatorApi) {
    try {
      const access = await checkTotemAccess(request);
      if (access.allowed) return NextResponse.next();
      if (operatorApi) return NextResponse.json({ error: 'Libere o totem com cartão e PIN.' }, { status: 401 });
      return NextResponse.redirect(new URL('/login-totem', request.url));
    } catch {
      if (operatorApi) return NextResponse.json({ error: 'Acesso ao totem indisponível.' }, { status: 503 });
      return NextResponse.redirect(new URL('/login-totem', request.url));
    }
  }
  if (pathname.startsWith('/api/backend/')) return NextResponse.next();
  const secret = process.env.SESSION_SECRET;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = secret && token ? await readAdminSession(token, secret) : null;
  const authenticated = Boolean(session);

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  }

  if (session?.mustChangePassword && request.nextUrl.pathname !== "/alterar-senha") {
    return NextResponse.redirect(new URL("/alterar-senha", request.url));
  }

  const requiredPermission = routePermissions.find(([path]) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))?.[1];
  if (requiredPermission && !session?.permissions.includes('*') && !session?.permissions.includes(requiredPermission)) {
    return NextResponse.redirect(new URL('/configuracoes?denied=1', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/', '/totem/:path*', '/date/:path*', '/preferencial/:path*', '/modalidades/:path*',
    '/api/patient-session/:path*', '/api/backend/clinux/pacientes/:path*',
    '/api/backend/clinux/totem/:path*', '/api/backend/clinux/senhas', '/acesso-totem/:path*',
    "/agenda/:path*",
    "/configuracoes/:path*",
    "/atencao/:path*",
    "/configuracao/:path*",
    "/dic/:path*",
    "/guiche/:path*",
    "/recepcao/:path*",
    "/setup-painel/:path*",
    "/configuracao-atrasos/:path*",
    "/midias/:path*",
    "/status/:path*",
    "/logs/:path*",
    "/usuarios/:path*",
    "/alterar-senha/:path*",
    "/api/guiches/:path*",
    "/api/paineis-config/:path*",
  ],
};
