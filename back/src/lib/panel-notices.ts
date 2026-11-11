import { z } from 'zod'

export const noticeSettings = z.object({
  enabled: z.boolean(),
  items: z.array(z.object({
    id: z.string().uuid(), title: z.string().trim().min(1).max(120),
    text: z.string().trim().min(1).max(700),
    icon: z.enum(['info', 'alert', 'results', 'calendar', 'heart']),
    category: z.enum(['informativos', 'avisos', 'orientacoes', 'campanhas']).optional(),
    images: z.array(z.object({ file: z.string().regex(/^notice-[0-9a-f-]{36}\.webp$/), alt: z.string().trim().max(160) }).strict()).max(4).optional(),
    durationSeconds: z.number().int().min(5).max(300), active: z.boolean(),
  }).strict()).max(50),
}).strict().refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, 'Informativos duplicados')
