import { constants, promises as fs } from "node:fs";
import path from "node:path";

// Imagens do sistema, separadas por tipo. Volume no compose: ./data/imagens:/app/data/imagens.
// IMAGES_DIR permite apontar para outro caminho.
export const IMAGES_DIRECTORY = process.env.IMAGES_DIR || path.join(process.cwd(), "data", "imagens");
export const LOGO_DIRECTORY = path.join(IMAGES_DIRECTORY, "logo");               // logo da clínica (aba Temas)
export const PARTNERS_DIRECTORY = path.join(IMAGES_DIRECTORY, "parceiros");      // logos de parceiros
export const NOTICES_DIRECTORY = path.join(IMAGES_DIRECTORY, "informativos");    // imagens dos informativos

// Pasta antiga, da época dos vídeos (volume ./public/videos). Só é lida na cópia inicial.
export const LEGACY_MEDIA_DIRECTORY = path.join(process.cwd(), "public", "videos");
const MIGRATION_MARKER = ".copiado-de-public-videos";
const IMAGE_FILE = /\.(webp|png|jpe?g|gif)$/i;

async function copyFiles(from: string, to: string, filter: (name: string) => boolean) {
  const entries = await fs.readdir(from, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !filter(entry.name)) continue;
    // COPYFILE_EXCL: nunca sobrescreve um arquivo que já exista na pasta nova.
    await fs.copyFile(path.join(from, entry.name), path.join(to, entry.name), constants.COPYFILE_EXCL).catch(() => {});
  }
}

/**
 * Cria as pastas e, uma única vez, COPIA as imagens da pasta antiga (public/videos) para a nova.
 * Copia em vez de mover: se o volume novo ainda não estiver no compose, os originais continuam lá
 * e a cópia é refeita na próxima subida.
 */
async function prepare() {
  await Promise.all([LOGO_DIRECTORY, PARTNERS_DIRECTORY, NOTICES_DIRECTORY].map((dir) => fs.mkdir(dir, { recursive: true })));
  const marker = path.join(IMAGES_DIRECTORY, MIGRATION_MARKER);
  if (await fs.stat(marker).then(() => true, () => false)) return;
  await copyFiles(path.join(LEGACY_MEDIA_DIRECTORY, "brand"), LOGO_DIRECTORY, () => true);
  await copyFiles(path.join(LEGACY_MEDIA_DIRECTORY, "partnerships"), PARTNERS_DIRECTORY, (name) => !name.endsWith(".tmp"));
  await copyFiles(LEGACY_MEDIA_DIRECTORY, NOTICES_DIRECTORY, (name) => IMAGE_FILE.test(name));
  await fs.writeFile(marker, new Date().toISOString()).catch(() => {});
}

const state = globalThis as typeof globalThis & { imagesReady?: Promise<void> };
export function ensureImagesReady() {
  state.imagesReady ??= prepare().catch((error) => { state.imagesReady = undefined; throw error; });
  return state.imagesReady;
}
