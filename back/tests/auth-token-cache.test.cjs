const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(rows) {
  const exports = {};
  const calls = [];
  const findUnique = async ({ where }) => { calls.push(where.tokenHash); return rows[where.tokenHash] ?? null; };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../middleware/autenticate.js'), 'utf8'), {
    exports, Date,
    require: name => name.includes('prismalog') ? { PrismaLog: { token: { findUnique } } } : name.includes('token') ? { hashToken: t => `h:${t}` } : require(name),
  });
  const reply = () => ({ status: 0, body: null, code(c) { this.status = c; return this; }, send(b) { this.body = b; return this; } });
  const call = async token => { const r = reply(); const req = { headers: { authorization: `Bearer ${token}` } }; await exports.authenticate(req, r); return { status: r.status, req }; };
  return { calls, call, exports };
}

test('token valido vai ao banco uma vez e depois usa o cache', async () => {
  const future = new Date(Date.now() + 3600_000);
  const { calls, call } = load({ 'h:ok': { expiresAt: future, revokedAt: null } });
  for (let i = 0; i < 5; i++) assert.equal((await call('ok')).status, 0);
  assert.equal(calls.length, 1);
});

test('token vencido continua recusado mesmo em cache; token inexistente tambem fica em cache curto', async () => {
  const { calls, call } = load({ 'h:old': { expiresAt: new Date(Date.now() - 1000), revokedAt: null }, 'h:rev': { expiresAt: new Date(Date.now() + 3600_000), revokedAt: new Date() } });
  assert.equal((await call('old')).status, 401);
  assert.equal((await call('old')).status, 401);
  assert.equal((await call('rev')).status, 401);
  assert.equal((await call('nope')).status, 401);
  assert.equal((await call('nope')).status, 401);
  assert.deepEqual(calls, ['h:old', 'h:rev', 'h:nope']);
});
