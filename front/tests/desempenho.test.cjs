const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/desempenho.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, Date, Math, Map });
  return exports;
}

const base = {
  cdAtendimento: 900,
  data: '2026-11-03', horaSenha: '07:50', horaChamada: '08:05', horaFim: '08:20', horaMarcada: '08:15',
  espera: 15, ficha: 15, atraso: 5, chegouNoHorario: true, exames: 1,
  cdFuncionario: 1, funcionario: 'ANA', cdMedico: 10, medico: 'DR X', cdConvenio: 100, convenio: 'UNIMED',
  modalidade: 'RAIO X', cdPaciente: 5, paciente: 'JOAO', preferencial: false,
};
const linha = (id, extra = {}) => ({ ...base, id, ...extra });

test('estatisticas: ficha, meta e atraso causado só para quem chegou no horário', () => {
  const { estatisticas } = load();
  const r = estatisticas([
    linha(1),
    linha(2, { ficha: 5, atraso: -10 }),
    linha(3, { ficha: 30, atraso: 40, chegouNoHorario: false }), // chegou atrasado: não conta como prejuízo
  ], 10);
  assert.equal(r.total, 3);
  assert.equal(r.mediaFicha, 16.7);
  assert.equal(r.medianaFicha, 15);
  assert.equal(r.percentualMeta, 33.3);
  assert.equal(r.comHorario, 2);
  assert.equal(r.atrasados, 1);
  assert.equal(r.minutosAtraso, 5);
  assert.equal(r.percentualAtrasados, 50);
  assert.equal(r.mediaTotal, 31.7);
});

test('filtro cruzado e agrupamento por dimensão', () => {
  const { filtrar, agrupar, chave } = load();
  const linhas = [linha(1), linha(2, { cdConvenio: 200, convenio: 'BRADESCO', ficha: 25 }), linha(3, { cdConvenio: null, convenio: null, horaChamada: '09:10' })];
  assert.equal(filtrar(linhas, { convenio: '200' }).length, 1);
  assert.equal(filtrar(linhas, { hora: '08' }).length, 2);
  // Ignorar a própria dimensão permite destacar a barra escolhida sem esconder as outras.
  assert.equal(filtrar(linhas, { convenio: '200' }, 'convenio').length, 3);
  const grupos = agrupar(linhas, 'convenio', 10);
  assert.deepEqual([...grupos.map(g => g.nome)].sort(), ['BRADESCO', 'Sem convênio', 'UNIMED']);
  assert.equal(chave(linhas[2], 'convenio'), '-');
});

test('dias do período sem buracos', () => {
  const { diasDoPeriodo } = load();
  assert.deepEqual([...diasDoPeriodo('2026-11-29', '2026-12-02')], ['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
});

test('maisRapidos: menor mediana com volume mínimo; empate vai para quem fez mais fichas', () => {
  const { maisRapidos } = load();
  const g = (chave, total, medianaFicha, mediaFicha = medianaFicha) => ({ chave, nome: chave, total, medianaFicha, mediaFicha });
  const r = maisRapidos([g('lenta', 50, 9), g('rapida-poucas', 3, 1), g('rapida', 40, 3), g('empate-mais', 80, 4), g('empate-menos', 20, 4), g('-', 99, 0)]);
  assert.deepEqual([...r.map(x => x.chave)], ['rapida', 'empate-mais', 'empate-menos']);
});
