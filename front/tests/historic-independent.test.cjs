const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

test('selecao de servico cancela historico pendente e encerra SSE sem aguardar resposta', async () => {
  const effects = [], listeners = new Map(), timers = new Map();
  let nextTimer = 0, signal, calls = 0, closed = false, stream;
  const exports = {};
  const clear = id => timers.delete(id);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/ui/historic.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, {
    exports, AbortController, clearTimeout: clear, console,
    window: {
      setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; },
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: name => listeners.delete(name),
    },
    EventSource: class { constructor() { stream = this; } close() { closed = true; } },
    require: name => name === 'react' ? {
      useState: initial => [initial, () => {}], useMemo: fn => fn(), useCallback: fn => fn,
      useRef: initial => ({ current: initial }), useTransition: () => [false, fn => fn()],
      useEffect: fn => effects.push(fn),
    } : name === '@/services/api' ? {
      buscaPaciente: async () => [],
      buscaSenhas: input => { calls++; signal = input; return new Promise((_resolve, reject) => input.addEventListener('abort', () => reject(new Error('cancelado')))); },
    } : name === 'react/jsx-runtime' ? require(name) : {},
  });
  exports.default();
  const cleanups = effects.map(fn => fn());
  assert.equal(calls, 1);
  assert.equal(signal.aborted, false);
  // Eventos simultâneos não iniciam consultas sobrepostas.
  stream.onmessage({ data: JSON.stringify({ message: JSON.stringify({ type: 'db' }) }) });
  timers.get(nextTimer)();
  assert.equal(calls, 1);
  listeners.get('totem-service-selected')();
  assert.equal(signal.aborted, true);
  assert.equal(closed, true);
  await new Promise(resolve => setImmediate(resolve));
  for (const cleanup of cleanups) if (cleanup) cleanup();
  assert.equal(listeners.size, 0);
});
