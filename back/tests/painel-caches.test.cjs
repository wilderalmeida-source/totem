const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Fastify = require('fastify');
const caches = require('../src/lib/painel-caches.js');

test('IP do painel le a configuracao uma vez e relê depois de limpar o cache', async () => {
  caches.configPainelCache.clear();
  let reads = 0;
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/services/senhas/senha.helpers.js'), 'utf8'), {
    exports, Date, console, process: { env: { IP_PAINEL: '10.0.0.1' } },
    require: name => name.includes('prismaDB') ? { prisma: {} }
      : name.includes('prismalog') ? { PrismaLog: { configuracao_painel: { findUnique: async () => { reads++; return { ativo: true, paineis: [{ painel: 2, ativo: true, ip: '10.0.0.2', atendimento: [5] }] } } } } }
      : name.includes('painel-caches') ? caches : require(name),
  });
  for (let i = 0; i < 3; i++) assert.equal(await exports.resolverIpPainelPorModalidade('B', 5), '10.0.0.2');
  assert.equal(await exports.resolverIpPainelPorModalidade('B', 9), '10.0.0.1');
  assert.equal(reads, 1);
  caches.configPainelCache.clear();
  await exports.resolverIpPainelPorModalidade('B', 5);
  assert.equal(reads, 2);
});

test('cadastrar, editar ou excluir guiche limpa o cache de nomes; listar nao', async t => {
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/routes/guiche.js'), 'utf8'), {
    exports, console,
    require: name => name.includes('prismalog') ? { PrismaLog: { guiches: { findMany: async () => [], upsert: async () => ({ id: 1 }), update: async () => ({}), delete: async () => ({}) } } }
      : name.includes('painel-caches') ? caches : require(name),
  });
  const app = Fastify();
  t.after(() => app.close());
  await app.register(exports[Object.keys(exports)[0]]);
  let loads = 0;
  const lookup = () => caches.guicheCache('02', async () => { loads++; return { ativo: true, nome: 'Guichê 2' }; });
  await lookup(); await lookup();
  await app.inject({ method: 'GET', url: '/clinux/guiches' });
  await lookup();
  assert.equal(loads, 1);
  const res = await app.inject({ method: 'DELETE', url: '/clinux/guiches/1' });
  assert.ok(res.statusCode < 500, String(res.statusCode));
  await lookup();
  assert.equal(loads, 2);
});
