export const noticeIcons = ['info', 'alert', 'results', 'calendar', 'heart'] as const
export const noticeCategories = { informativos: 'Informativo', avisos: 'Aviso', orientacoes: 'Orientação', campanhas: 'Campanha' } as const
export type Notice = { id: string; title: string; text: string; icon: typeof noticeIcons[number]; durationSeconds: number; active: boolean; category?: keyof typeof noticeCategories; images?: Array<{ file: string; alt: string }> }
export type NoticeSettings = { enabled: boolean; items: Notice[] }
export function validNoticeSettings(value: unknown): value is NoticeSettings {
  if (!value || typeof value !== 'object') return false
  const config = value as NoticeSettings
  return typeof config.enabled === 'boolean' && Array.isArray(config.items) && config.items.length <= 50
    && new Set(config.items.map(item => item?.id)).size === config.items.length
    && config.items.every(item => item && typeof item.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
      && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 120
      && typeof item.text === 'string' && item.text.trim().length > 0 && item.text.length <= 700
      && noticeIcons.includes(item.icon) && Number.isInteger(item.durationSeconds) && item.durationSeconds >= 5 && item.durationSeconds <= 300 && typeof item.active === 'boolean')
    && config.items.every(item => (item.category === undefined || Object.hasOwn(noticeCategories, item.category))
      && (item.images === undefined || (Array.isArray(item.images) && item.images.length <= 4 && item.images.every(image => image && typeof image.file === 'string' && /^notice-[0-9a-f-]{36}\.webp$/.test(image.file) && typeof image.alt === 'string' && image.alt.length <= 160))))
}
