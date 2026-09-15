const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(create) {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib/flow-audit.js'), 'utf8'), {
    exports, process: { env: { APP_VERSION: 'test' } }, console: { error: () => {} },
    require: name => name.startsWith('node:') ? require(name) : { recordAudit: data => { void Promise.resolve().then(() => create({ data })).catch(() => {}) } },
  });
  return exports;
}
test('contextos concorrentes nao misturam fluxo ou equipamento', async () => {
  const rows = [];
  const env = load(async data => { rows.push(data.data); });
  await Promise.all(['totem1', 'totem2', 'totem3'].map(device => env.auditContext.run({ flowId: device + '-flow', device }, async () => {
    await Promise.resolve();
    await env.auditOperation('clinico.test', async () => true);
  })));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rows.length, 3);
  for (const row of rows) assert.equal(row.sessionId, row.metadata.device + '-flow');
});
test('falha de auditoria nao muda resultado da operacao e preserva erro original', async () => {
  const env = load(async () => { throw Error('logs offline'); });
  assert.equal(await env.auditOperation('teste', async () => 12), 12);
  await assert.rejects(env.auditOperation('teste', async () => { throw Error('original'); }), /original/);
  await new Promise(resolve => setImmediate(resolve));
});
