import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export type AuditEvent = { eventId: string; createdAt: string; category: string; action: string; sessionId?: string; actor?: string; step?: string; metadata?: unknown }
const EVENT_FILE = /^[a-f0-9-]{36}\.json$/i
// Só os temporários criados pela própria fila. Antivírus/sincronização no Windows criam cópias
// como "<ID>.JSON.tmp" na pasta, que não podem deixar a saúde da fila em ATENÇÃO.
const OWN_TEMP_FILE = /^[a-f0-9-]{36}\.json\.[a-f0-9-]{36}\.tmp$/

// Arquivo ilegível (JSON quebrado, campos faltando) não pode travar a fila: vai para "<nome>.corrupt".
function validEvent(value: unknown): value is AuditEvent {
  const event = value as AuditEvent
  return Boolean(event) && typeof event === 'object' && typeof event.eventId === 'string' && /^[a-f0-9-]{36}$/i.test(event.eventId)
    && typeof event.createdAt === 'string' && Number.isFinite(Date.parse(event.createdAt))
    && typeof event.category === 'string' && typeof event.action === 'string'
}

export class AuditOutbox {
  // Quantidade de eventos na pasta, mantida em memória: antes cada evento listava a pasta inteira.
  // Recontada a cada envio de lote, que já lista a pasta.
  private fileCount: number | null = null
  private corrupted = 0
  private running = false
  private flushPending?: Promise<void>
  private deliveryFailures = 0
  private consecutiveFailures = 0
  private delivered = 0
  private lastSuccess: string | null = null
  private lastFailure: string | null = null
  async health() {
    let pending = 0, bytes = 0, oldest = Date.now(), temporaryFiles = 0, corruptFiles = 0
    let readable = true
    try {
      for (const name of await fs.readdir(this.directory).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error })) {
        if (OWN_TEMP_FILE.test(name)) temporaryFiles++
        if (name.endsWith('.corrupt')) corruptFiles++
        if (!EVENT_FILE.test(name)) continue
        const stat = await fs.stat(path.join(this.directory, name)).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return null; throw error })
        if (!stat) continue
        pending++; bytes += stat.size; oldest = Math.min(oldest, stat.mtimeMs)
      }
    } catch { readable = false }
    const oldestPendingSeconds = pending ? Math.floor((Date.now() - oldest) / 1000) : 0
    return { status: !readable ? 'ERRO' : this.consecutiveFailures || oldestPendingSeconds >= 60 || temporaryFiles || corruptFiles || pending >= 80000 ? 'ATENCAO' : 'OK',
      readable, pending, writesPending: this.queuedWrites, bytes, temporaryFiles, corruptFiles, oldestPendingSeconds, capacity: 100000,
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
    if (this.fileCount === null) this.fileCount = (await fs.readdir(this.directory)).filter(name => name.endsWith('.json')).length
    if (this.fileCount >= 100000) throw Error('AUDIT_QUEUE_FULL')
    const target = path.join(this.directory, event.eventId + '.json')
    if (await fs.stat(target).then(() => true, (error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return false; throw error })) return event.eventId
    const temporary = target + '.' + randomUUID() + '.tmp'
    const fd = await fs.open(temporary, 'wx', 0o600)
    try { await fd.writeFile(data); await fd.sync() } finally { await fd.close() }
    await fs.rename(temporary, target)
    await this.syncDirectory()
    this.fileCount++
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
      const all = (await fs.readdir(this.directory).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error }))
      this.fileCount = all.filter(name => name.endsWith('.json')).length
      const files = all.filter(name => EVENT_FILE.test(name)).slice(0, 100)
      for (const name of files) {
        const file = path.join(this.directory, name)
        let event: unknown
        try { event = JSON.parse(await fs.readFile(file, 'utf8')) } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
          event = undefined
        }
        if (!validEvent(event)) {
          await fs.rename(file, file + '.corrupt')
          this.fileCount = Math.max(0, this.fileCount - 1)
          this.corrupted++
          console.error('AUDIT_EVENT_CORRUPT: arquivo separado como .corrupt para a fila seguir')
          continue
        }
        await this.deliver(event)
        // Sem fsync aqui: se o unlink se perder numa queda, o evento é reenviado e o banco ignora (ON CONFLICT).
        await fs.unlink(file)
        this.fileCount = Math.max(0, this.fileCount - 1)
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
