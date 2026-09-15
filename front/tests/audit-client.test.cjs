const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('HTTP failures are detected and recovery is reported without exposing payloads', async () => {
  const calls = [], warnings = [];
  let available = false;
  const storage = { getItem: () => 'test-device', setItem() {} };
  const context = { exports: {}, sessionStorage: storage, localStorage: storage,
    process: { env: {} }, AbortSignal: { timeout: () => undefined },
    console: { error: (...args) => warnings.push(args) },
    fetch: async (_, options) => { calls.push(JSON.parse(options.body)); return { ok: available }; },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/audit-client.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  context.exports.auditTotem('teste', 'teste', { confidential: 'private' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(warnings.length, 1);
  assert.equal(JSON.stringify(warnings).includes('private'), false);
  available = true;
  context.exports.auditTotem('teste', 'teste');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 3);
  assert.equal(calls[2].action, 'auditoria_envio_recuperado');
  assert.equal(calls[2].metadata.failedDeliveries, 1);
});
