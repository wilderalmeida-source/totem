const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function load(prisma) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/routes/painel.ts'), 'utf8').replace('async function buscarNomeDaChamada(', 'export async function buscarNomeDaChamada(');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date, Buffer, process: { env: {} },
    require: name => name === '../../config/prismalog' ? { PrismaLog: {} } : name === '../../config/prismaDB' ? { prisma }
      : name.includes('flow-audit') ? { auditContext: { getStore: () => undefined }, flowAudit() {} }
      : name.includes('tcp-frames') ? {} : name.includes('tcp-allowlist') ? require('../src/lib/tcp-allowlist.js')
      : name.includes('painel-caches') ? require('../src/lib/painel-caches.js')
      : name.includes('senha.helpers') ? { getHojeBrasil: () => new Date('2026-11-15T00:00:00.000Z') } : require(name),
  });
  return exports.buscarNomeDaChamada;
}

test('B/D: busca so a senha chamada (numero + servico, hoje) em vez de carregar o dia', async () => {
  const calls = [];
  const buscar = load({ atendimentos_senhas: { findFirst: async args => { calls.push(args); return { atendimentos: [{ pacientes_atendimentos_cd_pacienteTopacientes: { ds_paciente: ' CRI TESTE ' } }] }; } } });
  assert.equal(await buscar('B', '0394'), 'CRI TESTE');
  assert.equal(calls[0].where.nr_senha, 394);
  assert.equal(calls[0].where.ds_opcao, 'B');
  assert.equal(calls[0].where.dt_entrada.gte.toISOString(), '2026-11-15T00:00:00.000Z');
  assert.equal(calls[0].where.dt_entrada.lt.toISOString(), '2026-11-16T00:00:00.000Z');
});

test('C: entrega usa o atendimento; referencia invalida ou erro no banco nao trava a chamada', async () => {
  let sql;
  const buscar = load({ $queryRaw: async (strings, ...values) => { sql = { text: strings.join('?'), values }; return [{ ds_paciente: 'MARIA DA SILVA' }]; } });
  assert.equal(await buscar('C', '0394'), 'MARIA DA SILVA');
  assert.match(sql.text, /LIMIT 1/);
  assert.deepEqual(sql.values.slice(2), [10000, 394]);
  assert.equal(await buscar('B', ''), undefined);
  assert.equal(await load({ atendimentos_senhas: { findFirst: async () => { throw new Error('banco fora'); } } })('B', '12'), undefined);
});
