const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

test('exportador sanitiza nomes e preserva bytes sem sobrescrever arquivos', async () => {
  const files = new Map();
  const exports = {};
  const mockedRequire = name => name === 'node:fs/promises' ? {
    writeFile: async (file, bytes, options) => {
      assert.equal(options.flag, 'wx');
      if (files.has(file)) throw Object.assign(new Error(), { code: 'EEXIST' });
      files.set(file, bytes);
    },
  } : require(name);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/scripts/exportar-chaves-rtf.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, module: {}, require: mockedRequire, Buffer });
  assert.equal(exports.nomeArquivoSeguro(null, 7), 'chave_7');
  assert.equal(exports.nomeDaChave('SILICONE', 'observação', 'Dra. Ana', 3, 7), 'SILICONE (observação) - Dra. Ana');
  assert.equal(exports.nomeDaChave('SILICONE', '  ', 'Dra. Ana', 3, 7), 'SILICONE - Dra. Ana');
  assert.equal(exports.nomeDaChave(null, null, null, 3, 7), 'chave_7 - medico_3');
  assert.equal(exports.nomeDaChave('SILICONE', null, null, null, 7), 'SILICONE');
  assert.ok(exports.nomeDaChave('A'.repeat(64), 'B'.repeat(64), 'C'.repeat(64), 3, 7).length <= 120);
  assert.equal(exports.nomeArquivoSeguro('CON.txt', 7), '_CON.txt');
  assert.equal(exports.nomeArquivoSeguro('../teste:chave', 7), '.._teste_chave');
  const bytes = Buffer.from('{\\rtf1 exemplo}');
  const first = await exports.salvarChave('saida', 'Texto', 1, bytes);
  const second = await exports.salvarChave('saida', 'Texto', 2, bytes);
  const third = await exports.salvarChave('saida', 'Texto', 2, bytes);
  assert.equal(new Set([first, second, third]).size, 3);
  for (const content of files.values()) assert.deepEqual(content, bytes);
});
