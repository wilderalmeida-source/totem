import path from 'node:path'
import { PrismaLog } from '../../config/prismalog'
import { AuditOutbox, type AuditEvent } from './audit-outbox'

const state = globalThis as typeof globalThis & { auditOutbox?: AuditOutbox }
export const auditOutbox = state.auditOutbox ??= new AuditOutbox(
  process.env.AUDIT_QUEUE_DIR ?? path.resolve('data/audit-outbox'),
  async event => {
    await PrismaLog.$executeRaw`
      INSERT INTO "AuditLog" ("eventId", "createdAt", "category", "action", "sessionId", "actor", "step", "metadata")
      VALUES (${event.eventId}::uuid, ${new Date(event.createdAt)}, ${event.category}, ${event.action},
        ${event.sessionId ?? null}, ${event.actor ?? null}, ${event.step ?? null}, ${JSON.stringify(event.metadata ?? null)}::jsonb)
      ON CONFLICT ("eventId") DO NOTHING
    `
  },
)
export function persistAudit(event: Omit<AuditEvent, 'eventId' | 'createdAt'> & Partial<Pick<AuditEvent, 'eventId' | 'createdAt'>>) {
  return auditOutbox.enqueue(event)
}
export function recordAudit(event: Parameters<typeof persistAudit>[0]) {
  try { persistAudit(event) } catch { console.error('AUDIT_LOCAL_WRITE_FAILED: evento nao persistido') }
}
