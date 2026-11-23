const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const mod = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: mod });
  return mod;
}
const { focusForCall, validNoticeSettings } = load('lib/panel-notices.ts');
const { parsePanelCall } = load('lib/panel-call.ts');
const base = { title: 'Preparo da ressonância', text: 'Retire objetos metálicos.', icon: 'info', active: true };
const rm = { ...base, id: '11111111-1111-4111-8111-111111111111', category: 'modalidade', modalidades: [7], durationSeconds: 30, extraSeconds: 10 };
const tc = { ...base, id: '22222222-2222-4222-8222-222222222222', category: 'modalidade', modalidades: [3, 4], durationSeconds: 20 };
const playlist = { ...base, id: '33333333-3333-4333-8333-333333333333', durationSeconds: 15 };
const items = [playlist, rm, tc];

test('chamada da modalidade mostra o aviso pelo tempo configurado', () => {
  const f = focusForCall(null, items, { cdModalidade: 7, modalidade: 'RESSONANCIA' }, 1000);
  assert.equal(f.notice.id, rm.id);
  assert.equal(f.until, 31000);
  assert.equal(f.modalidade, 'RESSONANCIA');
});

test('nova chamada da mesma modalidade soma os segundos extras', () => {
  const f1 = focusForCall(null, items, { cdModalidade: 7 }, 0);
  const f2 = focusForCall(f1, items, { cdModalidade: 7 }, 5000);
  assert.equal(f2.start, 0);
  assert.equal(f2.until, 40000);
  // sem extraSeconds vale 5 s
  const t1 = focusForCall(null, items, { cdModalidade: 3 }, 0);
  assert.equal(focusForCall(t1, items, { cdModalidade: 4 }, 1000).until, 25000);
});

test('o tempo somado nao passa de 5 minutos a frente', () => {
  let f = focusForCall(null, items, { cdModalidade: 7 }, 0);
  for (let i = 0; i < 100; i++) f = focusForCall(f, items, { cdModalidade: 7 }, 1000);
  assert.equal(f.until, 301000);
});

test('outra modalidade troca o aviso; sem aviso para a modalidade nada muda', () => {
  const f1 = focusForCall(null, items, { cdModalidade: 7 }, 0);
  const f2 = focusForCall(f1, items, { cdModalidade: 3 }, 2000);
  assert.equal(f2.notice.id, tc.id);
  assert.equal(f2.until, 22000);
  assert.equal(focusForCall(f2, items, { cdModalidade: 99 }, 3000), f2);
  assert.equal(focusForCall(null, items, {}, 0), null);
  // aviso vencido nao e estendido: comeca de novo
  assert.equal(focusForCall(f1, items, { cdModalidade: 7 }, 60000).until, 90000);
  // aviso inativo nao aparece
  assert.equal(focusForCall(null, [{ ...rm, active: false }], { cdModalidade: 7 }, 0), null);
});

test('validacao do front e codigo da modalidade na chamada', () => {
  assert.equal(validNoticeSettings({ enabled: true, items }), true);
  assert.equal(validNoticeSettings({ enabled: true, items: [{ ...rm, modalidades: [] }] }), false);
  assert.equal(validNoticeSettings({ enabled: true, items: [{ ...rm, extraSeconds: 90 }] }), false);
  const call = { id: 'a', name: 'MARIA', guicheNumero: '01', guicheNome: 'Guichê 1', recepcao: 'R', calledAt: '10:00' };
  assert.equal(parsePanelCall({ ...call, cdModalidade: 7 }).cdModalidade, 7);
  assert.equal(parsePanelCall(call).cdModalidade, undefined);
  assert.equal(parsePanelCall({ ...call, cdModalidade: 'x' }), null);
});
