const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function environment(t, session = { sub: 'admin', permissions: ['PAINEIS'] }) {
  const directory = fs.mkdtempSync(path.join(__dirname, '.partners-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const cache = new Map(), audit = [];
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(source, { exports, Buffer, File, structuredClone, console, process, require: name => {
      if (name.includes('panel-storage')) return { MEDIA_DIRECTORY: directory };
      if (name.includes('require-panel-admin')) return { requirePanelAdmin: async () => session };
      if (name.includes('persistent-audit')) return { recordAudit: async event => audit.push(event) };
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name) + '.ts');
      return require(name);
    } });
    return exports;
  }
  return { directory, load, audit };
}

test('playlist respects panel selection; random ignores order and avoids immediate repetition', t => {
  const { load } = environment(t);
  const { choosePartnerLogo, partnershipsSchema, EMPTY_PARTNERSHIPS } = load('lib/partnerships.ts');
  const a = randomUUID(), b = randomUUID(), other = randomUUID();
  const config = { ...EMPTY_PARTNERSHIPS, enabled: true, playlist: [b, a], logos: [a, b, other].map((id, i) => ({ id, file: `${id}.webp`, name: 'Logo', panelIds: i === 2 ? [2] : [1], orientation: i === 0 ? 'portrait' : 'landscape', position: 'center' })) };
  assert.equal(choosePartnerLogo(config, 1).id, b);
  assert.equal(choosePartnerLogo(config, 1, b).id, a);
  assert.equal(choosePartnerLogo(config, 1, a).id, b);
  assert.equal(choosePartnerLogo(config, 3), null);
  assert.equal(choosePartnerLogo({ ...config, enabled: false }, 1), null);
  assert.equal(choosePartnerLogo({ ...config, random: true, playlist: [] }, 1, a, () => 0).id, b);
  assert.equal(partnershipsSchema.safeParse({ ...config, playlist: [a, a] }).success, false);
  assert.equal(partnershipsSchema.safeParse({ ...config, logos: [{ ...config.logos[0], file: '../escape.webp' }] }).success, false);
});

test('storage preserves image reference, rejects stale mutations and removes deleted logo from playlist', async t => {
  const { load, directory } = environment(t);
  const store = load('lib/partnerships-storage.ts');
  const original = await store.readPartnerships();
  assert.equal(original.revision, 'initial');
  const added = await store.appendPartnerLogo(original.revision, 'Parceiro', Buffer.from('test'));
  assert.equal(added.logos.length, 1);
  assert.equal(added.playlist[0], added.logos[0].id);
  await assert.rejects(store.updatePartnerships(original), /outro administrador/);
  await assert.rejects(store.updatePartnerships({ ...added, logos: [{ ...added.logos[0], file: `${randomUUID()}.webp` }] }), /Arquivo/);
  const results = await Promise.allSettled([
    store.updatePartnerships({ ...added, enabled: true }),
    store.updatePartnerships({ ...added, random: true }),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const current = await store.readPartnerships();
  const deleted = await store.deletePartnerLogo(current.revision, current.logos[0].id);
  assert.equal(deleted.logos.length, 0); assert.equal(deleted.playlist.length, 0);
  assert.equal(fs.existsSync(path.join(directory, 'partnerships', added.logos[0].file)), false);
});

test('mutations require admin session and reject mandatory password changes', async t => {
  for (const session of [null, { sub: 'admin', mustChangePassword: true }]) {
    const { load } = environment(t, session);
    const route = load('app/api/partnerships/route.ts');
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await route[method](new NextRequest('http://totem.local/api/partnerships', { method }));
      assert.equal(response.status, 403);
    }
  }
});

test('upload validates actual image bytes and serves converted logo without path traversal', async t => {
  const { load } = environment(t);
  const route = load('app/api/partnerships/route.ts');
  async function upload(buffer) {
    const form = new FormData(); form.set('revision', 'initial');
    form.set('file', new File([buffer], 'logo.png', { type: 'image/png' }));
    return route.POST(new NextRequest('http://totem.local/api/partnerships', { method: 'POST', body: form }));
  }
  assert.equal((await upload(Buffer.from('<script>invalid</script>'))).status, 400);
  const input = await require('sharp')({ create: { width: 800, height: 400, channels: 4, background: '#ff0000' } }).png().toBuffer();
  const response = await upload(input); assert.equal(response.status, 201);
  const config = await response.json();
  assert.match(config.logos[0].url, /^\/api\/partnerships\/logo\//);
  const file = load('app/api/partnerships/logo/[id]/route.ts');
  const request = new NextRequest('http://totem.local/api/partnerships/logo/test');
  assert.equal((await file.GET(request, { params: Promise.resolve({ id: '../config.json' }) })).status, 400);
  const image = await file.GET(request, { params: Promise.resolve({ id: config.logos[0].id }) });
  assert.equal(image.headers.get('content-type'), 'image/webp');
  const metadata = await require('sharp')(Buffer.from(await image.arrayBuffer())).metadata();
  assert.equal(metadata.width, 512); assert.equal(metadata.height, 256);
});
