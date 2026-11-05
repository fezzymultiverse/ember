'use strict';
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve('www'),out=path.resolve('verification-free-tier-routing');fs.mkdirSync(out,{recursive:true});
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+decodeURIComponent(q.url.split('?')[0]==='/'?'/index.html':q.url.split('?')[0]));if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end();}fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');r.end(b);});});
const results=[];const check=(name,v)=>{assert(v,name);results.push(name);console.log('PASS '+name);};
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const ctx=await browser.newContext({viewport:{width:393,height:852},serviceWorkers:'block'}),posts=[],errors=[];let llFail=false;
 await ctx.route('**/*',r=>{const q=r.request();if(q.url().startsWith(base))return r.continue();
 if(q.url()==='https://api.groq.com/openai/v1/chat/completions'){
  const body=q.postDataJSON();posts.push({auth:q.headers().authorization,model:body.model});
  return r.fulfill({status:llFail&&body.model.startsWith('llama')?429:200,contentType:'application/json',headers:{'retry-after':'120'},body:JSON.stringify(llFail&&body.model.startsWith('llama')?{error:{message:'model quota'}}:{choices:[{message:{content:'Mocked answer'}}]})});
 }
 if(q.url()==='https://api.groq.com/openai/v1/models')return r.fulfill({json:{data:[{id:'llama-3.3-70b-versatile'},{id:'openai/gpt-oss-20b'}]}});
 return r.abort();});
 await ctx.addInitScript(()=>{if(localStorage.getItem('free-routing-fixture'))return;localStorage.setItem('free-routing-fixture','1');localStorage.setItem('ember_keys',JSON.stringify({groq:[{key:'fixture-browser-first-key'},{key:'fixture-browser-second-key'}]}));localStorage.setItem('ember_models',JSON.stringify({groq:{at:Date.now(),list:['llama-3.3-70b-versatile','openai/gpt-oss-20b']}}));localStorage.setItem('ember_free_pref','false');localStorage.setItem('untouched-custom-fixture',JSON.stringify({keep:42}));});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto(base);await page.waitForFunction(()=>window.EmberKeyManager&&window.Prov&&window.EmberHub);await page.evaluate(()=>document.getElementById('emberBootSkip').click());await page.evaluate(()=>EmberKeyManager.open('groq'));
 check('active inline key manager boots',await page.locator('#ekmInline').isVisible());
 check('existing keys are retained',await page.evaluate(()=>Prov.entries('groq').length===2));
 check('free confirmation is in the active UI, not only retired Settings',await page.locator('#ekmList [data-ekm-free="groq"]').count()===2);
 check('full key never appears in inline manager DOM',!(await page.locator('#ekmInline').evaluate(n=>n.outerHTML)).includes('fixture-browser-first-key'));
 const blocked=await page.evaluate(async()=>{try{await Prov.run('util',{system:'test',messages:[{role:'user',content:'Hi'}]});return false;}catch{return true;}});check('unconfirmed keys fail closed without inference',blocked&&posts.length===0);
 await page.locator('[data-ekm-free="groq"]').first().click();check('free-tier explanation requires explicit confirmation',await page.locator('#ekmFreeConfirm').isVisible()&&await page.locator('#ekmFreeAccept').isDisabled());
 await page.locator('#ekmFreeCancel').click();check('cancel does not enable key or send requests',!(await page.evaluate(()=>Prov.freeTierConfirmed('groq',Prov.entries('groq')[0].key)))&&posts.length===0);
 await page.locator('[data-ekm-free="groq"]').first().click();await page.locator('#ekmFreeCheck').check();await page.locator('#ekmFreeAccept').click();
 check('UI confirmation enables only the chosen key',await page.evaluate(()=>Prov.freeTierConfirmed('groq',Prov.entries('groq')[0].key)&&!Prov.freeTierConfirmed('groq',Prov.entries('groq')[1].key)));
 check('confirmation hides after acceptance',await page.locator('#ekmFreeConfirm').isHidden());
 const ask=()=>page.evaluate(()=>Prov.run('fast',{system:'test',messages:[{role:'user',content:'Hi'}]}));
 await ask();await ask();check('browser uses same working key and model for consecutive replies',posts.length===2&&posts[0].auth===posts[1].auth&&posts[0].model===posts[1].model);
 llFail=true;await ask();await ask();check('quota changes model only after failure and keeps it afterwards',posts.length===5&&posts[2].model.startsWith('llama')&&posts[3].model==='openai/gpt-oss-20b'&&posts[4].model===posts[3].model&&posts.every(p=>p.auth===posts[0].auth));
 check('active settings display actual successful model',(await page.locator('#ekmList').textContent()).includes('Working model: openai/gpt-oss-20b'));
 for(const width of [360,393,768,1280]){await page.setViewportSize({width,height:900});check('provider key UI fits '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.getElementById('ekmInline').scrollWidth<=document.getElementById('ekmInline').clientWidth+1));}
 await page.reload();await page.waitForFunction(()=>window.EmberKeyManager&&window.Prov);await page.evaluate(()=>document.getElementById('emberBootSkip').click());await page.evaluate(()=>EmberKeyManager.open('groq'));await ask();
 check('working model and key survive actual browser reload',posts.at(-1).model==='openai/gpt-oss-20b'&&posts.at(-1).auth===posts[0].auth);
 await page.locator('[data-ekm-free="groq"]').first().click();check('revoking confirmed free tier takes effect immediately',!(await page.evaluate(()=>Prov.freeTierConfirmed('groq',Prov.entries('groq')[0].key))));
 const before=posts.length;await page.evaluate(async()=>{try{await Prov.run('util',{system:'test',messages:[{role:'user',content:'Hi'}]});}catch{}});check('revoked key receives no more inference',posts.length===before);
 await page.evaluate(()=>{EmberAppearance.set('light');EmberKeyManager.open('groq');});await page.setViewportSize({width:393,height:852});
 check('light mode and unrelated setting remain functional',await page.evaluate(()=>document.documentElement.dataset.emberTheme==='light'&&JSON.parse(localStorage.getItem('untouched-custom-fixture')).keep===42));
 check('tested routing and settings flows have no runtime JavaScript errors',errors.length===0);
 await ctx.close();
 // A real service worker is tested separately from deterministic API fixtures.
 const sw=await browser.newContext({serviceWorkers:'allow'});await sw.route('https://**/*',r=>r.abort());const sp=await sw.newPage();await sp.goto(base);await sp.evaluate(()=>navigator.serviceWorker.ready);
 await sp.waitForFunction(async()=>{const c=await caches.open('ember-v1.10.59-free-tier-sticky-routing');return !!(await c.match('providers.js'))&&!!(await c.match('ember_repair.js'));});
 await sw.setOffline(true);await sp.reload();await sp.waitForFunction(()=>window.Prov&&window.EmberKeyManager);
 check('updated router and key-manager load on cold offline startup',await sp.evaluate(()=>Prov.freeOnly&&typeof Prov.confirmFreeTier==='function'));
 await sw.close();
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:results.length,checks:results,errors,inference:'mocked only',androidDeviceTested:false},null,2));console.log(results.length+' browser checks passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
