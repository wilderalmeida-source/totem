import { NextRequest, NextResponse } from "next/server";
import { requirePanelAdmin } from "@/lib/require-panel-admin";

export const dynamic = "force-dynamic";
const endpoint = () => `${process.env.LINK_API_INTERNA}/clinux/atrasos-config`;
const headers = () => ({ Authorization: `Bearer ${process.env.TOKEN_API_INT}`, "Content-Type": "application/json" });
export async function GET() {
  const response = await fetch(endpoint(), { cache: "no-store", headers: headers() });
  return new NextResponse(response.body, { status: response.status, headers: { "Content-Type": "application/json" } });
}
export async function PUT(request: NextRequest) {
  if (!(await requirePanelAdmin(request))) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const body = (await request.json()) as { toleranceMinutes?: number; timeBasis?: string };
  const toleranceMinutes = Number(body.toleranceMinutes);
  if (!Number.isInteger(toleranceMinutes) || toleranceMinutes < 0 || toleranceMinutes > 1440) return NextResponse.json({ error: "A tolerância deve estar entre 0 e 1440 minutos." }, { status: 400 });
  if (body.timeBasis !== "EXAM" && body.timeBasis !== "ARRIVAL") return NextResponse.json({ error: "Base de horário inválida." }, { status: 400 });
  const response = await fetch(endpoint(), { method: "PUT", headers: headers(), body: JSON.stringify({ toleranceMinutes, timeBasis: body.timeBasis }) });
  return new NextResponse(response.body, { status: response.status, headers: { "Content-Type": "application/json" } });
}
