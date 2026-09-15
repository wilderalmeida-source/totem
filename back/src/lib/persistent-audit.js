"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditOutbox = void 0;
exports.persistAudit = persistAudit;
exports.recordAudit = recordAudit;
const node_path_1 = __importDefault(require("node:path"));
const prismalog_1 = require("../../config/prismalog");
const audit_outbox_1 = require("./audit-outbox");
const state = globalThis;
exports.auditOutbox = state.auditOutbox ??= new audit_outbox_1.AuditOutbox(process.env.AUDIT_QUEUE_DIR ?? node_path_1.default.resolve('data/audit-outbox'), async (event) => {
    await prismalog_1.PrismaLog.$executeRaw `
      INSERT INTO "AuditLog" ("eventId", "createdAt", "category", "action", "sessionId", "actor", "step", "metadata")
      VALUES (${event.eventId}::uuid, ${new Date(event.createdAt)}, ${event.category}, ${event.action},
        ${event.sessionId ?? null}, ${event.actor ?? null}, ${event.step ?? null}, ${JSON.stringify(event.metadata ?? null)}::jsonb)
      ON CONFLICT ("eventId") DO NOTHING
    `;
});
function persistAudit(event) {
    return exports.auditOutbox.enqueue(event);
}
function recordAudit(event) {
    try {
        persistAudit(event);
    }
    catch {
        console.error('AUDIT_LOCAL_WRITE_FAILED: evento nao persistido');
    }
}
