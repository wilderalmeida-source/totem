import { z } from 'zod'

export const PARTNER_POSITIONS = [
  'top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
] as const
export type PartnerPosition = typeof PARTNER_POSITIONS[number]
export type PartnerOrientation = 'landscape' | 'portrait'

const id = z.string().uuid()
const logoSchema = z.object({
  id, name: z.string().trim().min(1).max(100),
  file: z.string().regex(/^[a-f0-9-]{36}\.webp$/i),
  orientation: z.enum(['landscape', 'portrait']), position: z.enum(PARTNER_POSITIONS),
  panelIds: z.array(z.number().int().positive().safe()).max(100).refine(values => new Set(values).size === values.length),
})
export const partnershipsSchema = z.object({
  revision: z.union([z.literal('initial'), id]),
  enabled: z.boolean(), random: z.boolean(), displaySeconds: z.number().int().min(5).max(60),
  logos: z.array(logoSchema).max(100), playlist: z.array(id).max(100),
}).superRefine((config, context) => {
  const ids = new Set(config.logos.map(logo => logo.id))
  if (ids.size !== config.logos.length || new Set(config.playlist).size !== config.playlist.length || config.playlist.some(value => !ids.has(value))) {
    context.addIssue({ code: 'custom', message: 'Logos ou playlist inválidas.' })
  }
})
export type PartnerLogo = z.infer<typeof logoSchema> & { url?: string }
export type PartnershipsConfig = Omit<z.infer<typeof partnershipsSchema>, 'logos'> & { logos: PartnerLogo[] }
export const EMPTY_PARTNERSHIPS: PartnershipsConfig = {
  revision: 'initial', enabled: false, random: false, displaySeconds: 10, logos: [], playlist: [],
}
export const partnerLogoUrl = (logoId: string) => `/api/partnerships/logo/${encodeURIComponent(logoId)}`
export function publicPartnerships(config: PartnershipsConfig): PartnershipsConfig {
  return { ...config, logos: config.logos.map(logo => ({ ...logo, url: partnerLogoUrl(logo.id) })) }
}

/** Random mode considers every logo assigned to this panel, independent of playlist. */
export function eligiblePartnerLogos(config: PartnershipsConfig, panelId: number): PartnerLogo[] {
  if (!config.enabled) return []
  const logos = config.logos.filter(logo => logo.panelIds.includes(panelId))
  if (config.random) return logos
  const byId = new Map(logos.map(logo => [logo.id, logo]))
  return config.playlist.flatMap(value => { const logo = byId.get(value); return logo ? [logo] : [] })
}

export function choosePartnerLogo(config: PartnershipsConfig, panelId: number, lastLogoId?: string, random = Math.random): PartnerLogo | null {
  const logos = eligiblePartnerLogos(config, panelId)
  if (!logos.length) return null
  if (!config.random) return logos[(logos.findIndex(logo => logo.id === lastLogoId) + 1) % logos.length]
  const candidates = logos.length > 1 ? logos.filter(logo => logo.id !== lastLogoId) : logos
  const index = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))
  return candidates[index]
}
