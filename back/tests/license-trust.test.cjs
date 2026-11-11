const {test}=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync}=require('node:crypto');
const {readLicenseTrust}=require('../src/lib/license-trust');
const {LicenseManager}=require('../src/lib/license-manager');
test('trust comes exclusively from backend environment and rejects private keys or unsafe URLs',()=>{
 const pair=generateKeyPairSync('ed25519');
 const env={LICENSE_SERVER_URL:'https://worker.example.test',LICENSE_PUBLIC_KEY_JWK:JSON.stringify(pair.publicKey.export({format:'jwk'}))};
 assert.equal(readLicenseTrust(env).url,'https://worker.example.test');
 for(const overrides of [{LICENSE_SERVER_URL:''},{LICENSE_PUBLIC_KEY_JWK:''},{LICENSE_SERVER_URL:'http://worker.example.test'},
  {LICENSE_SERVER_URL:'https://user:password@worker.example.test'},{LICENSE_SERVER_URL:'https://worker.example.test/path'},
  {LICENSE_PUBLIC_KEY_JWK:JSON.stringify(pair.privateKey.export({format:'jwk'}))}]){
   assert.throws(()=>readLicenseTrust({...env,...overrides}),/LICENSE_CONFIG_INVALID/);
 }
});
test('missing environment does not crash the process or allow patient operations',async()=>{
 const names=['LICENSE_SERVER_URL','LICENSE_PUBLIC_KEY_JWK'];const old=names.map(name=>process.env[name]);
 try{names.forEach(name=>delete process.env[name]);const manager=new LicenseManager({directory:'unused'});await manager.initialize();
  assert.equal(manager.status().state,'configuration_error');assert.equal(manager.status().allowed,false);assert.equal(manager.status().errorCode,'LICENSE_CONFIG_INVALID');
  assert.equal('serverUrl' in manager.status(),false);
 }finally{names.forEach((name,i)=>{if(old[i]===undefined)delete process.env[name];else process.env[name]=old[i];});}
});
