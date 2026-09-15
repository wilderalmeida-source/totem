const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const Fastify = require('fastify');
const { randomUUID } = require('node:crypto');
const crypto = require('../src/lib/totem-pin.js');

async function setup(t) {
  let user;
  const sessions = new Map(), attempts = new Map();
  const policy = { id: 1, enabled: true, sessionHours: 12, pinValidityDays: 90 };
  const select = (row, fields) => fields ? Object.fromEntries(Object.keys(fields).map(k => [k, row[k]])) : { ...row };
  const db = {
    auditLog: { create: async () => ({}) },
    totemAccessSettings: { upsert: async ({ update }) => Object.assign(policy, update) },
    totemOperator: {
      count: async () => user?.active ? 1 : 0,
      create: async ({ data, select: fields }) => { user = { id: 1, cardId: randomUUID(), active: true, version: 1, mustChangePin: true, ...data }; return select(user, fields); },
      findUnique: async ({ where }) => where.cardId === user?.cardId ? { ...user } : null,
      updateMany: async ({ where, data }) => { if (user.version !== where.version || !user.active) return { count: 0 }; Object.assign(user, data, { version: user.version + 1 }); return { count: 1 }; },
    },
    totemOperatorSession: {
      findUnique: async ({ where }) => sessions.has(where.tokenHash) ? { ...sessions.get(where.tokenHash), operator: { ...user } } : null,
      create: async ({ data }) => { sessions.set(data.tokenHash, { restricted: false, ...data }); return data; },
      deleteMany: async ({ where }) => { for (const [key, row] of sessions) if (!where || where.operatorId === row.operatorId || where.tokenHash === key || (where.expiresAt && row.expiresAt < where.expiresAt.lt)) sessions.delete(key); },
    },
    totemLoginAttempt: {
      upsert: async ({ where }) => { const count = (attempts.get(where.key) || 0) + 1; attempts.set(where.key, count); return { count }; },
      deleteMany: async ({ where }) => { if (where.key) attempts.delete(where.key); },
    },
  };
  db.$transaction = fn => fn(db);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/routes/totem-access.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, require: name => name.includes('persistent-audit') ? { recordAudit: data => { void db.auditLog.create({ data }); } } : name.includes('prismalog') ? { PrismaLog: db } : name.includes('totem-pin') ? crypto : require(name) });
  const app = Fastify();
  app.register(exports.totemAccessRoutes);
  t.after(() => app.close());
  const call = async (action, body, method = 'POST') => {
    const response = await app.inject({ method, url: `/clinux/totem-access/${action}`, payload: body });
    return { status: response.statusCode, ...response.json() };
  };
  return { call, policy, get user() { return user; }, sessions };
}
const clientKey = 'a'.repeat(64);
const input = () => ({ username: 'colaborador.teste', displayName: 'Colaborador Teste', pin: '1234', pinExpiresAt: new Date(Date.now() + 86400000).toISOString() });

test('PIN de quatro digitos, primeira troca, sessao reutilizavel e revogacao', async t => {
  const e = await setup(t);
  assert.equal((await e.call('users', { ...input(), pin: '123' })).status, 400);
  const created = await e.call('users', input());
  assert.equal(created.status, 201);
  assert.equal(created.pinHash, undefined);
  assert.notEqual(e.user.pinHash, '1234');
  const login = await e.call('login', { cardId: created.cardId, pin: '1234', clientKey });
  assert.equal(login.mustChangePin, true);
  assert.equal((await e.call('check', { token: login.token })).allowed, false);
  assert.equal((await e.call('change-pin', { token: login.token, newPin: '1234' })).status, 400);
  const changed = await e.call('change-pin', { token: login.token, newPin: '9876' });
  assert.equal(changed.status, 200);
  assert.equal((await e.call('check', { token: login.token })).allowed, false);
  for (let i = 0; i < 3; i++) assert.equal((await e.call('check', { token: changed.token })).allowed, true);
  assert.equal(await crypto.verifyPin('9876', e.user.pinHash), true);
  assert.equal((await e.call('change-pin', { token: changed.token, newPin: '5555' })).status, 401);
  await e.call('logout', { token: changed.token });
  assert.equal((await e.call('check', { token: changed.token })).allowed, false);
});

test('PIN expirado exige troca e tentativas nao escapam usando UUID maiusculo', async t => {
  const e = await setup(t);
  const created = await e.call('users', input());
  e.user.mustChangePin = false;
  e.user.pinExpiresAt = new Date(0);
  assert.equal((await e.call('login', { cardId: created.cardId, pin: '1234', clientKey })).mustChangePin, true);
  for (let i = 0; i < 5; i++) assert.equal((await e.call('login', { cardId: i % 2 ? created.cardId.toUpperCase() : created.cardId, pin: '9999', clientKey })).status, 401);
  assert.equal((await e.call('login', { cardId: created.cardId, pin: '1234', clientKey })).status, 429);
});

test('login desativado libera sem cartao; ativacao exige colaborador', async t => {
  const e = await setup(t);
  assert.equal((await e.call('settings', { enabled: true, sessionHours: 12, pinValidityDays: 90 }, 'PUT')).status, 400);
  e.policy.enabled = false;
  assert.equal((await e.call('check', {})).allowed, true);
});
