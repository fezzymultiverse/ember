'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict');
let count=0; const results=[];
function check(name,condition){assert(condition,name);count++;results.push({name,status:'PASS'});console.log('PASS '+name);}
const src=f=>fs.readFileSync('www/'+f,'utf8');
function boot(initial={},handler=async()=>{throw new Error('Unexpected network');}){
 const mem=structuredClone(initial), events=[];
 const LS={get:(k,d)=>k in mem?structuredClone(mem[k]):d,set:(k,v)=>{mem[k]=structuredClone(v);},del:k=>delete mem[k]};
 const window={dispatchEvent:e=>events.push(e),addEventListener(){}};
 const document={head:{appendChild(){}},createElement:()=>({})};
 const context={window,document,U:{LS},console,URL,Blob,performance,AbortController,ReadableStream,TextDecoder,TextEncoder,setTimeout,clearTimeout,Event,CustomEvent:class{constructor(type,o){this.type=type;this.detail=o&&o.detail;}},fetch:handler};
 vm.createContext(context);vm.runInContext(src('ember_deliverables.js'),context);vm.runInContext(src('ember_document_engine.js'),context);vm.runInContext(src('providers.js'),context);
 return {E:window.EmberDocumentEngine,D:window.EmberDeliverables,P:window.Prov,mem,events,context};
}
const response=(j,status=200,headers={})=>({ok:status>=200&&status<300,status,headers:{get:k=>headers[k]||null},json:async()=>j,text:async()=>JSON.stringify(j)});
const req=text=>({system:'Existing safety and personality instructions.',messages:[{role:'user',content:text}],max:650});
const keys=id=>({[id]:[{key:'fixture-'+id+'-not-a-real-key'}]});
const cache=(id,list)=>({[id]:{at:Date.now(),list}});
(async()=>{
 const {E,D,mem}=boot({ember_pin:'cohere',ember_pin_strict:false,ember_route_enabled:{groq:false,openrouter:true},custom_setting:{x:1}});
 check('two passes contain 16 authoring + 16 preflight standards',E.authoring.length===16&&E.preflight.length===16);
 check('ordinary chat is returned unchanged',E.apply(req('Hello there'),'fast').max===650);
 check('questions do not become document generation',!E.detect(req('How do I create an A4 report?')));
 check('negative document requests remain negative',!E.detect(req("Do not create printable HTML")));
 for(const q of ['Create a PDF report','Draft a Word document','Write a markdown file','Make a printable HTML document','Create a 2 A4 page report']){
  const a=E.apply(req(q),'fast');check('document contract applied: '+q,a.documentMode&&a.max>=4096&&a.system.includes('210 x 297 mm'));
 }
 const original=req('Create a PDF report'), old=JSON.stringify(original), enhanced=E.apply(original,'fast');
 check('caller request is not mutated',JSON.stringify(original)===old);
 check('standards injection is idempotent',E.apply(enhanced,'fast')===enhanced);
 check('existing safety instructions preserved',enhanced.system.startsWith(original.system));
 check('background jobs and JSON are untouched',E.apply(original,'util')===original&&E.apply({...original,json:true},'fast').max===650);
 check('short go-ahead inherits earlier file request',E.detect({messages:[{role:'user',content:'Create a PDF report'},{role:'assistant',content:'Ready to create your PDF.'},{role:'user',content:'yes'}]}));
 check('same-engine continuation gets document standards',E.apply({system:'You are Ember, finishing a document you already started.',messages:[{role:'user',content:'Continue'}]},'deep').documentMode);
 check('A4 qualifier accepted in page target',D.pageTarget('Write a 2 A4 page report',[])===2);
 check('inspection warns but never changes content',E.inspect('height:100vh [insert content] <artifact type="pdf">').warnings.length===3);
 check('page estimate is explicitly not exact',E.inspect('word '.repeat(500)).exactPageCount===false);
 check('loading preserves pin, switches and custom settings',mem.ember_pin==='cohere'&&mem.ember_pin_strict===false&&mem.ember_route_enabled.groq===false&&mem.custom_setting.x===1);
 let seen=[];
 const freeRows=[{id:'vendor/new-free-no-suffix',pricing:{prompt:'0',completion:'0'},architecture:{output_modalities:['text']},supported_parameters:['max_tokens'],top_provider:{max_completion_tokens:2048}}, {id:'vendor/model:free',pricing:{prompt:'0',completion:'0'}},{id:'vendor/paid',pricing:{prompt:'0.01',completion:'0.01'}},{id:'vendor/free-image:free',pricing:{prompt:'0',completion:'0'},architecture:{output_modalities:['image']}},{id:'vendor/unknown'},{id:'vendor/music-priced-per-song',pricing:{prompt:'0',completion:'0'},architecture:{output_modalities:['text','audio']}},{id:'vendor/fee:free',pricing:{prompt:'0',completion:'0',request:'0.01'}},{id:'vendor/conditional:free',pricing:{prompt:'0',completion:'0',overrides:[{}]}}];
 const env=boot({ember_keys:keys('openrouter'),ember_route_enabled:{openrouter:true},ember_free_pref:false},async(url,opt)=>{
   if(url.endsWith('/models'))return response({data:freeRows});
   seen.push({url,body:JSON.parse(opt.body)});return response({choices:[{message:{content:'A complete report body.'}}]});
 });
 const live=await env.P.freeModelsOf('openrouter',true);
 check('all zero-price text variants discovered including names without :free',live.includes('vendor/new-free-no-suffix')&&live.includes('vendor/model:free'));
 check('paid, image-only, unknown-price, per-request and conditional-price models excluded',live.length===2);
 const toolRequest={...req('Create a PDF report'),tools:[{name:'test_tool',description:'Fixture only',parameters:{query:'string'}}]};
 const r=await env.P.run('fast',toolRequest);
 check('auto OpenRouter uses a verified free model',r.provider==='openrouter'&&live.includes(r.model));
 check('max output clamped to catalog ceiling',seen[0].body.max_tokens===2048);
 check('unsupported native tools disabled without changing caller',!seen[0].body.tools&&toolRequest.tools.length===1);
 check('zero token prices cannot disguise paid mixed-media models',!live.includes('vendor/music-priced-per-song'));
 check('document contract reaches provider request path',seen[0].body.messages[0].content.includes('PREFLIGHT 16'));
 check('unsupported temperature parameter is omitted',seen[0].body.temperature===undefined);
 await env.P.run('util',{...req('Return one JSON object'),json:true});
 check('unsupported response_format uses JSON instructions instead',!seen[1].body.response_format&&seen[1].body.messages[0].content.includes('Return one valid JSON object'));
 env.P.setFree(false); check('explicit Free Mode preference persists',env.mem.ember_free_pref===false);
 let publicAuth;
 const pub=boot({},async(url,opt)=>{publicAuth=opt.headers.Authorization;return response({data:freeRows});});
 check('catalog can be refreshed without an API key',(await pub.P.freeModelsOf('openrouter',true)).length===2&&publicAuth===undefined);
 let coherePages=0, cohereBody;
 const co=boot({ember_pin:'cohere',ember_keys:keys('cohere')},async(url,opt)=>{
   if(url.includes('/v1/models')){coherePages++;return coherePages===1?response({models:[{name:'command-r7b-12-2024'}],next_page_token:'next & page'}):response({models:[{name:'command-a-03-2025'},{name:'command-a-03-2025'}]});}
   cohereBody=JSON.parse(opt.body);return response({message:{content:[{type:'text',text:'Complete document.'}]}});
 });
 const cr=await co.P.run('fast',req('Create a PDF report'));
 check('Cohere catalog follows all pages and deduplicates',coherePages===2&&co.mem.ember_models.cohere.list.length===2);
 check('document tasks prefer stronger Cohere model without changing provider pin',cr.model==='command-a-03-2025'&&co.mem.ember_pin==='cohere');
 check('Cohere receives larger document budget and full contract',cohereBody.max_tokens>=4096&&cohereBody.messages[0].content.includes('AUTHOR 16'));
 let repeated=0;
 const loop=boot({ember_keys:keys('cohere')},async()=>{repeated++;return response({models:[],next_page_token:'same'});});
 await assert.rejects(()=>loop.P.modelsOf('cohere',true),/did not terminate/);
 check('malformed pagination cannot loop forever',repeated===2);
 let googlePages=0;
 const gg=boot({ember_keys:keys('gemini')},async(url)=>{googlePages++;return response(googlePages===1?{models:[{name:'models/gemini-flash',supportedGenerationMethods:['generateContent']}],nextPageToken:'two'}:{models:[{name:'models/gemini-pro',supportedGenerationMethods:['generateContent']}]});});
 check('Gemini follows catalog pagination',(await gg.P.modelsOf('gemini',true)).length===2&&googlePages===2);
 let attempts=[];
 const off=boot({ember_keys:keys('groq'),ember_models:cache('groq',['model']),ember_free_pref:false},async(url)=>{attempts.push(url);return response({error:{message:'offline fixture'}},503);});
 await assert.rejects(()=>off.P.run('fast',req('Hi')),/No engine answered/);
 check('Free Mode OFF never calls keyless fallback',attempts.every(u=>u.includes('groq.com')));
 attempts=[];
 const strict=boot({ember_pin:'cohere',ember_keys:{...keys('cohere'),...keys('groq')},ember_models:cache('cohere',['command-r'])},async(url)=>{attempts.push(url);return response({error:{message:'invalid key'}},401);});
 await assert.rejects(()=>strict.P.run('fast',req('Hi')),/pinned/);
 check('strict pin and authentication failure never silently switch providers',attempts.length===1&&attempts[0].includes('cohere.com'));
 check('native background route also excludes paid OpenRouter models',env.P.nativePlan('fast').every(x=>live.includes(x.model)));
 let freeAttempts=[];
 const retry=boot({ember_keys:keys('openrouter'),ember_route_enabled:{openrouter:true},ember_models:cache('openrouter',['vendor/one:free','vendor/two:free','vendor/paid']),ember_free_pref:false},async(url,opt)=>{const b=JSON.parse(opt.body);freeAttempts.push(b.model);return freeAttempts.length===1?response({error:{message:'rate limited'}},429,{'retry-after':'120'}):response({choices:[{message:{content:'Recovered on a free model.'}}]});});
 const rr=await retry.P.run('fast',req('Hi'));
 check('free model 429 advances to another free model without paid leakage',rr.model==='vendor/two:free'&&freeAttempts.join(',')==='vendor/one:free,vendor/two:free');
 check('model rate limit preserves healthy key and cooldown',!retry.P.entries('openrouter')[0].bad&&retry.P.stats().openrouter.cooldowns.length===1);
 let partialAttempts=0;
 const partial=boot({ember_keys:{...keys('openrouter'),...keys('groq')},ember_pin:'openrouter',ember_pin_strict:false,ember_models:{...cache('openrouter',['vendor/one:free']),...cache('groq',['groq-model'])},ember_free_pref:false},async()=>{
   partialAttempts++;
   const text='data: '+JSON.stringify({choices:[{delta:{content:'partial output'}}]})+'\n\n'+'data: '+JSON.stringify({error:{code:503,message:'stream failed'}})+'\n\n';
   return {ok:true,status:200,headers:{get:()=>null},body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close();}})};
 });
 await assert.rejects(()=>partial.P.run('fast',{...req('Hello'),onToken(){}}),e=>e.code==='partial_stream');
 check('partial stream failure never mixes output from another provider',partialAttempts===1);
 fs.mkdirSync('verification-1.10.40',{recursive:true});fs.writeFileSync('verification-1.10.40/unit-results.json',JSON.stringify({count,results},null,2));
 console.log(count+' checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
