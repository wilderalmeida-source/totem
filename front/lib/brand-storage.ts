import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { ensureImagesReady, LOGO_DIRECTORY } from './panel-storage'
import { brandSchema, EMPTY_BRAND, type BrandConfig, type BrandMode } from './brand'

// data/imagens/logo (volume ./data/imagens no compose).
export const BRAND_DIRECTORY = LOGO_DIRECTORY
const configFile = path.join(BRAND_DIRECTORY, 'config.json')
const state = globalThis as typeof globalThis & { brandWrite?: Promise<unknown> }

export async function readBrand(): Promise<BrandConfig> {
  await ensureImagesReady()
  try { return brandSchema.parse(JSON.parse(await fs.readFile(configFile, 'utf8'))) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(EMPTY_BRAND)
    throw error
  }
}

/** Uma alteração por vez neste processo; gravação atômica (arquivo temporário + rename). */
function changeBrand(change: (current: BrandConfig) => Promise<BrandConfig> | BrandConfig): Promise<BrandConfig> {
  const operation = (state.brandWrite ?? Promise.resolve()).then(async () => {
    const current = await readBrand()
    await fs.mkdir(BRAND_DIRECTORY, { recursive: true })
    const next = brandSchema.parse({ ...await change(current), revision: randomUUID() })
    const temporary = path.join(BRAND_DIRECTORY, `config-${randomUUID()}.tmp`)
    const handle = await fs.open(temporary, 'wx', 0o600)
    try { await handle.writeFile(JSON.stringify(next)); await handle.sync() } finally { await handle.close() }
    try { await fs.rename(temporary, configFile) } catch (error) { await fs.unlink(temporary).catch(() => {}); throw error }
    return next
  })
  state.brandWrite = operation.catch(() => undefined)
  return operation
}

export function setBrandPlacement(placement: BrandConfig['placement']) {
  return changeBrand(current => ({ ...current, placement }))
}

/** Grava a nova logo do modo e apaga a anterior. O nome do arquivo muda a cada envio (cache do navegador). */
export async function saveBrandLogo(mode: BrandMode, content: Buffer) {
  const file = `logo-${mode}-${randomUUID()}.webp`
  let previous: string | null = null
  await fs.mkdir(BRAND_DIRECTORY, { recursive: true })
  await fs.writeFile(path.join(BRAND_DIRECTORY, file), content, { flag: 'wx' })
  try {
    const updated = await changeBrand(current => { previous = current[mode]; return { ...current, [mode]: file } })
    if (previous) await fs.unlink(path.join(BRAND_DIRECTORY, previous)).catch(() => {})
    return updated
  } catch (error) {
    await fs.unlink(path.join(BRAND_DIRECTORY, file)).catch(() => {})
    throw error
  }
}

export async function removeBrandLogo(mode: BrandMode) {
  let previous: string | null = null
  const updated = await changeBrand(current => { previous = current[mode]; return { ...current, [mode]: null } })
  if (previous) await fs.unlink(path.join(BRAND_DIRECTORY, previous)).catch(() => {})
  return updated
}
