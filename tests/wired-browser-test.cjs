const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium}=require('playwright');
const root=process.argv[2] || path.resolve(__dirname,'..'),out=process.argv[3] || path.join(root,'tests/results/wired/after');fs.mkdirSync(out,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.cjs':'text/plain','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{const p=path.join(root,'www',new URL(q.url,'http://localhost').pathname==='/'?'index.html':new URL(q.url,'http://localhost').pathname);fs.readFile(p,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':MIME[path.extname(p)]||'text/plain'});r.end(e?'missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox']});const results=[],runtime=[];
for(const [width,height] of [[412,915],[1280,900]]){
 const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:'reduce'});
 await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await ctx.addInitScript(()=>{
  localStorage.setItem('ember_quote_custom_v1',JSON.stringify([]));
  const FixedDate=Date;Date=class extends FixedDate{constructor(...args){super(...(args.length?args:['2026-10-29T12:00:00Z']));}static now(){return 1793275200000;}};
  Math.random=()=>0.375;
  window.__wiring={listeners:[],dispatches:[],storage:[]};
  const add=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(n,f,o){if(String(n).startsWith('ember-'))__wiring.listeners.push({name:n,target:this===window?'window':this===document?'document':this.id||this.nodeName||'other',stack:new Error().stack});return add.call(this,n,f,o);};
  const dispatch=EventTarget.prototype.dispatchEvent;EventTarget.prototype.dispatchEvent=function(e){if(String(e.type).startsWith('ember-'))__wiring.dispatches.push({name:e.type,target:this===window?'window':this===document?'document':this.id||'other'});return dispatch.call(this,e);};
 });
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const name of ['chat','settings','command-centre','browser','plugins','chooser','terminal']){
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.EmberCockpit&&window.EmberKeyless);await page.evaluate(()=>EmberKeyless.ready);await page.waitForTimeout(450);
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
  if(name==='settings')await page.evaluate(()=>EmberCockpit.open());
  if(name==='command-centre')await page.evaluate(()=>EmberCommandCenter.open());
  if(name==='browser')await page.click('#bBrowserTop');
  if(name==='plugins')await page.evaluate(()=>EmberPlugins.open('media'));
  if(name==='chooser'){
   await page.evaluate(()=>{EmberKeyless.clearPreference('avatar');window.__pendingChoice=EmberKeyless.route('Create an avatar of Ember');});
   // Availability fixtures deliberately fail: temporarily mark only avatar routes available via successful image probes.
   if(!await page.locator('#eklChooser').count()){
    await ctx.route('https://api.dicebear.com/**',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}));
    await ctx.route('https://robohash.org/**',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}));
    await page.evaluate(async()=>{await EmberKeyless.checkAvailability();window.__pendingChoice=EmberKeyless.route('Create an avatar of Ember');});
   }
   await page.waitForSelector('#eklChooser');
  }
  if(name==='terminal')await page.click('#eccTerminalToggle');
  await page.waitForTimeout(300);await page.screenshot({path:path.join(out,name+'-'+width+'x'+height+'.png'),animations:'disabled'});
  const observed=await page.evaluate(()=>({events:__wiring,apis:Object.keys(window).filter(k=>/^Ember|^(Prov|Store|Persona|Safety)$/.test(k)),loaded:[...document.scripts].map(s=>s.src).filter(Boolean),overflow:document.documentElement.scrollWidth>innerWidth}));
  runtime.push({width,name,...observed});results.push({width,height,name,errors:[...errors],overflow:observed.overflow});
 }
 await ctx.close();
}
// Exercise adapters separately from visual captures: no arbitrary event payload is ever retained.
const c=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'block'});
await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.fulfill({status:503,body:'{}'}));
const p=await c.newPage();const extraErrors=[];p.on('pageerror',e=>extraErrors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>window.EmberWiring&&window.EmberCockpit);await p.evaluate(()=>EmberKeyless.ready);
const adapter=await p.evaluate(()=>{
 const secret='SENSITIVE_TEST_VALUE_NEVER_LOG';
 window.dispatchEvent(new CustomEvent('ember-apis-change',{detail:{token:secret}}));
 window.dispatchEvent(new CustomEvent('ember-keyless-health',{detail:{id:'qr',ok:true,token:secret}}));
 window.dispatchEvent(new CustomEvent('ember-keyless-health',{detail:{id:secret,ok:true}}));
 document.dispatchEvent(new CustomEvent('ember-project-changed',{detail:{active:{name:secret}}}));
 EmberTimeline.begin();
 window.dispatchEvent(new CustomEvent('ember-download-status',{detail:{error:secret}}));
 window.dispatchEvent(new CustomEvent('ember-brain-pushed',{detail:{commit:secret}}));
 return {snapshot:EmberWiring.snapshot(),timeline:JSON.stringify(EmberTimeline.snapshot()),terminal:document.getElementById('eccTerminalOutput').textContent};
});
assert.equal(adapter.snapshot.health.qr,true);assert.equal(adapter.snapshot.projectRevision,1);assert(adapter.timeline.includes('Download bridge status'));assert(!JSON.stringify(adapter).includes('SENSITIVE_TEST_VALUE_NEVER_LOG'));assert.equal(extraErrors.length,0);
// Verify current UI entry points without restoring any old controller.
await p.evaluate(()=>{EmberTimeline.drop();EmberCockpit.close();});await p.click('#bActionMenu');await p.click('.erp-group-head >> nth=6');await p.click('[data-name="App settings"]');assert(await p.locator('#cockpitSettings').isVisible());
await p.evaluate(()=>EmberCockpit.close());await p.click('#bPlus');assert(await p.locator('#plusMenu').isVisible());
await c.close();await browser.close();server.close();
const diffs=[],before=path.join(root,'tests/results/wired/before');
if(fs.existsSync(before)){
 const {PNG}=require('pngjs');
 for(const file of fs.readdirSync(before).filter(f=>f.endsWith('.png'))){
  const a=PNG.sync.read(fs.readFileSync(path.join(before,file))),b=PNG.sync.read(fs.readFileSync(path.join(out,file)));assert.equal(a.width,b.width);assert.equal(a.height,b.height);let changed=0;
  const diff=new PNG({width:a.width,height:a.height});
  for(let i=0;i<a.data.length;i+=4){let unequal=false;for(let j=0;j<4;j++)if(a.data[i+j]!==b.data[i+j])unequal=true;if(unequal){changed++;diff.data[i]=255;diff.data[i+3]=255;}}
  diffs.push({file,changedPixels:changed,totalPixels:a.width*a.height});
  const d=path.join(root,'tests/results/wired/diffs');fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,file),PNG.sync.write(diff));
 }
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({results,runtime,adapter,diffs},null,2));console.log(JSON.stringify({results,diffs,adapters:'PASS'},null,2));
if(results.some(x=>x.errors.length||x.overflow)||diffs.some(x=>x.changedPixels))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exit(1)});
