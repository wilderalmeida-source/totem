import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const targetFolder = path.join(process.cwd(), "public", "videos");
  console.log("📁 Procurando em:", targetFolder);
  console.log("📂 Arquivos encontrados:", fs.readdirSync(targetFolder));
  
  const formats = [
    { ext: "webm", type: "video/webm" },
    { ext: "mp4",  type: "video/mp4"  },
    { ext: "jpeg", type: "image/jpeg" },
    { ext: "png",  type: "image/png"  },
  ];

  for (const format of formats) {
    const filePath = path.join(targetFolder, `propaganda.${format.ext}`);

    if (fs.existsSync(filePath)) {
      const file = fs.readFileSync(filePath);
      return new NextResponse(file.buffer as ArrayBuffer, {
          headers: {
                    "Content-Type": format.type,
                    "Cache-Control": "no-store, no-cache, must-revalidate",
  },
});
    }
  }

  return new NextResponse(null, { status: 404 });
}