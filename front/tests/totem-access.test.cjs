const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(file, mocks) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports, URL, Date, console, process: { env: { SESSION_SECRET: 'test-only' } },
    require: name => mocks[name] || require(name),
  });
  return exports;
}
const request = (url, method = 'GET', body) => new NextRequest(`https://totem.local${url}`, {
  method, headers: { host: 'totem.local', origin: 'https://totem.local', cookie: 'admin=test; totem_operator_session=cookie-token' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('middleware bloqueia totem e APIs, mas preserva painel publico e limpeza', async () => {
  let allowed = false;
  const middleware = load('middleware.ts', {
    '@/lib/totem-access': { checkTotemAccess: async () => ({ allowed }) },
    '@/lib/admin-session': { readAdminSession: async () => null },
  });
  for (const route of ['/', '/totem', '/date', '/preferencial', '/modalidades']) {
    assert.equal(new URL((await middleware.middleware(request(route))).headers.get('location')).pathname, '/login-totem');
  }
  assert.equal((await middleware.middleware(request('/api/patient-session'))).status, 401);
  assert.equal((await middleware.middleware(request('/api/patient-session', 'DELETE'))).status, 200);
  assert.equal((await middleware.middleware(request('/api/backend/clinux/senhas'))).status, 200);
  allowed = true;
  assert.equal((await middleware.middleware(request('/'))).status, 200);
});

test('API de login guarda token somente em cookie HttpOnly e troca usa cookie, nao corpo', async () => {
  const calls = [];
  const api = load('app/api/totem-access/[action]/route.ts', {
    '@/lib/patient-session-config': { PATIENT_SESSION_COOKIE: 'patient' },
    '@/lib/patient-session-http': { sameOrigin: req => req.headers.get('origin') === 'https://totem.local' },
    '@/lib/totem-access': { TOTEM_OPERATOR_COOKIE: 'totem_operator_session', totemBackend: async (action, init) => {
      calls.push({ action, body: JSON.parse(init.body) });
      return Response.json({ token: 'issued-secret', expiresAt: new Date(Date.now() + 3600000).toISOString(), mustChangePin: false });
    } },
  });
  const context = action => ({ params: Promise.resolve({ action }) });
  const response = await api.POST(request('/api/totem-access/login', 'POST', { cardId: 'test', pin: '1234' }), context('login'));
  assert.equal((await response.json()).token, undefined);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /Secure/);
  await api.POST(request('/api/totem-access/change-pin', 'POST', { token: 'forged', newPin: '9876' }), context('change-pin'));
  assert.equal(calls[1].body.token, 'cookie-token');
  const external = request('/api/totem-access/login', 'POST', {});
  external.headers.set('origin', 'https://other.local');
  assert.equal((await api.POST(external, context('login'))).status, 403);
});

test('cartao exige permissao administrativa, contem QR e nome escapado, nunca PIN', async () => {
  let session = null;
  const api = load('app/api/admin/totem-access/[...path]/route.ts', {
    '@/lib/admin-session': { ADMIN_SESSION_COOKIE: 'admin', readAdminSession: async () => session },
    '@/lib/patient-session-http': { patientBackend: async () => Response.json({}), sameOrigin: () => true },
    '@/lib/totem-access': { totemBackend: async () => Response.json([{ id: 1, username: 'colaborador', displayName: 'Nome <Teste>', cardId: '123e4567-e89b-42d3-a456-426614174000' }]) },
  });
  const context = { params: Promise.resolve({ path: ['users', '1', 'card'] }) };
  assert.equal((await api.GET(request('/card'), context)).status, 401);
  session = { sub: 'teste', permissions: ['DICIONARIO'] };
  assert.equal((await api.GET(request('/card'), context)).status, 403);
  session.permissions = ['USUARIOS'];
  const response = await api.GET(request('/card'), context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /cartao-colaborador.svg/);
  const svg = await response.text();
  assert.match(svg, /Nome &lt;Teste&gt;/);
  assert.match(svg, /<path/);
  assert.doesNotMatch(svg, /pinHash|1234/);
});
