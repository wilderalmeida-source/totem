import { z } from 'zod'

// Logo do estabelecimento (aba Temas). Uma imagem para o modo claro e outra para o escuro;
// se só uma for enviada, ela vale para os dois. "placement" define onde a logo aparece:
// - header:  no canto superior (no lugar do ícone/nome da marca); a saudação mostra o nome em texto.
// - welcome: na saudação ("Olá, seja bem-vindo ao {logo}"); o canto superior volta ao padrão.
export const BRAND_FILE = /^logo-(light|dark)-[0-9a-f-]{36}\.webp$/
export const BRAND_MODES = ['light', 'dark'] as const
export type BrandMode = typeof BRAND_MODES[number]

export const brandSchema = z.object({
  placement: z.enum(['header', 'welcome']).default('header'),
  light: z.string().regex(BRAND_FILE).nullable().default(null),
  dark: z.string().regex(BRAND_FILE).nullable().default(null),
  revision: z.string().max(100).default(''),
})
export type BrandConfig = z.infer<typeof brandSchema>
export const EMPTY_BRAND: BrandConfig = { placement: 'header', light: null, dark: null, revision: '' }

export type PublicBrand = {
  placement: 'header' | 'welcome'
  lightUrl: string | null
  darkUrl: string | null
  /** Arquivos realmente enviados (para a tela de Temas mostrar o que existe em cada modo). */
  uploaded: { light: boolean; dark: boolean }
}

export const brandLogoUrl = (file: string) => `/api/brand/logo/${encodeURIComponent(file)}`

export function publicBrand(config: BrandConfig): PublicBrand {
  const light = config.light ?? config.dark
  const dark = config.dark ?? config.light
  return {
    placement: config.placement,
    lightUrl: light ? brandLogoUrl(light) : null,
    darkUrl: dark ? brandLogoUrl(dark) : null,
    uploaded: { light: Boolean(config.light), dark: Boolean(config.dark) },
  }
}

export const hasBrandLogo = (brand: PublicBrand | null | undefined) => Boolean(brand?.lightUrl)
