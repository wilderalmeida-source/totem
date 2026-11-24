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
const load = () => carregar('lib/financeiro.ts', { '@/lib/diretoria': carregar('lib/diretoria.ts') });

const contas = [
  { cdConta: 1, conta: 'CONVENIOS', grupo: 'RECEITAS', despesa: false, linha: 'RECEITA OPERACIONAL', variavel: false },
  { cdConta: 2, conta: 'SALARIOS', grupo: 'PESSOAL', despesa: true, linha: 'DESPESA COM PESSOAL', variavel: false },
  { cdConta: 3, conta: 'HONORARIOS MEDICOS', grupo: 'OPERACIONAL', despesa: true, linha: 'DESPESA OPERACIONAL', variavel: true },
  { cdConta: 4, conta: 'AMORTIZACAO EMPRESTIMO BANCARIO', grupo: 'FINANCIAMENTOS', despesa: true, linha: 'AMORTIZAÇÃO DE EMPRESTIMOS', variavel: false },
];

test('tipoConta e saldos por conta/banco (ajuste fora do consolidado)', () => {
  const { tipoConta, resumoBancos } = load();
  assert.equal(tipoConta('APLICACAO B. SICOOB - AUTMATICO'), 'aplicacao');
  assert.equal(tipoConta('INVESTIMENDO B. UNICRED'), 'aplicacao');
  assert.equal(tipoConta('GETNET OPERACAO DE CARTAO'), 'cartao');
  assert.equal(tipoConta('CARTAO DE CREDITO SICOOB - CRI'), 'credito');
  assert.equal(tipoConta('BANCO DO BRASIL CONSORCIO'), 'financiamento');
  assert.equal(tipoConta('AJUSTE DE SALDO'), 'ajuste');
  assert.equal(tipoConta('CAIXA GERAL'), 'caixa');
  assert.equal(tipoConta('BANCO BRADESCO'), 'corrente');
  const b = (banco, saldoInicial, saldoFinal) => ({ cdBanco: banco.length, banco, saldoAtual: saldoFinal, saldoInicial, saldoFinal, entradas: 0, saidas: 0, transfEntrada: 0, transfSaida: 0 });
  const r = resumoBancos([b('BANCO BRADESCO', 100, 200), b('APLICACAO B. BRADESCO', 50, 60), b('AJUSTE DE SALDO', -1000, -1000), b('BANCO DO BRASIL CONSORCIO', -500, -400)]);
  assert.equal(r.saldoFinal, -140);
  assert.equal(r.disponivelFinal, 260);
  assert.equal(r.aplicacoes, 60);
  assert.equal(r.porInstituicao.find(i => i.instituicao === 'Bradesco').saldoFinal, 260);
});

test('serieFluxo agrupa e acumula o saldo', () => {
  const { serieFluxo, resumoFluxo } = load();
  const fluxo = [
    { dia: '2026-11-02', tipo: 'entrada', realizado: 100, previsto: 120 },
    { dia: '2026-11-03', tipo: 'saida', realizado: 30, previsto: 30 },
  ];
  const s = serieFluxo(fluxo, '2026-11-01', '2026-11-03', 1000);
  assert.equal(s.length, 3);
  assert.equal(s[2].saldo, 1070);
  assert.equal(resumoFluxo(fluxo).liquido, 70);
  assert.equal(serieFluxo(fluxo, '2026-01-01', '2026-12-31', 0).length, 12);
});

test('contas a receber: origem, envelhecimento, convênios, pagar operacional e projeção', () => {
  const { resumoReceber, projecao, dso } = load();
  const a = (receita, tipo, cdConta, cdFornecedor, faixa, valor) => ({ receita, tipo, cdConta, cdFornecedor, faixa, mesVencimento: '2026-11', mesCompetencia: '2026-10', valor, parcelas: 1 });
  const dados = { contas, abertos: [
    a(true, 'F', 1, 50, 'v31', 300), a(true, 'F', 1, 50, 'a30', 700), a(true, 'U', 1, null, 'v1', 100), a(true, 'L', 1, 70, 'a60', 50),
    a(false, 'L', 2, 80, 'a30', 400), a(false, 'L', 4, 90, 'a30', 1000), a(false, 'L', 3, 81, 'v16', 20),
  ] };
  const r = resumoReceber(dados);
  assert.equal(r.receberTotal, 1150);
  assert.equal(r.receberVencidos, 400);
  assert.equal(r.porOrigem.find(o => o.origem === 'convenio').total, 1000);
  assert.equal(r.porConvenio[0].cdFornecedor, 50);
  assert.equal(r.pagarVencidos, 20);
  assert.equal(r.pagarOperacionalTotal, 420);
  assert.deepEqual({ ...projecao(1000, r.receberFaixas, r.pagarFaixas) }, { d30: 300, d60: 350, d90: 350 });
  assert.equal(dso(1150, 9000), 11.5);
});

test('recebidos: no prazo, prazos ponderados e atraso por convênio', () => {
  const { resumoRecebidos } = load();
  const r = resumoRecebidos({ recebidos: [
    { tipo: 'F', cdFornecedor: 50, parcelas: 2, recebido: 1000, previsto: 1000, noPrazo: 600, atrasado: 400, antecipado: 0, parciais: 0, parcialValor: 0, perda: 0, diasEmissao: 30000, diasAtraso: 4000 },
    { tipo: 'U', cdFornecedor: null, parcelas: 5, recebido: 1000, previsto: 1010, noPrazo: 1000, atrasado: 0, antecipado: 200, parciais: 1, parcialValor: 10, perda: 0, diasEmissao: 0, diasAtraso: 0 },
  ] });
  assert.equal(r.percentualNoPrazo, 80);
  assert.equal(r.prazoMedio, 15);
  assert.equal(r.integral, 6);
  assert.equal(r.porConvenio[0].atrasoMedio, 4);
});

test('despesas fixas só de contas não variáveis', () => {
  const { despesasFixas, mesesDoPeriodo } = load();
  const financeiro = [
    { regime: 'competencia', mes: '2026-11', cdConta: 2, valor: 500 },
    { regime: 'competencia', mes: '2026-11', cdConta: 3, valor: 800 },
    { regime: 'competencia', mes: '2026-11', cdConta: 4, valor: 900 },
    { regime: 'caixa', mes: '2026-11', cdConta: 2, valor: 999 },
  ];
  assert.equal(despesasFixas({ contas, financeiro }, ['2026-11']), 500);
  assert.deepEqual([...mesesDoPeriodo('2025-11-15', '2026-02-03')], ['2025-11', '2025-12', '2026-01', '2026-02']);
});

test('contas a pagar: aberto por prazo, pagos, recorrência, juros, desconto e concentração', () => {
  const { resumoPagar } = load();
  const p = (cdFornecedor, cdConta, pago, extra = {}) => ({ cdFornecedor, cdConta, cdCentro: null, forma: 'PIX', parcelas: 1, pago, previsto: pago, juros: 0, multa: 0, desconto: 0, antecipado: 0, atrasado: 0, noPrazo: pago, diasPrazo: pago * 10, diasAtraso: 0, vencidoAntes: 0, ...extra });
  const dados = {
    contas,
    pagar: {
      abertos: [
        { cdFornecedor: 1, cdConta: 2, cdCentro: null, prazo: 'vencido', valor: 100, parcelas: 1 },
        { cdFornecedor: 1, cdConta: 2, cdCentro: null, prazo: 'd7', valor: 50, parcelas: 1 },
        { cdFornecedor: 2, cdConta: 3, cdCentro: 9, prazo: 'd30', valor: 200, parcelas: 1 },
        { cdFornecedor: 2, cdConta: 3, cdCentro: 9, prazo: 'd91', valor: 1000, parcelas: 1 },
      ],
      pagos: [
        p(1, 2, 600),
        p(2, 3, 300, { atrasado: 300, noPrazo: 0, juros: 6, multa: 3, diasAtraso: 1500 }),
        p(3, 3, 100, { desconto: 10, antecipado: 100 }),
      ],
      recorrentes: ['1|2'],
    },
    nomes: { fornecedores: {} },
  };
  const r = resumoPagar(dados);
  assert.equal(r.total, 1350);
  assert.equal(r.vencido, 100);
  assert.deepEqual([...r.proximos.map(x => x.valor)], [50, 50, 250, 250, 250]);
  assert.equal(r.pago, 1000);
  assert.equal(r.recorrente, 600);
  assert.equal(r.extraordinario, 400);
  assert.equal(r.juros + r.multa, 9);
  assert.equal(r.desconto, 10);
  assert.equal(r.percentualAtrasado, 30);
  assert.equal(r.atrasoMedio, 5);
  assert.equal(r.prazoMedio, 10);
  assert.equal(r.concentracao.top5, 100);
  assert.equal(r.pagoPor.categoria[0].chave, 'PESSOAL');
});
