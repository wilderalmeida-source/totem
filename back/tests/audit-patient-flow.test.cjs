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
    groupBy: async args => { calls.push(args); return [{ sessionId: 'flow-2' }, { sessionId: 'flow-1' }, { sessionId: 'flow-0' }].slice(0, args.take); },
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

test('modo resumo pagina por atendimento e devolve todos os eventos de cada um', async t => {
  const { calls, get } = await setup(t, []);
  const response = await get({ view: 'flows', limit: '2', page: '1', outcome: 'FALHOU' });
  assert.equal(response.statusCode, 200);
  const group = calls[0];
  assert.equal(group.by[0], 'sessionId');
  assert.equal(group.take, 3); // um a mais para saber se ha proxima pagina
  assert.equal(group.where.AND[0].AND[0].metadata.equals, 'FALHOU');
  assert.equal(group.where.AND[2].category, 'TOTEM');
  assert.equal(JSON.stringify(calls[1].where.sessionId.in), JSON.stringify(['flow-2', 'flow-1']));
  assert.equal(JSON.stringify(calls[1].where).includes('FALHOU'), false); // eventos do atendimento inteiro, sem o filtro
  assert.equal(response.json().hasMore, true);
  assert.equal(JSON.stringify(response.json().flows), JSON.stringify(['flow-2', 'flow-1']));
});
