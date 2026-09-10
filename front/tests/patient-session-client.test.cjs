const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function compile(file) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('cliente serializa troca de paciente e ignora resposta de identificação substituída', async () => {
  const exports = {};
  const requests = [];
  const events = [];
  const removed = [];
  vm.runInNewContext(compile('lib/patient-session-client.ts'), {
    exports, AbortSignal, Event, CustomEvent,
    require: () => ({ auditContextHeaders: () => ({}), auditTotem: () => {} }),
    window: { dispatchEvent: event => events.push(event.type) },
    sessionStorage: { removeItem: key => removed.push(key) },
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
  });
  const first = exports.patientSessionRequest('POST', { tipo: 'QR', cd_paciente: 123 }).catch(error => error);
  await tick();
  const second = exports.patientSessionRequest('POST', { tipo: 'QR', cd_paciente: 456 });
  assert.equal(requests.length, 1);
  requests[0].resolve(new Response(JSON.stringify({ patient: { cd_paciente: 123 } })));
  assert.match((await first).message, /substituída/);
  await tick();
  assert.equal(requests.length, 2);
  assert.equal(events.length, 0);
  requests[1].resolve(new Response(JSON.stringify({ patient: { cd_paciente: 456 } })));
  assert.equal((await second).patient.cd_paciente, 456);
  assert.deepEqual(events, ['patient-session-active']);
  const end = exports.endPatientSession();
  await tick();
  assert.equal(requests[2].options.method, 'DELETE');
  requests[2].resolve(new Response('{"ok":true}'));
  await end;
  assert.ok(removed.includes('pacienteModalidade'));
  assert.equal(events.at(-1), 'patient-session-cleared');
});

function guardEnvironment(pathname = '/totem', end = async () => {}) {
  let now = 1000000;
  const values = [];
  const effects = [];
  let hook = 0;
  const handlers = new Map();
  const timers = [];
  const removals = [];
  const redirects = [];
  const operations = [];
  const exports = {};
  const on = (name, callback) => handlers.set(name, callback);
  const off = name => handlers.delete(name);
  const react = {
    useState: value => { const index = hook++; if (!(index in values)) values[index] = value; return [values[index], value => { values[index] = value; }]; },
    useRef: value => { const index = hook++; if (!(index in values)) values[index] = { current: value }; return values[index]; },
    useEffect: (fn, deps) => { const index = hook++; if (!(index in values)) { values[index] = deps; effects.push(fn); } },
  };
  vm.runInNewContext(compile('components/totem/PatientSessionGuard.tsx'), {
    exports, Date: class extends Date { static now() { return now; } },
    require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'next/navigation') return { usePathname: () => pathname };
      if (name.endsWith('patient-session-config')) return { PATIENT_IDLE_MS: 120000 };
      if (name.endsWith('patient-session-client')) return {
        endPatientSession: async () => { operations.push('DELETE'); await end(); },
        patientSessionRequest: async method => { operations.push(method); throw Error('no session'); },
      };
      throw Error(name);
    },
    window: { addEventListener: on, removeEventListener: off, location: { replace: url => redirects.push(url) } },
    document: { addEventListener: on, removeEventListener: off, visibilityState: 'visible' },
    sessionStorage: { removeItem: key => removals.push(key) },
    setInterval: fn => { timers.push(fn); return timers.length; }, clearInterval: () => {},
  });
  return {
    render: () => { hook = 0; return exports.default({ children: 'PATIENT DATA' }); },
    mount: () => { effects.splice(0).forEach(fn => fn()); },
    advance: ms => { now += ms; }, timer: () => timers.forEach(fn => fn()),
    event: (name, data) => handlers.get(name)?.(data), operations, redirects, removals,
    now: () => now,
  };
}

test('inatividade oculta dados antes de encerrar sessão e voltar ao início', async () => {
  const env = guardEnvironment();
  env.render(); env.mount(); await tick();
  assert.equal(env.render().props.children, 'PATIENT DATA');
  env.event('patient-session-active', { detail: { expiresAt: env.now() + 120000, absoluteExpiresAt: env.now() + 600000 } });
  env.advance(119000); env.timer();
  assert.deepEqual(env.operations, ['GET']);
  env.advance(1001); env.timer();
  assert.notEqual(env.render().props.children, 'PATIENT DATA');
  await tick();
  assert.deepEqual(env.operations, ['GET', 'DELETE']);
  assert.deepEqual(env.redirects, ['/']);
  assert.ok(env.removals.includes('pacienteModalidade'));
});

test('tela inicial não libera novo atendimento até encerrar sessão anterior', async () => {
  let release;
  const env = guardEnvironment('/', () => new Promise(resolve => { release = resolve; }));
  env.render(); env.mount(); await tick();
  assert.notEqual(env.render().props.children, 'PATIENT DATA');
  release(); await tick();
  assert.equal(env.render().props.children, 'PATIENT DATA');
  assert.deepEqual(env.operations, ['DELETE']);
});

test('aba retomada após expiração encerra atendimento imediatamente', async () => {
  const env = guardEnvironment();
  env.render(); env.mount(); await tick();
  env.advance(120001);
  env.event('visibilitychange');
  assert.notEqual(env.render().props.children, 'PATIENT DATA');
  await tick();
  assert.deepEqual(env.redirects, ['/']);
});
