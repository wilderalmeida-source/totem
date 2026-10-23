import { z } from 'zod'
import type { Prisma } from '../../prisma-logs/app/generated/prisma/clientLog'

const date = z.string().datetime({ offset: true }).transform(value => new Date(value))
export const auditQuery = z.object({
  group: z.enum(['EMISSAO', 'SESSAO', 'COMUNICACAO', 'AUDIO', 'PACIENTES']).optional(),
  category: z.enum(['TOTEM', 'ADMIN']).optional(),
  flow: z.string().max(100).optional(), device: z.string().max(100).optional(),
  patientName: z.string().trim().min(3).max(150).optional(),
  outcome: z.enum(['CONCLUIDO', 'CANCELADO', 'EXPIRADO', 'FALHOU', 'DESCONHECIDO']).optional(),
  ticket: z.coerce.number().int().positive().safe().optional(),
  from: date.optional(), to: date.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
}).refine(q => !q.from || !q.to || q.from <= q.to, 'Periodo invalido')

// Find matching flows first; the main query must retain their other events.
export function auditPatientFilter(name: string): Prisma.AuditLogWhereInput {
  return { category: 'TOTEM', sessionId: { not: null }, metadata: { path: ['nomePaciente'], string_contains: name, mode: 'insensitive' } }
}

export function auditExtraFilters(query: z.infer<typeof auditQuery>): Prisma.AuditLogWhereInput[] {
  const filters: Prisma.AuditLogWhereInput[] = []
  if (query.from || query.to) filters.push({ createdAt: { gte: query.from, lte: query.to } })
  if (query.outcome) filters.push({ metadata: { path: ['outcome'], equals: query.outcome } })
  if (query.ticket) filters.push({ metadata: { path: ['cd_senha'], equals: query.ticket } })
  return filters
}
