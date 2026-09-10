import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { PrismaLog } from '../../config/prismalog'
import type { Prisma } from '../../prisma-logs/app/generated/prisma/clientLog'

export const auditContext = new AsyncLocalStorage<{ flowId: string; device: string }>()
export function auditIdentifier(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value) ? value : undefined
}
let pending = 0
let dropped = 0
export function flowAudit(action: string, step: string, metadata: Record<string, unknown> = {}) {
  if (pending >= 100) { dropped++; return }
  const context = auditContext.getStore()
  const discarded = dropped
  dropped = 0
  pending++
  void Promise.resolve().then(() => PrismaLog.auditLog.create({ data: {
    category: 'TOTEM', action, step, sessionId: context?.flowId ?? randomUUID(),
    metadata: JSON.parse(JSON.stringify({ ...metadata, device: context?.device, source: 'backend',
      version: process.env.APP_VERSION ?? 'nao_informada', droppedEvents: discarded })) as Prisma.InputJsonValue,
  } })).catch(() => console.error('AUDIT_WRITE_FAILED')).finally(() => { pending-- })
}
export async function auditOperation<T>(step: string, operation: () => Promise<T>): Promise<T> {
  const start = Date.now()
  try {
    const result = await operation()
    flowAudit('operacao_concluida', step, { durationMs: Date.now() - start })
    return result
  } catch (error) {
    flowAudit('operacao_falhou', step, { durationMs: Date.now() - start,
      code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'OPERATION_FAILED' })
    throw error
  }
}
