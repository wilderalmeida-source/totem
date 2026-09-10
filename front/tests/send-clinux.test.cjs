const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(patient, result, failure) {
  const exports = {}; let issued = 0;
  const source = fs.readFileSync(path.join(__dirname, '../services/sendClinux.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => name.includes('createDate') ? { parseBRDate: () => '1980-01-01' } : {
      cadastraPaciente: async () => patient,
      cadastraSenha: async () => { issued++; if (failure) throw Error('falha'); return result; },
    },
  });
  return { run: () => exports.sendClinux({ ds_paciente: 'TESTE', dt_nascimento: '01/01/1980', servico: 'B', preferencial: 0 }), issued: () => issued };
}
test('cadastro sem identificador impede emissao e sucesso', async () => {
  const env = load({}, { ok: true });
  await assert.rejects(env.run()); assert.equal(env.issued(), 0);
});
test('erro de emissao ou resposta incompleta nao confirma sucesso', async () => {
  for (const [result, failure] of [[null, false], [{}, false], [{ ok: false }, false], [null, true]]) {
    await assert.rejects(load({ cd_paciente: 123 }, result, failure).run());
  }
});
test('sucesso exige confirmacao explicita da emissao', async () => {
  assert.equal((await load({ cd_paciente: 123 }, { ok: true }).run()).ok, true);
});
