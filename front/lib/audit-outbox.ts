import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export type AuditEvent = { eventId: string; createdAt: string; category: string; action: string; sessionId?: string; actor?: string; step?: string; metadata?: unknown }
export class AuditOutbox {
  private running = false
  private flushPending?: Promise<void>
  private deliveryFailures = 0
  private consecutiveFailures = 0
  private delivered = 0
  private lastSuccess: string | null = null
  private lastFailure: string | null = null
  async health() {
    let pending = 0, bytes = 0, oldest = Date.now(), temporaryFiles = 0
    let readable = true
    try {
      for (const name of await fs.readdir(this.directory).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error })) {
        if (name.endsWith('.tmp')) temporaryFiles++
        if (!/^[a-f0-9-]{36}\.json$/i.test(name)) continue
        const stat = await fs.stat(path.join(this.directory, name)).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return null; throw error })
        if (!stat) continue
        pending++; bytes += stat.size; oldest = Math.min(oldest, stat.mtimeMs)
      }
    } catch { readable = false }
    const oldestPendingSeconds = pending ? Math.floor((Date.now() - oldest) / 1000) : 0
    return { status: !readable ? 'ERRO' : this.consecutiveFailures || oldestPendingSeconds >= 60 || temporaryFiles || pending >= 80000 ? 'ATENCAO' : 'OK',
      readable, pending, writesPending: this.queuedWrites, bytes, temporaryFiles, oldestPendingSeconds, capacity: 100000,
      deliveryFailures: this.deliveryFailures, consecutiveFailures: this.consecutiveFailures,
      delivered: this.delivered, lastSuccess: this.lastSuccess, lastFailure: this.lastFailure,
      sending: this.running, checkedAt: new Date().toISOString() }
  }
  private timer?: ReturnType<typeof setInterval>
  constructor(private directory: string, private deliver: (event: AuditEvent) => Promise<void>) {}
  private writes: Promise<unknown> = Promise.resolve()
  private queuedWrites = 0
  async enqueue(input: Omit<AuditEvent, 'eventId' | 'createdAt'> & Partial<Pick<AuditEvent, 'eventId' | 'createdAt'>>) {
    const event: AuditEvent = { ...input, eventId: input.eventId ?? randomUUID(), createdAt: input.createdAt ?? new Date().toISOString() }
    if (!/^[a-f0-9-]{36}$/i.test(event.eventId)) throw Error('AUDIT_INVALID_ID')

    const data = Buffer.from(JSON.stringify(event))
    if (data.length > 262144) throw Error('AUDIT_EVENT_TOO_LARGE')
    if (this.queuedWrites >= 1000) throw Error('AUDIT_WRITE_BACKLOG_FULL')
    this.queuedWrites++
    const write = this.writes.then(async () => {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 })
    const files = (await fs.readdir(this.directory)).filter(name => name.endsWith('.json'))
    if (files.length >= 100000) throw Error('AUDIT_QUEUE_FULL')
    const target = path.join(this.directory, event.eventId + '.json')
    if (await fs.stat(target).then(() => true, (error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return false; throw error })) return event.eventId
    const temporary = target + '.' + randomUUID() + '.tmp'
    const fd = await fs.open(temporary, 'wx', 0o600)
    try { await fd.writeFile(data); await fd.sync() } finally { await fd.close() }
    await fs.rename(temporary, target)
    await this.syncDirectory()
    this.start()
    return event.eventId
    })
    this.writes = write.catch(() => undefined)
    try { return await write } finally { this.queuedWrites-- }
  }
  private async syncDirectory() {
    if (process.platform === 'win32') return
    const fd = await fs.open(this.directory, 'r')
    try { await fd.sync() } finally { await fd.close() }
  }
  start() {
    if (this.timer) return
    this.timer = setInterval(() => { void this.flush() }, 5000)
    this.timer.unref()
  }
  async stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    await this.writes
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    await this.flushPending
  }
  flush(): Promise<void> {
    if (this.flushPending) return this.flushPending
    this.flushPending = this.flushBatch().finally(() => { this.flushPending = undefined })
    return this.flushPending
  }
  private async flushBatch() {
    this.running = true
    try {
      const files = (await fs.readdir(this.directory).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error })).filter(name => /^[a-f0-9-]{36}\.json$/i.test(name)).slice(0, 100)
      for (const name of files) {
        const file = path.join(this.directory, name)
        const event = JSON.parse(await fs.readFile(file, 'utf8')) as AuditEvent
        await this.deliver(event)
        await fs.unlink(file)
        await this.syncDirectory()
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
