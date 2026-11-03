'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../www'),out=path.resolve(__dirname,'../verification-1.10.40');fs.mkdirSync(out,{recursive:true});
const checks=[];function check(name,condition){assert(condition,name);checks.push({name,status:'PASS'});console.log('PASS '+name);}
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);const f=path.join(root,p==='/'?'index.html':p);if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'block',acceptDownloads:true});
 await context.route('https://**/*',r=>r.abort());
 await context.addInitScript(()=>{if(!localStorage.getItem('regression-seeded')){localStorage.setItem('ember_pin',JSON.stringify('cohere'));localStorage.setItem('ember_pin_strict','false');localStorage.setItem('ember_route_enabled',JSON.stringify({groq:false,openrouter:true}));localStorage.setItem('regression-custom',JSON.stringify({theme:'keep-me',value:42}));localStorage.setItem('regression-seeded','yes');}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await page.goto(base);await page.waitForFunction(()=>window.EmberDocumentEngine&&window.EmberArtifacts&&window.EmberDeliverables&&window.EmberTypewriter);
 await page.waitForFunction(()=>document.documentElement.classList.contains('ember-ready'));
 check('new document engine loads in real mobile app',await page.evaluate(()=>EmberDocumentEngine.version==='1.10.40'));
 check('existing settings survive app boot',await page.evaluate(()=>Prov.getPinned()==='cohere'&&Prov.getStrict()===false&&JSON.parse(localStorage.getItem('ember_route_enabled')).groq===false&&JSON.parse(localStorage.getItem('regression-custom')).value===42));
 check('mobile app fits phone width',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const originalErrors=errors.slice();
 const doc='# A4 Regression Report\n\nThis is a complete local document, not a screenshot.\n\n## Overview\n\n'+Array.from({length:12},(_,i)=>'### Section '+(i+1)+'\n\n'+('Selectable text must flow across printable A4 pages without losing content. '.repeat(12))).join('\n\n')+'\n\n| Item | Value |\n|---|---|\n| Final marker | VERIFIED-END-11040 |';
 const getBytes=async(kind,text)=>page.evaluate(async({kind,text})=>Array.from(new Uint8Array(await (await EmberDeliverables[kind](text,'A4 regression')).arrayBuffer())),{kind,text});
 let external=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
 const pdf=Buffer.from(await getBytes('pdf',doc));fs.writeFileSync(path.join(out,'a4-regression.pdf'),pdf);
 check('bundled PDF engine generates a real embedded-font file',pdf.length>20000&&pdf.subarray(0,5).toString()==='%PDF-');
 const word=Buffer.from(await getBytes('word',doc));fs.writeFileSync(path.join(out,'a4-regression.docx'),word);
 check('Word exporter generates a real ZIP-based DOCX',word.length>5000&&word.subarray(0,2).toString()==='PK');
 check('PDF/Word rendering makes no external request',external.length===0);
 await page.evaluate(doc=>EmberArtifacts.view({type:'document',title:'A4 regression.md',content:doc}),doc);
 await page.waitForSelector('.a4-page');
 const geometry=await page.locator('.a4-page').evaluateAll(nodes=>nodes.map(n=>({w:n.offsetWidth,h:n.offsetHeight,label:n.getAttribute('data-n')})));
 console.log('A4 geometry',JSON.stringify(geometry));
 check('mobile preview uses multiple actual A4 sheets',geometry.length>=2&&geometry.every(p=>Math.abs(p.w-794)<=1&&Math.abs(p.h-1123)<=1));
 check('preview labels every page',geometry.every((p,i)=>p.label==='Page '+(i+1)+' of '+geometry.length));
 await page.screenshot({path:path.join(out,'a4-mobile-preview.png')});
 // Exercise the actual Save PDF button, not just the standalone renderer.
 const downloadEvent=page.waitForEvent('download');await page.locator('[data-vact="pdf"]').click();
 const download=await downloadEvent;await download.saveAs(path.join(out,'save-button.pdf'));
 check('existing Save PDF action still downloads the intended file',download.suggestedFilename().endsWith('.pdf')&&fs.statSync(path.join(out,'save-button.pdf')).size>20000);
 await page.locator('.artifact-close').click();
 // Raw Markdown and HTML downloads retain exact bytes; no auto rewrite occurs.
 for(const artifact of [{type:'markdown',title:'exact.md',content:'# Original\n\nDo not alter this Ω text.\n'},{type:'html',title:'exact.html',content:'<!doctype html><html><head><style>@page{size:A4}</style></head><body><h1>Exact HTML</h1></body></html>'}]){
   const ev=page.waitForEvent('download');await page.evaluate(a=>EmberArtifacts.download(a),artifact);const dl=await ev;const file=path.join(out,artifact.title);await dl.saveAs(file);
   check(artifact.type+' download preserves original content',fs.readFileSync(file,'utf8')===artifact.content);
 }
 // Native bridge fixture validates the existing saveFile contract; no Android claim is made.
 check('native Save contract retains name, MIME and full payload',await page.evaluate(async()=>{let captured;const prior=window.Capacitor;window.Capacitor={isNativePlatform:()=>true,Plugins:{EmberDevice:{saveFile:async o=>{captured=o;return {ok:true,path:'content://fixture/document/one'};}}}};try{const ok=await EmberArtifacts.saveBlob(new Blob(['fixture payload'],{type:'application/pdf'}),'fixture.pdf');return ok&&captured.name==='fixture.pdf'&&captured.mime==='application/pdf'&&atob(captured.data)==='fixture payload';}finally{window.Capacitor=prior;}}));
 check('native Save cancellation remains cancellation',await page.evaluate(async()=>{const prior=window.Capacitor;window.Capacitor={isNativePlatform:()=>true,Plugins:{EmberDevice:{saveFile:async()=>({cancelled:true})}}};try{return await EmberArtifacts.saveBlob(new Blob(['x']), 'cancel.pdf')===false;}finally{window.Capacitor=prior;}}));
 const pacing=await page.evaluate(async()=>{const frames=[];const w=EmberTypewriter.create({paint:s=>frames.push(s)}),s='Gradual output with emoji 🙂 and complete ending. '.repeat(10);w.push(s);const immediate=frames.length;await w.finish(s);return {immediate,n:frames.length,last:frames.at(-1),expected:s};});
 check('typewriter stays gradual and retains complete final text',pacing.immediate===0&&pacing.n>3&&pacing.last===pacing.expected);
 check('artifact markup remains hidden during typing',await page.evaluate(async()=>{const a=[],w=EmberTypewriter.create({paint:s=>a.push(s)});await w.finish('Ready.\n<artifact type="pdf" title="Report.pdf">PRIVATE BODY</artifact>');return a.every(s=>!s.includes('PRIVATE BODY')&&!s.includes('<artifact'));}));
 check('typewriter Stop clears pending work',await page.evaluate(async()=>{const w=EmberTypewriter.create({paint:()=>{}});w.push('x'.repeat(5000));const p=w.finish('x'.repeat(5000));w.reset();return await p===false&&w.state().pending===0;}));
 await context.setOffline(true);const offline=await getBytes('pdf','# Offline A4\n\nOffline rendering succeeds.');check('preloaded PDF export works offline',offline.length>10000);await context.setOffline(false);
 await page.setViewportSize({width:1440,height:1000});check('desktop app has no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.evaluate(doc=>EmberArtifacts.view({type:'document',title:'A4 desktop.md',content:doc}),doc);await page.screenshot({path:path.join(out,'a4-desktop-preview.png')});await page.locator('.artifact-close').click();
 check('document work adds no browser runtime errors',errors.length===originalErrors.length);
 await page.reload();await page.waitForFunction(()=>window.EmberDocumentEngine&&window.Prov);
 check('settings still preserved after reload and all exports',await page.evaluate(()=>Prov.getPinned()==='cohere'&&Prov.getStrict()===false&&JSON.parse(localStorage.getItem('regression-custom')).value===42));
 await context.close();
 // Cold offline reload includes the additive engine in the actual service-worker cache.
 const sw=await browser.newContext({serviceWorkers:'allow'});await sw.route('https://**/*',r=>r.abort());const sp=await sw.newPage();await sp.goto(base);
 await sp.evaluate(()=>navigator.serviceWorker.ready);
 await sp.waitForFunction(async()=>{const c=await caches.open('ember-v1.10.40-document-engine');return !!(await c.match('ember_document_engine.js'))&&!!(await c.match('vendor/pdfmake-0.2.20-fonts.js'));},null,{timeout:45000});
 await sw.setOffline(true);await sp.reload();await sp.waitForFunction(()=>window.EmberDocumentEngine&&window.EmberDeliverables);
 check('new engine survives a cold offline app reload',await sp.evaluate(()=>EmberDocumentEngine.version==='1.10.40'));
 check('cold offline PDF export loads cached renderer',await sp.evaluate(async()=>(await EmberDeliverables.pdf('# Offline reload\n\nCached A4 export.','offline')).size>10000));
 await sw.close();
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({count:checks.length,checks,initialRuntimeErrors:originalErrors,allRuntimeErrors:errors,a4Geometry:geometry},null,2));console.log(checks.length+' browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
