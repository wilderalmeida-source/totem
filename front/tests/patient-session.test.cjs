const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function environment() {
  const root = path.resolve(__dirname, '..');
  let now = Date.now();
  const calls = [];
  const context = vm.createContext({
    URL, URLSearchParams, Response, Headers, AbortSignal, console,
    Date: class extends Date { static now() { return now; } },
    process: { env: { LINK_API_INTERNA: 'http://backend:5000', TOKEN_API_INT: 'internal-test-token' } },
    fetch: async (url, options) => {
      if (url.pathname === '/clinux/audit') return new Response(null, { status: 204 });
      calls.push({ url, options });
      if (url.pathname === '/clinux/pacientes') {
        return new Response(JSON.stringify(options.method === 'POST'
          ? { cd_paciente: 999, ds_paciente: 'NOVO', dt_nascimento: '1980-01-01' }
          : [{ cd_paciente: 123, ds_paciente: 'PACIENTE', dt_nascimento: '1980-01-01' }]), { headers: { 'Content-Type': 'application/json' } });
      }
      if (url.pathname === '/clinux/senhas') return new Response(JSON.stringify({ cd_senha: 321 }));
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    },
  });
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const source = fs.readFileSync(filename, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const localRequire = name => {
      if (name === '@/lib/require-totem-operator') return { requireTotemOperator: async () => null };
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name) + '.ts');
      return require(name);
    };
    vm.runInContext(`(function(exports, require) { ${code}\n})`, context)(exports, localRequire);
    return exports;
  }
  return {
    load, calls, context, advance: ms => { now += ms; },
    session: load('app/api/patient-session/route.ts'),
    store: load('lib/patient-session-store.ts'),
    proxy: load('app/api/backend/[...path]/route.ts'),
    issue: load('app/api/patient-session/senha/route.ts'),
  };
}

function request(route = '/api/patient-session', method = 'GET', body, token, secure = false) {
  const origin = `${secure ? 'https' : 'http'}://totem.local`;
  const headers = { host: 'totem.local', origin, 'Content-Type': 'application/json' };
  if (token) headers.cookie = `totem_patient_session=${token}`;
  return new NextRequest(origin + route, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
async function identify(env, body = { tipo: 'ID', ds_cpf: '12345678901', dt_nascimento: '1980-01-01' }, previous) {
  const response = await env.session.POST(request('/api/patient-session', 'POST', body, previous));
  assert.equal(response.status, 200);
  return response.cookies.get('totem_patient_session').value;
}

test('confirma no backend e emite cookie opaco HttpOnly com Secure em HTTPS', async () => {
  const env = environment();
  const response = await env.session.POST(request('/api/patient-session', 'POST', { tipo: 'ID', ds_cpf: '12345678901', dt_nascimento: '1980-01-01' }, undefined, true));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=strict/i);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const token = response.cookies.get('totem_patient_session').value;
  assert.equal(token.length, 43);
  assert.equal(env.store.readPatientSession(token).patientId, 123);
  assert.equal(env.store.readPatientSession(token.slice(0, -1)), null);
  assert.equal(env.calls[0].options.headers.Authorization, 'Bearer internal-test-token');
});

test('rejeita identificação incompleta/forjada e origem externa antes de consultar banco', async () => {
  const env = environment();
  for (const body of [{ tipo: 'ID', ds_cpf: '12345678901' }, { tipo: 'NOMEDATA', ds_paciente: 'ANA' },
    { tipo: 'ID', ds_cpf: '12345678901', dt_nascimento: '1980-01-01', cd_paciente: 456 },
    { tipo: 'QR', cd_paciente: '123abc' }, { tipo: 'NEW', ds_paciente: 'ANA', dt_nascimento: '1980-01-01', cd_paciente: 456 }]) {
    assert.equal((await env.session.POST(request('/api/patient-session', 'POST', body))).status, 400);
  }
  const external = request('/api/patient-session', 'POST', { tipo: 'QR', cd_paciente: 123 });
  external.headers.set('origin', 'http://other.local');
  assert.equal((await env.session.POST(external)).status, 403);
  assert.equal(env.calls.length, 0);
});

test('nome, QR numérico e novo cadastro criam sessão apenas com ID retornado pelo backend', async () => {
  for (const body of [{ tipo: 'NOMEDATA', ds_paciente: 'ANA', dt_nascimento: '1980-01-01' },
    { tipo: 'QR', cd_paciente: 123 }, { tipo: 'NEW', ds_paciente: 'NOVO', dt_nascimento: '1980-01-01' }]) {
    const env = environment();
    const token = await identify(env, body);
    assert.equal(env.store.readPatientSession(token).patientId, body.tipo === 'NEW' ? 999 : 123);
  }
});

test('consulta usa ID da sessão e bloqueia outro paciente, inclusive parâmetros repetidos', async () => {
  const env = environment();
  const token = await identify(env);
  env.calls.length = 0;
  const params = { params: Promise.resolve({ path: ['clinux', 'totem', 'atendimentos'] }) };
  assert.equal((await env.proxy.GET(request('/api/backend/clinux/totem/atendimentos?tipo=hoje'), params)).status, 401);
  for (const query of ['cd_paciente=456', 'cd_paciente=123&cd_paciente=456']) {
    assert.equal((await env.proxy.GET(request('/api/backend/clinux/totem/atendimentos?' + query, 'GET', undefined, token), params)).status, 403);
  }
  assert.equal(env.calls.length, 0);
  const response = await env.proxy.GET(request('/api/backend/clinux/totem/atendimentos?tipo=entrega', 'GET', undefined, token), params);
  assert.equal(response.status, 200);
  assert.equal(env.calls[0].url.searchParams.get('cd_paciente'), '123');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('expira no servidor por inatividade; leitura não renova; interação respeita duração máxima', async () => {
  const env = environment();
  const token = await identify(env);
  env.advance(119000);
  assert.equal((await env.session.GET(request('/api/patient-session', 'GET', undefined, token))).status, 200);
  env.advance(1001);
  assert.equal((await env.session.GET(request('/api/patient-session', 'GET', undefined, token))).status, 401);
  assert.equal((await env.session.PATCH(request('/api/patient-session', 'PATCH', undefined, token))).status, 401);
  const renewed = await identify(env);
  for (let i = 0; i < 9; i++) {
    env.advance(60000);
    assert.equal((await env.session.PATCH(request('/api/patient-session', 'PATCH', undefined, renewed))).status, 200);
  }
  env.advance(60001);
  assert.equal(env.store.readPatientSession(renewed), null);
});

test('logout e nova identificação revogam token antigo, sem possibilidade de reutilização', async () => {
  const env = environment();
  const first = await identify(env);
  const second = await identify(env, { tipo: 'QR', cd_paciente: 123 }, first);
  assert.equal(env.store.readPatientSession(first), null);
  const response = await env.session.DELETE(request('/api/patient-session', 'DELETE', undefined, second));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/i);
  assert.equal(env.store.readPatientSession(second), null);
});

test('identificação malsucedida não mantém sessão anterior', async () => {
  const env = environment();
  const first = await identify(env);
  env.context.fetch = async () => new Response(JSON.stringify([{ tentativas: 2 }]));
  const response = await env.session.POST(request('/api/patient-session', 'POST', { tipo: 'QR', cd_paciente: 456 }, first));
  assert.equal(response.status, 401);
  assert.equal(env.store.readPatientSession(first), null);
});

test('emissão exige vínculo, encerra sessão no sucesso e bloqueia repetição', async () => {
  const env = environment();
  const token = await identify(env);
  env.calls.length = 0;
  const body = { cd_paciente: 456, servico: 'B', preferencial: 0 };
  assert.equal((await env.issue.POST(request('/api/patient-session/senha', 'POST', body, token))).status, 403);
  assert.equal(env.calls.length, 0);
  delete body.cd_paciente;
  const response = await env.issue.POST(request('/api/patient-session/senha', 'POST', body, token));
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(env.calls[0].options.body).cd_paciente, 123);
  assert.equal(env.store.readPatientSession(token), null);
  assert.equal((await env.issue.POST(request('/api/patient-session/senha', 'POST', body, token))).status, 401);
});

test('emissões simultâneas da mesma sessão não são encaminhadas duas vezes', async () => {
  const env = environment();
  const token = await identify(env);
  let release;
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  env.context.fetch = () => { entered(); return new Promise(resolve => { release = resolve; }); };
  const first = env.issue.POST(request('/api/patient-session/senha', 'POST', { servico: 'B' }, token));
  await started;
  assert.equal((await env.issue.POST(request('/api/patient-session/senha', 'POST', { servico: 'B' }, token))).status, 409);
  release(new Response('{"cd_senha":321}'));
  assert.equal((await first).status, 200);
});

test('proxy não permite contornar sessão por consulta de ID ou gravações antigas', async () => {
  const env = environment();
  const token = await identify(env);
  env.calls.length = 0;
  const patients = { params: Promise.resolve({ path: ['clinux', 'pacientes'] }) };
  assert.equal((await env.proxy.GET(request('/clinux/pacientes?cd_paciente=456', 'GET', undefined, token), patients)).status, 403);
  assert.equal((await env.proxy.GET(request('/clinux/pacientes?tipo=ID&ds_cpf=12345678901&dt_nascimento=1980-01-01'), patients)).status, 403);
  assert.equal((await env.proxy.POST(request('/clinux/pacientes', 'POST', { ds_paciente: 'ANA' }, token), patients)).status, 403);
  const tickets = { params: Promise.resolve({ path: ['clinux', 'senhas'] }) };
  assert.equal((await env.proxy.POST(request('/clinux/senhas', 'POST', { cd_paciente: 456 }, token), tickets)).status, 403);
  assert.equal(env.calls.length, 0);
});


test('falhas e respostas sem comprovacao nunca retornam sucesso de emissao', async () => {
  for (const response of [new Response('{}'), new Response('null'), new Response('[]'), new Response('{"cd_senha":0}'), new Response('invalido'), new Response('{"error":"falha"}', { status: 500 })]) {
    const env = environment();
    const token = await identify(env);
    env.context.fetch = async () => response;
    const result = await env.issue.POST(request('/api/patient-session/senha', 'POST', { servico: 'B' }, token));
    assert.equal(result.status, 502);
    assert.notEqual((await result.json()).ok, true);
    assert.ok(env.store.readPatientSession(token));
  }
});
