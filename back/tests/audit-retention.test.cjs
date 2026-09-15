const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/audit-retention.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup(value) {
  const calls = [], events = [];
  const context = { exports: {}, process: { env: { AUDIT_RETENTION_DAYS: value } }, console,
    setInterval: () => ({ unref() {} }), clearInterval() {},
    require: name => name.includes('prismalog') ? { PrismaLog: { $executeRaw: async (...args) => { calls.push(args); return 2; } } } : { recordAudit: event => events.push(event) },
  };
  vm.runInNewContext(source, context);
  return { ...context.exports, calls, events };
}
test('retention is opt-in and invalid settings are rejected', () => {
  const api = setup(undefined);
  api.startAuditRetention();
  assert.equal(api.calls.length, 0);
  assert.equal(api.retentionDays('0'), null);
  for (const value of ['-1', '1.5', 'abc', '3651']) assert.throws(() => api.retentionDays(value));
});
test('cleanup is bounded and records count without copying removed data', async () => {
  const api = setup('90');
  api.startAuditRetention();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(api.calls.length, 1);
  assert.match(api.calls[0][0].join(''), /LIMIT 1000 FOR UPDATE SKIP LOCKED/);
  assert.equal(api.events[0].metadata.removed, 2);
  assert.equal(api.events[0].metadata.days, 90);
});
