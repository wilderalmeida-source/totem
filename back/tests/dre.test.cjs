const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sugerirFolha, ESTRUTURA_DRE, FOLHAS } = require('../src/lib/dre-estrutura.js');

const c = (conta, grupo, despesa, linha) => ({ cdConta: 1, conta, grupo, despesa, linha });

test('sugestão de linha da DRE para as contas do plano de contas do Clinux', () => {
  const casos = [
    [c('CONVENIOS', 'RECEITAS', false, 'RECEITA OPERACIONAL'), 'RB.CONV'],
    [c('PARTICULAR ', 'RECEITAS', false, 'RECEITA OPERACIONAL'), 'RB.PART'],
    [c('PREFEITURAS SUS E CONVENIO PUBLICOS', 'RECEITA PREFEITURAS E CONVEN. SUS', false, 'RECEITA OPERACIONAL'), 'RB.CONV'],
    [c('COFINS S/ RECEITA', 'DEDUCAO DE RECEITA', true, 'DEDUÇÃO DE RECEITA'), 'DED.TRIB'],
    [c('PIS S/ RECEITA', 'DEDUCAO DE RECEITA', true, 'DEDUÇÃO DE RECEITA'), 'DED.TRIB'],
    [c('ISSQN SERVICOS PRESTADOS', 'DEDUCAO DE RECEITA', true, 'DEDUÇÃO DE RECEITA'), 'DED.TRIB'],
    [c('IRPJ S/RECEITA', 'DEDUCAO DE RECEITA', true, 'DEDUÇÃO DE RECEITA'), 'IR.IRCS'],
    [c('CSLL S/RECEITA', 'DEDUCAO DE RECEITA', true, 'DEDUÇÃO DE RECEITA'), 'IR.IRCS'],
    [c('CANCELAMENTO E DEVOLUCOES', 'DEDUCAO DE RECEITA', true, 'DEDUÇÃO DE RECEITA'), 'DED.AJ'],
    [c('TARIFA DE CARTAO', 'DEDUCAO DE RECEITA', true, 'DEDUÇÃO DE RECEITA'), 'RF.DES'],
    [c('HONORARIOS MEDICOS', 'DESPESA OPERACIONAL', true, 'DESPESA OPERACIONAL'), 'CSP.MED'],
    [c('HONORARIO DE TELEOPERACAO', 'DESPESA OPERACIONAL', true, 'DESPESA OPERACIONAL'), 'CSP.MED'],
    [c('MATERIAIS E MEDICAMENTOS PARA EXAMES', 'DESPESA OPERACIONAL', true, 'DESPESA OPERACIONAL'), 'CSP.MAT'],
    [c('MANUTENCAO DE EQUIPAMENTO MEDICOS', 'DESPESA OPERACIONAL', true, 'DESPESA OPERACIONAL'), 'CSP.MAN'],
    [c('ENERGIA ELETRICA', 'DESPESA OPERACIONAL', true, 'DESPESA OPERACIONAL'), 'CSP.INF'],
    [c('ALUGUEIS E CONDOMINIOS', 'DESPESA ADMINISTRATIVA', true, 'DESPESA OPERACIONAL'), 'CSP.INF'],
    [c('ALUGUEL MAQUINA CARTAO', 'DESPESA OPERACIONAL', true, 'DESPESA OPERACIONAL'), 'RF.DES'],
    [c('SOFTWARE E SISTEMA', 'DESPESA ADMINISTRATIVA', true, 'DESPESA ADMINISTRATIVA'), 'DOP.TEC'],
    [c('TELEFONE E INTERNET', 'DESPESA ADMINISTRATIVA', true, 'DESPESA ADMINISTRATIVA'), 'DOP.TEC'],
    [c('HONORARIOS CONTABEIS', 'DESPESA ADMINISTRATIVA', true, 'DESPESA ADMINISTRATIVA'), 'DOP.ADM'],
    [c('PLANO DE SAUDE DIRETORIA', 'DESPESA COM DIRETORIA', true, 'DESPESA ADMINISTRATIVA'), 'DOP.ADM'],
    [c('SALARIOS', 'DESPESA COM PESSOAL', true, 'DESPESA COM PESSOAL'), 'DOP.PES'],
    [c('PROPGAGANDA E PUPLICIDADE', 'DESPESA COMERCIAL', true, 'DESPESA COMERCIAL'), 'DOP.COM'],
    [c('TARIFAS BANCARIAS', 'DESPESA FINANCEIRA', true, 'DESPESA FINANCEIRA'), 'RF.DES'],
    [c('ESTORNO DEBITO/CREDITO', 'DESPESA FINANCEIRA', true, 'DEDUÇÃO DE RECEITA'), 'DED.AJ'],
    [c('RENDIMENTO DE APLICACAO', 'RECEITAS', false, 'RECEITA FINANCEIRA'), 'RF.REC'],
    [c('OUTRAS RECEITAS', 'RECEITAS', false, 'RECEITA NÃO OPERACIONAL'), 'DOP.OUT'],
    [c('EMPRESTIMO CONSORCIO', 'RECEITAS', false, 'RECEITA FINANCEIRA'), 'FORA'],
    [c('AMORTIZACAO EMPRESTIMO BANCARIO', 'FINANCIAMENTOS', true, 'AMORTIZAÇÃO DE EMPRESTIMOS'), 'FORA'],
    [c('OBRAS E REFORMAS', 'IMOBILIZADO', true, 'IMOBILIZADOS E INVESTIMENTOS'), 'FORA'],
    [c('AJUSTE DE SALDO', 'RECEITAS', false, null), 'FORA'],
    [c('EVENTO OUTUBRO ROSA 2025', 'RECEITAS', false, null), null],
  ];
  for (const [conta, esperado] of casos) assert.equal(sugerirFolha(conta), esperado, conta.conta);
});

test('estrutura: toda folha é única e todo total referencia linhas existentes', () => {
  assert.equal(new Set(FOLHAS).size, FOLHAS.length);
  const ids = new Set(ESTRUTURA_DRE.map(l => l.id));
  for (const l of ESTRUTURA_DRE) if (l.tipo === 'total') for (const s of l.soma) assert.ok(ids.has(s.id), `${l.id} -> ${s.id}`);
});
