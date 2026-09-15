import { PrismaLog } from '../../config/prismalog'
import { recordAudit } from './persistent-audit'

export function retentionDays(value: string | undefined): number | null {
  if (!value || value === '0') return null
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 3650) {
    throw new Error('AUDIT_RETENTION_DAYS deve ser inteiro entre 1 e 3650, ou 0 para desativar')
  }
  return Number(value)
}

export function startAuditRetention() {
  const days = retentionDays(process.env.AUDIT_RETENTION_DAYS)
  if (days === null) return () => {}
  let running = false
  const clean = async () => {
    if (running) return
    running = true
    try {
      const cutoff = new Date(Date.now() - days * 86400000)
      // Bounded batch, restricted to the logs database. Never lock clinical tables.
      const removed = await PrismaLog.$executeRaw`
        DELETE FROM "AuditLog" WHERE "id" IN (
          SELECT "id" FROM "AuditLog" WHERE "createdAt" < ${cutoff}
          ORDER BY "createdAt", "id" LIMIT 1000 FOR UPDATE SKIP LOCKED
        )
      `
      if (removed > 0) recordAudit({ category: 'ADMIN', actor: 'sistema', action: 'logs_retencao_aplicada',
        step: 'administracao', metadata: { days, cutoff: cutoff.toISOString(), removed, outcome: 'CONCLUIDO' } })
    } catch {
      console.error('AUDIT_RETENTION_FAILED')
      recordAudit({ category: 'ADMIN', actor: 'sistema', action: 'logs_retencao_falhou',
        step: 'administracao', metadata: { outcome: 'FALHOU' } })
    } finally { running = false }
  }
  const timer = setInterval(() => { void clean() }, 60000)
  timer.unref()
  void clean()
  return () => clearInterval(timer)
}
