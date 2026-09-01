import { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, readAdminSession } from "@/lib/admin-session";

export async function requirePanelAdmin(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = secret && token ? await readAdminSession(token, secret) : null;
  if (!session) return null;
  return session.permissions.includes("*") || session.permissions.includes("PAINEIS") ? session : null;
}
