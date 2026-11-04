'use strict';
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const out=path.resolve(__dirname,'panel-wired-results'),results=[];
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});try{const ctx=await b.newContext({viewport:{width:412,height:915},serviceWorkers:'block'});const errors=[];
 const fullLog='GITHUB_FIRST\n'+ 'compiled module '.repeat(1500)+'\nGITHUB_LAST';
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1')return r.continue();if(u.hostname==='api.github.com'){
  let json={};if(u.pathname.endsWith('/actions/runs/123'))json={id:123,status:'completed',conclusion:'success',html_url:'https://github.com/sample/brain/actions/runs/123'};
  else if(u.pathname.endsWith('/contents/runs/123/log.txt'))json={content:Buffer.from(fullLog).toString('base64')};
  else if(u.pathname.endsWith('/contents/runs/123/status.json'))json={content:Buffer.from('{"exit":0}').toString('base64')};
  else json={default_branch:'main',permissions:{push:true},tree:[],workflow_runs:[]};return r.fulfill({json});
 }return r.fulfill({status:503,json:{}});});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(6000);await p.goto('http://127.0.0.1:8080');await p.waitForFunction(()=>window.EmberRightPanel);await p.evaluate(()=>EmberKeyless.ready);
 async function test(name,fn){try{await fn();console.log('PASS',name);results.push({name,status:'PASS'});}catch(e){console.log('FAIL',name,e.message);results.push({name,status:'FAIL',error:e.stack});}fs.writeFileSync(path.join(out,'extended.json'),JSON.stringify({results},null,2));}
 await test('Full GitHub published output survives upstream adapter, terminal and archive',async()=>{
  const r=await p.evaluate(async()=>{EmberGithub.setKnowledgeRepo('sample/brain');EmberGithub.setToken('ghp_'+'z'.repeat(40));EmberGithub.setCfg({runner:true,auto:false,sync:false});return EmberGithub.dispatch('github_run_status',{run_id:'123'});});
  assert(r.ok,JSON.stringify(r));assert(r.log.startsWith('GITHUB_FIRST'));assert(r.log.endsWith('GITHUB_LAST'));assert.equal(r.log,fullLog);await p.evaluate(()=>EmberOutputArchive.flush());const archived=await p.evaluate(()=>EmberOutputArchive.text());assert(archived.includes('GITHUB_FIRST'));assert(archived.includes('compiled module '.repeat(1500)));assert(archived.includes('GITHUB_LAST'));
 });
 await test('All media one-shot switches are exclusive and no generation occurs on selection',async()=>{
  for(const id of ['image','audio_gen','video_gen','pdf']){
   await p.evaluate(()=>EmberPlugins.open('media'));await p.locator('#emberPlugins.show').waitFor();await p.click('#emberPlugins [data-flip="'+id+'"]');
   assert(await p.evaluate(id=>EmberPlus.isOn(id),id));assert.equal(await p.evaluate(()=>['image','audio_gen','video_gen','pdf'].filter(id=>EmberPlus.isOn(id)).length),1);await p.waitForTimeout(200);
  }await p.evaluate(()=>['image','audio_gen','video_gen','pdf'].forEach(id=>EmberPlus.flip(id,false)));
 });
 await test('Web plugin scraping and reader switches update authoritative storage',async()=>{
  await p.evaluate(()=>EmberPlugins.open('web'));await p.locator('#emberPlugins.show').waitFor();
  for(const field of ['on','reader']){const before=await p.getAttribute('#emberPlugins [data-scr="'+field+'"]','aria-checked');await p.click('#emberPlugins [data-scr="'+field+'"]');assert.notEqual(await p.getAttribute('#emberPlugins [data-scr="'+field+'"]','aria-checked'),before);await p.click('#emberPlugins [data-scr="'+field+'"]');assert.equal(await p.getAttribute('#emberPlugins [data-scr="'+field+'"]','aria-checked'),before);}
  await p.evaluate(()=>EmberPlugins.close());await p.waitForTimeout(220);
 });
 await test('Real file picker attaches all text beyond the old 20,000-character limit',async()=>{
  await p.click('#bPlus');const chooserPromise=p.waitForEvent('filechooser');await p.click('#plusMenu [data-o="upload"]');const chooser=await chooserPromise;
  await chooser.setFiles({name:'complete-source.txt',mimeType:'text/plain',buffer:Buffer.from('BEGIN\n'+'x'.repeat(25000)+'\nATTACHMENT_END')});await p.waitForFunction(()=>document.getElementById('inp').value.includes('ATTACHMENT_END'));assert((await p.inputValue('#inp')).includes('x'.repeat(25000)));
 });
 await test('Archive persists on reload and purge removes stored history',async()=>{
  await p.evaluate(async()=>{EmberCommandCenter.write({text:'PERSISTENCE_SENTINEL'});await EmberOutputArchive.flush();});await p.waitForTimeout(350);await p.reload();await p.waitForFunction(()=>window.EmberRightPanel);await p.evaluate(()=>EmberOutputArchive.ready);assert((await p.evaluate(()=>EmberOutputArchive.text())).includes('PERSISTENCE_SENTINEL'));
  await p.evaluate(()=>EmberOutputArchive.purge());assert.equal(await p.evaluate(()=>EmberOutputArchive.text()),'');
 });
 await test('Plus Reasoning and Learn actions reach the actual existing panels',async()=>{
  await p.click('#bPlus');await p.click('#plusMenu [data-action="bReact"]');assert(await p.locator('#react.show').isVisible());await p.click('#bRx');
  await p.click('#bPlus');await p.click('#plusMenu [data-action="bLearn"]');assert(await p.locator('#learn.show').isVisible());await p.evaluate(()=>document.getElementById('learn').classList.remove('show'));
 });
 await test('Real chat Stop cancels a stalled reply and restores the composer',async()=>{
  await p.evaluate(()=>{['web','reason','device','code','image','audio_gen','video_gen','pdf','stab'].forEach(id=>EmberPlus.flip(id,false));window.__entered=false;EmberGithub.prefetch=async()=>({files:[]});EmberGithub.assertReadFirst=()=>{};EmberDeliverables.prepare=async()=>({context:'',results:[]});Persona.respond=()=>{window.__entered=true;return new Promise(()=>{});};});
  await p.fill('#inp','Hello, this is a cancellation check');await p.click('#bSend');await p.waitForFunction(()=>window.__entered);assert(await p.locator('#bStop').isVisible());await p.click('#bStop');await p.waitForFunction(()=>!document.getElementById('bSend').disabled&&!document.getElementById('bSend').classList.contains('hidden'));assert(!(await p.locator('#bStop').isVisible()));
 });
 await test('No browser exceptions in extended control tests',async()=>assert.deepEqual(errors,[]));
 await ctx.close();console.log(JSON.stringify(results.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{})));if(results.some(x=>x.status!=='PASS'))process.exitCode=1;
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
