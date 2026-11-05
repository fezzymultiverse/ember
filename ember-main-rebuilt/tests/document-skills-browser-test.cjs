'use strict';
const {chromium}=require(process.env.PW||'playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../www'),out=path.resolve(__dirname,'../verification-document-skills');fs.mkdirSync(out,{recursive:true});
const checks=[];function check(name,result){assert(result,name);checks.push({name,status:'PASS'});console.log('PASS '+name);}
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0])==='/'?'index.html':decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(data);});});
const paragraph='This is deterministic fixture content for checking long-form layout and selectable text. It is not a claim about the outside world. The renderer should preserve every section, value, label and source, with readable spacing and consistent colour. ';
const pages=Array.from({length:12},(_,i)=>{
 let s=(i?'<!-- pagebreak -->\n\n':'---\ntheme: ocean\ncover: false\ntoc: false\n---\n\n')+'# Section '+(i+1)+': '+['Overview','Signed change','Time trend','Composition','Comparison','Process','Data table','Area graph','Callouts','Code example','Evidence','Conclusions'][i]+'\n\n'+paragraph.repeat(4)+'\n\n';
 if(i===0)s+='```stats\nSections | 12\nFixture rows | 3\nNetwork calls for export | 0\n```\n';
 if(i===1)s+='```chart\ntype: bar\ntitle: Signed change (fixture units)\nunit: u\nsource: supplied test data\nLoss | -5\nZero | 0\nGain | 10\n```\n';
 if(i===2)s+='```chart\ntype: line\ntitle: Ordered fixture values\nunit: u\nsource: supplied test data\nJanuary | 5\nFebruary | 10\nMarch | 8\n```\n';
 if(i===3)s+='```chart\ntype: donut\ntitle: Parts of one fixture whole\nunit: %\nsource: supplied test data\nA | 50\nB | 30\nC | 20\n```\n';
 if(i===4)s+='<!-- columns -->\n### Option A\n\nA short comparison column.\n<!-- col -->\n### Option B\n\nA second short comparison column.\n<!-- endcolumns -->\n';
 if(i===5)s+='```steps\nPlan | Read the request\nBuild | Preserve data\nVerify | Check exported result\n```\n';
 if(i===6)s+='| Category | Amount (u) |\n|---|---|\n| Loss | -5 |\n| Zero | 0 |\n| Gain | 10 |\n';
 if(i===7)s+='```chart\ntype: area\ntitle: Area trend (fixture units)\nsource: supplied test data\nA | -5\nB | 10\nC | 8\n```\n';
 if(i===8)s+='> [!TIP]\n> This is a real rendered callout, not a screenshot.\n';
 if(i===9)s+='````javascript\nconst example = "Nested fence example";\n```\n// This line stays in the longer fence.\n````\n';
 return s+'\nEND-SECTION-'+(i+1)+'\n'+(i===11?'\nFINAL-VERIFIED-MARKER-11058\n':'');
}).join('\n');
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline fixture dashboard</title><style>:root{--accent:#1f5f99}*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui;background:#edf3f8;color:#172331}main{max-width:1000px;margin:auto;padding:24px}h1{font-size:clamp(24px,4vw,40px)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{padding:20px;border-radius:12px;background:white}button,input{font:inherit;min-height:44px}button{background:var(--accent);color:white;border:0;padding:10px 18px;cursor:pointer}input{max-width:100%;width:100%;margin:8px 0}svg{display:block;width:100%;height:auto}button:focus-visible,input:focus-visible{outline:3px solid #e09b26;outline-offset:3px}@media(max-width:600px){.grid{grid-template-columns:1fr}main{padding:16px}}@page{size:A4;margin:18mm}@media print{body{background:white}.controls{display:none}.card{break-inside:avoid}h1,h2{break-after:avoid}body{margin:0}}</style></head><body><main><h1>Working HTML fixture</h1><div class="grid"><section class="card"><h2>Real local interaction</h2><label for="name">Display name</label><input id="name" value="Ember"><button type="button" id="apply">Apply name</button><p id="result" role="status">Ready</p></section><section class="card"><h2>Supplied fixture data</h2><svg viewBox="0 0 300 160" role="img" aria-label="Category A: 50 units, category B: 30 units"><line x1="30" y1="125" x2="280" y2="125" stroke="#555"/><rect x="60" y="25" width="50" height="100" fill="#1f5f99"/><rect x="180" y="65" width="50" height="60" fill="#13786f"/><text x="60" y="148">A: 50 u</text><text x="180" y="148">B: 30 u</text></svg><p>Values: A 50 units; B 30 units. Source: supplied fixture data.</p></section></div></main><script>document.getElementById("apply").addEventListener("click",()=>{const value=document.getElementById("name").value.trim();document.getElementById("result").textContent=value?"Hello, "+value:"Please enter a name";});</script></body></html>';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'allow',acceptDownloads:true});
  await context.route('https://**/*',r=>r.abort());
  await context.addInitScript(()=>{if(window!==window.top)return;localStorage.setItem('ember_pin',JSON.stringify('cohere'));localStorage.setItem('ember_pin_strict','false');localStorage.setItem('skill-fixture-settings',JSON.stringify({keep:42}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.goto(base);await page.waitForFunction(()=>window.EmberDocumentEngine&&window.EmberDeliverables&&window.EmberArtifacts&&document.documentElement.classList.contains('ember-ready'));
  check('actual mobile app boots with updated skills',await page.evaluate(()=>EmberDocumentEngine.version==='1.10.58'));
  check('no mobile shell horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  check('existing pins and unrelated settings survive boot',await page.evaluate(()=>Prov.getPinned()==='cohere'&&Prov.getStrict()===false&&JSON.parse(localStorage.getItem('skill-fixture-settings')).keep===42));
  const initialErrors=errors.slice();let external=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
  const pdfBytes=await page.evaluate(async md=>Array.from(new Uint8Array(await (await EmberDeliverables.pdf(md,'12-page fixture',{cover:false,toc:false})).arrayBuffer())),pages);
  const pdf=Buffer.from(pdfBytes);fs.writeFileSync(path.join(out,'12-page-layout-fixture.pdf'),pdf);
  check('long PDF is a real embedded-font PDF',pdf.length>30000&&pdf.subarray(0,5).toString()==='%PDF-');
  check('long local PDF rendering makes no remote call',external.length===0);
  const word=Buffer.from(await page.evaluate(async md=>Array.from(new Uint8Array(await (await EmberDeliverables.word(md,'fixture')).arrayBuffer())),pages));fs.writeFileSync(path.join(out,'layout-fixture.docx'),word);
  check('existing Word export remains functional',word.length>5000&&word.subarray(0,2).toString()==='PK');
  const downloadEvent=page.waitForEvent('download');await page.evaluate(md=>EmberArtifacts.download({type:'pdf',title:'fixture.pdf',content:md,cover:false,toc:false}),pages);const dl=await downloadEvent;await dl.saveAs(path.join(out,'save-action.pdf'));
  check('actual artifact PDF download works',fs.statSync(path.join(out,'save-action.pdf')).size>30000);
  await page.evaluate(html=>EmberArtifacts.view({type:'html',title:'working.html',content:html}),html);await page.waitForSelector('.artifact-frame');
  const frame=page.frameLocator('.artifact-frame');await frame.getByRole('button',{name:'Apply name'}).click();
  check('inline HTML script executes in actual Ember preview',await frame.locator('#result').textContent()==='Hello, Ember');
  await frame.locator('#name').fill('<img src=x onerror=alert(1)>');await frame.getByRole('button',{name:'Apply name'}).click();
  check('fixture interaction escapes untrusted input',await frame.locator('#result img').count()===0&&(await frame.locator('#result').textContent()).includes('<img'));
  await frame.locator('#name').fill('');await frame.getByRole('button',{name:'Apply name'}).click();check('HTML validation state works',await frame.locator('#result').textContent()==='Please enter a name');
  check('sandbox protections remain intact',await page.locator('.artifact-frame').getAttribute('sandbox')==='allow-scripts allow-downloads');
  check('sandbox still blocks fetch',await frame.locator('body').evaluate(async()=>{try{await fetch('https://example.org/no-network');return false;}catch{return true;}}));
  check('sandbox cannot access application localStorage',await frame.locator('body').evaluate(()=>{try{localStorage.setItem('sandbox-test','x');return false;}catch{return true;}}));
  for(const width of [360,768,1440]){
    await page.setViewportSize({width,height:1000});
    check('responsive HTML fits '+width+'px',await frame.locator('html').evaluate(n=>n.scrollWidth<=window.innerWidth+1));
    check('actual preview SVG chart fits '+width+'px',await frame.locator('svg').evaluate(n=>n.getBoundingClientRect().width<=window.innerWidth));
  }
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(out,'html-execution-desktop.png')});
  await page.setViewportSize({width:412,height:915});await page.screenshot({path:path.join(out,'html-execution-mobile.png')});
  await page.locator('.artifact-close').click();
  for(const a of [{type:'html',title:'exact.html',content:html},{type:'markdown',title:'exact.md',content:'# Original Markdown\n\n- [x] Keep text\n\n| A | B |\n|---|---|\n| Unicode Ω | 4 |\n'}]){
    const ev=page.waitForEvent('download');await page.evaluate(a=>EmberArtifacts.download(a),a);const d=await ev;await d.saveAs(path.join(out,a.title));check(a.type+' download is byte-preserving',fs.readFileSync(path.join(out,a.title),'utf8')===a.content);
  }
  // Exercise the user's existing scraper API integration using an isolated fake key and response.
  await context.route('https://api.firecrawl.dev/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{markdown:'# Scraped fixture\n\nVerified fixture content from the supplied URL.',metadata:{title:'Fixture page',sourceURL:'https://example.org/fixture'}}})}));
  await page.evaluate(()=>{EmberScraper.setKey('firecrawl','fc-testfixture-not-a-real-key');EmberScraper.setOn(true);});
  const scrape=await page.evaluate(()=>EmberScraper.dispatch('scrape_url',{url:'https://example.org/fixture',objective:'read supplied fixture',via:'firecrawl'}));
  check('existing scrape_url API can return requested web content',!scrape.error&&JSON.stringify(scrape).includes('Verified fixture content'));
  check('Ember runtime knows configured scraper is enabled',await page.evaluate(()=>Prov.factsBlock(null,null,[]).includes('Scraping is currently enabled')&&Prov.factsBlock(null,null,[]).includes('Firecrawl')));
  check('runtime does not expose scraper credential',await page.evaluate(()=>!Prov.factsBlock(null,null,[]).includes('fc-testfixture')));
  await context.setOffline(true);const offline=await page.evaluate(async()=> (await EmberDeliverables.pdf('# Offline\n\nLocal export still works.','offline')).size);check('loaded PDF export works offline',offline>10000);await context.setOffline(false);
  const pacing=await page.evaluate(async()=>{const frames=[],w=EmberTypewriter.create({paint:s=>frames.push(s)}),text='Unchanged gradual text rendering. '.repeat(10);w.push(text);await w.finish(text);return frames.length>3&&frames.at(-1)===text;});check('existing typewriter pacing preserved',pacing);
  check('exports retain unrelated settings',await page.evaluate(()=>Prov.getPinned()==='cohere'&&Prov.getStrict()===false&&JSON.parse(localStorage.getItem('skill-fixture-settings')).keep===42));
  console.log('Runtime errors',JSON.stringify({initialErrors,errors}));
  check('document and HTML tests add no runtime JavaScript errors',errors.length===initialErrors.length);
  await context.close();
  const sw=await browser.newContext({serviceWorkers:'allow'});await sw.route('https://**/*',r=>r.abort());const sp=await sw.newPage();await sp.goto(base);await sp.evaluate(()=>navigator.serviceWorker.ready);
  await sp.waitForFunction(async()=>{const c=await caches.open('ember-v1.10.58-document-skills-free-only');return !!(await c.match('ember_document_engine.js'))&&!!(await c.match('vendor/pdfmake-0.2.20-fonts.js'));},null,{timeout:45000});
  await sw.setOffline(true);await sp.reload();await sp.waitForFunction(()=>window.EmberDocumentEngine&&window.EmberDeliverables);
  check('updated skills load after cold offline reload',await sp.evaluate(()=>EmberDocumentEngine.version==='1.10.58'));
  check('cold offline PDF renderer loads from cache',await sp.evaluate(async()=> (await EmberDeliverables.pdf('# Cold offline\n\nCached export.','offline')).size>10000));await sw.close();
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({count:checks.length,checks,initialErrors,errors,note:'Fixture-based browser validation; no production AI or scraping credentials were used. Android source guards were not device-tested.'},null,2)+'\n');console.log(checks.length+' browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
