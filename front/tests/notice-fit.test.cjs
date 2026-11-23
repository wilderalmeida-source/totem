const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/panel/useFitText.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = {};
vm.runInNewContext(code, { exports: mod, require: () => ({ useLayoutEffect: () => {} }) });
const { fitScale, FIT_MIN } = mod;

test('comunicado que cabe fica no tamanho normal', () => {
  assert.equal(fitScale(() => true), 1);
});

test('comunicado grande diminui ate o maior tamanho que cabe', () => {
  const s = fitScale(scale => scale <= 0.62);
  assert.ok(s <= 0.62 && s > 0.6, String(s));
});

test('texto enorme para no tamanho minimo legivel', () => {
  assert.equal(fitScale(() => false), FIT_MIN);
});
