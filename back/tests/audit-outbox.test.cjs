const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { AuditOutbox } = require('../src/lib/audit-outbox');
function directory(t) {
 const dir = fs.mkdtempSync(path.join(__dirname, '.outbox-test-'));
 t.after(() => { for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file)); fs.rmdirSync(dir); });
 return dir;
}
const event = { category: 'TOTEM', action: 'teste', createdAt: '2026-09-12T10:00:00.000Z' };
test('saude detecta falha e recuperacao sem expor eventos', async t => {
 const dir = directory(t); let offline = true;
 const queue = new AuditOutbox(dir, async () => { if (offline) throw Error('offline'); });
 assert.equal(queue.health().status, 'OK');
 queue.enqueue(event); queue.stop(); await new Promise(resolve => setImmediate(resolve));
 const failed = queue.health();
 assert.equal(failed.status, 'ATENCAO'); assert.equal(failed.pending, 1);
 assert.equal(failed.deliveryFailures, 1); assert.ok(failed.bytes > 0);
 assert.equal(JSON.stringify(failed).includes('teste'), false);
 offline = false; await queue.flush();
 assert.equal(queue.health().status, 'OK'); assert.equal(queue.health().pending, 0);
 assert.equal(queue.health().delivered, 1); assert.equal(queue.health().consecutiveFailures, 0);
});
test('indisponibilidade preserva disco e nova instancia reenvia com horario original', async t => {
 const dir = directory(t); const first = new AuditOutbox(dir, async () => { throw Error('offline'); });
 first.enqueue(event); first.stop(); await new Promise(r => setImmediate(r));
 assert.equal(fs.readdirSync(dir).filter(f => f.endsWith('.json')).length, 1);
 const received = []; const second = new AuditOutbox(dir, async e => { received.push(e); });
 await second.flush();
 assert.equal(received.length, 1); assert.equal(received[0].createdAt, event.createdAt);
 assert.equal(fs.readdirSync(dir).length, 0);
});
test('confirmacao perdida reenvia o mesmo ID e permite gravacao idempotente', async t => {
 const dir = directory(t); const saved = new Set(); let fail = true, count = 0;
 const q = new AuditOutbox(dir, async e => { count++; saved.add(e.eventId); if (fail) throw Error('ack perdido'); });
 q.enqueue(event); q.stop(); await new Promise(r => setImmediate(r)); fail = false;
 await q.flush(); assert.equal(count, 2); assert.equal(saved.size, 1); assert.equal(fs.readdirSync(dir).length, 0);
});
test('evento grande e rejeitado sem confirmar persistencia', t => {
 const q = new AuditOutbox(directory(t), async () => {});
 assert.throws(() => q.enqueue({ ...event, metadata: 'x'.repeat(300000) }), /AUDIT_EVENT_TOO_LARGE/);
 q.stop();
});
