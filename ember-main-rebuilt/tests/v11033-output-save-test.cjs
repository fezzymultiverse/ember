'use strict';
const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert'),path=require('path'),{spawn}=require('child_process');
const OUT=path.join(__dirname,'results','v11033');fs.mkdirSync(OUT,{recursive:true});
const BASE='http://127.0.0.1:8833/';const server=spawn(process.execPath,[path.join(__dirname,'..','serve.js'),'8833'],{stdio:'ignore'});
process.on('exit',()=>server.kill());
(async()=>{
 await new Promise(r=>setTimeout(r,500));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:412,height:915},acceptDownloads:true});const errors=[],results=[];
 const check=(label,value)=>{assert(value,label);results.push(label);console.log('PASS '+label);};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await page.goto(BASE,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.EmberBridge && window.EmberKeyless && window.EmberArtifacts);
 await page.waitForTimeout(1000);
 console.log('BOOT ERRORS',errors);
 check('clean app boot',errors.length===0);
 check('typewriter, inventory and media adapter loaded',await page.evaluate(()=>!!(EmberTypewriter&&EmberBuiltins&&EmberKeylessMedia)));
 // Adaptive pacing: one-shot provider bursts must produce many partial frames, not one dump.
 const pacing=await page.evaluate(async()=>{
  const samples=[];const w=EmberTypewriter.create({paint:t=>samples.push({t,n:t.length,at:performance.now()})});
  const text='A real buffered reply. '.repeat(80);w.push(text);await new Promise(r=>setTimeout(r,60));const early=w.state();await w.finish(text);
  const small=[];const s=EmberTypewriter.create({paint:t=>small.push(t)});s.push('short reply for a pacing check');await new Promise(r=>setTimeout(r,60));s.reset();
  return {length:text.length,first:samples[0].n,early:early.shown.length,last:samples.at(-1).n,count:samples.length,small:small.at(-1)?.length};
 });
 check('provider burst is visibly buffered',pacing.first>0&&pacing.first<pacing.length&&pacing.early<pacing.length&&pacing.count>15);
 check('buffer drains to exact complete text',pacing.last===pacing.length);
 check('large backlogs accelerate vs short replies',pacing.early>pacing.small);
 const cancel=await page.evaluate(async()=>{let n=0;const w=EmberTypewriter.create({paint:()=>n++});w.push('stop '.repeat(200));const p=w.finish('stop '.repeat(200));await new Promise(r=>setTimeout(r,40));w.reset();const ok=await p,before=n;await new Promise(r=>setTimeout(r,100));return {ok,before,n};});
 check('Stop cancels animation without late frames',cancel.ok===false&&cancel.before===cancel.n);
 // Complete reply path including buffered native/non-SSE-sized answer.
 await page.evaluate(()=>{
  window.__reply='This response arrives in a single provider result, but Ember must reveal it progressively instead of dumping it. '.repeat(8);
  Persona.respond=async()=>({text:window.__reply,provider:'groq',model:'mock',ms:1});
  EmberGithub.prefetch=async()=>({files:[],required:false,at:Date.now()});EmberGithub.assertReadFirst=()=>true;EmberGithub.isCodeQuestion=()=>false;
  EmberDeliverables.prepare=async()=>({results:[],context:''});
  if(EmberNative)EmberNative.holdDuringReply=p=>p;
 });
 await page.fill('#inp','Say something encouraging');await page.click('#bSend');
 await page.waitForSelector('#streamPreview');await page.waitForTimeout(100);
 const early=await page.locator('#streamPreview>div').innerText();
 check('actual chat one-shot response uses typewriter',early.length>0&&early.length<await page.evaluate(()=>__reply.length));
 await page.waitForFunction(()=>!EmberChatState.busy(),null,{timeout:30000});
 check('completed response persisted exactly once',await page.evaluate(()=>EmberBridge.getConversation().filter(m=>m.r==='a'&&m.t.trim()===__reply.trim()).length===1));
 // Real PDF generation and browser save events for the legacy prefix that used to be intercepted.
 const artifact={type:'markdown',title:'Ember - regression.md',content:'# PDF regression\n\nThis must really save.\n\n| Test | Result |\n|---|---|\n| PDF | pass |\n\n```chart\ntype: bar\nA: 3\nB: 7\n```'};
 await page.evaluate(a=>EmberArtifacts.view(a),artifact);
 const dlWait=page.waitForEvent('download');await page.click('[data-vact="pdf"]');const dl=await dlWait;
 const pdf=await dl.path(),bytes=fs.readFileSync(pdf);
 check('viewer PDF button produces real PDF download',bytes.subarray(0,5).toString()==='%PDF-'&&bytes.includes(Buffer.from('%%EOF')));
 fs.copyFileSync(pdf,path.join(OUT,'test-export.pdf'));
 const sourceWait=page.waitForEvent('download');await page.click('[data-vact="download"]');const source=await sourceWait;
 check('viewer Save artifact preserves markdown',fs.readFileSync(await source.path(),'utf8')===artifact.content&&source.suggestedFilename().endsWith('.md'));
 // Native bridge is mocked: check decoded bytes and save cancellation, not a claim of device testing.
 const native=await page.evaluate(async()=>{
  const old=window.Capacitor;let calls=[];window.Capacitor={isNativePlatform:()=>true,Plugins:{EmberDevice:{saveFile:async o=>{calls.push(o);return {ok:true,path:'content://test/saved'};}}}};
  const ok=await EmberArtifacts.saveBlob(new Blob(['saved artifact'],{type:'text/plain'}),'native.txt');
  window.Capacitor.Plugins.EmberDevice.saveFile=async()=>({cancelled:true});const cancelled=await EmberArtifacts.saveBlob(new Blob(['x']),'cancel.txt');
  window.Capacitor=old;return {ok,cancelled,calls};
 });
 check('native save bridge receives real file bytes',native.ok&&Buffer.from(native.calls[0].data,'base64').toString()==='saved artifact');
 check('cancelled native save is not reported successful',native.cancelled===false);
 await page.click('.artifact-close');
 // Verify the public native-result event path and Stop on a queued native reply.
 await page.evaluate(()=>{
   window.__nativeResults=[{convId:EmberChatState.conv().id,turnId:'native-test-1',text:'Native worker result is also progressively rendered. '.repeat(8),provider:'groq',model:'mock'}];
   EmberNative.aiAvailable=true;EmberNative.aiTakeResults=async()=>window.__nativeResults.splice(0);window.dispatchEvent(new Event('ember-bg-ready'));
 });
 await page.waitForSelector('#streamPreview');
 check('native background replies also use typewriter',await page.locator('#streamPreview>div').innerText().then(x=>x.length<400));
 await page.waitForFunction(()=>!EmberChatState.busy(),null,{timeout:30000});
 check('native background result is saved once',await page.evaluate(()=>EmberBridge.getConversation().filter(m=>m.turn==='native-test-1').length===1));
 await page.evaluate(()=>{window.__nativeResults=[{convId:EmberChatState.conv().id,turnId:'native-stop',text:'Stop the native queue. '.repeat(200),provider:'groq',model:'mock'}];window.dispatchEvent(new Event('ember-bg-ready'));});
 await page.waitForSelector('#streamPreview');await page.click('#bStop');await page.waitForFunction(()=>!EmberChatState.busy());
 check('Stop clears native typing without dumping final result',await page.evaluate(()=>!EmberBridge.getConversation().some(m=>m.turn==='native-stop')&&!document.getElementById('streamPreview')));
 // Test all existing PDF source converters using the real bundled renderer (no hosted APIs).
 for(const a of [
  {type:'pdf',title:'test.pdf',content:'# PDF source\n\nReady to export.'},
  {type:'document',title:'test-document.md',content:'# Word-like document\n\nBody.'},
  {type:'html',title:'test.html',content:'<h1>HTML export</h1><p>Layout preserved as document content.</p>'},
  {type:'code',language:'python',title:'test.py',content:'print("hello")'},
  {type:'json',title:'test.json',content:'[{"name":"A","value":4}]'},
  {type:'csv',title:'test.csv',content:'Name,Value\nA,4\nB,8'},
  {type:'svg',title:'test.svg',content:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#ff6a00"/></svg>'}
 ]){
  const download=page.waitForEvent('download');const ok=await page.evaluate(a=>EmberArtifacts.exportPdf(a),a);const f=await download;
  check(a.type+' artifact exports a real PDF',ok&&fs.readFileSync(await f.path()).subarray(0,5).toString()==='%PDF-');
 }
 // Removed integrations are absent from both UI and agent tools, even with previously stored keys.
 const removed=await page.evaluate(()=>{localStorage.setItem('ember_apis',JSON.stringify({on:true,keys:{unsplash:'old-key-12345',whoisjson:'old-key-12345',wordsapi:'old-key-12345'}}));return {tools:EmberApis.tools().map(t=>t.name),inv:EmberApis.inventory(),names:document.querySelector('#emberApis').textContent};});
 check('removed services are absent from tools and key inventory',removed.inv.length===0&&!removed.tools.some(t=>/grammar|photos|whois|word_info/.test(t)));
 check('removed services are absent from API panel',!/LanguageTool|Unsplash|WhoisJSON|WordsAPI/.test(removed.names));
 check('Settings has no media generation form',await page.locator('#efMediaProvider,#efGenerate,#efMediaOn').count()===0);
 await page.evaluate(()=>EmberPlugins.open('media'));
 check('plus panel has no PDF/image output plugin switches',await page.locator('#eplBody [data-flip="pdf"],#eplBody [data-flip="image"]').count()===0);
 check('plus panel retains optional Stability images',await page.locator('#eplStab').count()===1);
 check('keyless audio/video have no paid fallback',await page.evaluate(()=>EmberMedia.supported.stability.join(',')==='image'&&EmberMedia.supported.keyless.join(',')==='audio,video'));
 const noApi=await page.evaluate(async()=>{try{await EmberKeylessMedia.generate('audio','test',{},{});return '';}catch(e){return e.message;}});
 check('unconfigured keyless generation fails honestly',/No keyless audio API is configured/.test(noApi));
 check('built-in inventory lists output styling and images',await page.evaluate(()=>['PDF','Colours & themes','Charts','HTML & layouts','SVG images & diagrams','Image embedding'].every(n=>EmberBuiltins.list().some(x=>x.name===n))));
 check('built-in rules reach model state',await page.evaluate(()=>EmberPlus.stateLine().includes('EMBER INTRINSIC CAPABILITIES')));
 await page.screenshot({path:path.join(OUT,'media-panel.png'),fullPage:true});
 await page.evaluate(()=>EmberPlugins.close());await page.waitForTimeout(250);await page.evaluate(()=>EmberEngines.open());
 check('Built-in engines opens a read-only standalone sheet',await page.locator('#xengines.show').count()===1&&await page.locator('#xengines button[role="switch"]').count()===0&&await page.locator('#settings #xengines').count()===0);
 await page.screenshot({path:path.join(OUT,'builtins.png'),fullPage:true});
 check('no new browser errors',errors.length===0);
 fs.writeFileSync(path.join(OUT,'test-results.json'),JSON.stringify({passed:results.length,results,errors,pacing,nativeDeviceTested:false,liveMediaTested:false},null,2));
 console.log('ALL '+results.length+' CHECKS PASSED');await browser.close();server.kill();
})().catch(e=>{console.error(e);process.exit(1);});
