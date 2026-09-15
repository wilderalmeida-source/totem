const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const events = [];
const output = ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/admin-audit.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, require: () => ({ recordAudit: e => events.push(e) }) };
vm.runInNewContext(output, context);
const { isAdminMutation, safeAdminValues, registerAdminAudit } = context.exports;
test('excludes authentication, patients, tokens and playback', () => {
  for (const path of ['/clinux/admin/users/verify', '/clinux/admin/users/session', '/clinux/pacientes', '/clinux/voice/play', '/clinux/audit']) assert.equal(isAdminMutation('POST', path), false);
  assert.equal(isAdminMutation('PATCH', '/clinux/admin/users/:id'), true);
});
test('does not copy credentials or arbitrary nested payloads', () => {
  const result = safeAdminValues({ username: 'admin', password: 'secret', pinHash: 'secret', cardId: 'secret', playlists: [{ token: 'secret' }] });
  assert.equal(result.username, 'admin');
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
test('records failures without logging response errors or credentials', async () => {
  let hook;
  registerAdminAudit({ addHook: (_, fn) => { hook = fn; } });
  const payload = '{"error":"private database details"}';
  assert.equal(await hook({ routeOptions: { url: '/clinux/admin/users/:id' }, method: 'PATCH', headers: {}, id: 'req1', params: { id: 2 }, body: { password: 'secret', active: false } }, { statusCode: 500, elapsedTime: 10 }, payload), payload);
  const event = events.at(-1);
  assert.equal(event.metadata.outcome, 'FALHOU');
  assert.equal(event.metadata.credentialChangeRequested, true);
  assert.equal(event.actor, 'api_interna_nao_identificada');
  assert.equal(JSON.stringify(event).includes('secret'), false);
  assert.equal(JSON.stringify(event).includes('private database'), false);
});
