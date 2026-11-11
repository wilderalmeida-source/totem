const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const {NextRequest}=require('next/server');
const {readLicenseAdminProof}=require('../../back/src/lib/license-admin-proof');
function fixture(session={sub:'admin',source:'database',version:'2026-01-01T00:00:00.000Z',permissions:['USUARIOS']}){
 const calls=[],cache=new Map(),token='b'.repeat(64);
 function load(relative){const file=path.resolve(__dirname,'..',relative);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{
   exports,Buffer,URL,AbortSignal,console,process:{env:{SESSION_SECRET:'session-test',LINK_API_INTERNA:'http://backend:5000',TOKEN_API_INT:token}},
   fetch:async(url,init)=>{calls.push({url:String(url),init});return Response.json({allowed:true,state:'active'});},
   require:name=>{
    if(name.endsWith('admin-session'))return {ADMIN_SESSION_COOKIE:'admin',readAdminSession:async()=>session};
    if(name.endsWith('patient-session-http'))return {sameOrigin:request=>request.headers.get('origin')===request.nextUrl.origin};
    if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
    if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
    return require(name);
   }
  });return exports;
 }
 const req=(method='GET',body,origin='http://totem.test')=>new NextRequest('http://totem.test/api/license',{method,headers:{cookie:'admin=valid',origin,'content-type':'application/json'},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 return {load,req,calls,token};
}
test('upload, refresh and status require a current privileged administrator',async()=>{
 for(const session of [null,{sub:'viewer',permissions:['PAINEIS']},{sub:'admin',permissions:['*'],mustChangePassword:true}]){
  const {load,req,calls}=fixture(session),route=load('app/api/license/route.ts'),refresh=load('app/api/license/refresh/route.ts');
  assert.equal((await route.GET(req())).status,403);assert.equal((await route.POST(req('POST',{}))).status,403);
  assert.equal((await refresh.POST(req('POST',{}))).status,403);assert.equal(calls.length,0);
 }
});
test('upload rejects cross-origin requests, malformed JSON and oversized streams',async()=>{
 const {load,req,calls}=fixture(),route=load('app/api/license/route.ts');
 assert.equal((await route.POST(req('POST',{},'https://evil.test'))).status,403);
 assert.equal((await route.POST(req('POST','{broken'))).status,400);
 assert.equal((await route.POST(req('POST',JSON.stringify({data:'x'.repeat(9000)})))).status,400);
 assert.equal(calls.length,0);
});
test('server forwards uploaded content with a verifiable admin proof and returns no credentials',async()=>{
 const {load,req,calls,token}=fixture(),route=load('app/api/license/route.ts');
 const body={installationId:'clinic-1',licenseId:'d7ede220-d126-454f-a54f-ce46dc505ccd',credential:'a'.repeat(64)};
 const response=await route.POST(req('POST',body));assert.equal(response.status,200);assert.ok(!(await response.text()).includes(body.credential));
 assert.equal(calls.length,1);const call=calls[0];assert.equal(call.url,'http://backend:5000/clinux/license/activate');
 assert.equal(readLicenseAdminProof(call.init.headers['x-license-admin-proof'],'Bearer '+token,'POST','/clinux/license/activate',JSON.parse(call.init.body)).sub,'admin');
 assert.equal(readLicenseAdminProof(call.init.headers['x-license-admin-proof'],'Bearer '+token,'POST','/clinux/license/activate',{}),null);
});
test('public availability only returns a boolean and never an admin proof',async()=>{
 const {load,calls}=fixture(null),route=load('app/api/license/availability/route.ts');
 assert.deepEqual(await(await route.GET()).json(),{allowed:true});assert.equal(calls[0].init.headers['x-license-admin-proof'],undefined);
});
