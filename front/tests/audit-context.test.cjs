const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
test('fluxo persiste na navegacao e equipamento persiste entre atendimentos', () => {
  const session = new Map(), local = new Map();
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) });
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/audit-client.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, sessionStorage: storage(session), localStorage: storage(local), crypto: require('node:crypto').webcrypto,
  });
  const first = exports.auditContextHeaders();
  assert.equal(exports.auditContextHeaders()['x-flow-id'], first['x-flow-id']);
  session.delete('totemAuditSession');
  const next = exports.auditContextHeaders();
  assert.notEqual(next['x-flow-id'], first['x-flow-id']);
  assert.equal(next['x-device-id'], first['x-device-id']);
});
