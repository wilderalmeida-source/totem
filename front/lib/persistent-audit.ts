import path from 'node:path'
import { AuditOutbox } from './audit-outbox'

const state = globalThis as typeof globalThis & { nextAuditOutbox?: AuditOutbox }
export const auditOutbox = state.nextAuditOutbox ??= new AuditOutbox(
  process.env.AUDIT_QUEUE_DIR ?? path.resolve('data/audit-outbox'),
  async event => {
    const base = process.env.LINK_API_INTERNA, token = process.env.TOKEN_API_INT
    if (!base || !token) throw Error('AUDIT_BACKEND_UNAVAILABLE')
    const response = await fetch(new URL('/clinux/audit', base), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(event), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw Error('AUDIT_BACKEND_REJECTED')
  },
)
export function recordAudit(event: Parameters<AuditOutbox['enqueue']>[0]) {
  try { auditOutbox.enqueue(event) } catch { console.error('AUDIT_LOCAL_WRITE_FAILED') }
}
