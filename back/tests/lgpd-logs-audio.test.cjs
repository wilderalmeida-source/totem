const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadLib(file, extra = {}) {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/lib', file), 'utf8'), { exports, require, URLSearchParams, Date, ...extra });
  return exports;
}

test('log de requisicao guarda so os nomes dos parametros da busca', () => {
  const { redactUrl, requestSerializer } = loadLib('log-redact.js');
  assert.equal(redactUrl('/clinux/pacientes?tipo=ID&ds_cpf=12345678901&dt_nascimento=1980-01-01'),
    '/clinux/pacientes?tipo=[omitido]&ds_cpf=[omitido]&dt_nascimento=[omitido]');
  assert.equal(redactUrl('/clinux/pacientes?ds_paciente=MARIA%20AP'), '/clinux/pacientes?ds_paciente=[omitido]');
  assert.equal(redactUrl('/clinux/painel'), '/clinux/painel');
  assert.equal(redactUrl('/x?'), '/x');
  const logged = requestSerializer({ method: 'GET', url: '/clinux/pacientes?ds_cpf=1', hostname: 'h', ip: '1.2.3.4', socket: { remotePort: 9 } });
  assert.equal(JSON.stringify(logged), JSON.stringify({ method: 'GET', url: '/clinux/pacientes?ds_cpf=[omitido]', host: 'h', remoteAddress: '1.2.3.4', remotePort: 9 }));
});

test('limpeza apaga so MP3 de chamada e teste com mais de 24 h', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audios-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const now = Date.now();
  const files = { 'chamada-MARIA_SILVA-abc.mp3': 25, 'chamada-0123abcd.mp3': 1, 'Teste-ff.mp3': 30, 'atencao.mp3': 100, 'outro.txt': 100 };
  for (const [name, hours] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.writeFileSync(file, 'x');
    const when = new Date(now - hours * 3600 * 1000);
    fs.utimesSync(file, when, when);
  }
  const { limparAudiosAntigos } = require('../src/lib/audio-cleanup.js');
  assert.equal(await limparAudiosAntigos(dir, 24 * 3600 * 1000, now), 2);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['atencao.mp3', 'chamada-0123abcd.mp3', 'outro.txt']);
  assert.equal(await limparAudiosAntigos(path.join(dir, 'nao-existe')), 0);
});

test('mensagem TCP vai para o log sem o nome do paciente', () => {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/routes/painel.ts'), 'utf8')
    .replace('function resumoTcp(', 'export function resumoTcp(');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date, Buffer, process: { env: {} },
    require: name => name.includes('prismalog') ? { PrismaLog: {} } : name.includes('prismaDB') ? { prisma: {} }
      : name.includes('flow-audit') ? { auditContext: { getStore: () => undefined }, flowAudit() {} }
      : name.includes('tcp-frames') ? {} : name.includes('tcp-allowlist') ? require('../src/lib/tcp-allowlist.js') : name.includes('painel-caches') ? require('../src/lib/painel-caches.js') : name.includes('nome-privacidade') ? require('../src/lib/nome-privacidade.js') : name.endsWith('/privacidade') ? { lerPrivacidade: async () => ({ painelNome: globalThis.__painelNome ?? 'completo' }) } : name.includes('senha.helpers') ? { getHojeBrasil: () => new Date('2026-11-15T00:00:00.000Z') } : require(name),
  });
  const resumo = exports.resumoTcp('B-0-123-02-RAIO X-MARIA DA SILVA-GUICHE');
  assert.ok(!JSON.stringify(resumo).includes('MARIA'));
  assert.equal(resumo.modalidade, 'RAIO X');
  assert.equal(resumo.guiche, '02');
});
