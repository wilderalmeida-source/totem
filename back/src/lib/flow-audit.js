"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditContext = void 0;
exports.auditIdentifier = auditIdentifier;
exports.flowAudit = flowAudit;
exports.auditOperation = auditOperation;
const node_async_hooks_1 = require("node:async_hooks");
const node_crypto_1 = require("node:crypto");
const prismalog_1 = require("../../config/prismalog");
exports.auditContext = new node_async_hooks_1.AsyncLocalStorage();
function auditIdentifier(value) {
    return typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,100}$/.test(value) ? value : undefined;
}
let pending = 0;
let dropped = 0;
function flowAudit(action, step, metadata = {}) {
    if (pending >= 100) {
        dropped++;
        return;
    }
    const context = exports.auditContext.getStore();
    const discarded = dropped;
    dropped = 0;
    pending++;
    void Promise.resolve().then(() => prismalog_1.PrismaLog.auditLog.create({ data: {
            category: 'TOTEM', action, step, sessionId: context?.flowId ?? (0, node_crypto_1.randomUUID)(),
            metadata: JSON.parse(JSON.stringify({ ...metadata, device: context?.device, source: 'backend',
                version: process.env.APP_VERSION ?? 'nao_informada', droppedEvents: discarded })),
        } })).catch(() => console.error('AUDIT_WRITE_FAILED')).finally(() => { pending--; });
}
async function auditOperation(step, operation) {
    const start = Date.now();
    try {
        const result = await operation();
        flowAudit('operacao_concluida', step, { durationMs: Date.now() - start });
        return result;
    }
    catch (error) {
        flowAudit('operacao_falhou', step, { durationMs: Date.now() - start,
            code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'OPERATION_FAILED' });
        throw error;
    }
}
