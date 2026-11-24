const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function carregar(arquivo, modulos = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, require: nome => modulos[nome], Math, Map, Set, Number, String, Array, Object, Date, Infinity });
  return exports;
}
const load = () => carregar('lib/faturamento.ts', { '@/lib/diretoria': carregar('lib/diretoria.ts') });
const m = (extra = {}) => ({ exames: 0, producao: 0, faturavel: 0, examesConvenio: 0, examesParticular: 0, faturados: 0, faturado: 0, pendente: 0, examesPendentes: 0, glosa: 0, examesGlosados: 0, guiasFaturadas: 0, faturas: 0, diasAteFaturar: 0, ...extra });

test('indicadores: ticket, dias até faturar, taxa de glosa e soma', () => {
  const { ticket, diasMedios, taxaGlosa, somar, pct } = load();
  const t = somar([m({ exames: 2, producao: 300, faturados: 2, diasAteFaturar: 30, faturado: 200, glosa: 10 }), m({ exames: 1, producao: 100 })]);
  assert.equal(ticket(t), 400 / 3);
  assert.equal(diasMedios(t), 15);
  assert.equal(taxaGlosa(t), 5);
  assert.equal(pct(1, 3), 33.3);
});

test('série semanal/mensal com períodos vazios e picos e quedas', () => {
  const { serie, picosEQuedas } = load();
  const dias = [{ dia: '2026-11-02', ...m({ exames: 10, producao: 1000 }) }, { dia: '2026-11-10', ...m({ exames: 5, producao: 400 }) }];
  const s = serie(dias, '2026-11-02', '2026-11-15', 'semana');
  assert.equal(s.length, 2);
  assert.equal(s[0].producao, 1000);
  const d = serie(dias.slice(0, 1), '2026-11-01', '2026-11-03', 'dia');
  assert.equal(d.length, 3);
  const pq = picosEQuedas(s);
  assert.equal(pq.picos[0].producao, 1000);
  assert.equal(pq.quedas[0].queda, -60);
});

test('pendências: faixas, acumulado, tipo pelo motivo e agrupamentos', () => {
  const { resumoPendencias, tipoPendencia } = load();
  const e = (dias, valor, extra = {}) => ({ cdExame: dias, cdAtendimento: 1, data: '2026-11-01', cdConvenio: 1, convenio: 'UNIMED', cdModalidade: 8, modalidade: 'US', cdProcedimento: 5, procedimento: 'US ABDOME', valor, dias, guia: 'G', autorizacao: 'A', validade: null, motivo: null, pendenciaDesde: null, observacao: null, ...extra });
  assert.equal(tipoPendencia({ motivo: 'FALTA SCANEAR COM ASSINATURA', guia: 'G', autorizacao: 'A' }), 'documentacao');
  assert.equal(tipoPendencia({ motivo: 'SENHA DE AUTORIZACAO ERRADA', guia: 'G', autorizacao: 'A' }), 'autorizacao');
  assert.equal(tipoPendencia({ motivo: 'CODIGO PROCEDIMENTO DIVERGENTE', guia: 'G', autorizacao: 'A' }), 'cadastro');
  assert.equal(tipoPendencia({ motivo: null, guia: 'G', autorizacao: null }), 'autorizacao');
  const r = resumoPendencias([e(0, 100), e(5, 200, { motivo: 'FALTANDO PEDIDO MEDICO' }), e(40, 300, { guia: null, validade: '2026-10-01' })]);
  assert.equal(r.valor, 600);
  assert.equal(r.faixas.find(f => f.id === '7').exames, 1);
  assert.equal(r.faixas.find(f => f.id === '31').valor, 300);
  assert.deepEqual([...r.maisDe.map(x => x.exames)], [2, 2, 1, 1, 1]);
  assert.equal(r.semGuia, 1);
  assert.equal(r.autorizacaoVencida, 1);
  assert.equal(r.porMotivo[0].chave, 'Sem motivo informado');
});

test('glosas: categoria pelo código TISS, situação do recurso, recorrência e aumento anormal', () => {
  const { categoriaGlosa, situacaoRecurso, motivosRecorrentes, aumentosAnormais } = load();
  assert.equal(categoriaGlosa('1705'), 'valor');
  assert.equal(categoriaGlosa('1402'), 'autorizacao');
  assert.equal(categoriaGlosa('2421'), 'tecnica');
  assert.equal(categoriaGlosa('3052'), 'documentacao');
  assert.equal(categoriaGlosa('1010'), 'administrativa');
  assert.equal(categoriaGlosa('2099'), 'outros');
  assert.equal(categoriaGlosa(null), 'outros');
  assert.equal(situacaoRecurso({ dataRecurso: null, recebido: 0, aceite: false }), 'sem_recurso');
  assert.equal(situacaoRecurso({ dataRecurso: '2026-10-01', recebido: 0, aceite: false }), 'em_analise');
  assert.equal(situacaoRecurso({ dataRecurso: '2026-10-01', recebido: 50, aceite: false }), 'revertido');
  assert.equal(situacaoRecurso({ dataRecurso: null, recebido: 0, aceite: true }), 'definitiva');
  const h = (mes, codigo, glosa) => ({ mes, codigo, cdConvenio: 1, glosa, exames: 1 });
  const hist = [h('2026-07', '1705', 100), h('2026-08', '1705', 100), h('2026-09', '1705', 100), h('2026-10', '1705', 400), h('2026-09', '1402', 50)];
  const rec = motivosRecorrentes(hist);
  assert.equal(rec.length, 1);
  assert.equal(rec[0].meses, 4);
  const an = aumentosAnormais(hist);
  assert.equal(an.find(x => x.mes === '2026-10').anormal, true);
  assert.equal(an.find(x => x.mes === '2026-09').anormal, false);
});

test('tendência, queda anormal, concentração e contraste', () => {
  const { tendencia, concentracao, comContraste } = load();
  const t = tendencia([{ mes: '2026-07', valor: 100 }, { mes: '2026-08', valor: 100 }, { mes: '2026-09', valor: 100 }, { mes: '2026-10', valor: 60 }]);
  assert.equal(t.crescimento, -40);
  assert.equal(t.quedaAnormal, true);
  assert.equal(concentracao([50, 30, 20], 1), 50);
  assert.equal(comContraste('TC DE CRANIO COM CONTRASTE'), true);
  assert.equal(comContraste('RM JOELHO C/ GADOLINIO'), true);
  assert.equal(comContraste('US ABDOME TOTAL'), false);
});

test('guias: agrupa por guia com a pior situação e tempo de autorização', () => {
  const { porGuia, tempoAutorizacao } = load();
  const e = (cdExame, guia, situacao, extra = {}) => ({ cdExame, cdAtendimento: 1, data: '2026-10-05', cdConvenio: 1, cdModalidade: 8, cdProcedimento: 5, guia, autorizacao: 'A', solicitacao: '2026-10-01', dataAutorizacao: '2026-10-03', validade: null, situacao, negada: false, divergente: false, faturado: false, valor: 100, motivoGlosa: null, pendencia: null, ...extra });
  const g = porGuia([e(1, 'G1', 'autorizada', { faturado: true }), e(2, 'G1', 'vencida'), e(3, null, 'pendente', { negada: true })]);
  assert.equal(g.length, 2);
  const g1 = g.find(x => x.guia === 'G1');
  assert.equal(g1.situacao, 'vencida');
  assert.equal(g1.faturada, true);
  assert.equal(g1.valor, 200);
  assert.equal(g.find(x => x.guia === 'sem guia').negada, true);
  assert.equal(tempoAutorizacao([e(1, 'G', 'autorizada'), e(2, 'G', 'autorizada', { solicitacao: null })]), 2);
});

test('produtividade: dias úteis e percentual no prazo; demonstrativo pendente; ordem da auditoria', () => {
  const { diasUteis, prazoFaturamento, demonstrativoPendente, ordenarVerificacoes } = load();
  assert.equal(diasUteis('2026-11-23', '2026-11-29'), 5);
  const p = prazoFaturamento([{ dias: 5, exames: 6, valor: 0 }, { dias: 40, exames: 4, valor: 0 }], 30);
  assert.equal(p.percentual, 60);
  assert.equal(p.media, 19);
  assert.equal(demonstrativoPendente({ situacoes: ['6'] }), false);
  assert.equal(demonstrativoPendente({ situacoes: ['6', '2'] }), true);
  assert.equal(demonstrativoPendente({ situacoes: [] }), true);
  const v = (id, gravidade, quantidade, impacto) => ({ id, titulo: id, gravidade, descricao: '', quantidade, impacto, itens: [] });
  const o = ordenarVerificacoes([v('a', 'baixa', 5, 999), v('b', 'alta', 0, 0), v('c', 'media', 1, 10), v('d', 'alta', 2, 5)]);
  assert.deepEqual([...o.map(x => x.id)], ['d', 'c', 'a', 'b']);
});
