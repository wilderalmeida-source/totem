import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import { recordAudit } from './persistent-audit'


export const auditContext = new AsyncLocalStorage<{ flowId: string; device: string }>()
export function auditIdentifier(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value) ? value : undefined
}
export function flowAudit(action: string, step: string, metadata: Record<string, unknown> = {}) {
  const context = auditContext.getStore()
  recordAudit({ category: 'TOTEM', action, step, sessionId: context?.flowId ?? randomUUID(),
    metadata: { ...metadata, device: context?.device, source: 'backend', version: process.env.APP_VERSION ?? 'nao_informada' } })
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
