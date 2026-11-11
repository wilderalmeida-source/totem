const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const Fastify = require('fastify');
const { noticeSettings } = require('../src/lib/panel-notices');
const item = { id: 'f260a461-0bdf-4fad-82d3-2479cd3727a1', title: 'Aviso', text: 'Texto informativo', icon: 'info', durationSeconds: 5, active: true };

test('valida limites, duplicidades e playlist vazia sem aceitar icones arbitrarios', () => {
  assert.equal(noticeSettings.safeParse({ enabled: true, items: [] }).success, true);
  assert.equal(noticeSettings.safeParse({ enabled: true, items: [item] }).success, true);
  for (const items of [[item, item], [{ ...item, durationSeconds: 0 }], [{ ...item, durationSeconds: 301 }], [{ ...item, icon: '<script>' }], [{ ...item, title: '' }]]) {
    assert.equal(noticeSettings.safeParse({ enabled: true, items }).success, false);
  }
  assert.equal(noticeSettings.safeParse({ enabled: true, items: [{ ...item, category: 'campanhas', images: [{ file: 'notice-f260a461-0bdf-4fad-82d3-2479cd3727a1.webp', alt: 'Exemplo' }] }] }).success, true);
  assert.equal(noticeSettings.safeParse({ enabled: true, items: [{ ...item, images: [{ file: '../arquivo.webp', alt: '' }] }] }).success, false);
  assert.equal(noticeSettings.safeParse({ enabled: true, items: [{ ...item, category: 'categoria-invalida' }] }).success, false);
});
test('configuracao salva e recarregada preserva ordem, inativos e texto parametrizado', async t => {
  let stored, writes = 0;
  const file = path.join(__dirname, '../src/routes/configuracoes-totem.js');
  const realRequire = createRequire(file), exports = {};
  const db = {
    $queryRaw: async () => stored ? [{ config: stored }] : [],
    $executeRaw: async (_sql, json) => { stored = JSON.parse(json); writes++; },
  };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { exports, require: name => name === '../../config/prismalog' ? { PrismaLog: db } : realRequire(name) });
  const app = Fastify(); t.after(() => app.close()); await app.register(exports.configuracoesTotemRoutes);
  const body = { enabled: true, items: [{ ...item, title: "Aviso d'água <texto>" }, { ...item, id: '6e19190a-aaba-4fc6-bbf3-95e3a560742f', active: false }] };
  assert.equal((await app.inject({ method: 'PUT', url: '/clinux/informativos-config', payload: body })).statusCode, 200);
  assert.deepEqual((await app.inject('/clinux/informativos-config')).json(), body);
  assert.equal(writes, 1);
  assert.equal((await app.inject({ method: 'PUT', url: '/clinux/informativos-config', payload: { enabled: true, items: [item, item] } })).statusCode, 400);
  assert.equal(writes, 1);
});
