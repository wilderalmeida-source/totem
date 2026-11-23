export const noticeIcons = ['info', 'alert', 'results', 'calendar', 'heart'] as const
export const noticeCategories = { informativos: 'Informativo', avisos: 'Aviso', orientacoes: 'Orientação', campanhas: 'Campanha', modalidade: 'Aviso da modalidade' } as const
export type Notice = { id: string; title: string; text: string; icon: typeof noticeIcons[number]; durationSeconds: number; active: boolean; category?: keyof typeof noticeCategories; images?: Array<{ file: string; alt: string }>; fullImage?: boolean
  /** Categoria "modalidade": códigos das modalidades que fazem o aviso aparecer e segundos somados a cada nova chamada. */
  modalidades?: number[]; extraSeconds?: number }
export type NoticeSettings = { enabled: boolean; items: Notice[] }
export function validNoticeSettings(value: unknown): value is NoticeSettings {
  if (!value || typeof value !== 'object') return false
  const config = value as NoticeSettings
  return typeof config.enabled === 'boolean' && Array.isArray(config.items) && config.items.length <= 50
    && new Set(config.items.map(item => item?.id)).size === config.items.length
    && config.items.every(item => item && typeof item.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
      && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 120
      && typeof item.text === 'string' && item.text.length <= 700
      && (item.fullImage === undefined || typeof item.fullImage === 'boolean')
      // Imagem em tela cheia: precisa de imagem e dispensa o texto. Sem ela, o texto é obrigatório.
      && (item.fullImage ? Array.isArray(item.images) && item.images.length > 0 : item.text.trim().length > 0)
      && noticeIcons.includes(item.icon) && Number.isInteger(item.durationSeconds) && item.durationSeconds >= 5 && item.durationSeconds <= 300 && typeof item.active === 'boolean')
    && config.items.every(item => (item.category === undefined || Object.hasOwn(noticeCategories, item.category))
      && (item.modalidades === undefined || (Array.isArray(item.modalidades) && item.modalidades.length <= 100 && item.modalidades.every(id => Number.isInteger(id) && id > 0)))
      && (item.category !== 'modalidade' || (item.modalidades?.length ?? 0) > 0)
      && (item.extraSeconds === undefined || (Number.isInteger(item.extraSeconds) && item.extraSeconds >= 0 && item.extraSeconds <= 60))
      && (item.images === undefined || (Array.isArray(item.images) && item.images.length <= 4 && item.images.every(image => image && typeof image.file === 'string' && /^notice-[0-9a-f-]{36}\.webp$/.test(image.file) && typeof image.alt === 'string' && image.alt.length <= 160))))
}

/** Aviso da modalidade em exibição: começa em start e sai da tela em until (ms). */
export type ModalityFocus = { notice: Notice; modalidade?: string; start: number; until: number }
export const MODALITY_EXTRA_DEFAULT = 5
export const MODALITY_MAX_MS = 300_000

/** Nova chamada: mostra o aviso da modalidade chamada. Se o mesmo aviso já está na tela, soma os segundos extras
 * (até 5 minutos à frente); outro aviso de modalidade substitui o atual. Sem aviso para a modalidade, nada muda. */
export function focusForCall(prev: ModalityFocus | null, items: Notice[], call: { cdModalidade?: number; modalidade?: string }, now: number): ModalityFocus | null {
  const active = prev && prev.until > now ? prev : null
  const cd = call.cdModalidade
  const match = cd === undefined ? undefined : items.find(item => item.active && item.category === 'modalidade' && item.modalidades?.includes(cd))
  if (!match) return active
  if (active && active.notice.id === match.id) {
    const extra = (match.extraSeconds ?? MODALITY_EXTRA_DEFAULT) * 1000
    return { notice: match, modalidade: call.modalidade || active.modalidade, start: active.start, until: Math.min(active.until + extra, now + MODALITY_MAX_MS) }
  }
  return { notice: match, modalidade: call.modalidade, start: now, until: now + match.durationSeconds * 1000 }
}
