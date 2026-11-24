const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/dre.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, Math, Map, Set, Number, String, Array, Object });
  return exports;
}

// Estrutura reduzida no mesmo formato da do back.
const estrutura = [
  { id: 'RB', nome: 'Receita bruta', tipo: 'grupo', folhas: [{ id: 'RB.CONV', nome: 'Convênios' }, { id: 'RB.PART', nome: 'Particulares' }] },
  { id: 'DED', nome: 'Deduções', tipo: 'grupo', folhas: [{ id: 'DED.TRIB', nome: 'Tributos' }] },
  { id: 'RL', nome: 'Receita líquida', tipo: 'total', soma: [{ id: 'RB', sinal: 1 }, { id: 'DED', sinal: 1 }] },
  { id: 'CSP', nome: 'Custos', tipo: 'grupo', folhas: [{ id: 'CSP.PES', nome: 'Pessoal operacional' }] },
  { id: 'LB', nome: 'Lucro bruto', tipo: 'total', soma: [{ id: 'RL', sinal: 1 }, { id: 'CSP', sinal: 1 }] },
  { id: 'DOP', nome: 'Despesas', tipo: 'grupo', folhas: [{ id: 'DOP.PES', nome: 'Pessoal adm' }] },
  { id: 'DA', nome: 'D&A', tipo: 'grupo', folhas: [{ id: 'DA.DEP', nome: 'Depreciação' }] },
  { id: 'EBIT', nome: 'EBIT', tipo: 'total', soma: [{ id: 'LB', sinal: 1 }, { id: 'DOP', sinal: 1 }, { id: 'DA', sinal: 1 }] },
  { id: 'EBITDA', nome: 'EBITDA', tipo: 'total', soma: [{ id: 'EBIT', sinal: 1 }, { id: 'DA', sinal: -1 }], memo: true },
  { id: 'LL', nome: 'Lucro', tipo: 'total', soma: [{ id: 'EBIT', sinal: 1 }] },
];
const contas = [
  { cdConta: 1, conta: 'CONVENIOS', grupo: null, despesa: false, itens: [{ folha: 'RB.CONV', pct: 100 }], salvo: false },
  { cdConta: 2, conta: 'ISS', grupo: null, despesa: true, itens: [{ folha: 'DED.TRIB', pct: 100 }], salvo: false },
  { cdConta: 3, conta: 'SALARIOS', grupo: null, despesa: true, itens: [{ folha: 'CSP.PES', pct: 60 }, { folha: 'DOP.PES', pct: 40 }], salvo: true },
  { cdConta: 4, conta: 'DEPRECIACAO', grupo: null, despesa: true, itens: [{ folha: 'DA.DEP', pct: 100 }], salvo: true },
  { cdConta: 5, conta: 'EMPRESTIMO', grupo: null, despesa: false, itens: [{ folha: 'FORA', pct: 100 }], salvo: false },
  { cdConta: 6, conta: 'EVENTO', grupo: null, despesa: false, itens: [], salvo: false },
];
const v = (mes, cdConta, valor) => ({ mes, cdConta, valor, titulos: 1 });

test('calcularCelula: sinais, rateio, totais, EBITDA, fora da DRE e sem classificação', () => {
  const { calcularCelula, valorLinha, totalSemClassificacao, analiseVertical, indicadores } = load();
  const valores = [v('2026-10', 1, 1000), v('2026-10', 2, 50), v('2026-10', 3, 500), v('2026-10', 4, 30), v('2026-10', 5, 999), v('2026-10', 6, 10), v('2026-10', null, 7), v('2026-09', 1, 5555)];
  const c = calcularCelula(estrutura, { contas, valores }, ['2026-10']);
  assert.equal(valorLinha(c, 'RL'), 950);
  assert.equal(valorLinha(c, 'CSP'), -300);
  assert.equal(valorLinha(c, 'LB'), 650);
  assert.equal(valorLinha(c, 'DOP'), -200);
  assert.equal(valorLinha(c, 'EBIT'), 420);
  assert.equal(valorLinha(c, 'EBITDA'), 450);
  assert.equal(c.fora, 999);
  assert.equal(totalSemClassificacao(c), 17);
  assert.equal(c.contas.get('CSP.PES').get(3), -300);
  assert.equal(analiseVertical(c, valorLinha(c, 'LB')), 68.4);
  assert.equal(indicadores(c).margemEbitda, 47.4);
});

test('colunas de cada visão', () => {
  const { colunasDaVisao } = load();
  const m = colunasDaVisao('mensal', '2026-03');
  assert.deepEqual([...m.map(c => c.chave)], ['2026-01', '2026-02', '2026-03', 'total']);
  const t = colunasDaVisao('trimestral', '2026-05');
  assert.deepEqual([...t.map(c => c.meses.length)], [3, 2, 5]);
  assert.equal(colunasDaVisao('anual', '2026-11')[0].meses.length, 12);
  assert.equal(colunasDaVisao('anual', '2026-11')[2].meses.length, 11);
  const a = colunasDaVisao('acumulado', '2026-11');
  assert.equal(a[0].meses[0], '2025-01');
  const d = colunasDaVisao('doze', '2026-11');
  assert.equal(d[1].meses[0], '2025-12');
  assert.equal(d[0].meses.at(-1), '2025-11');
});

test('análise horizontal e contas que mais impactaram', () => {
  const { calcularCelula, analiseHorizontal, maioresImpactos } = load();
  const valores = [v('2026-09', 1, 1000), v('2026-09', 3, 500), v('2026-10', 1, 1200), v('2026-10', 3, 900)];
  const a = calcularCelula(estrutura, { contas, valores }, ['2026-09']);
  const b = calcularCelula(estrutura, { contas, valores }, ['2026-10']);
  const imp = maioresImpactos(a, b, new Map(contas.map(c => [c.cdConta, c.conta])));
  assert.equal(imp[0].conta, 'SALARIOS');
  assert.equal(imp[0].impacto, -400);
  assert.equal(imp[1].impacto, 200);
  assert.equal(analiseHorizontal(-900, -500), -80);
  assert.equal(analiseHorizontal(10, 0), null);
});

test('mês fechado usa a associação da época do fechamento', () => {
  const { calcularCelula, valorLinha } = load();
  const valores = [v('2026-09', 3, 500), v('2026-10', 3, 500)];
  // Em setembro (fechado) salários iam 100% para pessoal administrativo; hoje são rateados 60/40.
  const mapeamentoMes = { '2026-09': { '3': [{ folha: 'DOP.PES', pct: 100 }] } };
  const set = calcularCelula(estrutura, { contas, valores, mapeamentoMes }, ['2026-09']);
  const out = calcularCelula(estrutura, { contas, valores, mapeamentoMes }, ['2026-10']);
  assert.equal(valorLinha(set, 'CSP'), 0);
  assert.equal(valorLinha(set, 'DOP'), -500);
  assert.equal(valorLinha(out, 'CSP'), -300);
});

test('situação da coluna e orçamento com sinal pela natureza da linha', () => {
  const { statusColuna, celulaOrcada, valorLinha, temOrcamento, realizadoPorFolha } = load();
  const f = { '2026-01': { status: 'fechado' }, '2026-02': { status: 'fechado' }, '2026-03': { status: 'em_aprovacao' } };
  assert.equal(statusColuna(['2026-01', '2026-02'], f), 'fechado');
  assert.equal(statusColuna(['2026-01', '2026-03'], f), 'parcial');
  assert.equal(statusColuna(['2026-03'], f), 'em_aprovacao');
  assert.equal(statusColuna(['2026-04'], f), 'aberto');
  const orc = { 2026: { 'RB.CONV': [1000, 1000, ...Array(10).fill(0)], 'CSP.PES': [400, 400, ...Array(10).fill(0)] } };
  const c = celulaOrcada(estrutura, orc, ['2026-01', '2026-02']);
  assert.equal(valorLinha(c, 'RB'), 2000);
  assert.equal(valorLinha(c, 'LB'), 1200);
  assert.equal(temOrcamento(orc, ['2026-03']), false);
  const dados = { contas, valores: [v('2025-01', 1, 1000), v('2025-01', 3, 500)] };
  const r = realizadoPorFolha(estrutura, dados, 2025, 1.1);
  assert.equal(r['RB.CONV'][0], 1100);
  assert.equal(r['CSP.PES'][0], 330);
});
