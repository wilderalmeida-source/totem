const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Fastify = require('fastify');

async function setup(t, matches) {
  const calls = [];
  const filename = path.join(__dirname, '../src/routes/admin.js');
  const realRequire = createRequire(filename);
  const exports = {};
  const auditLog = {
    findMany: async args => {
      calls.push(args);
      return args.select ? matches : [{ id: 1n, sessionId: 'flow-1', action: 'servico_selecionado', metadata: { servico: 'D' } }];
    },
    count: async args => { calls.push(args); return 1; },
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    exports, Buffer,
    require: name => name === '../../config/prismalog' ? { PrismaLog: { auditLog } }
      : name === '../lib/persistent-audit' ? {} : realRequire(name),
  });
  const app = Fastify();
  t.after(() => app.close());
  await app.register(exports.adminRoutes);
  return { calls, get: query => app.inject({ url: '/clinux/audit?' + new URLSearchParams(query) }) };
}

test('busca por nome seleciona fluxos e inclui etapas sem nome', async t => {
  const { calls, get } = await setup(t, [{ sessionId: 'flow-1' }]);
  const response = await get({ patientName: 'ANA', outcome: 'FALHOU' });
  assert.equal(response.statusCode, 200);
  assert.equal(calls[0].where.AND[0].metadata.string_contains, 'ANA');
  assert.equal(calls[0].where.AND[0].metadata.mode, 'insensitive');
  assert.equal(calls[0].where.AND[0].category, 'TOTEM');
  assert.equal(calls[1].where.AND.at(-1).sessionId.in[0], 'flow-1');
  assert.equal(calls[1].where.AND[0].metadata.equals, 'FALHOU');
  assert.equal(JSON.stringify(calls[1]).includes('string_contains'), false);
  assert.equal(response.json().items[0].action, 'servico_selecionado');
});

test('nome sem correspondencia nao remove a restricao de fluxo', async t => {
  const { calls, get } = await setup(t, []);
  assert.equal((await get({ patientName: 'NINGUEM' })).statusCode, 200);
  assert.equal(calls[1].where.AND.at(-1).sessionId.in.length, 0);
});

test('busca ampla exige refinamento em vez de truncar atendimentos', async t => {
  const { calls, get } = await setup(t, Array.from({ length: 501 }, (_, i) => ({ sessionId: String(i) })));
  const response = await get({ patientName: 'ANA' });
  assert.equal(response.statusCode, 422);
  assert.match(response.json().error, /nome mais completo/);
  assert.equal(calls.length, 1);
});
