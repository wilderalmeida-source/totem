import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureMediaDirectory, MEDIA_DIRECTORY } from "@/lib/panel-storage";
import { requirePanelAdmin } from "@/lib/require-panel-admin";

export const dynamic = "force-dynamic";
const extensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".ogv"]);
const videos = new Set([".mp4", ".webm", ".ogv"]);
const mimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/ogg"]);
type Playlist = { id: string; name: string; items: string[] };
type Config = { activePlaylistId: string | null; imageDurationSeconds: number; playlists: Playlist[] };
const empty: Config = { activePlaylistId: null, imageDurationSeconds: 10, playlists: [] };
const configEndpoint = () => `${process.env.LINK_API_INTERNA}/clinux/midias-config`;
const backendHeaders = () => ({ Authorization: `Bearer ${process.env.TOKEN_API_INT}`, "Content-Type": "application/json" });
async function readConfig(): Promise<Config> { try { const response = await fetch(configEndpoint(), { cache: "no-store", headers: backendHeaders() }); return response.ok ? await response.json() : empty; } catch { return empty; } }
async function saveConfig(config: Config) { return fetch(configEndpoint(), { method: "PUT", headers: backendHeaders(), body: JSON.stringify(config) }); }
async function readPanelPlaylist(panelId: number): Promise<string | null> {
  if (!Number.isInteger(panelId) || panelId < 1) return null;
  try {
    const response = await fetch(`${process.env.LINK_API_INTERNA}/clinux/paineis-config`, { cache: "no-store", headers: backendHeaders() });
    if (!response.ok) return null;
    const config = await response.json();
    const panel = Array.isArray(config?.paineis) ? config.paineis.find((item: { painel?: number }) => Number(item.painel) === panelId) : null;
    return typeof panel?.playlistId === "string" ? panel.playlistId : null;
  } catch { return null; }
}

function safeName(value: string) {
  const ext = path.extname(value).toLowerCase();
  const base = path.basename(value, ext).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "midia";
  return `${base}${ext}`;
}
async function listFiles() {
  await ensureMediaDirectory();
  return (await fs.readdir(MEDIA_DIRECTORY, { withFileTypes: true })).filter((entry) => entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())).map((entry) => entry.name).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
const describe = (name: string) => ({ name, url: `/api/media/file?name=${encodeURIComponent(name)}`, type: videos.has(path.extname(name).toLowerCase()) ? "video" : "image" });

export async function GET(request: NextRequest) {
  const names = await listFiles(); const config = await readConfig(); const available = new Set(names);
  const playlists = config.playlists.map((list) => ({ ...list, items: list.items.filter((name) => available.has(name)) }));
  const panelId = Number(request.nextUrl.searchParams.get("painel") ?? 0);
  const selectedPlaylistId = await readPanelPlaylist(panelId);
  const active = playlists.find((list) => list.id === selectedPlaylistId) ?? playlists[0] ?? null;
  return NextResponse.json({ ...config, activePlaylistId: active?.id ?? null, selectedPlaylistId, playlists, files: names.map(describe), activeItems: (active?.items ?? names).map(describe) });
}
export async function POST(request: NextRequest) {
  if (!(await requirePanelAdmin(request))) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const form = await request.formData(); const uploads = form.getAll("files").filter((value): value is File => value instanceof File);
  if (!uploads.length) return NextResponse.json({ error: "Selecione ao menos um arquivo." }, { status: 400 });
  await ensureMediaDirectory(); const saved: string[] = [];
  for (const upload of uploads) {
    if (!mimeTypes.has(upload.type) || upload.size > 250 * 1024 * 1024) return NextResponse.json({ error: `Arquivo inválido ou maior que 250 MB: ${upload.name}` }, { status: 400 });
    const clean = safeName(upload.name); const ext = path.extname(clean); const base = path.basename(clean, ext); let name = clean; let index = 2;
    while (await fs.stat(path.join(MEDIA_DIRECTORY, name)).then(() => true).catch(() => false)) name = `${base}-${index++}${ext}`;
    await fs.writeFile(path.join(MEDIA_DIRECTORY, name), Buffer.from(await upload.arrayBuffer())); saved.push(name);
  }
  return NextResponse.json({ files: saved }, { status: 201 });
}
export async function PUT(request: NextRequest) {
  if (!(await requirePanelAdmin(request))) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const body = (await request.json()) as Config; const available = new Set(await listFiles()); const ids = new Set<string>();
  try {
    const playlists = (body.playlists ?? []).slice(0, 50).map((list) => { const id = String(list.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60); if (!id || ids.has(id)) throw new Error(); ids.add(id); return { id, name: String(list.name).trim().slice(0, 80) || "Playlist", items: [...new Set(list.items)].filter((name) => available.has(name)) }; });
    const config: Config = { activePlaylistId: playlists.some((list) => list.id === body.activePlaylistId) ? body.activePlaylistId : playlists[0]?.id ?? null, imageDurationSeconds: Math.min(300, Math.max(2, Number(body.imageDurationSeconds) || 10)), playlists };
    const response = await saveConfig(config); return new NextResponse(response.body, { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch { return NextResponse.json({ error: "Configuração de playlists inválida." }, { status: 400 }); }
}
export async function DELETE(request: NextRequest) {
  if (!(await requirePanelAdmin(request))) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const name = safeName(request.nextUrl.searchParams.get("name") ?? "");
  if (!extensions.has(path.extname(name).toLowerCase())) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  await fs.unlink(path.join(MEDIA_DIRECTORY, name)).catch(() => undefined);
  const config = await readConfig(); config.playlists = config.playlists.map((list) => ({ ...list, items: list.items.filter((entry) => entry !== name) })); await saveConfig(config);
  return NextResponse.json({ ok: true });
}
