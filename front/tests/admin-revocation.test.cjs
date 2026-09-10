const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
function environment() {
  const exports = {};
  const state = { active: true, version: 'v1', fail: false, calls: 0 };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/admin-session.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, crypto: webcrypto, TextEncoder, btoa, atob, AbortSignal,
    process: { env: { ADMIN_USERNAME: 'emergency', LINK_API_INTERNA: 'http://backend:5000', TOKEN_API_INT: 'test' } },
    fetch: async (url, options) => {
      state.calls++;
      assert.equal(options.cache, 'no-store');
      if (state.fail) throw Error('offline');
      const body = JSON.parse(options.body);
      return new Response(JSON.stringify({ permissions: ['LOGS'], mustChangePassword: false }), { status: state.active && body.version === state.version ? 200 : 401 });
    },
  });
  return { ...exports, state };
}
test('cookie valido perde acesso quando usuario e desativado ou cadastro muda', async () => {
  const env = environment();
  const token = await env.createAdminSession('user', 'secret', false, ['*'], { source: 'database', version: 'v1' });
  assert.equal((await env.readAdminSession(token, 'secret')).permissions.join(), 'LOGS');
  env.state.active = false;
  assert.equal(await env.readAdminSession(token, 'secret'), null);
  env.state.active = true; env.state.version = 'v2';
  assert.equal(await env.readAdminSession(token, 'secret'), null);
  assert.equal(env.state.calls, 3);
});
test('indisponibilidade do backend nao autoriza com permissoes antigas', async () => {
  const env = environment();
  const token = await env.createAdminSession('user', 'secret', false, ['*'], { source: 'database', version: 'v1' });
  env.state.fail = true;
  assert.equal(await env.readAdminSession(token, 'secret'), null);
});
test('sessao legada sem versao exige novo login; bootstrap e explicito', async () => {
  const env = environment();
  assert.equal(await env.readAdminSession(await env.createAdminSession('user', 'secret'), 'secret'), null);
  const token = await env.createAdminSession('emergency', 'secret', false, ['*'], { source: 'bootstrap' });
  assert.ok(await env.readAdminSession(token, 'secret'));
  assert.equal(await env.readAdminSession(token + 'x', 'secret'), null);
});
