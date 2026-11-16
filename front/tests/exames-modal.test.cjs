const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/exames-modal.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require });
  return exports;
}
const atendimentos = [5, 4, 6].map((total, a) => ({ cd_atendimento: a, exames: Array.from({ length: total }, (_, e) => ({ dt_assinado: null, nome: `${a}-${e}` })) }));

test('entrega mostra so os 10 exames mais recentes, na ordem recebida', () => {
  const { examesParaExibir } = load();
  const exibidos = examesParaExibir(atendimentos, 'C');
  assert.equal(exibidos.length, 10);
  assert.equal(exibidos[0].exame.nome, '0-0');
  assert.equal(exibidos[9].exame.nome, '2-0');
});

test('atendimento e marcacao continuam mostrando todos; sem exames nao quebra', () => {
  const { examesParaExibir } = load();
  assert.equal(examesParaExibir(atendimentos, 'B').length, 15);
  assert.equal(examesParaExibir(atendimentos, 'D').length, 15);
  assert.equal(examesParaExibir(null, 'C').length, 0);
  assert.equal(examesParaExibir([{ cd_atendimento: 1 }], 'C').length, 0);
});
