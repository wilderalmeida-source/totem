const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function environment(config) {
  let cycle = 0;
  const effects = [], timers = [];
  const react = { useEffect: fn => effects.push(fn), useState: initial => [
    initial === false ? true : typeof initial === 'number' ? cycle : initial && typeof initial === 'object' && 'items' in initial ? config : initial,
    value => { if (typeof initial === 'number') cycle = typeof value === 'function' ? value(cycle) : value; },
  ] };
  function load(file) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(code, { exports, setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {},
      require: name => name === 'react' ? react : name === '@/lib/panel-notices' ? load('lib/panel-notices.ts') : name === '@/components/GoldMark' ? load('components/GoldMark.tsx') : name === './Pictogram' ? load('components/panel/Pictogram.tsx') : require(name),
    });
    return exports;
  }
  const Panel = load('components/panel/ThemeOnePanel.tsx').default;
  return { timers, render: () => {
    effects.length = 0;
    return renderToStaticMarkup(React.createElement(Panel, { current: { id: 'call-1', name: 'Paciente T.', fullName: 'PACIENTE TESTE NOME COMPLETO', modalidade: 'Ultrassonografia', guicheNome: 'Guichê 1', recepcao: 'Recepção 1', calledAt: '10:30' }, people: [], painelId: 1 }));
  }, rotate: () => effects.at(-1)() };
}
const item = { id: 'f260a461-0bdf-4fad-82d3-2479cd3727a1', title: 'Aviso', text: '<script>não executar</script>', icon: 'info', durationSeconds: 7, active: true };
test('nome completo e modalidade sao exibidos; texto informativo e escapado', () => {
  const env = environment({ enabled: true, items: [item] });
  const html = env.render();
  assert.match(html, /PACIENTE TESTE NOME COMPLETO/);
  assert.match(html, /Ultrassonografia/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|Simular nova chamada/);
});
test('um unico informativo repete na duracao configurada e lista desativada nao agenda rotacao', () => {
  const env = environment({ enabled: true, items: [item] });
  env.render(); env.rotate(); assert.equal(env.timers[0].ms, 7000);
  env.timers[0].fn(); env.render(); env.rotate(); assert.equal(env.timers.length, 2);
  const disabled = environment({ enabled: false, items: [item] });
  assert.match(disabled.render(), /tv-no-notice/); disabled.rotate(); assert.equal(disabled.timers.length, 0);
});

test('indicador vermelho pertence somente a categoria informativos e imagens usam arquivos locais', () => {
  const images = [{ file: 'notice-f260a461-0bdf-4fad-82d3-2479cd3727a1.webp', alt: 'Orientação ilustrada' }];
  const info = environment({ enabled: true, items: [{ ...item, category: 'informativos', images }] }).render();
  assert.match(info, /tv-notice-alert-dot/);
  assert.match(info, /api\/media\/file\?name=notice-/);
  assert.match(info, /Orientação ilustrada/);
  const campaign = environment({ enabled: true, items: [{ ...item, category: 'campanhas' }] }).render();
  assert.doesNotMatch(campaign, /tv-notice-alert-dot/);
  assert.match(campaign, /Campanha/);
});
