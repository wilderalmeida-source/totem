const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const Fastify = require('fastify');

function loadTts(fetch) {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib/google-tts.js'), 'utf8'), {
    exports, fetch, Buffer, AbortSignal, process: { env: {} },
  });
  return exports;
}

test('TTS manda a chave no header, com tempo limite, e devolve o MP3', async () => {
  const calls = [];
  const { synthesizeSpeech, TTS_URL } = loadTts(async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => ({ audioContent: Buffer.from('mp3').toString('base64') }) };
  });
  const audio = await synthesizeSpeech({ input: { text: 'oi' } }, 'CHAVE-TESTE');
  assert.equal(audio.toString(), 'mp3');
  assert.equal(calls[0].url, TTS_URL);
  assert.ok(!calls[0].url.includes('CHAVE-TESTE'));
  assert.equal(calls[0].init.headers['x-goog-api-key'], 'CHAVE-TESTE');
  assert.ok(calls[0].init.signal);
});

test('TTS devolve null sem chave, com erro HTTP, sem audio ou quando demora demais', async () => {
  let called = false;
  assert.equal(await loadTts(async () => { called = true; }).synthesizeSpeech({}, ''), null);
  assert.equal(called, false);
  assert.equal(await loadTts(async () => ({ ok: false, json: async () => ({}) })).synthesizeSpeech({}, 'k'), null);
  assert.equal(await loadTts(async () => ({ ok: true, json: async () => ({}) })).synthesizeSpeech({}, 'k'), null);
  const slow = loadTts((url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))));
  const started = Date.now();
  assert.equal(await slow.synthesizeSpeech({}, 'k', 30), null);
  assert.ok(Date.now() - started < 1000);
});

function loadPanel(counter) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/routes/painel.ts'), 'utf8')
    .replace('async function descobrirPainelPorEvento(', 'export async function descobrirPainelPorEvento(');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date, Buffer, process: { env: {} },
    require: name => name === '../../config/prismalog'
      ? { PrismaLog: { configuracao_painel: { findUnique: async () => { counter.config++; return null } }, recepcoes_modalidades: { findMany: async () => [] } } }
      : name === '../../config/prismaDB' ? { prisma: { modalidades: { findMany: async () => { counter.modalidades++; return [] } } } }
      : name.includes('flow-audit') ? { auditContext: { getStore: () => undefined }, flowAudit() {} }
      : name.includes('tcp-frames') ? {} : name.includes('tcp-allowlist') ? require('../src/lib/tcp-allowlist.js') : name.includes('painel-caches') ? require('../src/lib/painel-caches.js') : name.includes('nome-privacidade') ? require('../src/lib/nome-privacidade.js') : name.endsWith('/privacidade') ? { lerPrivacidade: async () => ({ painelNome: globalThis.__painelNome ?? 'completo' }) } : name.includes('senha.helpers') ? { getHojeBrasil: () => new Date('2026-11-15T00:00:00.000Z') } : require(name),
  });
  return exports.descobrirPainelPorEvento;
}

test('painel desativado ou modalidade desconhecida recarrega o cache no maximo uma vez a cada 30 s', async () => {
  const counter = { config: 0, modalidades: 0 };
  const descobrir = loadPanel(counter);
  const fastify = { log: { info() {}, warn() {}, error() {} } };
  for (let i = 0; i < 5; i++) assert.equal(await descobrir(fastify, 'B-0-123-02-RAIO X-MARIA-GUICHE'), 1);
  assert.equal(counter.config, 1);
  assert.equal(counter.modalidades, 1);
});

test('salvar a configuracao dos paineis recarrega o cache na hora', async t => {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/routes/paineis-config.js'), 'utf8'), {
    exports, console,
    require: name => name === '../../config/prismalog'
      ? { PrismaLog: { configuracao_painel: { upsert: async ({ create }) => create } } }
      : name.includes('painel-caches') ? require('../src/lib/painel-caches.js') : name.includes('nome-privacidade') ? require('../src/lib/nome-privacidade.js') : name.endsWith('/privacidade') ? { lerPrivacidade: async () => ({ painelNome: globalThis.__painelNome ?? 'completo' }) } : name.includes('senha.helpers') ? { getHojeBrasil: () => new Date('2026-11-15T00:00:00.000Z') } : require(name),
  });
  let reloads = 0;
  const app = Fastify();
  t.after(() => app.close());
  app.decorate('recarregarCachePainel', async () => { reloads++ });
  await app.register(exports.configuracaoPaineisRoutes);
  const response = await app.inject({ method: 'POST', url: '/clinux/paineis-config', payload: { ativo: false, paineis: [] } });
  assert.equal(response.statusCode, 200);
  assert.equal(reloads, 1);
});

test('configuracao dos paineis recusa estrutura invalida e aceita 1 painel ativo', async t => {
  const exports = {};
  const saved = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/routes/paineis-config.js'), 'utf8'), {
    exports, console,
    require: name => name === '../../config/prismalog'
      ? { PrismaLog: { configuracao_painel: { upsert: async ({ create }) => { saved.push(create); return create } } } }
      : name.includes('painel-caches') ? require('../src/lib/painel-caches.js') : name.includes('nome-privacidade') ? require('../src/lib/nome-privacidade.js') : name.endsWith('/privacidade') ? { lerPrivacidade: async () => ({ painelNome: globalThis.__painelNome ?? 'completo' }) } : name.includes('senha.helpers') ? { getHojeBrasil: () => new Date('2026-11-15T00:00:00.000Z') } : require(name),
  });
  const app = Fastify();
  t.after(() => app.close());
  app.decorate('recarregarCachePainel', async () => {});
  await app.register(exports.configuracaoPaineisRoutes);
  const post = payload => app.inject({ method: 'POST', url: '/clinux/paineis-config', payload });
  for (const payload of [{}, { ativo: 'sim', paineis: [] }, { ativo: true, paineis: 'x' },
    { ativo: true, paineis: [{ painel: 1, ativo: true, ip: '10.0.0.1', atendimento: ['RAIO X'] }] },
    { ativo: true, paineis: [{ painel: 1, ativo: true, ip: '10.0.0.1' }, { painel: 1, ativo: false }] }]) {
    assert.equal((await post(payload)).statusCode, 400, JSON.stringify(payload));
  }
  const nenhum = await post({ ativo: true, paineis: [{ painel: 1, ativo: false }] });
  assert.equal(nenhum.statusCode, 400);
  assert.match(nenhum.json().error, /pelo menos 1 painel/);
  const ok = await post({ ativo: true, paineis: [{ painel: 1, ativo: true, ip: '10.0.0.1', atendimento: [5], extra: 'ignorado' }] });
  assert.equal(ok.statusCode, 200);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].paineis[0].extra, undefined);
});
