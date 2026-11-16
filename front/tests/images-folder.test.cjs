const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(cwd) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/panel-storage.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require, Date, process: { env: {}, cwd: () => cwd }, globalThis: {} });
  return exports;
}
const write = (file, content = 'x') => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); };

test('primeira subida copia as imagens de public/videos para data/imagens sem apagar os originais', async t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'imagens-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));
  const legacy = path.join(cwd, 'public', 'videos');
  write(path.join(legacy, 'brand', 'config.json'), '{"placement":"header"}');
  write(path.join(legacy, 'brand', 'logo-light-1.webp'));
  write(path.join(legacy, 'partnerships', 'config.json'));
  write(path.join(legacy, 'partnerships', 'a.webp'));
  write(path.join(legacy, 'partnerships', 'config-x.tmp'));
  write(path.join(legacy, 'notice-1.webp'));
  write(path.join(legacy, 'antigo.mp4'));
  const storage = load(cwd);
  write(path.join(storage.NOTICES_DIRECTORY, 'notice-1.webp'), 'ja existia');
  await storage.ensureImagesReady();
  assert.deepEqual(fs.readdirSync(storage.LOGO_DIRECTORY).sort(), ['config.json', 'logo-light-1.webp']);
  assert.deepEqual(fs.readdirSync(storage.PARTNERS_DIRECTORY).sort(), ['a.webp', 'config.json']);
  assert.deepEqual(fs.readdirSync(storage.NOTICES_DIRECTORY), ['notice-1.webp']);
  assert.equal(fs.readFileSync(path.join(storage.NOTICES_DIRECTORY, 'notice-1.webp'), 'utf8'), 'ja existia');
  assert.ok(fs.existsSync(path.join(legacy, 'brand', 'logo-light-1.webp')));
  // Depois da cópia inicial, a pasta antiga não é lida de novo (uma logo removida não volta).
  fs.unlinkSync(path.join(storage.LOGO_DIRECTORY, 'logo-light-1.webp'));
  await load(cwd).ensureImagesReady();
  assert.equal(fs.existsSync(path.join(storage.LOGO_DIRECTORY, 'logo-light-1.webp')), false);
});

test('sem pasta antiga apenas cria as pastas novas', async t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'imagens-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));
  const storage = load(cwd);
  await storage.ensureImagesReady();
  for (const dir of [storage.LOGO_DIRECTORY, storage.PARTNERS_DIRECTORY, storage.NOTICES_DIRECTORY]) assert.ok(fs.statSync(dir).isDirectory());
  assert.equal(storage.IMAGES_DIRECTORY, path.join(cwd, 'data', 'imagens'));
});
