const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

test('selecao de servico cancela historico pendente e encerra SSE sem aguardar resposta', async () => {
  const effects = [], listeners = new Map(), timers = new Map(), intervals = new Map(), docListeners = new Map();
  let nextTimer = 0, signal, calls = 0, closed = false, stream;
  const exports = {};
  const clear = id => timers.delete(id);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/ui/historic.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, {
    exports, AbortController, clearTimeout: clear, clearInterval: id => intervals.delete(id), console,
    document: { visibilityState: 'visible', addEventListener: (name, fn) => docListeners.set(name, fn), removeEventListener: name => docListeners.delete(name) },
    window: {
      setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; },
      setInterval: fn => { intervals.set(++nextTimer, fn); return nextTimer; },
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
  // A atualização de segurança e o aviso de volta à tela também param ao escolher um serviço.
  assert.equal(intervals.size, 0);
  assert.equal(docListeners.size, 0);
  await new Promise(resolve => setImmediate(resolve));
  for (const cleanup of cleanups) if (cleanup) cleanup();
  assert.equal(listeners.size, 0);
});

test('historico se atualiza sozinho a cada 30 s e ao reconectar os eventos', async () => {
  const effects = [], intervals = new Map(), timers = new Map();
  let nextTimer = 0, calls = 0, stream, now = 1_000_000;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/ui/historic.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, {
    exports, AbortController, clearTimeout: id => timers.delete(id), clearInterval: id => intervals.delete(id), console,
    Date: class extends Date { static now() { return now; } },
    document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    window: {
      setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; },
      setInterval: fn => { intervals.set(++nextTimer, fn); return nextTimer; },
      addEventListener() {}, removeEventListener() {},
    },
    EventSource: class { constructor() { stream = this; } close() {} },
    require: name => name === 'react' ? {
      useState: initial => [initial, () => {}], useMemo: fn => fn(), useCallback: fn => fn,
      useRef: initial => ({ current: initial }), useTransition: () => [false, fn => fn()],
      useEffect: fn => effects.push(fn),
    } : name === '@/services/api' ? {
      buscaPaciente: async () => [],
      buscaSenhas: async () => { calls++; return { senhas: [], senhasnr: [] }; },
    } : name === 'react/jsx-runtime' ? require(name) : {},
  });
  exports.default();
  effects.map(fn => fn());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  const tick = [...intervals.values()][0];
  now += 20_000; tick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1); // ainda recente: não consulta de novo
  now += 10_000; tick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 2); // 30 s: atualiza sozinho
  stream.onerror(); stream.onopen(); timers.get(nextTimer)(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 3); // conexão de eventos voltou: recarrega
});

