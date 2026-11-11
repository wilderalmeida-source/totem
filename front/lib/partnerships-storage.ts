import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { MEDIA_DIRECTORY } from './panel-storage'
import { EMPTY_PARTNERSHIPS, partnershipsSchema, type PartnerLogo, type PartnershipsConfig } from './partnerships'

export const PARTNERSHIPS_DIRECTORY = path.join(MEDIA_DIRECTORY, 'partnerships')
const configFile = path.join(PARTNERSHIPS_DIRECTORY, 'config.json')
export class PartnershipConflict extends Error {}
export class PartnershipInvalid extends Error {}
const state = globalThis as typeof globalThis & { partnershipsWrite?: Promise<unknown> }

export async function readPartnerships(): Promise<PartnershipsConfig> {
  try { return partnershipsSchema.parse(JSON.parse(await fs.readFile(configFile, 'utf8'))) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(EMPTY_PARTNERSHIPS)
    throw error
  }
}

/** Serialize the read/check/write across requests handled by this Node process. */
export function changePartnerships(revision: string, change: (current: PartnershipsConfig) => Promise<PartnershipsConfig>): Promise<PartnershipsConfig> {
  const operation = (state.partnershipsWrite ?? Promise.resolve()).then(async () => {
    const current = await readPartnerships()
    if (revision !== current.revision) throw new PartnershipConflict('Configuração alterada por outro administrador. Recarregue a página.')
    await fs.mkdir(PARTNERSHIPS_DIRECTORY, { recursive: true })
    const next = partnershipsSchema.parse({ ...await change(current), revision: randomUUID() })
    const temporary = path.join(PARTNERSHIPS_DIRECTORY, `config-${randomUUID()}.tmp`)
    const handle = await fs.open(temporary, 'wx', 0o600)
    try { await handle.writeFile(JSON.stringify(next)); await handle.sync() } finally { await handle.close() }
    try { await fs.rename(temporary, configFile) } catch (error) { await fs.unlink(temporary).catch(() => {}); throw error }
    if (process.platform !== 'win32') {
      const directory = await fs.open(PARTNERSHIPS_DIRECTORY, 'r')
      try { await directory.sync() } finally { await directory.close() }
    }
    return next
  })
  state.partnershipsWrite = operation.catch(() => undefined)
  return operation
}

export function updatePartnerships(input: PartnershipsConfig) {
  const parsed = partnershipsSchema.parse(input)
  return changePartnerships(parsed.revision, async current => {
    if (current.logos.length !== parsed.logos.length) throw new PartnershipInvalid('Use os comandos de upload e exclusão para alterar a biblioteca.')
    const existing = new Map(current.logos.map(logo => [logo.id, logo]))
    for (const logo of parsed.logos) {
      if (existing.get(logo.id)?.file !== logo.file) throw new PartnershipInvalid('Arquivo de logo inválido.')
    }
    return parsed
  })
}

export async function appendPartnerLogo(revision: string, name: string, content: Buffer) {
  let created: string | undefined
  try {
    return await changePartnerships(revision, async current => {
      if (current.logos.length >= 100) throw new PartnershipInvalid('Limite de 100 logos atingido.')
      const id = randomUUID(), file = `${id}.webp`
      created = path.join(PARTNERSHIPS_DIRECTORY, file)
      const handle = await fs.open(created, 'wx', 0o600)
      try { await handle.writeFile(content); await handle.sync() } finally { await handle.close() }
      const logo: PartnerLogo = { id, file, name, orientation: 'landscape', position: 'center', panelIds: [] }
      return { ...current, logos: [...current.logos, logo], playlist: [...current.playlist, id] }
    })
  } catch (error) {
    // Never remove a file after a possibly committed rename (e.g. directory fsync failure).
    if (created) console.error('PARTNERSHIP_UPLOAD_NOT_CONFIRMED')
    throw error
  }
}

export async function deletePartnerLogo(revision: string, id: string) {
  let removed: string | undefined
  const updated = await changePartnerships(revision, async current => {
    const logo = current.logos.find(item => item.id === id)
    if (!logo) throw new PartnershipInvalid('Logo não encontrada.')
    removed = logo.file
    return { ...current, logos: current.logos.filter(item => item.id !== id), playlist: current.playlist.filter(value => value !== id) }
  })
  // Remove only after the manifest no longer references the image.
  if (removed) await fs.unlink(path.join(PARTNERSHIPS_DIRECTORY, removed)).catch(() => console.error('PARTNERSHIP_UNUSED_FILE_NOT_REMOVED'))
  return updated
}
