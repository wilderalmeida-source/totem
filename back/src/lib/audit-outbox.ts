import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export type AuditEvent = { eventId: string; createdAt: string; category: string; action: string; sessionId?: string; actor?: string; step?: string; metadata?: unknown }
export class AuditOutbox {
  private running = false
  private deliveryFailures = 0
  private consecutiveFailures = 0
  private delivered = 0
  private lastSuccess: string | null = null
  private lastFailure: string | null = null
  health() {
    let pending = 0, bytes = 0, oldest = Date.now(), temporaryFiles = 0
    let readable = true
    try {
      if (fs.existsSync(this.directory)) for (const name of fs.readdirSync(this.directory)) {
        if (name.endsWith('.tmp')) temporaryFiles++
        if (!/^[a-f0-9-]{36}\.json$/i.test(name)) continue
        const stat = fs.statSync(path.join(this.directory, name))
        pending++; bytes += stat.size; oldest = Math.min(oldest, stat.mtimeMs)
      }
    } catch { readable = false }
    const oldestPendingSeconds = pending ? Math.floor((Date.now() - oldest) / 1000) : 0
    return { status: !readable ? 'ERRO' : this.consecutiveFailures || oldestPendingSeconds >= 60 || temporaryFiles || pending >= 80000 ? 'ATENCAO' : 'OK',
      readable, pending, bytes, temporaryFiles, oldestPendingSeconds, capacity: 100000,
      deliveryFailures: this.deliveryFailures, consecutiveFailures: this.consecutiveFailures,
      delivered: this.delivered, lastSuccess: this.lastSuccess, lastFailure: this.lastFailure,
      sending: this.running, checkedAt: new Date().toISOString() }
  }
  private timer?: ReturnType<typeof setInterval>
  constructor(private directory: string, private deliver: (event: AuditEvent) => Promise<void>) {}
  enqueue(input: Omit<AuditEvent, 'eventId' | 'createdAt'> & Partial<Pick<AuditEvent, 'eventId' | 'createdAt'>>) {
    const event: AuditEvent = { ...input, eventId: input.eventId ?? randomUUID(), createdAt: input.createdAt ?? new Date().toISOString() }
    if (!/^[a-f0-9-]{36}$/i.test(event.eventId)) throw Error('AUDIT_INVALID_ID')
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 })
    const data = Buffer.from(JSON.stringify(event))
    if (data.length > 262144) throw Error('AUDIT_EVENT_TOO_LARGE')
    const files = fs.readdirSync(this.directory).filter(name => name.endsWith('.json'))
    if (files.length >= 100000) throw Error('AUDIT_QUEUE_FULL')
    const target = path.join(this.directory, event.eventId + '.json')
    if (fs.existsSync(target)) return event.eventId
    const temporary = target + '.' + randomUUID() + '.tmp'
    const fd = fs.openSync(temporary, 'wx', 0o600)
    try { fs.writeFileSync(fd, data); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
    fs.renameSync(temporary, target)
    this.syncDirectory()
    this.start()
    return event.eventId
  }
  private syncDirectory() {
    if (process.platform === 'win32') return
    const fd = fs.openSync(this.directory, 'r')
    try { fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  }
  start() {
    if (this.timer) return
    this.timer = setInterval(() => { void this.flush() }, 5000)
    this.timer.unref()
    void this.flush()
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined }
  async flush() {
    if (this.running) return
    this.running = true
    try {
      if (!fs.existsSync(this.directory)) return
      const files = fs.readdirSync(this.directory).filter(name => /^[a-f0-9-]{36}\.json$/i.test(name)).slice(0, 100)
      for (const name of files) {
        const file = path.join(this.directory, name)
        const event = JSON.parse(fs.readFileSync(file, 'utf8')) as AuditEvent
        await this.deliver(event)
        fs.unlinkSync(file)
        this.syncDirectory()
        this.delivered++
        this.lastSuccess = new Date().toISOString()
        this.consecutiveFailures = 0
      }
    } catch {
      this.deliveryFailures++; this.consecutiveFailures++
      this.lastFailure = new Date().toISOString()
      console.error('AUDIT_DELIVERY_FAILED: eventos preservados para reenvio')
    }
    finally { this.running = false }
  }
}
