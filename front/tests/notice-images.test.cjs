const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const { NextRequest } = require('next/server');
function setup(allowed = true, origin = true) {
  const exports = {}, writes = [];
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/api/informativos/images/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, Buffer, File,
    require: name => name.includes('require-panel-admin') ? { requirePanelAdmin: async () => allowed ? { sub: 'admin' } : null }
      : name.includes('patient-session-http') ? { sameOrigin: () => origin }
      : name.includes('panel-storage') ? { MEDIA_DIRECTORY: '/virtual', ensureMediaDirectory: async () => {} }
      : name === 'node:fs' ? { promises: { writeFile: async (file, content, options) => writes.push({ file, content, options }) } } : require(name),
  });
  return { api: exports, writes };
}
function request(buffer, type = 'image/png') {
  const form = new FormData(); form.append('files', new File([buffer], 'imagem.png', { type }));
  return new NextRequest('http://totem.test/api/informativos/images', { method: 'POST', body: form });
}
test('upload exige permissao e origem valida antes de gravar', async () => {
  for (const [allowed, origin] of [[false, true], [true, false]]) {
    const { api, writes } = setup(allowed, origin);
    assert.equal((await api.POST(request(Buffer.from('fake')))).status, 403);
    assert.equal(writes.length, 0);
  }
});
test('decodifica imagem real e grava WebP com nome gerado sem sobrescrever arquivos', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#176cdb' } }).png().toBuffer();
  const { api, writes } = setup();
  const response = await api.POST(request(png));
  assert.equal(response.status, 201);
  assert.match((await response.json()).images[0].file, /^notice-[0-9a-f-]{36}\.webp$/);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].options.flag, 'wx');
  assert.equal((await sharp(writes[0].content).metadata()).format, 'webp');
});
test('conteudo falso e SVG sao recusados sem gravacao', async () => {
  const { api, writes } = setup();
  assert.equal((await api.POST(request(Buffer.from('<script>fake</script>')))).status, 400);
  assert.equal((await api.POST(request(Buffer.from('<svg/>'), 'image/svg+xml'))).status, 400);
  assert.equal(writes.length, 0);
});
