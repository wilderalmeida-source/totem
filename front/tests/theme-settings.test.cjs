const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
function setup(allowed = true, origin = true) {
  const exports = {}, calls = [];
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/api/theme-settings/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, AbortSignal, process: { env: { LINK_API_INTERNA: 'http://backend.test', TOKEN_API_INT: 'fixture' } },
    require: name => name === 'next/server' ? require(name) : name.includes('require-panel-admin') ? { requirePanelAdmin: async () => allowed } : { sameOrigin: () => origin },
    fetch: async (url, init) => { calls.push({ url, init }); return Response.json({ theme: 'theme1', mode: 'dark' }); },
  });
  return { api: exports, calls };
}
const request = body => new NextRequest('http://totem.test/api/theme-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('salvar tema exige permissao e origem valida', async () => {
  for (const [allowed, origin] of [[false, true], [true, false]]) {
    const { api, calls } = setup(allowed, origin);
    assert.equal((await api.PUT(request({ theme: 'theme1', mode: 'dark' }))).status, 403);
    assert.equal(calls.length, 0);
  }
});
test('tema ou modo invalido nao chega ao backend', async () => {
  const { api, calls } = setup();
  assert.equal((await api.PUT(request({ theme: 'other', mode: 'dark' }))).status, 400);
  assert.equal(calls.length, 0);
});
test('configuracao valida encaminha apenas tema e modo', async () => {
  const { api, calls } = setup();
  assert.equal((await api.PUT(request({ theme: 'theme1', mode: 'dark', ignored: 'not-saved' }))).status, 200);
  assert.equal(calls[0].init.body, JSON.stringify({ theme: 'theme1', mode: 'dark' }));
});
