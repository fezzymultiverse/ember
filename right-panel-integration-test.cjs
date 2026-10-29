'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tests/panel-wired-results');fs.mkdirSync(out,{recursive:true});
const results=[];async function test(name,fn){const start=Date.now();try{await fn();results.push({name,status:'PASS',ms:Date.now()-start});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:e.stack,ms:Date.now()-start});console.log('FAIL',name,e.message);}fs.writeFileSync(path.join(out,'integration.json'),JSON.stringify({results},null,2));}
const server=http.createServer((q,r)=>{const u=new URL(q.url,'http://localhost'),p=path.join(root,'www',u.pathname==='/'?'index.html':u.pathname);fs.readFile(p,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'})[path.extname(p)]||'text/html'});r.end(e?'Not found':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--no-sandbox']});try{
for(const [width,height,android] of [[1280,900,false],[412,915,false],[390,844,true],[320,640,false]]){
 const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block',reducedMotion:'reduce',...(android?{userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36'}:{})});
 await ctx.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(5000);
 await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>window.EmberRightPanel&&window.EmberCockpit);await p.evaluate(()=>EmberKeyless.ready);
 const label=width+(android?' Android':'');
 async function reset(){await p.evaluate(()=>{EmberRightPanel.close(false);EmberCockpit.close();EmberCommandCenter.close();EmberPlugins.close();EmberBrowser.close();EmberMusicUI.close();document.getElementById('bDx').click();document.getElementById('erpTasksClose').click();document.getElementById('provDrop').classList.add('hidden');document.getElementById('app').inert=false;});await p.waitForTimeout(240);}
 await test(label+' panel opens, traps focus, closes with Escape, fits viewport',async()=>{
  await p.click('#bActionMenu');assert(await p.locator('#emberRightPanel').isVisible());assert.equal(await p.locator('#emberRightPanel .erp-group').count(),7);assert.equal(await p.locator('#emberRightPanel [data-name]').count(),21);
  assert(await p.evaluate(()=>document.getElementById('app').inert));
  assert(await p.evaluate(()=>{const r=document.getElementById('emberRightPanel').getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1}));
  await p.screenshot({path:path.join(out,'right-panel-'+label.replace(/ /g,'-')+'.png')});
  await p.keyboard.press('Escape');assert(!(await p.locator('#emberRightPanel').isVisible()));assert.equal(await p.evaluate(()=>document.activeElement.id),'bActionMenu');
 });
 await test(label+' search filters individual tools, empty state and reset',async()=>{
  await p.click('#bActionMenu');await p.fill('#erpToolSearch','github');assert.equal(await p.locator('#emberRightPanel [data-name]:visible').count(),1);
  await p.fill('#erpToolSearch','NO-MATCH-000');assert(await p.locator('#erpNoResults').isVisible());await p.fill('#erpToolSearch','');assert.equal(await p.locator('#emberRightPanel .erp-group:visible').count(),7);await p.keyboard.press('Escape');
 });
 const checks={
  'Start a conversation':()=>p.evaluate(()=>document.activeElement.id==='inp'),
  'Choose an AI engine':()=>p.locator('#provDrop').isVisible(),
  'Memory and Settings':()=>p.locator('#settings.show #cockpit_general').isVisible(),
  'Create music':()=>p.evaluate(()=>EmberPlus.isOn('audio_gen')),
  'Write lyrics':async()=> (await p.inputValue('#inp')).startsWith('Write original lyrics'),
  'Draft a document':()=>p.locator('#browser.show #brNotes').isVisible(),
  'Web search':()=>p.evaluate(()=>EmberPlus.isOn('web')),
  'Open browser':()=>p.locator('#browser.show').isVisible(),
  'Scrape a page':()=>p.locator('#settings.show #tUrl').isVisible(),
  'Music player':()=>p.locator('#music.show').isVisible(),
  'Find media':()=>p.locator('#music.show').isVisible(),
  'Downloads':()=>p.locator('#settings.show #cockpitYouTube').isVisible(),
  'Projects':()=>p.locator('#drawer.show #pjList').isVisible(),
  'Tasks':()=>p.locator('#erpTasks').isVisible(),
  'Files & deliverables':()=>p.locator('#browser.show #brDocs').isVisible(),
  'Device controls':()=>p.locator('#settings.show #cockpit_device').isVisible(),
  'Terminal':()=>p.locator('#settings.show #etPanel').isVisible(),
  'GitHub & integrations':()=>p.locator('#emberCommandCenter.ecc-open #ghTok').isVisible(),
  'AI providers & API keys':()=>p.locator('#settings.show #cockpit_engine').isVisible(),
  'Permissions & privacy':()=>p.locator('#settings.show #cockpit_permissions').isVisible(),
  'App settings':()=>p.locator('#settings.show #cockpitMenu').isVisible()
 };
 // Full 21-route click-through at mobile + desktop; smallest / Android exercise panel, menus and output.
 if(width===1280||width===412) for(const [name,check] of Object.entries(checks))await test(label+' route: '+name,async()=>{
  await reset();await p.click('#bActionMenu');await p.fill('#erpToolSearch',name);await p.locator('#emberRightPanel [data-name]').filter({hasText:name}).click();await p.waitForTimeout(200);assert(await check(),name+' reaches real controller');assert(!(await p.locator('#emberRightPanel').isVisible()));
 });
 await reset();
 await test(label+' left plus menu persistent toggles, chips and plugin submenus',async()=>{
  for(const id of ['device','reason','code']){await p.click('#bPlus');const b=p.locator('#plusMenu [data-t="'+id+'"]');const before=await b.getAttribute('aria-checked');await b.click();assert.notEqual(await b.getAttribute('aria-checked'),before);assert.equal(await p.evaluate(id=>EmberPlus.isOn(id),id),before!=='true');await b.click();assert.equal(await b.getAttribute('aria-checked'),before);await p.keyboard.press('Escape');}
  for(const plug of ['web','media']){await p.click('#bPlus');await p.click('#plusMenu [data-plug="'+plug+'"]');await p.locator('#emberPlugins.show').waitFor({state:'visible'});assert.equal(await p.getAttribute('#emberPlugins [data-tab="'+plug+'"]','aria-selected'),'true');await p.evaluate(()=>EmberPlugins.close());await p.waitForTimeout(220);}
  await p.evaluate(()=>EmberPlus.flip('code',true));assert(await p.locator('#plusChips [data-x="code"]').isVisible());await p.click('#plusChips [data-x="code"]');assert(!(await p.evaluate(()=>EmberPlus.isOn('code'))));
 });
 await test(label+' all 20 keyless switches toggle independently',async()=>{
  await reset();await p.evaluate(()=>EmberCockpit.open('engine'));for(const id of await p.evaluate(()=>EmberKeyless.tools().map(t=>t.id))){const b=p.locator('#cockpit_engine [data-kl-toggle="'+id+'"]');const before=await b.getAttribute('aria-checked');await b.click();assert.notEqual(await b.getAttribute('aria-checked'),before);await b.click();assert.equal(await b.getAttribute('aria-checked'),before);}await p.evaluate(()=>EmberCockpit.close());
 });
 await test(label+' output retains long lines and history without unbounded DOM',async()=>{
  await reset();await p.evaluate(async()=>{document.getElementById('eccTerminalAuto').checked=false;await EmberOutputArchive.clear();document.getElementById('eccTerminalClear').click();});await p.waitForTimeout(80);
  await p.evaluate(()=>{EmberCommandCenter.write({source:'Full-output test',stream:'stdout',text:'FIRST_SENTINEL\n'+ 'X'.repeat(75000)+'LONG_LINE_END\n'+'row\n'.repeat(1500)+'FINAL_SENTINEL'});});
  await p.evaluate(()=>EmberOutputArchive.flush());const data=await p.evaluate(async()=>({text:await EmberOutputArchive.text(),live:EmberCommandCenter.snapshot().lineCount,total:EmberOutputArchive.snapshot().total}));
  assert(data.text.includes('FIRST_SENTINEL'));assert(data.text.includes('X'.repeat(75000)+'LONG_LINE_END'));assert(data.text.includes('FINAL_SENTINEL'));assert.equal(data.live,1000);assert(data.total>1500);
  if(await p.evaluate(()=>document.getElementById('eccTerminalBody').hidden))await p.click('#eccTerminalToggle');await p.click('#eccHistoryOlder');await p.waitForFunction(()=>document.getElementById('eccTerminalOutput').textContent.includes('FIRST_SENTINEL'));assert((await p.locator('#eccTerminalOutput').textContent()).includes('LONG_LINE_END'));assert(await p.locator('#eccTerminalOutput .ecc-line').count()<=1000);
  await p.click('#eccHistoryLatest');await p.waitForFunction(()=>document.getElementById('eccTerminalOutput').textContent.includes('FINAL_SENTINEL'));
  const downloadPromise=p.waitForEvent('download');await p.click('#eccHistorySave');const download=await downloadPromise;const f=path.join(out,'full-log-'+width+'.txt');await download.saveAs(f);const text=fs.readFileSync(f,'utf8');assert(text.includes('FIRST_SENTINEL')&&text.includes('LONG_LINE_END')&&text.includes('FINAL_SENTINEL'));
  await p.evaluate(()=>EmberCommandCenter.write({source:'redaction',text:'Authorization: Bearer do-not-leak-this-token\nghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n<img src=x onerror=alert(1)>'}));await p.evaluate(()=>EmberOutputArchive.flush());const redacted=await p.evaluate(()=>EmberOutputArchive.text());assert(!redacted.includes('do-not-leak-this-token'));assert(!redacted.includes('ghp_aaa'));assert.equal(await p.locator('#eccTerminalOutput img').count(),0);
  const t=Date.now();for(let i=0;i<6;i++){await p.click('#bActionMenu');await p.keyboard.press('Escape');}assert(Date.now()-t<8000);await p.screenshot({path:path.join(out,'full-output-'+width+'.png')});
 });
 await test(label+' Stop is accessible during generation',async()=>{await p.evaluate(()=>document.getElementById('bStop').classList.remove('hidden'));assert(await p.locator('#bStop').isVisible());assert.equal(await p.getAttribute('#bStop','aria-hidden'),null);await p.evaluate(()=>document.getElementById('bStop').classList.add('hidden'));});
 await test(label+' no uncaught browser errors or horizontal document overflow',async()=>{assert.deepEqual(errors,[]);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));});
 await ctx.close();
}
}finally{await browser.close();server.close();}console.log(JSON.stringify(results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})));if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exit(1)});
