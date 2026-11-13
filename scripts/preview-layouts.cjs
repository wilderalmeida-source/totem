// Offline previews of real components. Fixture data only; no API or database access.
// Usage: node scripts/preview-layouts.cjs <compiled-globals.css>
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..'), front = path.join(root, 'front');
const req = createRequire(path.join(front, 'package.json'));
const React = req('react'), { renderToStaticMarkup } = req('react-dom/server'), ts = req('typescript');
const css = fs.readFileSync(process.argv[2], 'utf8');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'totem-layout-review-'));
const noop = () => {};
const setters = Object.fromEntries(['setShowModal','setDados','setExames','setTentativas','setLoading','setInvalido'].map(key=>[key,noop]));
const modalContext = React.createContext(setters);
const modalities = ['Mamografia','Ultrassonografia','Raio X','Ressonância magnética','Tomografia computadorizada','Densitometria óssea'].map((ds_modalidade,i)=>({cd_modalidade:i+1,ds_modalidade}));
const notices = {enabled:true,items:[{id:'test',title:'Informativo de demonstração',text:'Este texto é usado somente na prévia offline do layout.',icon:'info',active:true,durationSeconds:15}]};
let searchType='NOME', previewPath='/totem';
function load(relative) {
 let filename=path.join(front,relative);
 if(!fs.existsSync(filename)) filename=['.ts','.tsx'].map(ext=>filename+ext).find(file=>fs.existsSync(file));
 if(!filename) throw Error(relative);
 if(/\.png$/.test(filename)) return {src:'data:image/png;base64,'+fs.readFileSync(filename).toString('base64')};
 if(/\.css$/.test(filename)) return {};
 const file=path.relative(front,filename).replaceAll('\\','/');
 let source=fs.readFileSync(filename,'utf8');
 if(file==='components/ui/historic.tsx') source=source.replace('function TabelaSenhas(', 'export function TabelaSenhas(');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 const react={...React,useEffect:noop,useState:initial=>{
   let value=initial;
   if((file.endsWith('AdminRouteFrame.tsx')||file==='app/configuracoes/page.tsx')&&Array.isArray(initial))value=['*'];
   if(file.endsWith('HomeThemeHeader.tsx')&&initial===null)value=new Date('2026-11-11T14:30:00-03:00');
   if(file.endsWith('ThemeOnePanel.tsx')) {if(initial===false)value=true;if(initial===null)value=new Date('2026-11-11T14:30:00-03:00');if(initial?.items)value=notices;}
   if(file.endsWith('modalidadesContent.tsx')) {if(Array.isArray(initial))value=modalities;if(initial===true)value=false;}
   if(file.endsWith('pageClient.tsx')) {if(initial==='DATA')value=searchType;if(initial==='')value=searchType==='NOME'?'PAC':'12/03/1958';}
   return [value,noop];
 }};
 const localRequire=name=>{
   if(name==='react')return react;
   if(name==='next/link')return ({children,prefetch,...props})=>React.createElement('a',props,children);
   if(name==='next/image')return ({src,priority,...props})=>React.createElement('img',{...props,src:typeof src==='object'?src.src:src});
   if(name==='next/navigation')return {useRouter:()=>({push:noop,replace:noop}),useSearchParams:()=>new URLSearchParams({servico:'D',tipo:searchType,nome:searchType==='DATA'?'1958-03-12':'PACIENTE DE TESTE'}),usePathname:()=>previewPath};
   if(name==='next-themes')return {useTheme:()=>({resolvedTheme:'dark',setTheme:noop})};
   if(name==='@/components/modals/providers')return {modalContext};
   if(name.includes('LicenseAvailability'))return ({children})=>children;
   if(name.includes('usePatientSearch'))return {usePatientSearch:()=>({pacientes:searchType==='NOME'?[{ds_nome:'PACIENTE DE TESTE A'},{ds_nome:'PACIENTE DE TESTE B'}]:[{dt_nascimento:'1958-03-12'}],loading:false,error:null,pesquisar:noop,clearPatients:noop})};
   if(name.includes('useDatePatientSearch'))return {useDatePatientSearch:()=>({pacientes:[{cd_paciente:1,ds_paciente:'PACIENTE DE TESTE A',dt_nascimento:'1958-03-12'},{cd_paciente:2,ds_paciente:'PACIENTE DE TESTE B',dt_nascimento:'1958-03-13'}],atendimentosHoje:[],idsComExame:new Set(),loading:false,error:null})};
   if(name==='@/components/ui/historic')return ()=> {
     const Table=load('components/ui/historic.tsx').TabelaSenhas;
     const itens=[1,2,3].map(id=>({cd_senha:id,ds_paciente:'Paciente de teste '+id,dt_saida:'2026-11-11'}));
     return React.createElement('div',{className:'home-history-grid'},...['Atendimento','Entrega'].map(titulo=>React.createElement(Table,{key:titulo,titulo,itens,getNome:s=>s.ds_paciente,getKey:s=>s.cd_senha,loading:false})));
   };
   if(name==='@/components/ui/dialog')return {
     Dialog:({children})=>children,DialogHeader:({children,...p})=>React.createElement('div',p,children),
     DialogTitle:({children,...p})=>React.createElement('h2',p,children),DialogDescription:({children,...p})=>React.createElement('p',p,children),
     DialogContent:({children,className,...p})=>React.createElement(React.Fragment,null,React.createElement('div',{className:'fixed inset-0 z-50 bg-black/80'}),React.createElement('section',{...p,className:'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg '+className},children,React.createElement('button',{type:'button','aria-label':'Fechar',className:'absolute right-4 top-4'},'×')))
   };
   if(name==='react-imask')return {IMaskInput:({inputRef,mask,unmask,onAccept,...p})=>React.createElement('input',p)};
   if(name.startsWith('@/services/')||name.includes('audit-client')||name.includes('patient-session-client'))return new Proxy({},{get:()=>noop});
   if(name.startsWith('@/'))return load(name.slice(2));
   if(name.startsWith('.'))return load(path.relative(front,path.resolve(path.dirname(filename),name)));
   if(name.endsWith('.css'))return {};
   return req(name);
 };
 vm.runInNewContext(code,{exports,require:localRequire,process:{env:{EMPRESA_NOME:'CRI',EMPRESA_DESCRICAO:'Clínica Radiológica de Itumbiara'}},Date,URLSearchParams,console});
 return exports;
}
const labels=['ATENDIMENTO NORMAL','CRIANÇA DE COLO','GESTANTE','IDOSO','CADEIRANTE','AUTISTA','ESPECIAL','VOLTAR'];
const e=React.createElement;
function screen(kind){
 if(kind==='login'||kind==='login-totem')return e(load(`app/${kind}/page.tsx`).default);
 if(kind==='confirm-name'||kind==='confirm-date') {searchType=kind==='confirm-name'?'DATA':'NOME';return e(load('app/date/date.tsx').default);}
 if(kind==='admin'||kind==='themes') {previewPath=kind==='admin'?'/configuracoes':'/temas';return e(load('components/admin/AdminRouteFrame.tsx').default,null,e(load(kind==='admin'?'app/configuracoes/page.tsx':'app/temas/page.tsx').default));}
 if(kind==='home')return e(load('app/page.tsx').default);
 if(kind==='priority')return e('div',{className:'priority-screen'},e(load('components/PriorityOptions.tsx').default,{servico:'B',options:labels.map((label,i)=>({label,icone:{src:''},preferencial:i===0||i===7?0:i===6?2:1,...(i===7?{href:'/'}:{})}))}));
 if(kind.startsWith('search')){searchType=kind==='search-name'?'NOME':kind==='search-cpf'?'CPF':'DATA';return e(load('app/totem/pageClient.tsx').default);}
 if(kind==='modalities')return e(load('app/modalidades/modalidadesContent.tsx').default);
 if(kind==='modal')return e(load('components/modals/patientModal.tsx').DialogPatient,{...setters,showModal:true,loading:false,tentativas:null,invalido:null,dados:{ds_paciente:'PACIENTE DE TESTE COM NOME COMPLETO',cd_paciente:123,dt_nascimento:'1964-09-28',servico:'C',preferencial:0},exames:[{cd_atendimento:1,salas:{cd_modalidade:1,modalidades_salas_cd_modalidadeTomodalidades:{ds_modalidade:'Mamografia'}},exames:[{dt_assinado:'2026-11-11',procedimentos_exames_cd_procedimentoToprocedimentos:{ds_procedimento:'Exame de demonstração A'}},{dt_assinado:null,procedimentos_exames_cd_procedimentoToprocedimentos:{ds_procedimento:'Exame de demonstração B'}}]}]});
 if(kind==='tv')return e('div',{className:'call-panel'},e(load('components/panel/ThemeOnePanel.tsx').default,{painelId:1,current:{id:'test',name:'Paciente T.',fullName:'PACIENTE DE TESTE COM NOME COMPLETO',guicheNome:'Guichê 1',recepcao:'Recepção 1',modalidade:'Ultrassonografia',localizacao:'Sala de demonstração',calledAt:'14:30'},people:[1,2,3].map(id=>({id,name:'PACIENTE TESTE '+id,instruction:'Guichê '+id,modalidade:modalities[id-1].ds_modalidade,calledAt:'14:20'}))}));
}
const keyboardJs=fs.readFileSync(req.resolve('simple-keyboard/build/index.js'),'utf8');
const keyboardCss=fs.readFileSync(req.resolve('simple-keyboard/build/css/index.css'),'utf8');
for(const theme of ['theme1','theme2'])for(const mode of ['light','dark'])for(const kind of ['home','priority','search-name','search-data','search-cpf','confirm-name','confirm-date','modalities','modal','tv','login','login-totem','admin','themes']){
 const markup=renderToStaticMarkup(screen(kind));
 const bootstrap=`document.querySelectorAll('time').forEach(t=>{if(t.textContent==='--:--:--')t.textContent='14:30:00';if(t.textContent==='--:--')t.textContent='14:30'});if(document.querySelector('.simple-keyboard'))new window.SimpleKeyboard.default({layout:{default:${JSON.stringify(kind==='search-name'||kind==='confirm-name'?['1 2 3 4 5 6 7 8 9 0','Q W E R T Y U I O P','A S D F G H J K L Ç','Z X C V B N M {bksp}',"{clear} {space} '"]:['1 2 3','4 5 6','7 8 9','{clear} 0 {bksp}'])}},display:{'{clear}':'Limpar','{space}':'espaço','{bksp}':'⌫'}});`;
 const metrics=`setTimeout(()=>{const output=document.createElement('output');output.id='review-metrics';output.hidden=true;output.textContent=JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,inputBackground:document.querySelector('.search-input-row input')?getComputedStyle(document.querySelector('.search-input-row input')).backgroundColor:null,cardBackground:document.querySelector('.modality-card')?getComputedStyle(document.querySelector('.modality-card')).backgroundColor:null});document.body.append(output)},100);`;
 fs.writeFileSync(path.join(directory,`${kind}-${theme}-${mode}.html`),`<!doctype html><html lang="pt-BR" class="${mode==='dark'?'dark':''}" data-visual-theme="${theme}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prévia offline · ${kind}</title><style>${keyboardCss}\n${css}\n/* Freeze transitions only in the offline review artifact. */*{animation:none!important;transition:none!important}</style><body>${markup}<script>${keyboardJs.replaceAll('</script','<\\/script')}</script><script>${bootstrap}${metrics}</script></body></html>`);
}
console.log(directory);
