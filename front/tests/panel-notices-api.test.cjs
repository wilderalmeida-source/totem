const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
function compiled(file) { return ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText; }
function setup(session = { sub: 'admin', mustChangePassword: false }, origin = true) {
  const validation = {}, exports = {}, calls = [];
  vm.runInNewContext(compiled('lib/panel-notices.ts'), { exports: validation });
  vm.runInNewContext(compiled('app/api/informativos/route.ts'), {
    exports, AbortSignal, process: { env: { LINK_API_INTERNA: 'http://backend.test', TOKEN_API_INT: 'fixture' } },
    require: name => name === 'next/server' ? require(name) : name.includes('require-panel-admin') ? { requirePanelAdmin: async () => session } : name.includes('patient-session-http') ? { sameOrigin: () => origin } : validation,
    fetch: async (url, init) => { calls.push({ url, init }); return Response.json({ enabled: true, items: [] }); },
  });
  return { api: exports, calls };
}
const req = body => new NextRequest('http://totem.test/api/informativos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('cadastro exige permissao, troca de senha concluida e origem valida', async () => {
  for (const [session, origin] of [[null, true], [{ sub: 'admin', mustChangePassword: true }, true], [{ sub: 'admin' }, false]]) {
    const { api, calls } = setup(session, origin);
    assert.equal((await api.PUT(req({ enabled: true, items: [] }))).status, 403);
    assert.equal(calls.length, 0);
  }
});
test('playlist vazia pode ser salva; lista invalida nao chega ao banco', async () => {
  const { api, calls } = setup();
  assert.equal((await api.PUT(req({ enabled: true, items: [] }))).status, 200);
  assert.equal(calls[0].init.headers['x-admin-actor'], 'admin');
  assert.equal((await api.PUT(req({ enabled: true, items: [{ id: 'invalido' }] }))).status, 400);
  assert.equal(calls.length, 1);
});
