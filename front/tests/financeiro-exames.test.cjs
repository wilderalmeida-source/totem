const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mod = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/financeiro-exames.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: mod });
const { ticketPorModalidade, descreverDesvio, csvForaDoPadrao } = mod;

const item = { cdExame: 77, cdAtendimento: 2190941, cdPaciente: 5, data: '2026-11-10', cdProcedimento: 223, cdModalidade: 7, cdConvenio: 173, valor: 50, convenio: 50, particular: 0,
  grupo: { exames: 40, media: 480, desvio: 60, q1: 500, mediana: 500, q3: 500 } };
const dados = {
  periodo: { inicio: '2026-11-01', fim: '2026-11-24' }, anterior: { inicio: '2026-10-08', fim: '2026-10-31' }, rigor: 'normal', minimoGrupo: 5,
  ticket: [
    { cdModalidade: 7, exames: 30, atendimentos: 20, valor: 10000, convenio: 8000, particular: 2000, atendConvenio: 16, atendParticular: 4, medianaExame: 300, anterior: { atendimentos: 25, valor: 10000 } },
    { cdModalidade: 3, exames: 10, atendimentos: 10, valor: 2000, convenio: 2000, particular: 0, atendConvenio: 10, atendParticular: 0, medianaExame: 200, anterior: null },
  ],
  foraDoPadrao: { total: 1, impacto: -450, limite: 1000, gruposAnalisados: 1, examesAnalisados: 40, itens: [item] },
  nomes: { modalidades: { 7: 'RESSONANCIA' }, procedimentos: { 223: 'RM; PROSTATA' }, convenios: { 173: 'UNIMED' }, pacientes: { 5: 'JOSE CARLOS' } }, atualizadoEm: '',
};

test('ticket medio por atendimento, por exame, convenio, particular e variacao', () => {
  const [rm, tc] = ticketPorModalidade(dados);
  assert.equal(rm.nome, 'RESSONANCIA');
  assert.equal(rm.ticketAtendimento, 500);
  assert.equal(rm.ticketExame, 10000 / 30);
  assert.equal(rm.ticketConvenio, 500);
  assert.equal(rm.ticketParticular, 500);
  assert.equal(rm.variacao, 25);          // 500 contra 400 antes
  assert.equal(rm.participacao, 83.3);
  assert.equal(tc.ticketParticular, null); // sem atendimento particular
  assert.equal(tc.variacao, null);
  assert.equal(tc.nome, 'Modalidade 3');
});

test('desvio descreve direcao, diferenca, percentual e desvios padrao', () => {
  const x = descreverDesvio(item);
  assert.equal(x.direcao, 'abaixo');
  assert.equal(x.diferenca, -450);
  assert.equal(x.percentual, -90);
  assert.equal(x.desvios, -7.2);
  assert.equal(descreverDesvio({ ...item, valor: 900, grupo: { ...item.grupo, desvio: null } }).desvios, null);
});

test('planilha tem paciente e atendimento e protege o separador', () => {
  const linhas = csvForaDoPadrao(dados, [item]).split('\r\n');
  assert.equal(linhas.length, 2);
  assert.match(linhas[1], /^10\/11\/2026;2190941;77;JOSE CARLOS;RESSONANCIA;"RM; PROSTATA";UNIMED;50,00;/);
  assert.match(linhas[1], /Abaixo do normal$/);
});
