const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file) {
  const exports = {};
  const filename = path.join(__dirname, '..', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') ? load('lib/' + name.slice(2) + '.ts') : require(name) });
  return exports;
}
const api = load('lib/audit-presentation.ts');
const event = (action, metadata = {}) => ({ id: action, category: 'TOTEM', sessionId: 'flow-1', action, metadata, createdAt: '2026-10-23T15:40:00Z' });
test('servico, prioridade, navegacao e codigo de barras possuem nomes legiveis', () => {
  assert.equal(api.stageTitle(event('servico_selecionado', { servico: 'C' })), 'Serviço: Entrega de exames');
  assert.equal(api.stageTitle(event('prioridade_selecionada', { preferencial: 0 })), 'Prioridade: Atendimento normal');
  assert.equal(api.stageTitle(event('voltar')), 'Voltar');
  assert.match(api.stageTitle(event('qr_lido')), /barras/);
});
test('somente confirmacao explicita da emissao confirma o envio; audio fica separado', () => {
  assert.notEqual(api.flowSummary([event('identificacao_resposta_final', { status: 200, outcome: 'CONCLUIDO' })]).status, 'Envio confirmado');
  const summary = api.flowSummary([event('senha_e_vinculo_confirmados', { nr_senha: 23 }), event('audio_falhou', { outcome: 'FALHOU' })]);
  assert.equal(summary.status, 'Envio confirmado');
  assert.equal(summary.ticket, '23');
  assert.equal(summary.audioFailure, true);
  assert.equal(api.flowSummary([event('emissao_rejeitada')]).status, 'Envio rejeitado');
});
test('detalhes convertem retorno em campos e preservam limites sem mostrar CPF ou QR brutos', () => {
  const details = api.stageDetails(event('identificacao_retorno_backend', {
    resposta: { quantidade: 20, truncado: true, amostra: [{ ds_paciente: 'PACIENTE TESTE', dt_nascimento: '1992-08-13T00:00:00Z', ds_cpf: '12345678901' }] },
    codigoLido: 'segredo-do-cartao', token: 'segredo-token',
  }));
  assert.equal(details.count, 20);
  assert.equal(details.truncated, true);
  assert.match(JSON.stringify(details), /13\/08\/1992/);
  assert.doesNotMatch(JSON.stringify(details), /12345678901|segredo/);
  assert.equal(api.visibleStages([event('identificacao_retorno_backend', { resposta: { amostra: [{ ds_paciente: 'TESTE' }] } })]).length, 1);
});
test('cartao renderiza etapas acessiveis responsivas e nao inclui JSON bruto', () => {
  const Timeline = load('components/admin/AuditTimeline.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Timeline, { items: [event('servico_selecionado', { servico: 'D', segredo: 'NAO_EXIBIR' }), event('voltar')], onSelectFlow: () => {} }));
  assert.match(html, /Serviço: Agendar exames/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /md:flex-row/);
  assert.doesNotMatch(html, /<pre|NAO_EXIBIR|JSON/);
});
