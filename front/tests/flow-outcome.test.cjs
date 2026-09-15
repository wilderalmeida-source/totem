const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const exports_ = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/flow-outcome.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exports_ });
test('encerramento nao apaga resultado da emissao', () => {
  assert.equal(exports_.closingOutcome('retorno_inicio', 'CONCLUIDO'), 'CONCLUIDO');
  assert.equal(exports_.closingOutcome('inatividade_ou_expiracao', 'DESCONHECIDO'), 'DESCONHECIDO');
  assert.equal(exports_.closingOutcome('cancelar_modal'), 'CANCELADO');
  assert.equal(exports_.closingOutcome('inatividade_ou_expiracao'), 'EXPIRADO');
  assert.equal(exports_.closingOutcome('falha_emissao'), 'DESCONHECIDO');
});
