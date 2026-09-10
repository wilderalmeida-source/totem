const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../app/api/voice-proxy/route.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function handler(fetch, env = { LINK_API_INTERNA: 'http://backend:5000', TOKEN_API_INT: 'test-token' }) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: name => name.includes('flow-audit-server') ? { auditServer: () => {} } : require(name), AbortSignal, URL, process: { env }, fetch,
  });
  return exports.GET;
}

function request(audioPath) {
  const url = new URL('http://frontend:3000/api/voice-proxy');
  if (audioPath !== undefined) url.searchParams.set('path', audioPath);
  return new Request(url);
}

test('reproduz os MP3 de chamada e teste através do hostname interno', async () => {
  for (const filename of ['chamada-evento_123-abcdef0123456789.mp3', 'Teste-abc123.mp3']) {
    const bytes = new Uint8Array([73, 68, 51, 0, 255]);
    const get = handler(async (url, options) => {
      assert.equal(url.href, `http://backend:5000/audios/${filename}`);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.cache, 'no-store');
      return new Response(bytes);
    });
    const response = await get(request(`/audios/${filename}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'audio/mpeg');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  }
});

test('bloqueia rotas internas, URLs e traversal antes de chamar o backend', async () => {
  let calls = 0;
  const get = handler(async () => { calls++; throw new Error('unexpected fetch'); });
  for (const input of [undefined, '', '/clinux/admin/users', '/clinux/audit',
    'http://other/audios/a.mp3', '//other/audios/a.mp3',
    '/audios/../clinux/audit', '/audios/%2e%2e%2fclinux/audit',
    '/audios/sub/a.mp3', '/audios/a.mp3?path=/clinux/audit',
    '/audios/a.mp3#fragment', '/audios/a.mp3/extra', '/audios/a.wav',
    '/audios/..\\clinux\\audit']) {
    assert.equal((await get(request(input))).status, 400, String(input));
  }
  assert.equal(calls, 0);
});

test('não segue redirecionamento e não devolve seu conteúdo', async () => {
  const get = handler(async () => new Response('private data', {
    status: 302, headers: { Location: '/clinux/admin/users' },
  }));
  const response = await get(request('/audios/test.mp3'));
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('location'), null);
  assert.equal(await response.text(), 'Áudio indisponível.');
});

test('trata áudio ausente, falha interna e configuração ausente sem expor detalhes', async () => {
  for (const status of [404, 401, 500]) {
    const get = handler(async () => new Response('sensitive details', { status }));
    const response = await get(request('/audios/test.mp3'));
    assert.equal(response.status, status === 404 ? 404 : 502);
    assert.equal(await response.text(), 'Áudio indisponível.');
  }
  const get = handler(async () => { throw new Error('secret backend details'); });
  assert.equal(await (await get(request('/audios/test.mp3'))).text(), 'Falha ao buscar áudio.');
  const missing = handler(async () => { throw new Error('unexpected fetch'); }, {});
  assert.equal((await missing(request('/audios/test.mp3'))).status, 503);
});
