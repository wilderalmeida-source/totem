const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('requisicao sem fluxo nao cria auditoria; fluxo iniciado preserva eventos', () => {
  const events = [];
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib/flow-audit.js'), 'utf8'), {
    exports, process: { env: {} },
    require: name => name === './persistent-audit' ? { recordAudit: event => events.push(event) } : require(name),
  });
  exports.auditContext.run({ flowId: '', device: 'test' }, () => exports.flowAudit('resposta_backend', 'historico'));
  assert.equal(events.length, 0);
  exports.auditContext.run({ flowId: 'service-flow', device: 'test' }, () => exports.flowAudit('emissao_recebida_backend', 'emissao'));
  assert.equal(events.length, 1);
  assert.equal(events[0].sessionId, 'service-flow');
});
