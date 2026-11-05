'use strict';
// Free-only is permanent: lock cannot be turned off, Mistral/Claude never sent, unconfirmed Groq never sent, confirmed Groq works. All traffic mocked.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('www/providers.js','utf8');let n=0;const check=(m,v)=>{assert(v,m);n++;console.log('PASS '+m);};
const resp=(s,j)=>({ok:s>=200&&s<300,status:s,headers:{get:()=>null},text:async()=>JSON.stringify(j),json:async()=>j});
const ok=()=>resp(200,{choices:[{message:{content:'Fixture answer'}}],usage:{total_tokens:8}});
function boot(mem){mem=structuredClone({ember_free_pref:false,...mem});const requests=[];
 const LS={get:(k,d)=>k in mem?structuredClone(mem[k]):d,set:(k,v)=>mem[k]=structuredClone(v),del:k=>delete mem[k]};
 const c={U:{LS},performance,AbortController,ReadableStream,TextEncoder,TextDecoder,console,Event,CustomEvent:class{constructor(t,o){this.type=t;this.detail=o?.detail;}},setTimeout,clearTimeout,fetch:async(u,o)=>{requests.push({u:String(u),o});return ok();}};
 c.window=c;c.self=c;c.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 vm.createContext(c);vm.runInContext(src,c);return {P:c.window.Prov,requests,mem};}
const opt=()=>({system:'x',messages:[{role:'user',content:'Hello'}]});
const cache=(id,l)=>({ember_models:{[id]:{at:Date.now(),list:l}}});
const posts=(x,re)=>x.requests.filter(q=>q.o&&q.o.method==='POST'&&re.test(q.u));
(async()=>{
 let x=boot({ember_free_lock:false});
 check('lock is on even if storage says off',x.P.freeLock()===true&&x.P.freeOnly===true);
 x.P.setFreeLock(false); check('setFreeLock(false) cannot turn it off',x.P.freeLock()===true);
 x=boot({ember_keys:{mistral:[{key:'mistral_fixture_key'}]},...cache('mistral',['mistral-small-latest'])});
 try{await x.P.run('fast',opt());}catch(e){}
 check('Mistral key is never sent a request',posts(x,/mistral/).length===0);
 x=boot({ember_keys:{anthropic:[{key:'sk-ant-fixture'}]},ember_pin:'anthropic'});
 try{await x.P.run('fast',opt());}catch(e){}
 check('Claude key never sent a request, saved pin dropped',posts(x,/anthropic/).length===0&&x.P.getPinned()===null);
 x.P.setPinned('mistral'); check('cannot pin Mistral',x.P.getPinned()===null);
 check('Mistral absent from every lane order',['fast','deep','util'].every(l=>!x.P.route(l).includes('mistral')&&!x.P.route(l).includes('anthropic')));
 x=boot({ember_keys:{groq:[{key:'gsk_fixture_unconfirmed'}]},...cache('groq',['llama-3.3-70b-versatile'])});
 try{await x.P.run('fast',opt());}catch(e){}
 check('unconfirmed Groq key is never sent a request',posts(x,/groq/).length===0);
 x=boot({ember_keys:{groq:[{key:'gsk_fixture_confirmed',freeTierConfirmedAt:Date.now(),tier:'free'}]},...cache('groq',['llama-3.3-70b-versatile'])});
 try{await x.P.run('fast',opt());}catch(e){}
 check('user-confirmed Free Groq key still answers',posts(x,/groq/).length>=1);
 console.log('PASSED '+n);
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
