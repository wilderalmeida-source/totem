const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObject = {};
const source = fs.readFileSync(require.resolve('../lib/panel-call.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject });
const { parsePanelCall } = exportsObject;
const call = {
  id: 'ca3542cf-1442-4596-abd5-6bd20b469dba',
  name: 'PACIENTE TESTE',
  guicheNumero: '02',
  guicheNome: 'Guichê 02',
  recepcao: 'Recepção de exames',
  calledAt: '14:30',
};

test('preserves correlation id and every call field without copying extra payloads', () => {
  const parsed = parsePanelCall({ ...call, name: ' PACIENTE TESTE ', token: 'private' });
  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), call);
  assert.equal(parsed.token, undefined);
});

test('rejects missing, oversized and malformed call metadata without throwing', () => {
  for (const invalid of [null, undefined, 1, 'raw', [], {}, { ...call, id: ' ' },
    { ...call, name: '' }, { ...call, name: 'X'.repeat(201) },
    { ...call, id: 'x'.repeat(101) }, { ...call, guicheNumero: 2 },
    { ...call, recepcao: {} }, { ...call, calledAt: undefined }]) {
    assert.equal(parsePanelCall(invalid), null);
  }
});

test('different calls retain their own patient, counter and reception', () => {
  const first = parsePanelCall(call);
  const second = parsePanelCall({ ...call, id: 'ca3542cf-1442-4596-abd5-6bd20b469dbb', name: 'OUTRO PACIENTE', guicheNumero: '03', guicheNome: 'Guichê 03', recepcao: 'Recepção 3' });
  assert.notEqual(first.id, second.id);
  assert.equal(first.name, 'PACIENTE TESTE');
  assert.equal(second.guicheNumero, '03');
  assert.equal(second.recepcao, 'Recepção 3');
});

test('preserva nome completo, modalidade e localizacao sem exigir campos novos de eventos antigos', () => {
  const extended = parsePanelCall({ ...call, fullName: 'PACIENTE COM NOME COMPLETO', modalidade: 'Ultrassonografia', localizacao: 'Sala 3 · 2º andar' });
  assert.equal(extended.fullName, 'PACIENTE COM NOME COMPLETO');
  assert.equal(extended.modalidade, 'Ultrassonografia');
  assert.equal(extended.localizacao, 'Sala 3 · 2º andar');
  assert.equal(parsePanelCall(call).fullName, undefined);
  assert.equal(parsePanelCall({ ...call, modalidade: {} }), null);
  assert.equal(parsePanelCall({ ...call, fullName: 'X'.repeat(201) }), null);
});
