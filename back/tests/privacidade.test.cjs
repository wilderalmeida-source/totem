const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { formatarNome } = require('../src/lib/nome-privacidade');

function loadPrivacidade(db) {
  const file = path.join(__dirname, '../src/lib/privacidade.js');
  const exports = {}; const realRequire = createRequire(file);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { exports, Date, require: n => n === '../../config/prismalog' ? { PrismaLog: db } : realRequire(n) });
  return exports;
}

test('formatos do nome: completo, primeiro e ultimo, abreviado e iniciais, sem particulas', () => {
  const nome = 'MARIA APARECIDA DOS SANTOS';
  assert.equal(formatarNome(nome, 'completo'), nome);
  assert.equal(formatarNome(nome, 'primeiro_ultimo'), 'MARIA SANTOS');
  assert.equal(formatarNome(nome, 'abreviado'), 'MARIA A. S.');
  assert.equal(formatarNome(nome, 'iniciais'), 'M. A. S.');
  assert.equal(formatarNome('  JOSE   DA SILVA ', 'abreviado'), 'JOSE S.');
  assert.equal(formatarNome('ANA', 'primeiro_ultimo'), 'ANA');
  assert.equal(formatarNome('', 'iniciais'), '');
});

test('sem a coluna no banco usa o padrao anterior; valor salvo e validado', async () => {
  const semColuna = loadPrivacidade({ $queryRaw: async () => { throw new Error('column "privacidade" does not exist'); } });
  assert.equal(JSON.stringify(await semColuna.lerPrivacidade()), JSON.stringify({ painelNome: 'completo', historicoNome: 'primeiro_ultimo', logsRetencaoDias: 0 }));
  const salvo = loadPrivacidade({ $queryRaw: async () => [{ privacidade: { painelNome: 'iniciais', historicoNome: 'oculto', logsRetencaoDias: 90 } }] });
  assert.equal((await salvo.lerPrivacidade()).painelNome, 'iniciais');
  assert.equal(salvo.privacidadeSchema.safeParse({ painelNome: 'completo', historicoNome: 'completo', logsRetencaoDias: 0 }).success, false); // historico nunca com nome completo
  assert.equal(salvo.privacidadeSchema.safeParse({ painelNome: 'completo', historicoNome: 'oculto', logsRetencaoDias: 7 }).success, false);
});

test('limpeza dos logs respeita o prazo, apaga em lotes e nao faz nada sem prazo', async () => {
  const calls = [];
  const db = { $queryRaw: async () => [{ privacidade: { logsRetencaoDias: 30 } }], $executeRaw: async (sql, limite) => { calls.push(limite); return calls.length === 1 ? 5000 : 12; } };
  const antes = Date.now();
  assert.equal(await loadPrivacidade(db).limparLogsAntigos(), 5012);
  assert.equal(calls.length, 2);
  const dias = (antes - calls[0].getTime()) / 86400000;
  assert.ok(dias > 29.99 && dias < 30.01);
  let chamadas = 0;
  const semPrazo = loadPrivacidade({ $queryRaw: async () => [{ privacidade: {} }], $executeRaw: async () => { chamadas++; return 0; } });
  assert.equal(await semPrazo.limparLogsAntigos(), 0);
  assert.equal(chamadas, 0);
});
