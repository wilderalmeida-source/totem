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
      : name.includes('tcp-frames') ? {} : require(name),
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
