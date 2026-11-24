const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/diretoria.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, Math, Map, Set, Number, String, Array, Object });
  return exports;
}

// Contas no formato do plano de contas do Clinux (linha do DRE = contas_resultados).
const contas = [
  { cdConta: 1, conta: 'CONVENIOS', grupo: 'RECEITAS', despesa: false, linha: 'RECEITA OPERACIONAL', variavel: false },
  { cdConta: 2, conta: 'ISSQN SERVICOS PRESTADOS', grupo: 'DEDUCAO DE RECEITA', despesa: true, linha: 'DEDUÇÃO DE RECEITA', variavel: true },
  { cdConta: 3, conta: 'HONORARIOS MEDICOS', grupo: 'DESPESA OPERACIONAL', despesa: true, linha: 'DESPESA OPERACIONAL', variavel: true },
  { cdConta: 4, conta: 'SOFTWARE E SISTEMA', grupo: 'DESPESA ADMINISTRATIVA', despesa: true, linha: 'DESPESA ADMINISTRATIVA', variavel: false },
  { cdConta: 5, conta: 'SALARIOS', grupo: 'DESPESA COM PESSOAL', despesa: true, linha: 'DESPESA COM PESSOAL', variavel: false },
  { cdConta: 6, conta: 'TARIFAS BANCARIAS', grupo: 'DESPESA FINANCEIRA', despesa: true, linha: 'DESPESA FINANCEIRA', variavel: false },
  { cdConta: 7, conta: 'RENDIMENTO DE APLICACAO', grupo: 'RECEITAS', despesa: false, linha: 'RECEITA FINANCEIRA', variavel: false },
  { cdConta: 8, conta: 'AMORTIZACAO EMPRESTIMO BANCARIO', grupo: 'FINANCIAMENTOS', despesa: true, linha: 'AMORTIZAÇÃO DE EMPRESTIMOS', variavel: false },
  { cdConta: 9, conta: 'OBRAS E REFORMAS', grupo: 'IMOBILIZADO', despesa: true, linha: 'IMOBILIZADOS E INVESTIMENTOS', variavel: false },
  { cdConta: 10, conta: 'AJUSTE DE SALDO', grupo: 'RECEITAS', despesa: false, linha: null, variavel: false },
  { cdConta: 11, conta: 'RECEITA DE IMBOLIZADO', grupo: 'RECEITAS', despesa: false, linha: 'RECEITA NÃO OPERACIONAL', variavel: false },
];
const f = (cdConta, valor, mes = '2026-11', regime = 'caixa') => ({ regime, mes, cdConta, valor });

test('categoria segue a linha do DRE do plano de contas', () => {
  const { categoria } = load();
  assert.deepEqual(contas.map(categoria), ['receita', 'deducao', 'custo', 'administrativa', 'pessoal', 'despFin', 'recFin', 'amortizacao', 'investimento', 'ajuste', 'naoOperacional']);
});

test('calcularDre: lucro bruto, EBITDA, lucro líquido, margens; ajuste, amortização e investimento fora do DRE', () => {
  const { calcularDre } = load();
  const financeiro = [f(1, 1000), f(2, 100), f(3, 300), f(4, 100), f(5, 200), f(6, 10), f(7, 30), f(8, 500), f(9, 50), f(10, 999), f(11, 20), f(1, 7777, '2026-10'), f(1, 5, '2026-11', 'competencia')];
  const d = calcularDre({ contas, financeiro }, 'caixa', ['2026-11']);
  assert.equal(d.receitaBruta, 1000);
  assert.equal(d.receitaLiquida, 900);
  assert.equal(d.lucroBruto, 600);
  assert.equal(d.ebitda, 300);
  assert.equal(d.lucroLiquido, 340);            // 300 + 30 − 10 + 20
  assert.equal(d.margemEbitda, 33.3);
  assert.equal(d.margemContribuicao, 600);       // 1000 − (100 ISS + 300 honorários) variáveis
  assert.equal(d.amortizacoes, 500);
  assert.equal(d.investimentos, 50);
  assert.equal(d.totalRecebido, 1050);           // sem o ajuste de saldo
  assert.equal(d.totalPago, 1260);
});

test('resumoAbertos, saldos e previsão de caixa', () => {
  const { resumoAbertos, saldos, previsaoCaixa } = load();
  const abertos = [
    { cdConta: 1, cdFornecedor: 50, faixa: 'v31', valor: 100, parcelas: 1 },
    { cdConta: 1, cdFornecedor: 50, faixa: 'v365', valor: 900, parcelas: 1 },
    { cdConta: 1, cdFornecedor: 51, faixa: 'a30', valor: 400, parcelas: 1 },
    { cdConta: 3, cdFornecedor: 60, faixa: 'a30', valor: 150, parcelas: 1 },
    { cdConta: 8, cdFornecedor: 70, faixa: 'a60', valor: 300, parcelas: 1 },
    { cdConta: 10, cdFornecedor: null, faixa: 'a30', valor: 5000, parcelas: 1 },
  ];
  const r = resumoAbertos({ contas, abertos });
  assert.equal(r.receber.vencidas, 100);
  assert.equal(r.receber.vencidasMaisDeUmAno, 900);
  assert.equal(r.pagar.total, 450);
  assert.equal(r.divida.total, 300);
  assert.equal(r.inadimplencia.get(50), 100);
  const s = saldos([{ cdBanco: 1, banco: 'A', saldo: 1000 }, { cdBanco: 2, banco: 'B', saldo: -200 }, { cdBanco: 3, banco: 'C', saldo: 1e-12 }]);
  assert.equal(s.consolidado, 800);
  assert.equal(s.disponivel, 1000);
  assert.equal(s.lista.length, 2);
  assert.deepEqual({ ...previsaoCaixa(1000, r.receber, r.pagar) }, { d30: 1250, d60: 950, d90: 950 });
});

test('meses e formatação', () => {
  const { deslocarMes, acumuladoAno, mesesAte, formatarReais, variacao } = load();
  assert.equal(deslocarMes('2026-01', -1), '2025-12');
  assert.equal(deslocarMes('2026-11', -12), '2025-11');
  assert.deepEqual([...acumuladoAno('2026-03')], ['2026-01', '2026-02', '2026-03']);
  assert.equal(mesesAte('2026-11', 13)[0], '2025-11');
  assert.equal(formatarReais(1234567, true), 'R$ 1,23 mi');
  assert.equal(variacao(110, 100), 10);
  assert.equal(variacao(5, 0), null);
});
