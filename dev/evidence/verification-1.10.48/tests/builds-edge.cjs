'use strict';
const {chromium}=require(process.env.PW || 'playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const output=process.env.EMBER_TEST_OUTPUT || path.resolve(__dirname,'../../verification-1.10.48');
const results=[];function check(name,ok){results.push({name,status:ok?'PASS':'FAIL'});console.log((ok?'PASS ':'FAIL ')+name);assert(ok,name);}
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
const context=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'allow'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER ERROR '+e.stack);});await context.route('https://**/*',r=>r.abort());
await page.goto(process.env.EMBER_TEST_BASE || 'http://127.0.0.1:8098');await page.waitForFunction(()=>window.EmberBuilds&&window.__ember?.ready);await page.waitForFunction(()=>document.documentElement.classList.contains('ember-ready'));await page.waitForTimeout(1000);
const long=await page.evaluate(async()=>{let calls=0;const out=await EmberDeliverables.continueArtifact('<artifact type="html">\n<!doctype html>\n',async input=>{calls++;return '<p>Continuation number '+calls+' with full HTML syntax</p>\n'+(calls===7?'</artifact>':'');},{request:'Build a long complex HTML page',maxParts:4});return{calls,out};});
check('complex HTML can continue beyond original four follow-up parts',long.calls===7&&long.out.includes('Continuation number 7')&&long.out.endsWith('</artifact>'));
const cancelled=await page.evaluate(async()=>{let calls=0;const text='<artifact type="pdf">\n# Partial preserved\n';const out=await EmberDeliverables.continueArtifact(text,async()=>{calls++;return 'unexpected';},{cancelled:()=>true});return{calls,equal:out===text};});
check('cancelled continuation preserves original partial text without another call',cancelled.calls===0&&cancelled.equal);
check('rescued partial artifacts are marked incomplete',await page.evaluate(()=>EmberArtifacts.parse('<artifact type="pdf" title="partial.pdf">\n# Unfinished content\n\nThis file is still being written.').items[0].incomplete===true));
await page.evaluate(()=>EmberArtifacts.view({type:'html',title:'index.html.html',content:'<!doctype html><html><head><style>body{background:#fff;color:#123}h1{font:48px sans-serif}</style></head><body><h1>Full HTML build</h1><button id="check" onclick="document.getElementById(\'out\').textContent=\'Interactive works\'">Try</button><p id="out"></p></body></html>'}));
await page.frameLocator('.artifact-frame').locator('#check').click();check('original interactive HTML sandbox still runs',await page.frameLocator('.artifact-frame').locator('#out').innerText()==='Interactive works');
check('HTML sandbox never gains same-origin permission',!(await page.locator('.artifact-frame').getAttribute('sandbox')).includes('allow-same-origin'));
check('HTML has real image lookup and structured PDF page action',await page.locator('[data-eb-extra]').count()===1&&await page.getByRole('button',{name:'PDF pages',exact:true}).count()===1);
await page.locator('.artifact-close').click();
await page.evaluate(()=>EmberArtifacts.view({type:'svg',title:'drawing.svg',content:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect width="100" height="60" rx="6" fill="#ff8b35"/><text x="10" y="35">Vector</text></svg>'}));
check('SVG stays an actual SVG image and can find a real replacement',await page.locator('#artSvg img').getAttribute('src').then(s=>s.startsWith('data:image/svg+xml'))&&await page.locator('[data-eb-extra]').count()===1);
await page.locator('[data-eb-extra]').click();await page.getByRole('searchbox',{name:'Image subject'}).fill('a precise subject');await page.locator('#emberImageLookup form button').click();await page.waitForFunction(()=>document.querySelector('.ei-status').textContent.includes('unavailable'));check('offline image lookup fails honestly without invented images',await page.locator('.ei-results article').count()===0);await page.locator('[data-ei=close]').click();await page.locator('.artifact-close').click();
await page.evaluate(async()=>{
const now=Date.now();await Store.put({id:'patch-test-artifacts',title:'Patch UI fixtures',created:now,updated:now,msgs:[{r:'a',t:'<artifact type="pdf" title="Fixture.pdf"># Fixture PDF</artifact>\n<artifact type="svg" title="Fixture.svg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></artifact>\n<artifact type="image" title="Fixture.png">data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==</artifact>\n<artifact type="document" title="Fixture.md"># Fixture document</artifact>',eng:{p:'groq',m:'fixture-model'},ts:now}]});
const get=EmberBridge.getConversation;window._oldGet=get;EmberBridge.getConversation=()=>[{r:'a',t:'Fixture response',eng:{p:'groq',m:'fixture-model'}}];document.getElementById('log').innerHTML='<div class="msg a"><div>Fixture response</div><div class="mt"><span>09:00 · Groq</span><button data-act="copy" data-i="0">Copy</button></div></div>';EmberFinish.decorate();
});
check('actual reply footer gets correct local provider logo',await page.locator('.ef-provider[data-provider=groq] img').getAttribute('src')==='provider-icons/groq.svg');
await page.waitForTimeout(250);check('no duplicate visible old/new provider badges',await page.locator('.msg.a .mt .vb-prov:visible').count()===0&&await page.locator('.msg.a .mt .ef-provider:visible').count()===1);
await page.evaluate(()=>{document.getElementById('empty').classList.add('hidden');});await page.screenshot({path:path.join(output,'provider-badge-mobile.png')});
await page.evaluate(()=>{document.getElementById('bArtOpen').click();});await page.waitForSelector('#artList .art-row .ef-type-badge');
const labels=await page.locator('#artList .ef-type-badge').allTextContents();check('real saved Artifacts list has PDF SVG IMAGE and DOC badges',['PDF','SVG','IMAGE','DOC'].every(label=>labels.includes(label)));
await page.screenshot({path:path.join(output,'artifact-types-mobile.png')});
check('edge-case tests produce no uncaught browser errors',errors.length===0);
fs.writeFileSync(path.join(output,'edge-results.json'),JSON.stringify({results,errors},null,2));console.log('ALL '+results.length+' EDGE CHECKS PASSED');
}finally{await browser.close();}})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,'edge-results.json'),JSON.stringify({results,error:e.stack},null,2));process.exitCode=1;});
