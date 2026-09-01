import { promises as fs } from "node:fs";
import path from "node:path";

export const MEDIA_DIRECTORY = path.join(process.cwd(), "public", "videos");
export async function ensureMediaDirectory() { await fs.mkdir(MEDIA_DIRECTORY, { recursive: true }); }
