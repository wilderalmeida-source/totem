const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
test('digitação agrupa buscas e cancela a anterior',async()=>{
 const timers=new Map(), calls=[]; let id=0; const exports={};
 const source=ts.transpileModule(fs.readFileSync(require.resolve('../hooks/usePatientSearch.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(source,{exports,AbortController,console,setTimeout:fn=>{timers.set(++id,fn);return id},clearTimeout:key=>timers.delete(key),require:name=>name==='react'?{useCallback:fn=>fn,useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:()=>{}}:name==='@/services/api'?{buscaPaciente:async(input,signal)=>{calls.push({input,signal});return []}}:name.includes('patientUtils')?{onlyNumbers:v=>v.replace(/\D/g,''),isCommonShortName:()=>false,normalizePaciente:v=>v}:name.includes('identification-diagnostic')?{identificationValues:v=>v}:{auditTotem:()=>{}}});
 const hook=exports.usePatientSearch('NOME'); hook.pesquisar('FULAN');hook.pesquisar('FULANO');
 assert.equal(timers.size,1);assert.equal(calls.length,0);
 const fn=timers.values().next().value;timers.clear();fn();await Promise.resolve();
 assert.equal(calls.length,1);assert.equal(calls[0].input.ds_paciente,'FULANO');
 hook.pesquisar('FULANO SILVA');assert.equal(calls[0].signal.aborted,true);
 hook.clearPatients();assert.equal(timers.size,0);
});
