const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadAt(iso) {
  const exports = {};
  const fixed = Date.parse(iso);
  class FixedDate extends Date { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/services/senhas/senha.helpers.js'), 'utf8'), {
    exports, Date: FixedDate, process: { env: {} }, console,
    require: name => name.includes('prismaDB') ? { prisma: {} } : name.includes('prismalog') ? { PrismaLog: {} } : name.includes('painel-caches') ? require('../src/lib/painel-caches.js') : require(name),
  });
  return exports;
}

for (const tz of ['UTC', 'America/Sao_Paulo']) {
  test(`hoje no Brasil nao depende do fuso do servidor (TZ=${tz})`, t => {
    const previous = process.env.TZ;
    process.env.TZ = tz;
    t.after(() => { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; });
    // 01:00 de Brasilia de 15/11 (04:00 UTC): ainda e dia 15 no Brasil.
    assert.equal(loadAt('2026-11-15T04:00:00.000Z').getHojeBrasil().toISOString(), '2026-11-15T00:00:00.000Z');
    // 23:30 de Brasilia de 15/11 (02:30 UTC do dia 16): ainda e dia 15 no Brasil.
    assert.equal(loadAt('2026-11-16T02:30:00.000Z').getHojeBrasil().toISOString(), '2026-11-15T00:00:00.000Z');
  });
}
