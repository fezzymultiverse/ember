/* Ember media feature router. Never used as chat fallback; paid jobs need explicit confirmation. */
'use strict';
(() => {
 const W=window, get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d;}catch(_){return d;}};
 const cfg=()=>get('ember_media_cfg',{enabled:false});
 const supported={stability:['image','audio'],puter:['image','video','speech']};
 const jobs=new Map(); let dbPromise;
 function db(){ if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('ember_media_artifacts',1);r.onupgradeneeded=()=>r.result.createObjectStore('artifacts',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return dbPromise; }
 async function store(a){const d=await db();await new Promise((resolve,reject)=>{const t=d.transaction('artifacts','readwrite');t.objectStore('artifacts').put(a);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});return a;}
 async function list(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('artifacts').objectStore('artifacts').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.at-a.at));r.onerror=()=>reject(r.error);});}
 async function remove(id){const d=await db();await new Promise((resolve,reject)=>{const t=d.transaction('artifacts','readwrite');t.objectStore('artifacts').delete(id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});notify();}
 function notify(){W.dispatchEvent(new CustomEvent('ember-media-update'));}
 function retryTime(r){const h=r.headers.get('retry-after');const n=Number(h);return h ? (Number.isFinite(n)?n:Math.max(1,(Date.parse(h)-Date.now())/1000)) : 60;}
 async function responseError(r){let p={};try{p=await r.json();}catch(_){}return Object.assign(new Error((p.errors||[]).join('; ')||p.message||p.error?.message||'Provider HTTP '+r.status),{status:r.status,retryAfter:retryTime(r)});}
 async function stability(kind,prompt,options,job){
   const P=W.Prov, model=kind==='image'?'stable-image-core':'stable-audio-2.5';
   const candidates=P.rotation('stability','media:'+model); let last;
   for(const e of candidates){
     if(e.bad || P.isCool(e.key) || P.modelResting('stability',e.key,model))continue;
     const form=new FormData();form.set('prompt',prompt);
     if(kind==='image'){form.set('output_format','png');form.set('aspect_ratio',options.aspect||'1:1');}
     else{form.set('model','stable-audio-2.5');form.set('duration',String(Math.max(1,Math.min(190,Number(options.duration)||20))));form.set('output_format','mp3');}
     const ctl=new AbortController();job.controller=ctl;
     const timer=setTimeout(()=>ctl.abort(),240000),start=performance.now();
     try{
       const path=kind==='image'?'/v2beta/stable-image/generate/core':'/v2beta/audio/stable-audio-2/text-to-audio';
       const r=await fetch(P.CFG.stability.base+path,{method:'POST',headers:{Authorization:'Bearer '+e.key,Accept:kind==='image'?'image/*':'audio/*'},body:form,signal:ctl.signal});
       if(!r.ok)throw await responseError(r);
       if(r.headers.get('finish-reason')==='CONTENT_FILTERED')throw Object.assign(new Error('Provider filtered this result.'),{status:403});
       const blob=await r.blob();if(!blob.size || !blob.type.startsWith(kind==='image'?'image/':'audio/'))throw Object.assign(new Error('Provider returned no valid media artifact.'),{status:502});
       P.record('stability',model,true,Math.round(performance.now()-start),200);
       return {blob,model};
     }catch(er){
       if(ctl.signal.aborted)throw Object.assign(new Error('Generation stopped or timed out. Provider billing may still apply; no automatic duplicate submitted.'),{code:'cancelled'});
       last=er;P.record('stability',model,false,0,er.status);
       if(er.status===401){e.bad=true; e.st={at:Date.now(),ok:false,code:401,msg:'Key rejected'};U.LS.set('ember_keys',P.keys());continue;}
       if(er.status===429){P.modelRest('stability',e.key,model,er.retryAfter);continue;}
       // Do not auto-repeat billed submissions on timeout/network/5xx or moderation failure.
       throw er;
     }finally{clearTimeout(timer);job.controller=null;}
   }
   throw last||new Error('No available Stability AI key for '+model+'. Add a key or wait for its cooldown.');
 }
 let sdkPromise;
 async function sdk(){if(W.puter?.ai)return W.puter;if(!sdkPromise)sdkPromise=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://js.puter.com/v2/';s.onload=()=>W.puter?.ai?res(W.puter):rej(new Error('Puter AI unavailable'));s.onerror=()=>{sdkPromise=null;rej(new Error('Could not load Puter SDK'));};document.head.append(s);});return sdkPromise;}
 async function connectPuter(){const p=await sdk();if(!await p.auth.isSignedIn())await p.auth.signIn();return true;}
 async function puter(kind,prompt,options,job){
   const p=await sdk();if(!await p.auth.isSignedIn())throw new Error('Connect Puter Media first. Chat bearer tokens do not silently authorize SDK media.');
   const start=performance.now(); let element;
   if(kind==='video')element=await p.ai.txt2vid(prompt,options.model?{model:options.model}:{});
   else if(kind==='image')element=await p.ai.txt2img(prompt,options.model?{model:options.model}:{});
   else element=await p.ai.txt2speech(prompt);
   if(job.cancelled)throw new Error('Result ignored after cancellation; the provider may have billed this job.');
   const source=element.src;if(!source || !/^(https:|blob:|data:(image|video|audio)\/)/.test(source))throw new Error('Puter returned no supported media source.');
   const r=await fetch(source);if(!r.ok)throw new Error('Generated media could not be saved: HTTP '+r.status);const blob=await r.blob();
   W.Prov.record('puter','media:'+kind,true,Math.round(performance.now()-start),200);return{blob,model:options.model||'Puter default '+kind};
 }
 async function generate(request){
   if(!cfg().enabled)throw new Error('Media generation is OFF in AI Features.');
   if(request.confirmed!==true)throw new Error('Explicit generation confirmation required.');
   const {provider,kind}=request,prompt=String(request.prompt||'').trim();
   if(!supported[provider]?.includes(kind))throw new Error(kind==='video' && provider==='stability'?'Stability hosted video API is retired. Select Puter video explicitly.':'Unsupported provider / media feature.');
   if(!prompt || prompt.length>10000)throw new Error('Prompt must contain 1–10,000 characters.');
   const id='media-'+crypto.randomUUID(),job={id,state:'running',provider,kind,at:Date.now()};jobs.set(id,job);notify();
   try{const result=provider==='stability'?await stability(kind,prompt,request,job):await puter(kind,prompt,request,job);if(job.cancelled)throw new Error('Job cancelled; provider billing may apply.');const ext=result.blob.type.includes('png')?'png':result.blob.type.includes('jpeg')?'jpg':kind==='video'?'mp4':'mp3';
     const a={id,provider,kind,model:result.model,prompt,blob:result.blob,name:'Ember-'+kind+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+ext,at:Date.now()};
     try{await store(a);job.state='done';job.artifactId=id;}catch(e){job.state='unsaved';job.artifact=a;throw new Error('Generated result could not be stored. Use the recovery download before closing Ember.');}
     notify();return{id,provider,kind,name:a.name};
   }catch(er){if(job.state!=='unsaved')job.state=job.cancelled?'cancelled':'failed';job.error=String(er.message||er).slice(0,240);notify();throw er;}
 }
 function cancel(id){const j=jobs.get(id);if(j){j.cancelled=true;j.controller?.abort();j.state='cancelled';notify();}}
 async function download(a){const url=URL.createObjectURL(a.blob),el=document.createElement('a');el.href=url;el.download=a.name;document.body.append(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 W.EmberMedia={cfg,supported,generate,list,remove,download,cancel,connectPuter,jobs:()=>[...jobs.values()]};
})();
