const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');

function load({ session = null, totemAllowed = false } = {}, calls) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', 'app/api/backend/[...path]/route.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, Headers, Response, console,
    process: { env: { LINK_API_INTERNA: 'http://backend:5000', TOKEN_API_INT: 'test-token', SESSION_SECRET: 'test-secret' } },
    require: name => name === 'next/server' ? require(name) : {
      auditServer: () => {}, recordAudit: () => {},
      requireTotemOperator: async () => totemAllowed ? null : NextResponse.json({ error: 'Libere o totem com cartão e PIN.' }, { status: 401 }),
      ADMIN_SESSION_COOKIE: 'session', readAdminSession: async () => session,
      PATIENT_SESSION_COOKIE: 'patient-session', readPatientSession: () => null,
    },
    fetch: async (url, options) => { calls.push({ url: String(url), options }); return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); },
  });
  return exports;
}

function call(proxy, route, method = 'GET') {
  const nextUrl = new URL('http://frontend:3000/' + route);
  const req = { method, nextUrl, url: nextUrl.href, cookies: { get: () => ({ value: 'cookie' }) }, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) };
  return proxy[method](req, { params: Promise.resolve({ path: nextUrl.pathname.slice(1).split('/') }) });
}

test('POST /clinux/voice exige administrador com permissão VOZ', async () => {
  const calls = [];
  assert.equal((await call(load({ totemAllowed: true }, calls), 'clinux/voice', 'POST')).status, 401);
  assert.equal((await call(load({ session: { sub: 'u', permissions: ['LOGS'] } }, calls), 'clinux/voice', 'POST')).status, 403);
  assert.equal(calls.length, 0);
  assert.equal((await call(load({ session: { sub: 'u', permissions: ['VOZ'] } }, calls), 'clinux/voice', 'POST')).status, 200);
  assert.equal(calls.length, 1);
});

test('POST /clinux/audit não passa pelo proxy; GET continua para quem tem LOGS', async () => {
  const calls = [];
  const admin = load({ session: { sub: 'admin', permissions: ['*'] } }, calls);
  for (const method of ['POST', 'PUT', 'DELETE']) {
    assert.equal((await call(admin, 'clinux/audit', method)).status, 404);
    assert.equal((await call(load({}, calls), 'clinux/audit', method)).status, 404);
  }
  assert.equal(calls.length, 0);
  assert.equal((await call(admin, 'clinux/audit?limit=10')).status, 200);
  assert.equal((await call(load({}, calls), 'clinux/audit')).status, 401);
  assert.equal(calls.length, 1);
});

test('GET /clinux/atencao: totem liberado ou admin ATENCAO tocam; anônimo não', async () => {
  const calls = [];
  assert.equal((await call(load({}, calls), 'clinux/atencao?TorP=play')).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await call(load({ totemAllowed: true }, calls), 'clinux/atencao?TorP=play')).status, 200);
  assert.equal((await call(load({ session: { sub: 'u', permissions: ['ATENCAO'] } }, calls), 'clinux/atencao?TorP=play')).status, 200);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(c => c.url.endsWith('/clinux/atencao?TorP=play')));
});
