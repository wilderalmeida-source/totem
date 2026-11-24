const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregar(arquivo, modulos = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, require: nome => modulos[nome], Math, Map, Set, Number, String, Array, Object, Date });
  return exports;
}
const load = () => carregar('lib/fluxo.ts', { '@/lib/diretoria': carregar('lib/diretoria.ts') });

const contas = [
  { cdConta: 1, conta: 'CONVENIOS', grupo: 'RECEITAS', despesa: false, linha: 'RECEITA OPERACIONAL', variavel: false },
  { cdConta: 2, conta: 'SALARIOS', grupo: 'PESSOAL', despesa: true, linha: 'DESPESA COM PESSOAL', variavel: false },
  { cdConta: 3, conta: 'AMORTIZACAO EMPRESTIMO BANCARIO', grupo: 'FINANCIAMENTOS', despesa: true, linha: 'AMORTIZAÇÃO DE EMPRESTIMOS', variavel: false },
  { cdConta: 4, conta: 'AQUISICAO DE MAQUINAS E EQUIPAMENTOS MEDICOS', grupo: 'IMOBILIZADO', despesa: true, linha: 'IMOBILIZADOS E INVESTIMENTOS', variavel: false },
  { cdConta: 5, conta: 'EMPRESTIMO CONSORCIO', grupo: 'RECEITAS', despesa: false, linha: 'RECEITA FINANCEIRA', variavel: false },
];
const base = (extra = {}) => ({
  periodo: { inicio: '2026-11-01', fim: '2026-11-03', agrupar: 'dia' }, hoje: '2026-11-24', contas, bancos: [],
  historico: [], projecao: [], vencidos: [], base: [], previsao: [], atualizadoEm: '', ...extra,
});

test('categoria do fluxo: operacional, investimento e financiamento', () => {
  const { categoriaFluxo } = load();
  assert.deepEqual(contas.map(categoriaFluxo), ['operacional', 'operacional', 'financiamento', 'investimento', 'financiamento']);
});

test('histórico agrupado com saldo acumulado e categorias', () => {
  const { historicoAgrupado, totaisHistorico } = load();
  const d = base({ historico: [
    { periodo: '2026-11-02', cdConta: 1, realizado: 1000, previsto: 1200 },
    { periodo: '2026-11-02', cdConta: 3, realizado: 300, previsto: 300 },
    { periodo: '2026-11-03', cdConta: 2, realizado: 400, previsto: 0 },
  ] });
  const p = historicoAgrupado(d, 'dia', 500);
  assert.equal(p.length, 3);
  assert.equal(p[2].saldo, 800);
  const t = totaisHistorico(p);
  assert.equal(t.categorias.financiamento.saidas, 300);
  assert.equal(t.categorias.operacional.entradas, 1000);
  assert.equal(t.entradasPrevistas, 1200);
});

test('projeção: lançado + estimativa, atraso de convênio, vencidos e alerta', () => {
  const { projetar, resumoHorizontes, alertaCaixa, CENARIOS, mediaMensal } = load();
  const d = base({
    projecao: [{ dia: '2026-11-25', cdConta: 1, tipo: 'F', valor: 1000 }, { dia: '2026-11-26', cdConta: 2, tipo: 'L', valor: 300 }],
    vencidos: [{ cdConta: 2, tipo: 'L', valor: 70 }, { cdConta: 1, tipo: 'F', valor: 600 }],
    base: [{ mes: '2026-10', cdConta: 1, valor: 3000 }, { mes: '2026-10', cdConta: 2, valor: 1500 }, { mes: '2026-10', cdConta: 3, valor: 999 }],
  });
  assert.equal(mediaMensal(d).saidas, 1500);
  const semEstimativa = { ...CENARIOS.realista, estimarNaoLancado: false, recuperacaoVencidos: 0 };
  const p = projetar(d, 100, semEstimativa, 30);
  const h = resumoHorizontes(p, 100);
  assert.equal(Math.round(h[0].entradas), 1000);           // 7 dias
  assert.equal(Math.round(h[0].saidas), 370);              // salário + obrigações vencidas
  // Convênio 30 dias atrasado: a fatura sai dos 7 primeiros dias.
  const atrasado = projetar(d, 100, { ...semEstimativa, atrasoConvenios: 30 }, 40);
  assert.equal(Math.round(resumoHorizontes(atrasado, 100)[0].entradas), 0);
  const a = alertaCaixa(atrasado, 50);
  assert.ok(a.primeiro);
  assert.ok(a.necessidade > 0);
  // Estimativa: completa até a média do mês (fração dos dias restantes de novembro).
  const comEstimativa = projetar(d, 100, { ...CENARIOS.realista, recuperacaoVencidos: 0 }, 7);
  const novembro = comEstimativa.filter(x => x.dia.startsWith('2026-11'));
  const saidasNov = novembro.reduce((s, x) => s + x.saidasLancadas + x.saidasEstimadas, 0);
  assert.equal(Math.round(saidasNov), Math.round(Math.max(1500 * 7 / 30, 300) + 70));
});

test('confiabilidade da previsão', () => {
  const { confiabilidade } = load();
  const c = confiabilidade(base({ previsao: [
    { mes: '2026-09', despesa: true, previsto: 800, realizado: 1000 },
    { mes: '2026-09', despesa: false, previsto: 0, realizado: 500 },
    { mes: '2026-10', despesa: true, previsto: 1000, realizado: 1000 },
  ] }));
  assert.equal(c.linhas[0].acertoSaidas, 80);
  assert.equal(c.linhas[0].acertoEntradas, 0);
  assert.equal(c.saidas, 90);
});
