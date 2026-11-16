const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

function load() {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/api/auth/login/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, {
    exports, console, Date, URL, Response,
    process: { env: { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'Senha-Certa-123', SESSION_SECRET: 'x'.repeat(40) } },
    require: name => name === 'next/server' ? { NextRequest, NextResponse }
      : name === '@/lib/persistent-audit' ? { recordAudit: async () => {} }
      : name === '@/lib/admin-session' ? { ADMIN_SESSION_COOKIE: 'c', ADMIN_SESSION_TTL_SECONDS: 60, createAdminSession: async () => 'token' }
      : require(name),
  });
  return exports.POST;
}
const login = (POST, username, password, ip) => POST(new NextRequest('http://painel.local/api/auth/login', {
  method: 'POST', body: JSON.stringify({ username, password }),
  headers: { host: 'painel.local', origin: 'http://painel.local', 'content-type': 'application/json', 'x-forwarded-for': ip },
}));

test('trocar o X-Forwarded-For nao da tentativas ilimitadas: o usuario e bloqueado apos 5 erros', async () => {
  const POST = load();
  for (let i = 0; i < 5; i++) assert.equal((await login(POST, 'admin', 'errada', `10.0.0.${i}`)).status, 401);
  assert.equal((await login(POST, 'admin', 'errada', '10.0.0.99')).status, 429);
  assert.equal((await login(POST, 'ADMIN ', 'Senha-Certa-123', '10.0.0.100')).status, 429);
  assert.equal((await login(POST, 'outro', 'errada', '10.0.0.101')).status, 401);
});

test('mesmo IP continua limitado e login correto zera os contadores', async () => {
  const POST = load();
  for (let i = 0; i < 4; i++) assert.equal((await login(POST, `u${i}`, 'errada', '10.1.1.1')).status, 401);
  assert.equal((await login(POST, 'admin', 'Senha-Certa-123', '10.1.1.1')).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await login(POST, `v${i}`, 'errada', '10.1.1.1')).status, 401);
  assert.equal((await login(POST, 'w', 'errada', '10.1.1.1')).status, 429);
});
