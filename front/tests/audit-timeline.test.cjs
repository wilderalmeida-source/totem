const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/audit-timeline.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: api });
const log = (id, sessionId, action, metadata = {}, createdAt = '2026-10-23T12:00:00Z') => ({ id, sessionId, action, metadata, createdAt, category: 'TOTEM' });
test('agrupa por fluxo, ordena pela hora original e nao mistura eventos sem fluxo', () => {
  const items = [log('10', 'a', 'fim'), log('2', 'a', 'inicio'), log('3', undefined, 'x'), log('4', undefined, 'y')];
  const groups = api.timelineGroups(items);
  assert.equal(groups.length, 3);
  assert.equal(groups.find(g => g.key === 'flow:a').events.map(e => e.id).join(), '2,10');
  assert.equal(items[0].id, '10');
});
test('resposta HTTP 200 nao vira confirmacao de emissao e erros tecnicos nao sao ocultados', () => {
  const response = log('1', 'a', 'resposta_backend', { status: 200 });
  assert.equal(api.eventResult(response), 'Registro de etapa');
  assert.equal(api.isTechnicalEvent(response), true);
  const failure = log('2', 'a', 'resposta_backend', { status: 500 });
  assert.equal(api.isTechnicalEvent(failure), false);
  assert.equal(api.eventResult(failure), 'Erro HTTP 500');
  assert.equal(api.eventResult(log('4', 'a', 'operacao_falhou')), 'Falhou');
  assert.match(api.eventTitle(log('3', 'a', 'numero_reservado')), /ainda não/);
});
test('resume recusa de sessao sem expor CPF ou dados arbitrarios', () => {
  const context = api.eventContext(log('1', 'a', 'emissao_rejeitada', { code: 'PATIENT_SESSION_MISSING', ds_cpf: '12345678901', secret: 'oculto' }));
  assert.match(context, /não foi enviado/);
  assert.doesNotMatch(context, /12345678901|oculto/);
});
