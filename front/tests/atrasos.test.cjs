const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/atrasos.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, Math, Map });
  return exports;
}

const linha = (id, atraso, extra = {}) => ({
  id, cdAtendimento: id, data: '2026-11-03', horaExame: '09:00', horaChegada: '08:30', horaEntrada: '08:40', antecedencia: 30,
  atraso, atrasoExame: atraso - 30, fonte: 'clinux', cdMedico: 1, medico: 'DR A', cdConvenio: 10, convenio: 'UNIMED',
  modalidade: 'RESSONANCIA', cdPaciente: id, paciente: 'P', ...extra,
});

test('estatAtraso: tolerância define atrasado; atraso médio só dos atrasados; depois do exame', () => {
  const { estatAtraso } = load();
  const r = estatAtraso([linha(1, -10), linha(2, 5), linha(3, 20), linha(4, 60)], 10);
  assert.equal(r.total, 4);
  assert.equal(r.atrasados, 2);
  assert.equal(r.percentual, 50);
  assert.equal(r.mediaAtraso, 40);
  assert.equal(r.aposExame, 1);
});

test('agrupar e filtrar por médico, faixa e horário', () => {
  const { agruparAtrasos, filtrarAtrasos, faixa } = load();
  const linhas = [linha(1, 20), linha(2, -40, { cdMedico: 2, medico: 'DR B', horaExame: '14:00' }), linha(3, 0, { cdMedico: 2, medico: 'DR B' })];
  const porMedico = agruparAtrasos(linhas, 'medico', 0);
  assert.equal(porMedico.find(g => g.nome === 'DR A').percentual, 100);
  assert.equal(porMedico.find(g => g.nome === 'DR B').atrasados, 0);
  assert.equal(faixa(linhas[1], 0).id, '1-adiantado');
  assert.equal(faixa(linhas[2], 0).id, '2-antes');
  assert.equal(filtrarAtrasos(linhas, { hora: '14' }, 0).length, 1);
  assert.equal(filtrarAtrasos(linhas, { faixa: '5-ate30' }, 0).length, 1);
});
