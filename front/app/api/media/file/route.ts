import { NextRequest, NextResponse } from "next/server";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { ensureImagesReady, NOTICES_DIRECTORY } from "@/lib/panel-storage";

export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const extension = path.extname(name).toLowerCase();

  if (!name || name !== path.basename(name) || !contentTypes[extension]) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }

  // Imagens dos informativos, em data/imagens/informativos.
  const filePath = path.join(NOTICES_DIRECTORY, name);

  try {
    await ensureImagesReady();
    const stat = await fs.stat(filePath);
    const range = request.headers.get("range");
    let start = 0;
    let end = stat.size - 1;
    let status = 200;

    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match) return new NextResponse(null, { status: 416 });
      start = match[1] ? Number(match[1]) : 0;
      end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
      if (start > end || start >= stat.size) {
        return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      }
      status = 206;
    }

    const headers = new Headers({
      "Content-Type": contentTypes[extension],
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    if (status === 206) headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);

    const stream = Readable.toWeb(createReadStream(filePath, { start, end }));
    return new NextResponse(stream as ReadableStream, { status, headers });
  } catch {
    return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
  }
}
