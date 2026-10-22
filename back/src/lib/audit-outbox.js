"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditOutbox = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
class AuditOutbox {
    directory;
    deliver;
    running = false;
    flushPending;
    deliveryFailures = 0;
    consecutiveFailures = 0;
    delivered = 0;
    lastSuccess = null;
    lastFailure = null;
    async health() {
        let pending = 0, bytes = 0, oldest = Date.now(), temporaryFiles = 0;
        let readable = true;
        try {
            for (const name of await promises_1.default.readdir(this.directory).catch((error) => { if (error.code === 'ENOENT')
                return []; throw error; })) {
                if (name.endsWith('.tmp'))
                    temporaryFiles++;
                if (!/^[a-f0-9-]{36}\.json$/i.test(name))
                    continue;
                const stat = await promises_1.default.stat(node_path_1.default.join(this.directory, name)).catch((error) => { if (error.code === 'ENOENT')
                    return null; throw error; });
                if (!stat)
                    continue;
                pending++;
                bytes += stat.size;
                oldest = Math.min(oldest, stat.mtimeMs);
            }
        }
        catch {
            readable = false;
        }
        const oldestPendingSeconds = pending ? Math.floor((Date.now() - oldest) / 1000) : 0;
        return { status: !readable ? 'ERRO' : this.consecutiveFailures || oldestPendingSeconds >= 60 || temporaryFiles || pending >= 80000 ? 'ATENCAO' : 'OK',
            readable, pending, writesPending: this.queuedWrites, bytes, temporaryFiles, oldestPendingSeconds, capacity: 100000,
            deliveryFailures: this.deliveryFailures, consecutiveFailures: this.consecutiveFailures,
            delivered: this.delivered, lastSuccess: this.lastSuccess, lastFailure: this.lastFailure,
            sending: this.running, checkedAt: new Date().toISOString() };
    }
    timer;
    constructor(directory, deliver) {
        this.directory = directory;
        this.deliver = deliver;
    }
    writes = Promise.resolve();
    queuedWrites = 0;
    async enqueue(input) {
        const event = { ...input, eventId: input.eventId ?? (0, node_crypto_1.randomUUID)(), createdAt: input.createdAt ?? new Date().toISOString() };
        if (!/^[a-f0-9-]{36}$/i.test(event.eventId))
            throw Error('AUDIT_INVALID_ID');
        const data = Buffer.from(JSON.stringify(event));
        if (data.length > 262144)
            throw Error('AUDIT_EVENT_TOO_LARGE');
        if (this.queuedWrites >= 1000)
            throw Error('AUDIT_WRITE_BACKLOG_FULL');
        this.queuedWrites++;
        const write = this.writes.then(async () => {
            await promises_1.default.mkdir(this.directory, { recursive: true, mode: 0o700 });
            const files = (await promises_1.default.readdir(this.directory)).filter(name => name.endsWith('.json'));
            if (files.length >= 100000)
                throw Error('AUDIT_QUEUE_FULL');
            const target = node_path_1.default.join(this.directory, event.eventId + '.json');
            if (await promises_1.default.stat(target).then(() => true, (error) => { if (error.code === 'ENOENT')
                return false; throw error; }))
                return event.eventId;
            const temporary = target + '.' + (0, node_crypto_1.randomUUID)() + '.tmp';
            const fd = await promises_1.default.open(temporary, 'wx', 0o600);
            try {
                await fd.writeFile(data);
                await fd.sync();
            }
            finally {
                await fd.close();
            }
            await promises_1.default.rename(temporary, target);
            await this.syncDirectory();
            this.start();
            return event.eventId;
        });
        this.writes = write.catch(() => undefined);
        try {
            return await write;
        }
        finally {
            this.queuedWrites--;
        }
    }
    async syncDirectory() {
        if (process.platform === 'win32')
            return;
        const fd = await promises_1.default.open(this.directory, 'r');
        try {
            await fd.sync();
        }
        finally {
            await fd.close();
        }
    }
    start() {
        if (this.timer)
            return;
        this.timer = setInterval(() => { void this.flush(); }, 5000);
        this.timer.unref();
    }
    async stop() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = undefined;
        await this.writes;
        if (this.timer)
            clearInterval(this.timer);
        this.timer = undefined;
        await this.flushPending;
    }
    flush() {
        if (this.flushPending)
            return this.flushPending;
        this.flushPending = this.flushBatch().finally(() => { this.flushPending = undefined; });
        return this.flushPending;
    }
    async flushBatch() {
        this.running = true;
        try {
            const files = (await promises_1.default.readdir(this.directory).catch((error) => { if (error.code === 'ENOENT')
                return []; throw error; })).filter(name => /^[a-f0-9-]{36}\.json$/i.test(name)).slice(0, 100);
            for (const name of files) {
                const file = node_path_1.default.join(this.directory, name);
                const event = JSON.parse(await promises_1.default.readFile(file, 'utf8'));
                await this.deliver(event);
                await promises_1.default.unlink(file);
                await this.syncDirectory();
                this.delivered++;
                this.lastSuccess = new Date().toISOString();
                this.consecutiveFailures = 0;
            }
        }
        catch {
            this.deliveryFailures++;
            this.consecutiveFailures++;
            this.lastFailure = new Date().toISOString();
            console.error('AUDIT_DELIVERY_FAILED: eventos preservados para reenvio');
        }
        finally {
            this.running = false;
        }
    }
}
exports.AuditOutbox = AuditOutbox;
