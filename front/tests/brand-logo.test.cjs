const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const { NextRequest, NextResponse } = require('next/server');

function environment(t, isAdmin = true) {
  const media = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-'));
  t.after(() => fs.rmSync(media, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));
  const cache = new Map();
  const load = file => {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { exports, console, URL, Response, File, FormData, Buffer, process, structuredClone, globalThis: {},
      require: name => name === 'next/server' ? { NextRequest, NextResponse }
        : name === '@/lib/panel-storage' || name === './panel-storage' ? { LOGO_DIRECTORY: path.join(media, 'logo'), ensureImagesReady: async () => {} }
        : name === '@/lib/require-panel-admin' ? { requirePanelAdmin: async () => isAdmin ? { sub: 'admin', permissions: ['*'] } : null }
        : name === '@/lib/patient-session-http' ? { sameOrigin: () => true }
        : name === '@/lib/persistent-audit' ? { recordAudit: async () => {} }
        : name === '@/lib/brand' || name === './brand' ? load('lib/brand.ts')
        : name === '@/lib/brand-storage' ? load('lib/brand-storage.ts')
        : require(name) });
    return exports;
  };
  return { api: load('app/api/brand/route.ts'), logo: load('app/api/brand/logo/[file]/route.ts'), media };
}
async function upload(api, mode, buffer, type = 'image/png') {
  const form = new FormData(); form.append('mode', mode); form.append('file', new File([buffer], 'logo.png', { type }));
  const body = new Response(form), bytes = Buffer.from(await body.arrayBuffer());
  return api.POST(new NextRequest('http://totem.local/api/brand', { method: 'POST', body: bytes, headers: { 'content-type': body.headers.get('content-type'), 'content-length': String(bytes.length) } }));
}
const bigLogo = () => sharp({ create: { width: 3000, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: { create: { width: 2400, height: 800, channels: 4, background: { r: 20, g: 90, b: 200, alpha: 1 } } }, left: 300, top: 200 }]).png().toBuffer();

test('logo grande e reduzida (bordas vazias cortadas) e vale para os dois modos', async t => {
  const { api, logo } = environment(t);
  assert.equal((await (await api.GET()).json()).lightUrl, null);
  const res = await upload(api, 'light', await bigLogo());
  assert.equal(res.status, 201);
  const brand = await res.json();
  assert.equal(brand.placement, 'header');
  assert.equal(brand.lightUrl, brand.darkUrl);
  assert.deepEqual(brand.uploaded, { light: true, dark: false });
  const file = decodeURIComponent(brand.lightUrl.split('/').pop());
  const served = await logo.GET(new Request('http://totem.local' + brand.lightUrl), { params: Promise.resolve({ file }) });
  assert.equal(served.headers.get('content-type'), 'image/webp');
  const meta = await sharp(Buffer.from(await served.arrayBuffer())).metadata();
  assert.ok(meta.width <= 600 && meta.height <= 200, `${meta.width}x${meta.height}`);
  assert.equal(meta.width / meta.height, 3); // 2400x800 depois do corte das bordas: proporcao mantida
});

test('modo escuro proprio, posicao na saudacao e remocao', async t => {
  const { api, media } = environment(t);
  await upload(api, 'light', await bigLogo());
  const dark = await (await upload(api, 'dark', await bigLogo())).json();
  assert.notEqual(dark.lightUrl, dark.darkUrl);
  const put = r => api.PUT(new NextRequest('http://totem.local/api/brand', { method: 'PUT', body: JSON.stringify(r), headers: { 'content-type': 'application/json' } }));
  assert.equal((await (await put({ placement: 'welcome' })).json()).placement, 'welcome');
  assert.equal((await put({ placement: 'rodape' })).status, 400);
  const removed = await (await api.DELETE(new NextRequest('http://totem.local/api/brand?mode=dark', { method: 'DELETE' }))).json();
  assert.equal(removed.darkUrl, removed.lightUrl);
  assert.equal(fs.readdirSync(path.join(media, 'logo')).filter(f => f.endsWith('.webp')).length, 1);
});

test('somente admin altera a logo; arquivo que nao e imagem e recusado', async t => {
  const anon = environment(t, false);
  assert.equal((await upload(anon.api, 'light', await bigLogo())).status, 403);
  assert.equal((await anon.api.GET()).status, 200);
  const { api, logo } = environment(t);
  assert.equal((await upload(api, 'light', Buffer.from('nao e imagem'))).status, 400);
  assert.equal((await logo.GET(new Request('http://x'), { params: Promise.resolve({ file: '../config.json' }) })).status, 404);
});
