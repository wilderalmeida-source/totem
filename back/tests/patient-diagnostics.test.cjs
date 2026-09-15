const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(create) {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib/patient-diagnostics.js'), 'utf8'), {
    exports, Date, process: { env: {} }, console: { error: () => {} }, require: name => name.includes('flow-audit') ? { auditContext: { getStore: () => undefined } } : ({ recordAudit: data => { void Promise.resolve().then(() => create({ data })).catch(() => {}) } }),
  });
  return exports;
}
test('espacos ficam visiveis e CPF nao e registrado', () => {
  const env = load(async () => {});
  const result = env.describePatientInput({ ds_paciente: ' ANA  ', dt_nascimento: '31/02/1980', ds_cpf: '12345678901' });
  assert.equal(result.nome, ' ANA  ');
  assert.equal(result.espacosNasPontas, true);
  assert.equal(result.tamanhoNome, 6);
  assert.equal(result.nomeVisivel.charCodeAt(0), 183);
  assert.ok(!JSON.stringify(result).includes('12345678901'));
});
test('falha no banco de logs nao propaga erro para a consulta', async () => {
  const env = load(async () => { throw Error('offline'); });
  assert.doesNotThrow(() => env.patientDiagnostic('request-1', { resultado: 'teste' }));
  await new Promise(resolve => setImmediate(resolve));
});


test('diagnostico preserva codigo pesquisado e codigo retornado', () => {
  const env = load(async () => {});
  assert.equal(env.describePatientInput({ cd_paciente: '12345' }).cd_paciente, '12345');
  assert.equal(env.describePatientInput({ cd_paciente: 12345 }).cd_paciente, 12345);
});
