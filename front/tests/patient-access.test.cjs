const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, session, calls) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, Headers, Response, console,
    process: { env: { LINK_API_INTERNA: 'http://backend:5000', TOKEN_API_INT: 'test-token', SESSION_SECRET: 'test-secret' } },
    require: name => name === 'next/server' ? require(name) : {
      auditServer: () => {},
      requireTotemOperator: async () => null,
      ADMIN_SESSION_COOKIE: 'session', readAdminSession: async () => session,
      PATIENT_SESSION_COOKIE: 'patient-session', readPatientSession: () => null,
    },
    fetch: async (url, options) => { calls.push({ url, options }); return new Response('[]', { headers: { 'Content-Type': 'application/json' } }); },
  });
  return exports;
}

function request(pathname, method = 'GET') {
  const nextUrl = new URL('http://frontend:3000' + pathname);
  return { method, nextUrl, url: nextUrl.href, cookies: { get: () => ({ value: 'test-cookie' }) }, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(0) };
}

test('agenda geral exige sessão; seleção de pacientes continua pública e atendimentos exigem identificação', async () => {
  const calls = [];
  const proxy = load('app/api/backend/[...path]/route.ts', null, calls);
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await proxy[method](request('/clinux/agenda', method), { params: Promise.resolve({ path: ['clinux', 'agenda'] }) });
    assert.equal(response.status, 401);
  }
  assert.equal(calls.length, 0);
  for (const route of ['clinux/pacientes', 'clinux/totem/pacientes-com-exames']) {
    const response = await proxy.GET(request('/' + route + '?dt_nascimento=1980-01-01'), { params: Promise.resolve({ path: route.split('/') }) });
    assert.equal(response.status, 200);
  }
  assert.equal(calls.length, 2);
  assert.equal((await proxy.GET(request('/clinux/totem/atendimentos?cd_paciente=123'), { params: Promise.resolve({ path: ['clinux', 'totem', 'atendimentos'] }) })).status, 401);
  assert.ok(calls.every(call => call.options.headers.get('authorization') === 'Bearer test-token'));
});

test('administrador consegue consultar agenda; caminhos alternativos não contornam a proteção', async () => {
  const calls = [];
  const proxy = load('app/api/backend/[...path]/route.ts', { sub: 'admin', permissions: ['*'] }, calls);
  assert.equal((await proxy.GET(request('/clinux/agenda'), { params: Promise.resolve({ path: ['clinux', 'agenda'] }) })).status, 200);
  const anonymous = load('app/api/backend/[...path]/route.ts', null, calls);
  for (const segments of [
    ['clinux', 'pacientes', '..', 'agenda'], ['clinux', 'pacientes', '%2e%2e', 'agenda'],
    ['clinux', 'pacientes', '../agenda'], ['clinux', 'pacientes', '..\\agenda'],
    ['clinux', 'pacientes', '.\t.', 'agenda'],
    ['clinux', 'documentos'], ['clinux', 'arquivo'],
  ]) {
    assert.equal((await anonymous.GET(request('/'), { params: Promise.resolve({ path: segments }) })).status, 404);
  }
  assert.equal(calls.length, 1);
});

test('página de agenda também exige login', async () => {
  const middleware = load('middleware.ts', null, []);
  assert.ok(middleware.config.matcher.includes('/agenda/:path*'));
  const response = await middleware.middleware(request('/agenda'));
  assert.equal(new URL(response.headers.get('location')).pathname, '/login');
});
