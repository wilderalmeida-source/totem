const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/short-cache.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, { exports, Date, Promise });
  return exports.shortCache;
}

test('shortCache junta chamadas simultaneas e expira no prazo', async () => {
  const cache = load()(5000);
  let loads = 0;
  const loader = async () => { loads++; return 'ok'; };
  const [a, b] = await Promise.all([cache('k', loader, 1000), cache('k', loader, 1000)]);
  assert.equal(a, 'ok'); assert.equal(b, 'ok');
  await cache('k', loader, 5999);
  assert.equal(loads, 1);
  await cache('k', loader, 6000);
  assert.equal(loads, 2);
  await cache('outra', loader, 6000);
  assert.equal(loads, 3);
});

test('shortCache nao guarda falhas', async () => {
  const cache = load()(5000);
  let loads = 0;
  await assert.rejects(cache('k', async () => { loads++; throw new Error('backend fora'); }, 1000));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(await cache('k', async () => { loads++; return 'ok'; }, 1001), 'ok');
  assert.equal(loads, 2);
});
