/* Deterministic 1.10.16 browser regression; all third-party HTTP is mocked. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'tests/results/keyless');fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afoQAAAAASUVORK5CYII=','base64');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ed8439"/><circle cx="32" cy="28" r="15" fill="#15121a"/></svg>';
const results=[],record=(name,ok,detail='')=>{results.push({name,pass:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(detail?' '+detail:''));};
const server=http.createServer((req,res)=>{const rel=decodeURIComponent((req.url||'/').split('?')[0]);const file=path.resolve(ROOT,'www','.'+(rel==='/'?'/index.html':rel));if(!file.startsWith(path.join(ROOT,'www')+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b);});});
async function scenario(browser,width,height){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true});
  const page=await context.newPage(),errors=[],calls=[];let failing=new Set(),delayed=new Set();
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://**/*',async route=>{
    const req=route.request(),u=req.url();calls.push({url:u,method:req.method(),headers:req.headers()});
    const host=new URL(u).hostname;
    if(delayed.has(host)){await new Promise(r=>setTimeout(r,11000));try{await route.fulfill({status:200,contentType:'image/svg+xml',body:svg});}catch(_){}return;}
    if(failing.has(host)){await route.fulfill({status:503,body:'Unavailable'});return;}
    if(host==='api.languagetool.org'){
      const text=new URLSearchParams(req.postData()||'').get('text')||'',i=text.indexOf('This are');
      return route.fulfill({contentType:'application/json',body:JSON.stringify({matches:i<0?[]:[{offset:i+5,length:3,replacements:[{value:'is'}]}]})});
    }
    if(host==='api.dicebear.com')return route.fulfill({contentType:'image/svg+xml',body:svg});
    if(['image.pollinations.ai','picsum.photos','api.qrserver.com','robohash.org'].includes(host))return route.fulfill({contentType:'image/png',body:pixel});
    if(host==='api.streamelements.com')return route.fulfill({contentType:'audio/mpeg',body:Buffer.from('ID3mock-audio')});
    if(host==='r.jina.ai')return route.fulfill({contentType:'text/plain',body:'# Public staff page\nJane Example — Director\nJohn Sample — Editor\nPublished public professional information.'});
    if(host==='api.ipify.org')return route.fulfill({contentType:'application/json',body:'{"ip":"203.0.113.7"}'});
    if(host==='dummyjson.com')return route.fulfill({contentType:'application/json',body:'{"products":[{"id":1,"title":"Sample"}]}'});
    if(host==='api.microlink.io')return route.fulfill({contentType:'application/json',body:'{"status":"success","data":{"title":"Example","url":"https://example.com"}}'});
    if(host==='itunes.apple.com')return route.fulfill({contentType:'application/json',body:'{"resultCount":1,"results":[{"artistName":"Example","trackName":"Hello"}]}'});
    if(host==='lrclib.net')return route.fulfill({contentType:'application/json',body:'[{"trackName":"Hello","plainLyrics":"Sample test lyrics"}]'});
    if(host==='saavn.dev')return route.fulfill({contentType:'application/json',body:'{"success":true,"data":{"results":[]}}'});
    if(host==='emkc.org')return route.fulfill({contentType:'application/json',body:'{"run":{"stdout":"1\\n","code":0}}'});
    return route.fulfill({status:404,body:'No external network in this test'});
  });
  const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url);await page.waitForFunction(()=>window.EmberKeyless&&window.EmberCockpit);
  await page.evaluate(async()=>{
    await EmberKeyless.ready;
    window.klLines=[];window.klNotes=[];window.klActivities=[];window.klEvents=[];
    addEventListener('ember-terminal',e=>klLines.push(e.detail));addEventListener('ember-agent-note',e=>klNotes.push(e.detail));addEventListener('ember-activity',e=>klActivities.push(e.detail));
    ['ember-try','ember-switch'].forEach(n=>addEventListener(n,e=>klEvents.push({n,detail:e.detail})));
    window.klFetches=[];const fetch0=window.fetch;window.fetch=(u,o)=>{if(String(u).startsWith('https:'))klFetches.push({u:String(u),credentials:o?.credentials,hasSignal:!!o?.signal,cache:o?.cache,headers:o?.headers||{}});return fetch0(u,o);};
    window.klOriginalRun=Prov.run;Prov.run=async(lane,o)=>({text:'# Essay\n\n'+o.messages[0].t});
  });
  const test=async(name,fn)=>{try{await fn();record(width+' '+name,true);}catch(e){record(width+' '+name,false,e.message);}};
  await test('default switches: 20 tools plus preserved Forge, unofficial OFF',async()=>{const rows=await page.evaluate(()=>EmberKeyless.tools());assert.equal(rows.length,21);assert.equal(rows.filter(r=>r.id!=='forge'&&r.on).length,19);assert.equal(rows.find(r=>r.id==='jiosaavn').on,false);assert.equal(rows.find(r=>r.id==='forge').health.ok,false);});
  await test('all toggles persist, terminal events, abilities update immediately',async()=>{
    await page.evaluate(()=>{EmberKeyless.tools().forEach(d=>{EmberKeyless.toggle(d.id,false);EmberKeyless.toggle(d.id,true);});EmberKeyless.toggle('jiosaavn',false);EmberKeyless.toggle('qr',false);});
    assert(!(await page.evaluate(()=>EmberPlus.stateLine())).includes('QRServer'));
    await page.reload();await page.evaluate(()=>EmberKeyless.ready);assert.equal(await page.evaluate(()=>EmberKeyless.enabled('qr')),false);
    await page.evaluate(()=>{window.klLines=[];window.klNotes=[];window.klActivities=[];window.klEvents=[];window.klFetches=[];addEventListener('ember-terminal',e=>klLines.push(e.detail));addEventListener('ember-agent-note',e=>klNotes.push(e.detail));addEventListener('ember-activity',e=>klActivities.push(e.detail));['ember-try','ember-switch'].forEach(n=>addEventListener(n,e=>klEvents.push({n,detail:e.detail})));const f=window.fetch;window.fetch=(u,o)=>{if(String(u).startsWith('https:'))klFetches.push({u:String(u),credentials:o?.credentials,hasSignal:!!o?.signal,cache:o?.cache,headers:o?.headers||{}});return f(u,o);};Prov.run=async(lane,o)=>({text:'# Essay\n\n'+o.messages[0].t});EmberKeyless.toggle('qr',true);});
    assert((await page.evaluate(()=>EmberPlus.stateLine())).includes('QRServer'));assert((await page.evaluate(()=>klLines)).some(s=>s==='[PLUGIN] QRServer ON'));
  });
  await test('plugins and inline cockpit include all switches without overflow',async()=>{
    await page.evaluate(()=>EmberPlugins.open('media'));await page.waitForSelector('#emberPlugins [data-kl-panel]');
    assert.equal(await page.locator('#emberPlugins [data-kl-toggle]').count(),21);assert.equal(await page.locator('#cockpit_engine [data-kl-toggle]').count(),21);
    await page.locator('#eplBody').evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(OUT,'plugins-'+width+'.png')});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>EmberPlugins.close());await page.waitForTimeout(250);
  });
  await test('single-tool route runs automatically and timeline matches terminal',async()=>{
    const r=await page.evaluate(async()=>{EmberTimeline.begin();const r=await EmberKeyless.route('Make a QR code for https://example.com');return{ok:r.ok,engine:r.engine,text:r.text,lines:klLines.slice(),notes:klNotes.slice(),snapshot:EmberTimeline.snapshot()};});assert(r.ok);assert.equal(r.engine,'qr');assert(r.text.includes('type="svg"'));assert.equal(await page.locator('#eklChooser').count(),0);assert(r.lines.includes('[SUCCESS]'));assert(r.lines.every(x=>r.notes.includes(x)));assert(JSON.stringify(r.snapshot).includes('[SUCCESS]'));await page.evaluate(()=>EmberTimeline.drop());
  });
  await test('chooser waits indefinitely; accessible radio cards and once choice',async()=>{
    await page.evaluate(()=>{window.pending=EmberKeyless.route('Create an avatar of Ember');});await page.waitForSelector('#eklChooser');
    assert.equal(await page.locator('#eklChooser [role=dialog]').getAttribute('aria-modal'),'true');assert.equal(await page.locator('#eklChooser input[type=radio]').count(),2);
    await page.waitForTimeout(700);assert.equal(await page.locator('#eklChooser').count(),1);assert(await page.locator('#eklChooser').getByText('RECOMMENDED').count());
    await page.screenshot({path:path.join(OUT,'chooser-'+width+'.png')});await page.click('[data-choice=once]');assert.equal((await page.evaluate(()=>pending)).engine,'dicebear');assert(await page.evaluate(()=>klActivities.some(a=>a.text==='Waiting for your engine choice')));
  });
  await test('always preference persists and skips chooser',async()=>{
    await page.evaluate(()=>{window.pending=EmberKeyless.route('Create an avatar of Ember');});await page.waitForSelector('#eklChooser');await page.check('input[value=robohash]');await page.click('[data-choice=always]');assert.equal((await page.evaluate(()=>pending)).engine,'robohash');assert.equal((await page.evaluate(()=>EmberKeyless.route('Create an avatar again'))).engine,'robohash');assert.equal(await page.locator('#eklChooser').count(),0);assert((await page.evaluate(()=>JSON.parse(localStorage.getItem('ember_keyless_v1')))).preferences.avatar==='robohash');
  });
  await test('Auto policy, disabled tools never called, all-failure max 3 attempts',async()=>{
    await page.evaluate(()=>{EmberKeyless.clearPreference('image');window.pending=EmberKeyless.route('Create an image of a sunset');});await page.waitForSelector('#eklChooser');await page.click('[data-choice=auto]');assert((await page.evaluate(()=>pending)).ok);
    failing=new Set(['image.pollinations.ai']);let at=calls.length;const r=await page.evaluate(()=>EmberKeyless.route('Create an image of a forest'));assert(r.ok);assert.equal(r.engine,'picsum');assert(calls.slice(at).some(c=>c.url.includes('picsum.photos')));assert((await page.evaluate(()=>klEvents)).some(e=>e.n==='ember-switch'));failing.clear();
    await page.evaluate(()=>EmberKeyless.checkAvailability());
    await page.evaluate(()=>{EmberKeyless.clearPreference('avatar');EmberKeyless.toggle('dicebear',false);});at=calls.length;
    assert.equal((await page.evaluate(()=>EmberKeyless.route('Create an avatar of a fox'))).engine,'robohash');assert(!calls.slice(at).some(c=>c.url.includes('dicebear')));
    await page.evaluate(()=>EmberKeyless.toggle('dicebear',true));
    failing=new Set(['image.pollinations.ai','picsum.photos','api.dicebear.com','robohash.org']);at=calls.length;
    const bad=await page.evaluate(()=>EmberKeyless.route('Create an image of a city'));assert.equal(bad.ok,false);const hosts=calls.slice(at).map(c=>new URL(c.url).hostname);assert.equal(hosts.length,3);assert(!hosts.includes('robohash.org'));failing.clear();await page.evaluate(()=>EmberKeyless.checkAvailability());
  });
  await test('essay → grammar → structuring → real local PDF; no optional media',async()=>{
    const at=calls.length;
    const r=await page.evaluate(async()=>{window.essay=await EmberKeyless.route('Make a PDF and fix grammar:\nThis are a test essay about Ember. The complete second paragraph must remain in the document.');return {ok:essay.ok,title:essay.title,magic:Array.from(new Uint8Array(await essay.blob.arrayBuffer()).slice(0,5)),text:essay.text,size:essay.blob.size};});
    assert(r.ok);assert.equal(Buffer.from(r.magic).toString(),'%PDF-');assert(r.size>1000);assert(r.text.includes('This is a test'));assert(r.text.includes('complete second paragraph'));assert(calls.slice(at).every(c=>new URL(c.url).hostname==='api.languagetool.org'));
  });
  await test('real DOCX zip signature and Markdown artifact export',async()=>{
    const r=await page.evaluate(async()=>{const r=await EmberKeyless.route('Create a Word document:\nA complete source document for the DOCX test.');const md=await EmberKeyless.route('Create Markdown:\n# A heading\n\nA complete paragraph.');return{ok:r.ok,magic:Array.from(new Uint8Array(await r.blob.arrayBuffer()).slice(0,2)),type:r.blob.type,md:md.ok&&md.text};});assert(r.ok);assert.equal(Buffer.from(r.magic).toString(),'PK');assert(r.type.includes('wordprocessingml'));assert(r.md.includes('type="markdown"'));
  });
  await test('grammar OFF is never called in document chain',async()=>{
    await page.evaluate(()=>EmberKeyless.toggle('grammar',false));const at=calls.length;assert((await page.evaluate(()=>EmberKeyless.route('Make a PDF:\nThis is full source text for an offline-style export.'))).ok);assert(!calls.slice(at).some(c=>c.url.includes('languagetool')));await page.evaluate(()=>EmberKeyless.toggle('grammar',true));
  });
  await test('public page evidence includes published names and source; no fabricated identity',async()=>{
    await page.evaluate(()=>EmberScraper.setOn(true));const r=await page.evaluate(()=>EmberKeyless.route('Extract public names from https://example.com/staff'));assert(r.ok);assert(r.text.includes('Jane Example'));assert(r.text.includes('https://example.com/staff'));assert(r.text.includes('Retrieved:'));
    const invalid=await page.evaluate(()=>['http://localhost','http://127.0.0.1','http://10.0.0.1','http://[::1]','https://u:p@example.com','https://example.com/?api_key=secret'].map(u=>{try{EmberKeyless.publicUrl(u);return false;}catch(_){return true;}}));assert(invalid.every(Boolean));
  });
  await test('configured scraper chosen automatically using public API; no new key storage',async()=>{
    const r=await page.evaluate(async()=>{
      const s=EmberScraper,orig={plan:s.plan,scrape_url:s.scrape_url,searchIds:s.searchIds,searchVia:s.searchVia};window.keyedCalls=[];
      s.plan=()=>['firecrawl','reader'];s.scrape_url=async(...args)=>{keyedCalls.push(args);return {markdown:'Published name: Jane Example, Director',provider:'Firecrawl'};};
      s.searchIds=()=>['firecrawl'];s.searchVia=async()=>({results:[{title:'Public staff',url:'https://example.com/staff',snippet:'Published staff'}]});
      EmberKeyless.toggle('jina',false);
      const page=await EmberKeyless.route('Scrape public names from https://example.com/staff');
      const research=await EmberKeyless.route('Find public information and names for Example staff');
      EmberKeyless.toggle('jina',true);Object.assign(s,orig);
      return{page:page.ok,research:research.ok,body:research.text,via:keyedCalls.map(a=>a[3]),store:localStorage.getItem('ember_keyless_v1')};
    });assert(r.page&&r.research);assert(r.via.every(v=>v==='firecrawl'));assert(r.body.includes('Jane Example'));assert(!/credential|api_key|Bearer/.test(r.store));
  });
  await test('scraping OFF prevents public fetching',async()=>{
    await page.evaluate(()=>EmberScraper.setOn(false));const at=calls.length;const r=await page.evaluate(()=>EmberKeyless.route('Read https://example.com/staff'));assert.equal(r.ok,false);assert.equal(calls.length,at);await page.evaluate(()=>EmberScraper.setOn(true));
  });
  await test('all remaining keyless adapters respond to mocked HTTP',async()=>{
    for(const [task,prompt] of [['speech','Read aloud: Hello Ember'],['music','Find music by Example'],['lyrics','Find lyrics for Example'],['code','Run code:\n```python\nprint(1)\n```'],['mock','Get mock data products'],['metadata','Get metadata https://example.com'],['ip','Show my public IP address']]){const r=await page.evaluate(({task,prompt})=>EmberKeyless.route(prompt,{task}),{task,prompt});assert(r.ok,task+': '+r.error);}
    await page.evaluate(async()=>{EmberKeyless.toggle('jiosaavn',true);await EmberKeyless.checkAvailability();EmberKeyless.toggle('itunes',false);});assert((await page.evaluate(()=>EmberKeyless.route('Find music for Example'))).ok);await page.evaluate(()=>{EmberKeyless.toggle('jiosaavn',false);EmberKeyless.toggle('itunes',true);});
  });
  await test('chooser keyboard cancellation leaves no running task',async()=>{
    await page.evaluate(()=>{EmberKeyless.clearPreference('avatar');window.pending=EmberKeyless.route('Create an avatar of Ember');});await page.waitForSelector('#eklChooser');await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>pending)).ok,false);assert.equal(await page.locator('#eklChooser').count(),0);assert((await page.evaluate(()=>EmberKeyless.route('Make a QR code for hello'))).ok);
  });
  await test('10-second timeout aborts fetch and fallback succeeds',async()=>{
    delayed.add('image.pollinations.ai');const start=Date.now();const r=await page.evaluate(()=>EmberKeyless.route('Create an image of the sea'));delayed.clear();assert(r.ok);assert.equal(r.engine,'picsum');assert(Date.now()-start<13500);assert((await page.evaluate(()=>klLines)).some(s=>s.includes('failed (timeout)')));
  });
  await test('plain chat triggers router, normal Artifact Card, actual Save PDF download',async()=>{
    await page.evaluate(()=>{document.getElementById('inp').value='Make a PDF and fix grammar:\nThis are a complete essay from the normal chat composer.';document.getElementById('bSend').click();});
    await page.waitForSelector('#log .artifact-card [data-artifact-pdf]',{timeout:20000});
    const downloadPromise=page.waitForEvent('download');await page.locator('#log [data-artifact-pdf]').last().click();const dl=await downloadPromise;const saved=await dl.path();assert(fs.readFileSync(saved).subarray(0,5).toString()==='%PDF-');
    await page.waitForTimeout(3000);await page.screenshot({path:path.join(OUT,'chat-artifact-'+width+'.png')});
    await page.evaluate(()=>{const b=document.getElementById('eccTerminalBody');if(b)b.hidden=false;document.getElementById('eccTerminal')?.setAttribute('open','');});
    await page.screenshot({path:path.join(OUT,'terminal-chain-'+width+'.png')});
  });
  await test('strict keyless requests omit cookies/auth, have AbortController, never cache',async()=>{
    const fetched=await page.evaluate(()=>klFetches);assert(fetched.length>10);assert(fetched.every(c=>c.credentials==='omit'&&c.hasSignal&&c.cache==='no-store'));assert(calls.every(c=>!c.headers.authorization&&!c.headers.apikey&&!c.headers.cookie));
    const storage=await page.evaluate(()=>JSON.parse(localStorage.getItem('ember_keyless_v1')));assert.deepEqual(Object.keys(storage).sort(),['on','preferences']);assert(Object.values(storage.on).every(v=>typeof v==='boolean'));assert((await page.evaluate(()=>klLines)).every(s=>!s.includes('Bearer secret')&&!s.includes('api_key=secret')));
  });
  await test('zero browser page errors and no sideways page overflow',async()=>{assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));});
  await context.close();
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    const hashes=JSON.parse(fs.readFileSync(path.join(__dirname,'keyless-protected-hashes.json')));
    for(const [f,hash]of Object.entries(hashes))record('byte hash '+f,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'www',f))).digest('hex')===hash);
    await scenario(browser,412,915);await scenario(browser,1280,900);
  }catch(e){record('suite infrastructure',false,e.stack);}
  finally{await browser.close();server.close();const report={tests:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({tests:report.tests,passed:report.passed,failed:report.failed}));process.exitCode=report.failed?1:0;}
})();
