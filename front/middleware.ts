import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  readAdminSession,
} from "@/lib/admin-session";

const routePermissions: Array<[string, string]> = [
  ['/atencao', 'ATENCAO'], ['/configuracao', 'VOZ'], ['/dic', 'DICIONARIO'],
  ['/guiche', 'GUICHES'], ['/recepcao', 'RECEPCOES'], ['/setup-painel', 'PAINEIS'],
  ['/status', 'STATUS'], ['/logs', 'LOGS'], ['/usuarios', 'USUARIOS'],
  ['/api/guiches', 'GUICHES'], ['/api/paineis-config', 'PAINEIS'],
];

export async function middleware(request: NextRequest) {
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
    "/configuracoes/:path*",
    "/atencao/:path*",
    "/configuracao/:path*",
    "/dic/:path*",
    "/guiche/:path*",
    "/recepcao/:path*",
    "/setup-painel/:path*",
    "/status/:path*",
    "/logs/:path*",
    "/usuarios/:path*",
    "/alterar-senha/:path*",
    "/api/guiches/:path*",
    "/api/paineis-config/:path*",
  ],
};
