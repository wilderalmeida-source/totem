const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load() {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/routes/painel.ts'), 'utf8').replace('async function tratarMensagemTcp(', 'export async function tratarMensagemTcp(');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date, Buffer, process: { env: {} },
    require: name => name === '../../config/prismalog' ? { PrismaLog: { guiches: { findUnique: async () => ({ ativo: true, nome: 'Atendimento' }) }, recepcoes_modalidades: { findMany: async () => [] } } }
      : name === '../../config/prismaDB' ? { prisma: {} }
      : name.includes('flow-audit') ? { auditContext: { getStore: () => ({ flowId: 'unique-call' }) }, flowAudit() {} }
      : name.includes('tcp-frames') ? {} : name.includes('tcp-allowlist') ? require('../src/lib/tcp-allowlist.js') : name.includes('painel-caches') ? require('../src/lib/painel-caches.js') : name.includes('nome-privacidade') ? require('../src/lib/nome-privacidade.js') : name.endsWith('/privacidade') ? { lerPrivacidade: async () => ({ painelNome: globalThis.__painelNome ?? 'completo' }) } : name.includes('senha.helpers') ? { getHojeBrasil: () => new Date('2026-11-15T00:00:00.000Z') } : require(name),
  });
  return exports.tratarMensagemTcp;
}
test('TCP and audio share immutable call identity and patient/location metadata', async () => {
  const messages = [];
  const call = load();
  await call({ log: { error() {} }, broadcast: message => messages.push(message), inject: async request => request.method === 'GET'
    ? { json: () => ({}) } : { statusCode: 200, json: () => ({ audioContent: '/audios/test.mp3' }) } }, 'B-0-123-02-RAIO X-MARIA-GUICHE', 3);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].payload.followsAudio, true);
  assert.equal(messages[0].payload.call, messages[1].payload.call);
  assert.equal(messages[1].payload.call.name, 'MARIA');
  assert.equal(messages[1].payload.call.guicheNumero, '02');
  assert.equal(messages[1].payload.call.recepcao, 'Recepção 3');
  assert.equal(messages[1].payload.ttsBody.audioContent, '/audios/test.mp3');
});
test('TTS rejection keeps call metadata and provides speech fallback', async () => {
  const messages = [];
  await load()({ log: { error() {} }, broadcast: message => messages.push(message), inject: async request => request.method === 'GET'
    ? { json: () => ({}) } : { statusCode: 503 } }, 'B-0-123-02-RAIO X-MARIA-GUICHE', 1);
  assert.equal(messages[1].type, 'tts:audio');
  assert.match(messages[1].payload.ttsBody.errorTTS, /MARIA/);
});
test('privacidade: painel recebe o nome no formato escolhido e a voz continua com o nome', async () => {
  globalThis.__painelNome = 'iniciais';
  try {
    const messages = [];
    const injected = [];
    await load()({ log: { error() {} }, broadcast: message => messages.push(message), inject: async request => { injected.push(request); return request.method === 'GET'
      ? { json: () => ({}) } : { statusCode: 200, json: () => ({ audioContent: '/audios/test.mp3' }) }; } }, 'B-0-123-02-RAIO X-MARIA DA SILVA-GUICHE', 1);
    assert.equal(messages[0].payload.call.name, 'M. S.');
    assert.equal(messages[0].payload.call.fullName, 'M. S.');
    assert.equal(messages[0].data.includes('MARIA DA SILVA'), false); // mensagem crua do painel classico tambem mascarada
    assert.match(messages[0].data, /-M\. S\.-/);
    assert.match(injected.find(r => r.method === 'POST').payload.text, /MARIA DA SILVA/);
  } finally { delete globalThis.__painelNome; }
});
