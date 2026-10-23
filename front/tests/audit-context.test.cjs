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

test('clique no servico inicia fluxo novo e os cliques seguintes usam o mesmo ID', () => {
  const session = new Map(), local = new Map(), events = [];
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) });
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/audit-client.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, sessionStorage: storage(session), localStorage: storage(local), crypto: require('node:crypto').webcrypto,
    process: { env: {} }, AbortSignal, console,
    fetch: async (_url, options) => { events.push(JSON.parse(options.body)); return { ok: true }; },
  });
  exports.startTotemFlow('D');
  exports.auditTotem('prioridade_selecionada', 'prioridade', { preferencial: 0 });
  exports.auditTotem('voltar', '/date');
  assert.equal(events.length, 3);
  assert.ok(events.every(event => event.sessionId === events[0].sessionId));
  exports.startTotemFlow('B');
  assert.notEqual(events[3].sessionId, events[0].sessionId);
  assert.equal(events[0].metadata.servico, 'D');
});
