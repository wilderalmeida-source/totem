const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, URLSearchParams, require: name => mocks[name] || {} });
  return exports;
}
test('avancar exige selecao com painel universal; respeita desativacao', () => {
  const rule = load('lib/painel-selection.ts');
  const config = { ativo: true, paineis: [{ ativo: true, universal: { atendimento: true, resultado: true, marcacao: true } }] };
  assert.equal(rule.deveSelecionarModalidadeAoAvancar(config), true);
  for (const service of ['B', 'C', 'D']) assert.equal(rule.deveSelecionarModalidade(config, service), false);
  assert.equal(rule.deveSelecionarModalidadeAoAvancar({ ...config, ativo: false }), false);
  assert.equal(rule.deveSelecionarModalidadeAoAvancar({ ativo: true, paineis: [] }), false);
  assert.equal(rule.deveSelecionarModalidadeAoAvancar({ ativo: true, paineis: [{ ativo: false }] }), false);
});
test('entrega usa decisao do backend sem inferir pelos dez exames visiveis', async () => {
  const calls = [];
  const service = load('services/entregadeexames.ts', { './api/client': { apiFetch: async url => {
    calls.push(url); return Response.json({ exames: [], requerSelecaoModalidade: false });
  } } });
  assert.equal((await service.contextoEntrega(123)).requerSelecaoModalidade, false);
  const url = new URL(calls[0], 'http://local');
  assert.equal(url.searchParams.get('contexto'), 'true');
  assert.equal(url.searchParams.get('cd_paciente'), '123');
});
test('nome e CPF preservam a necessidade de selecionar modalidade na entrega', async () => {
  for (const file of ['services/buscaNomeData.ts', 'services/buscaCPF.ts']) {
    const service = load(file, {
      '@/services/api': { buscaPaciente: async () => [{ cd_paciente: 123, ds_paciente: 'TESTE' }] },
      '@/services/entregadeexames': { contextoEntrega: async () => ({ exames: [], requerSelecaoModalidade: true }) },
    });
    const result = file.includes('NomeData')
      ? await service.buscarPacienteNomeData({ ds_paciente: 'TESTE', dt_nascimento: '1980-01-01', servico: 'C', preferencial: 0 })
      : await service.buscarPacienteCPF('12345678901', '1980-01-01', 'C', 0);
    assert.equal(result.dados.requerSelecaoModalidade, true);
    assert.equal(result.dados.cd_paciente, 123);
  }
});
