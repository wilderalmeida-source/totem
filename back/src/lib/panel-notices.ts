import { z } from 'zod'

export const noticeSettings = z.object({
  enabled: z.boolean(),
  items: z.array(z.object({
    id: z.string().uuid(), title: z.string().trim().min(1).max(120),
    // Com imagem em tela cheia o texto é opcional (a imagem é o comunicado).
    text: z.string().trim().max(700),
    fullImage: z.boolean().optional(),
    icon: z.enum(['info', 'alert', 'results', 'calendar', 'heart']),
    category: z.enum(['informativos', 'avisos', 'orientacoes', 'campanhas']).optional(),
    images: z.array(z.object({ file: z.string().regex(/^notice-[0-9a-f-]{36}\.webp$/), alt: z.string().trim().max(160) }).strict()).max(4).optional(),
    durationSeconds: z.number().int().min(5).max(300), active: z.boolean(),
  }).strict().superRefine((item, ctx) => {
    if (item.fullImage && !item.images?.length) ctx.addIssue({ code: 'custom', path: ['images'], message: 'Imagem em tela cheia exige ao menos uma imagem' })
    if (!item.fullImage && !item.text) ctx.addIssue({ code: 'custom', path: ['text'], message: 'Informe o texto' })
  })).max(50),
}).strict().refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, 'Informativos duplicados')
