'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../www/providers.js'),'utf8');
let passed=0;
const check=(name,cond)=>{assert(cond,name);passed++;console.log('PASS '+name)};
const response=(status,data)=>({ok:status>=200&&status<300,status,headers:{get:()=>null},text:async()=>JSON.stringify(data),json:async()=>data});
function boot(handler,extra={}){
 const mem=Object.assign({ember_keys:{groq:[{key:'gsk_fixture_not_a_real_key'}],mistral:[{key:'fixture_mistral_not_a_real_key'}]},ember_free_pref:false},extra.mem||{});
 const LS={get:(k,d)=>k in mem?structuredClone(mem[k]):d,set:(k,v)=>{mem[k]=structuredClone(v)},del:k=>delete mem[k]};
 const ctx={U:{LS},window:{addEventListener(){},dispatchEvent(){}},console,performance,AbortController,ReadableStream,TextDecoder,TextEncoder,URL,CustomEvent:function(){},setTimeout:(f,ms)=>setTimeout(f,Math.min(ms,75)),clearTimeout,fetch:handler};
 if(extra.Capacitor)ctx.window.Capacitor=ctx.Capacitor=extra.Capacitor;
 vm.createContext(ctx);vm.runInContext(source.replace('window.Prov = {','window.Prov = { _testNet: net,'),ctx);
 return {P:ctx.window.Prov,mem,ctx};
}
const opts={system:'Fixture',messages:[{role:'user',content:'hello'}]};
(async()=>{
 // Body stalls AFTER successful HTTP headers; the old implementation cleared its timer too early.
 let firstSignal;
 let t=boot(async(url,opt)=>{
  if(url.endsWith('/models'))return response(200,{data:[{id:url.includes('groq')?'llama-3.3-70b-versatile':'mistral-small-latest'}]});
  if(url.includes('groq')){firstSignal=opt.signal;return {ok:true,status:200,headers:{get:()=>null},text:()=>new Promise(()=>{})};}
  return response(200,{choices:[{message:{content:'fallback after stalled body'}}]});
 });
 let r=await t.P.run('fast',opts);
 check('JSON body stall yields to next provider',r.provider==='mistral');check('stalled body controller aborted',firstSignal.aborted);
 // The JS-side native bridge watchdog also ends a hung plugin promise.
 t=boot(async()=>{throw new TypeError('CORS')},{Capacitor:{Plugins:{CapacitorHttp:{request:()=>new Promise(()=>{})}}}});
 let error;try{await t.P._testNet('https://provider.invalid/models',{},20)}catch(e){error=e}
 check('native HTTP hang has bounded UI deadline',error?.code==='timeout');
 // Native fallback protocol: JSON and HTTP error metadata survive conversion.
 t=boot(async()=>{throw new TypeError('CORS')},{Capacitor:{Plugins:{CapacitorHttp:{request:async()=>({status:200,headers:{},data:{data:[{id:'live-catalog-model'}]}})}}}});
 r=await t.P._testNet('https://provider.invalid/models',{},1000);
 check('native CORS fallback preserves response JSON',(await r.json()).data[0].id==='live-catalog-model');
 // Stop while body is waiting: no retry should be dispatched.
 let calls=0; t=boot(async()=>{calls++;return {ok:true,status:200,headers:{get:()=>null},text:()=>new Promise(()=>{})}});
 const pending=t.P._testNet('https://provider.invalid/chat',{},1000);setTimeout(()=>t.P.abortInflight(),5);
 error=null;try{await pending}catch(e){error=e}
 check('Stop aborts waiting body and returns cancellation',error?.code==='cancelled'&&calls===1);
 // Discover the live catalog without a baked-in model name.
 const sent=[];t=boot(async(url,opt)=>{sent.push({url,opt});return !url.includes(':generateContent')?response(200,{models:[{name:'models/gemini-9.9-flash-fixture',supportedGenerationMethods:['generateContent']}]}) : response(200,{candidates:[{content:{parts:[{text:'live model selected'}]}}]});},{mem:{ember_keys:{gemini:[{key:'fixture_gemini_not_a_real_key'}]},ember_pin:'gemini'}});
 r=await t.P.run('fast',opts);check('Gemini chooses model returned by live catalog',r.model==='gemini-9.9-flash-fixture');
 check('Gemini request uses discovered endpoint',sent.some(x=>x.url.includes('gemini-9.9-flash-fixture:generateContent')));
 // Explicit pin stays strict even when provider is unavailable.
 let otherCalled=false;t=boot(async(url)=>{if(url.includes('mistral'))otherCalled=true;if(url.endsWith('/models'))return response(200,{data:[{id:'llama-3.3-70b-versatile'}]});return response(401,{error:{message:'invalid key fixture'}});});t.P.setPinned('groq');error=null;try{await t.P.run('fast',opts)}catch(e){error=e}
 check('strict provider pin is preserved',!otherCalled&&/pinned/.test(error?.message||''));
 // Refresh catalog on future requests after stale model 404, without altering model pins.
 let catalog=0;t=boot(async(url)=>{if(url.endsWith('/models')){catalog++;return response(200,{data:[{id:'llama-3.3-70b-versatile'}]})}return response(404,{error:{message:'retired model'}});},{mem:{ember_keys:{groq:[{key:'fixture_key'}]},ember_models:{groq:{at:Date.now(),list:['retired-fixture-model']}}}});
 try{await t.P.run('fast',opts)}catch(_){}check('retired automatic model invalidates stale catalog',!t.mem.ember_models.groq);
 try{await t.P.run('fast',opts)}catch(_){}check('next turn discovers refreshed live catalog',catalog===1);
 // Adding a key must never consume a hidden trial chat generation.
 let generations=0;t=boot(async(url)=>{if(url.includes(':generateContent'))generations++;return response(200,{models:[{name:'models/gemini-9.9-flash-fixture',supportedGenerationMethods:['generateContent']}]})},{mem:{ember_keys:{}}});
 r=await t.P.addKey('gemini','fixture_gemini_add');await new Promise(r=>setTimeout(r,15));
 check('Add key saves and checks catalog only',r.ok&&generations===0);
 check('Duplicate key does not create another credential',(await t.P.addKey('gemini','fixture_gemini_add')).why==='already added');
 t.P.removeKey('gemini','fixture_gemini_add');check('Remove key updates existing credential store',t.P.entries('gemini').length===0);
 // All supported protocols remain exposed; native plan must not reference route-only locals.
 check('native request plan remains callable',Array.isArray(t.P.nativePlan('fast',opts)));
 console.log('\n'+passed+' passed, 0 failed');
})().catch(e=>{console.error(e);process.exitCode=1});
