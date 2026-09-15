"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditOutbox = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
class AuditOutbox {
    directory;
    deliver;
    running = false;
    deliveryFailures = 0;
    consecutiveFailures = 0;
    delivered = 0;
    lastSuccess = null;
    lastFailure = null;
    health() {
        let pending = 0, bytes = 0, oldest = Date.now(), temporaryFiles = 0;
        let readable = true;
        try {
            if (node_fs_1.default.existsSync(this.directory))
                for (const name of node_fs_1.default.readdirSync(this.directory)) {
                    if (name.endsWith('.tmp'))
                        temporaryFiles++;
                    if (!/^[a-f0-9-]{36}\.json$/i.test(name))
                        continue;
                    const stat = node_fs_1.default.statSync(node_path_1.default.join(this.directory, name));
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
            readable, pending, bytes, temporaryFiles, oldestPendingSeconds, capacity: 100000,
            deliveryFailures: this.deliveryFailures, consecutiveFailures: this.consecutiveFailures,
            delivered: this.delivered, lastSuccess: this.lastSuccess, lastFailure: this.lastFailure,
            sending: this.running, checkedAt: new Date().toISOString() };
    }
    timer;
    constructor(directory, deliver) {
        this.directory = directory;
        this.deliver = deliver;
    }
    enqueue(input) {
        const event = { ...input, eventId: input.eventId ?? (0, node_crypto_1.randomUUID)(), createdAt: input.createdAt ?? new Date().toISOString() };
        if (!/^[a-f0-9-]{36}$/i.test(event.eventId))
            throw Error('AUDIT_INVALID_ID');
        node_fs_1.default.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
        const data = Buffer.from(JSON.stringify(event));
        if (data.length > 262144)
            throw Error('AUDIT_EVENT_TOO_LARGE');
        const files = node_fs_1.default.readdirSync(this.directory).filter(name => name.endsWith('.json'));
        if (files.length >= 100000)
            throw Error('AUDIT_QUEUE_FULL');
        const target = node_path_1.default.join(this.directory, event.eventId + '.json');
        if (node_fs_1.default.existsSync(target))
            return event.eventId;
        const temporary = target + '.' + (0, node_crypto_1.randomUUID)() + '.tmp';
        const fd = node_fs_1.default.openSync(temporary, 'wx', 0o600);
        try {
            node_fs_1.default.writeFileSync(fd, data);
            node_fs_1.default.fsyncSync(fd);
        }
        finally {
            node_fs_1.default.closeSync(fd);
        }
        node_fs_1.default.renameSync(temporary, target);
        this.syncDirectory();
        this.start();
        return event.eventId;
    }
    syncDirectory() {
        if (process.platform === 'win32')
            return;
        const fd = node_fs_1.default.openSync(this.directory, 'r');
        try {
            node_fs_1.default.fsyncSync(fd);
        }
        finally {
            node_fs_1.default.closeSync(fd);
        }
    }
    start() {
        if (this.timer)
            return;
        this.timer = setInterval(() => { void this.flush(); }, 5000);
        this.timer.unref();
        void this.flush();
    }
    stop() { if (this.timer)
        clearInterval(this.timer); this.timer = undefined; }
    async flush() {
        if (this.running)
            return;
        this.running = true;
        try {
            if (!node_fs_1.default.existsSync(this.directory))
                return;
            const files = node_fs_1.default.readdirSync(this.directory).filter(name => /^[a-f0-9-]{36}\.json$/i.test(name)).slice(0, 100);
            for (const name of files) {
                const file = node_path_1.default.join(this.directory, name);
                const event = JSON.parse(node_fs_1.default.readFileSync(file, 'utf8'));
                await this.deliver(event);
                node_fs_1.default.unlinkSync(file);
                this.syncDirectory();
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
