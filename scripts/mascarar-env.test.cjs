const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {maskEnv,exportMasked}=require('./mascarar-env.cjs');
test('masks every value, comments and multiline secrets, including license configuration',()=>{
 const content='\uFEFF# segredo no comentario\r\nURL=https://private.example.test\r\nTOKEN_API_INT=supersecret # outra senha\r\nexport LICENSE_PUBLIC_KEY_JWK=\'{"x":"private-location"}\'\r\nKEY="linha-1\nlinha-2"\nEMPTY=\n';
 const masked=maskEnv(content);
 for(const secret of ['segredo no comentario','private.example.test','supersecret','outra senha','private-location','linha-1','linha-2'])assert.ok(!masked.includes(secret));
 for(const key of ['URL','TOKEN_API_INT','LICENSE_PUBLIC_KEY_JWK','KEY','EMPTY'])assert.ok(masked.includes(key+"='[MASCARADO]'"));
});
test('writes a separate masked file without modifying original; refuses a real env as destination',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'masked-env-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const input=path.join(root,'.env.backend');await fs.writeFile(input,'PASSWORD=secret\n');const output=await exportMasked(input);
 assert.equal(await fs.readFile(input,'utf8'),'PASSWORD=secret\n');assert.ok(!(await fs.readFile(output,'utf8')).includes('secret'));
 await exportMasked(input);await assert.rejects(exportMasked(input,input));
 const unsafe=path.join(root,'original.mascarado');await fs.writeFile(unsafe,'PASSWORD=real\n');await assert.rejects(exportMasked(input,unsafe));assert.equal(await fs.readFile(unsafe,'utf8'),'PASSWORD=real\n');
});
test('does not mistake multiline private material for environment variable names',()=>{
 const masked=maskEnv('PRIVATE_KEY="first\nBASE64SECRET=\nFAKE_KEY=secret\nlast"\nNORMAL=value\n');
 assert.ok(masked.includes('PRIVATE_KEY='));assert.ok(masked.includes('NORMAL='));assert.ok(!masked.includes('BASE64SECRET'));assert.ok(!masked.includes('FAKE_KEY'));
});
