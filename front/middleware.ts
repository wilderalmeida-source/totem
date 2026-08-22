import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "@/lib/admin-session";

export async function middleware(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated =
    Boolean(secret) && Boolean(token) &&
    (await verifyAdminSession(token!, secret!));

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
    "/api/guiches/:path*",
    "/api/paineis-config/:path*",
  ],
};
