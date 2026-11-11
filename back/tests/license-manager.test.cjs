const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, randomBytes, randomUUID, sign } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { LicenseManager, requiresLicense } = require('../src/lib/license-manager');

async function fixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'totem-license-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const pair = generateKeyPairSync('ed25519');
  const trust = { url: 'https://licenses.test', issuer: 'test', audience: 'totem-backend', keyId: 'key', publicJwk: pair.publicKey.export({ format: 'jwk' }) };
  const credentials = { installationId: 'clinic-1', licenseId: randomUUID(), credential: randomBytes(32).toString('hex') };
  const control = { now: 1800000000, version: 1, status: 'active', offline: false, unauthorized: false, invalid: false, calls: 0, override: {}, beforeResponse: null };
  const fetcher = async (url, init) => {
    assert.equal(String(url), 'https://licenses.test/v1/license/check'); assert.equal(init.redirect, 'error'); control.calls++;
    const request = JSON.parse(init.body);
    assert.deepEqual(Object.keys(request).sort(), ['installationId', 'nonce']);
    if(control.offline) throw new Error('network unreachable');
    if(control.unauthorized) return new Response('{}', {status:401});
    if(control.beforeResponse) await control.beforeResponse();
    const claims = { iss: trust.issuer, aud: trust.audience, sub: credentials.licenseId, installationId: request.installationId,
      nonce: request.nonce, status: control.status, version: control.version, iat: control.now, nbf: control.now,
      exp: control.now + (control.status === 'active' ? 3600 : 300), licenseExpiresAt: control.now + 86400,
      nextCheckAt: control.now + 300, ...control.override };
    const header = Buffer.from(JSON.stringify({alg:'EdDSA',typ:'JWT',kid:trust.keyId})).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const input = header+'.'+payload;
    const signature = sign(null,Buffer.from(input),control.invalid?generateKeyPairSync('ed25519').privateKey:pair.privateKey).toString('base64url');
    return Response.json({token:input+'.'+signature});
  };
  const settings = { directory, trust, fetcher, now: () => control.now, ...options };
  const manager = new LicenseManager(settings); await manager.initialize();
  return {manager,control,credentials,directory,settings};
}
test('requires a verified upload and never exposes credentials or signed tokens in status',async t=>{
  const {manager,control,credentials}=await fixture(t);
  assert.equal(manager.status().allowed,false);assert.equal(manager.status().state,'unconfigured');
  assert.equal((await manager.activate(credentials)).allowed,true);
  assert.equal(control.calls,1);const status=JSON.stringify(manager.status());assert.ok(!status.includes(credentials.credential));assert.ok(!status.includes('token'));
  for(let i=0;i<1000;i++)manager.status();assert.equal(control.calls,1);
});
test('rejects keys, URLs, administrator passwords and malformed files',async t=>{
  const {manager,credentials,control}=await fixture(t);
  for(const input of [{...credentials,publicKey:{}},{...credentials,url:'https://evil.test'},{username:'admin',password:'secret'},{...credentials,credential:'abc'}]){
    await assert.rejects(manager.activate(input),/LICENSE_FILE_INVALID/);
  }assert.equal(control.calls,0);
});
test('rejects forged signatures and mismatched nonce, installation, license, issuer or audience',async t=>{
  const {manager,credentials,control}=await fixture(t);control.invalid=true;
  await assert.rejects(manager.activate(credentials),/LICENSE_SIGNATURE_INVALID/);control.invalid=false;
  for(const override of [{nonce:'x'.repeat(32)},{installationId:'other'},{sub:randomUUID()},{iss:'other'},{aud:'other'},{exp:control.now+604801}]){
    control.override=override;await assert.rejects(manager.activate(credentials),/LICENSE_SIGNATURE_INVALID/);
  }assert.equal(manager.status().allowed,false);
});
test('offline grace survives restart and is not renewed by failed network checks',async t=>{
  const {manager,credentials,control,settings}=await fixture(t);await manager.activate(credentials);
  const expiry=manager.status().authorizationExpiresAt;control.now+=1800;control.offline=true;await manager.refresh();
  assert.equal(manager.status().state,'offline');assert.equal(manager.status().allowed,true);assert.equal(manager.status().authorizationExpiresAt,expiry);
  const restarted=new LicenseManager(settings);await restarted.initialize();await restarted.refresh();assert.equal(restarted.status().allowed,true);
  control.now+=1801;assert.equal(restarted.status().allowed,false);assert.equal(restarted.status().state,'unavailable');
});
test('signed block persists across restart and beyond short denial token expiry',async t=>{
  const {manager,credentials,control,settings}=await fixture(t);await manager.activate(credentials);
  control.status='blocked';control.version=2;await manager.refresh();assert.equal(manager.status().state,'blocked');
  control.now+=600;control.offline=true;const restarted=new LicenseManager(settings);await restarted.initialize();await restarted.refresh();
  assert.equal(restarted.status().state,'blocked');assert.equal(restarted.status().allowed,false);
  control.offline=false;control.status='active';control.version=1;await restarted.refresh();assert.equal(restarted.status().allowed,false);
  control.version=2;await restarted.refresh();assert.equal(restarted.status().allowed,false);
  control.version=3;await restarted.refresh();assert.equal(restarted.status().allowed,true);
});
test('401 does not invent a signed block but cannot extend the last valid authorization',async t=>{
  const {manager,credentials,control}=await fixture(t);await manager.activate(credentials);control.unauthorized=true;await manager.refresh();
  assert.equal(manager.status().errorCode,'LICENSE_CREDENTIAL_INVALID');assert.equal(manager.status().allowed,true);
  control.now+=3601;assert.equal(manager.status().allowed,false);
});
test('invalid replacement preserves the previously accepted license',async t=>{
  const {manager,credentials,control}=await fixture(t);await manager.activate(credentials);control.invalid=true;
  await assert.rejects(manager.activate({...credentials,installationId:'clinic-other'}));assert.equal(manager.status().installationId,'clinic-1');assert.equal(manager.status().allowed,true);
});
test('activation cannot report success if persistence fails',async t=>{
  const {manager,credentials}=await fixture(t,{persist:async()=>{throw new Error('disk full')}});
  await assert.rejects(manager.activate(credentials),/LICENSE_STORAGE_FAILED/);assert.equal(manager.status().allowed,false);assert.equal(manager.status().state,'storage_error');
});
test('corrupt cache fails closed and can be recovered by a verified upload',async t=>{
  const {credentials,settings,directory}=await fixture(t);await fs.writeFile(path.join(directory,'state.json'),'{broken');
  const manager=new LicenseManager(settings);await manager.initialize();assert.equal(manager.status().allowed,false);assert.equal(manager.status().state,'storage_error');
  await manager.activate(credentials);assert.equal(manager.status().allowed,true);
});
test('concurrent refreshes share one remote request',async t=>{
  const {manager,credentials,control}=await fixture(t);await manager.activate(credentials);let release;
  control.beforeResponse=()=>new Promise(resolve=>{release=resolve});
  const a=manager.refresh(),b=manager.refresh();await new Promise(resolve=>setImmediate(resolve));assert.equal(control.calls,2);release();await Promise.all([a,b]);
});
test('license gates patient and issuance operations, preserving recovery, audio and history',()=>{
  for(const url of ['/clinux/pacientes','/clinux/agenda','/clinux/totem/atendimentos'])assert.equal(requiresLicense('GET',url),true);
  assert.equal(requiresLicense('POST','/clinux/senhas'),true);
  for(const [method,url]of [['GET','/clinux/senhas'],['POST','/clinux/voice'],['GET','/clinux/voice/status'],['GET','/clinux/license'],['POST','/clinux/license/activate'],['POST','/clinux/admin/users/verify'],['GET','/clinux/totem-access/settings'],['GET','/audios/example.mp3']])assert.equal(requiresLicense(method,url),false);
});
