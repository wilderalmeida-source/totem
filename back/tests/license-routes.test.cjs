const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash,createHmac}=require('node:crypto');
const Fastify=require('fastify');
const apiToken='a'.repeat(64);
function proof(method,url,body,overrides={}){
 const value={sub:'admin',source:'database',version:'2026-01-01T00:00:00.000Z',permissions:['USUARIOS'],exp:Math.floor(Date.now()/1000)+60,
 method,path:url,bodyHash:createHash('sha256').update(JSON.stringify(body??null)).digest('hex'),...overrides};
 const payload=Buffer.from(JSON.stringify(value)).toString('base64url');
 return payload+'.'+createHmac('sha256',apiToken).update('license-admin:'+payload).digest('base64url');
}
async function fixture(t){
 const state={allowed:false,active:true,permissions:['USUARIOS'],version:'2026-01-01T00:00:00.000Z',calls:0,audit:[]};
 const exports={};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/routes/license.js'),'utf8'),{exports,require:name=>{
  if(name.includes('config/prismalog'))return {PrismaLog:{adminUser:{findUnique:async()=>({active:state.active,mustChangePassword:false,permissions:state.permissions,updatedAt:new Date(state.version)})}}};
  if(name.includes('persistent-audit'))return {recordAudit:event=>state.audit.push(event)};
  return require(path.resolve(__dirname,'../src/routes',name));
 }});
 const app=Fastify();t.after(()=>app.close());
 app.addHook('preHandler',async(request,reply)=>{if(request.headers.authorization!=='Bearer '+apiToken)return reply.code(401).send({error:'auth'});});
 await exports.licensingRoutes(app,{status:()=>({allowed:state.allowed,state:state.allowed?'active':'blocked'}),activate:async()=>{state.calls++;state.allowed=true;return {allowed:true,state:'active'}},refresh:async()=>{state.calls++;}});
 for(const url of ['/clinux/pacientes','/clinux/totem/atendimentos','/clinux/senhas','/clinux/voice/status','/clinux/admin/users/verify']){
  app.route({method:['GET','POST'],url,handler:()=>({ok:true})});
 }
 await app.ready();
 const send=(url,method='GET',body,extra={})=>app.inject({url,method,headers:{authorization:'Bearer '+apiToken,...extra},...(body===undefined?{}:{payload:body})});
 return {app,state,send};
}
test('root license hook blocks direct patient and issuance routes but preserves audio, history and admin recovery',async t=>{
 const {send,state}=await fixture(t);
 for(const [url,method]of [['/clinux/pacientes','GET'],['/clinux/totem/atendimentos','GET'],['/clinux/senhas','POST']]){
  const response=await send(url,method);assert.equal(response.statusCode,503);assert.equal(response.json().code,'LICENSE_UNAVAILABLE');
 }
 for(const [url,method]of [['/clinux/senhas','GET'],['/clinux/voice/status','GET'],['/clinux/admin/users/verify','POST']])assert.equal((await send(url,method)).statusCode,200);
 assert.notEqual((await send('/clinux/%70acientes')).statusCode,200);
 state.allowed=true;assert.equal((await send('/clinux/pacientes')).statusCode,200);
});
test('activation requires authenticated API token and a fresh proof bound to method, path and file',async t=>{
 const {app,send,state}=await fixture(t),url='/clinux/license/activate',body={file:'test'};
 assert.equal((await app.inject({url,method:'POST',payload:body})).statusCode,401);
 assert.equal((await send(url,'POST',body)).statusCode,403);
 for(const overrides of [{path:'/other'},{method:'GET'},{exp:0},{permissions:['PAINEIS']},{bodyHash:'wrong'}]){
  assert.equal((await send(url,'POST',body,{'x-license-admin-proof':proof('POST',url,body,overrides)})).statusCode,403);
 }
 assert.equal(state.calls,0);
 assert.equal((await send(url,'POST',body,{'x-license-admin-proof':proof('POST',url,body)})).statusCode,200);
 assert.equal(state.calls,1);assert.equal(state.audit[0].actor,'admin');
});
test('disabled, outdated or unprivileged administrators cannot change the license',async t=>{
 const {send,state}=await fixture(t),url='/clinux/license';
 const headers={'x-license-admin-proof':proof('GET',url)};
 state.active=false;assert.equal((await send(url,'GET',undefined,headers)).statusCode,403);
 state.active=true;state.permissions=['PAINEIS'];assert.equal((await send(url,'GET',undefined,headers)).statusCode,403);
 state.permissions=['USUARIOS'];state.version='2026-02-01T00:00:00.000Z';assert.equal((await send(url,'GET',undefined,headers)).statusCode,403);
});
test('availability endpoint contains no installation or credential data',async t=>{
 const {send}=await fixture(t);assert.deepEqual((await send('/clinux/license/availability')).json(),{allowed:false});
});
