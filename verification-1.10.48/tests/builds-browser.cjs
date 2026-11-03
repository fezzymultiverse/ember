'use strict';
const {chromium}=require(process.env.PW || 'playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const zlib=require('node:zlib');
function readZip(bytes){const files={};let p=bytes.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));assert(p>=0,'ZIP directory exists');const count=bytes.readUInt16LE(p+10);p=bytes.readUInt32LE(p+16);for(let i=0;i<count;i++){assert(bytes.readUInt32LE(p)===0x02014b50);const method=bytes.readUInt16LE(p+10),size=bytes.readUInt32LE(p+20),nl=bytes.readUInt16LE(p+28),el=bytes.readUInt16LE(p+30),cl=bytes.readUInt16LE(p+32),offset=bytes.readUInt32LE(p+42),name=bytes.subarray(p+46,p+46+nl).toString();const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28),data=bytes.subarray(start,start+size);files[name]=()=>method===0?data:zlib.inflateRawSync(data);p+=46+nl+el+cl;}return files;}
const out=process.env.EMBER_TEST_OUTPUT || path.resolve(__dirname,'..');fs.mkdirSync(out,{recursive:true});
const checks=[];function check(name,yes){checks.push({name,status:yes?'PASS':'FAIL'});console.log((yes?'PASS ':'FAIL ')+name);assert(yes,name);}
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:1,serviceWorkers:'block',acceptDownloads:true});
await context.addInitScript(()=>{
localStorage.setItem('ember_set',JSON.stringify({learn:false,summarize:false,musicAddon:false,agentAddon:true}));
localStorage.setItem('ember_pin','"mistral"');localStorage.setItem('ember_pin_strict','true');localStorage.setItem('patch-test-setting','keep-exactly');
});
let external=[];await context.route('https://**/*',async route=>{
const url=route.request().url();external.push(url);
if(url.startsWith('https://commons.wikimedia.org/w/api.php'))return route.fulfill({contentType:'application/json',body:JSON.stringify({query:{pages:{'1':{index:1,title:'File:Test landscape.jpg',imageinfo:[{url:'https://upload.wikimedia.org/landscape.jpg',thumburl:'https://upload.wikimedia.org/thumb/landscape.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Test_landscape.jpg',width:600,height:400,extmetadata:{Artist:{value:'<b>Test Photographer</b>'},LicenseShortName:{value:'CC BY-SA 4.0'}}}]}}}})});
return route.abort();});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR '+e.message);});page.setDefaultTimeout(30000);
await page.goto(process.env.EMBER_TEST_BASE || 'http://127.0.0.1:8080');await page.waitForFunction(()=>window.EmberBuilds&&window.EmberFinish&&window.EmberImageLookup);await page.waitForFunction(()=>document.documentElement.classList.contains('ember-ready'));
check('add-ons boot in full mobile app',await page.evaluate(()=>EmberBuilds.version==='1.10.48'&&EmberFinish.version==='1.10.48'));
check('existing settings and pinned provider preserved',await page.evaluate(()=>Prov.getPinned()==='mistral'&&Prov.getStrict()&&localStorage.getItem('patch-test-setting')==='keep-exactly'));
check('local empty-state SVG loads',await page.locator('#empty .ef-empty-art').evaluate(im=>im.complete&&im.naturalWidth===420));
check('mobile page has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.waitForTimeout(1700);await page.screenshot({path:path.join(out,'new-chat-mobile.png')});
check('HTML HTML aliases normalize to one extension',await page.evaluate(()=>{const a=EmberArtifacts.parse('<artifact type="html.html" title="index.html.html"><!doctype html><html><body>Hello</body></html></artifact>').items[0];return a.type==='html'&&a.title==='index.html';}));
check('HTML requests get a deliverable intent',await page.evaluate(()=>EmberDeliverables.intent('Build a long complex HTML page').type==='html'&&!EmberDeliverables.intent('Do not create HTML')));
check('search image tool is gated by existing web switch',await page.evaluate(()=>EmberAgentAddon.toolsFor({agentAddon:true}).some(x=>x.name==='search_images')&&!EmberAgentAddon.toolsFor({agentAddon:false}).some(x=>x.name==='search_images')));
const images=await page.evaluate(()=>EmberImageLookup.search('specific landscape',2));check('real image lookup carries exact URL artist and license',images.results.length===1&&images.results[0].artist==='Test Photographer'&&images.results[0].license==='CC BY-SA 4.0');
check('source metadata is never treated as HTML',!images.results[0].artist.includes('<'));
check('provider badge uses stored answering provider',await page.evaluate(()=>EmberFinish.providerBadge({p:'groq',m:'actual-model'}).includes('data-provider="groq"')&&!EmberFinish.providerBadge({p:'groq'}).includes('data-provider="mistral"')));
check('missing provider metadata is not guessed',await page.evaluate(()=>EmberFinish.providerBadge(null).includes('Provider not recorded')));
const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=240;c.height=120;const g=c.getContext('2d');g.fillStyle='#2374bf';g.fillRect(0,0,240,120);g.fillStyle='#ff9a35';g.fillRect(30,20,180,80);return c.toDataURL('image/png');});
const doc='# Ember publication regression\n\nComplete content with **bold** and [source](https://example.com/source).\n\n![Embedded picture]('+png+')\n\n> [!NOTE] An important publication callout.\n\n```stats\nDocuments | 12\nPages | 24\n```\n\n| Item | Description |\n|---|---|\n| Image | Embedded locally |\n| Export | Actual bytes |\n\n1. First ordered item\n2. Second ordered item\n  - Nested bullet\n\n```javascript\nconst untouched = true;\nconsole.log(untouched);\n```\n\n'+Array.from({length:16},(_,i)=>'## Section '+(i+1)+'\n\n'+('Complex content must flow across A4 pages with no dropped final text. '.repeat(25))).join('\n\n')+'\n\nFINAL-END-MARKER-11048';
await page.evaluate(doc=>{window.testArtifact={type:'document',title:'Long complex publication.md',content:doc,opts:{cover:'false',toc:'false'}};EmberArtifacts.view(window.testArtifact);},doc);
await page.waitForFunction(()=>document.querySelector('.eb-sheet')?.dataset.drawn&&document.querySelector('.eb-sheet canvas')?.width>1,null,{timeout:90000});
await page.waitForFunction(()=>document.querySelector('.eb-status')?.textContent.includes('real PDF'));
const count=await page.locator('.eb-sheet').count();check('actual multi-page PDF rendered in-app',count>=8);
check('local PDF worker renders at mobile width',await page.locator('.eb-sheet canvas').first().evaluate(cv=>cv.width>200&&cv.width<1000));
check('render is not simplified Markdown preview',await page.locator('.eb-pages .artifact-markdown').count()===0);
await page.screenshot({path:path.join(out,'pdf-preview-mobile.png')});
let pdfDownload=page.waitForEvent('download');await page.locator('.eb-viewer [data-vact=pdf]').click();const pdf=await pdfDownload;await pdf.saveAs(path.join(out,'long-complex-with-image.pdf'));
const expected=await page.evaluate(async()=>Array.from(new Uint8Array(await (await EmberBuilds.prepare(window.testArtifact)).blob.arrayBuffer())));
check('Save PDF downloads identical preview bytes',fs.readFileSync(path.join(out,'long-complex-with-image.pdf')).equals(Buffer.from(expected)));
let wordDownload=page.waitForEvent('download');await page.locator('.eb-viewer [data-vact=doc]').click();const word=await wordDownload;await word.saveAs(path.join(out,'long-complex-with-image.docx'));
const zip=readZip(fs.readFileSync(path.join(out,'long-complex-with-image.docx'))),xml=zip['word/document.xml']().toString();
check('DOCX embeds actual image media',Object.keys(zip).some(k=>/^word\/media\/.+\.png$/.test(k)));
check('DOCX preserves end marker code lists and table',xml.includes('FINAL-END-MARKER-11048')&&xml.includes('console.log')&&xml.includes('w:tbl')&&xml.includes('w:numPr'));
await page.locator('[data-eb=source]').click();check('full source tab includes final content and image reference',await page.locator('.eb-source').evaluate(n=>n.textContent.includes('FINAL-END-MARKER-11048')&&n.textContent.includes('data:image/png')));
await page.locator('[data-eb=pages]').click();await page.selectOption('.eb-page',String(count));await page.waitForTimeout(900);check('last PDF page loads on demand',await page.locator('.eb-sheet').last().locator('canvas').count()===1);
await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(900);await page.selectOption('.eb-page','1');await page.waitForTimeout(1000);await page.waitForFunction(()=>document.querySelector('.eb-sheet')?.dataset.drawn);await page.screenshot({path:path.join(out,'pdf-preview-desktop.png')});
await page.locator('.artifact-close').click();check('workspace closes cleanly',await page.locator('.eb-overlay').count()===0);
check('PDF DOCX with embedded image do not upload document data',!external.some(u=>/pdf|docx|convert|render|api\.groq|api\.mistral/.test(u)));
await page.evaluate(()=>{
EmberTimeline.setStyle('claude');EmberTimeline.begin();const h=EmberTimeline.tool('web_search',{query:'actual sources'});h.end({results:[{title:'Verified source',url:'https://example.com/evidence'},{title:'Second source',url:'https://example.org/research'}]});EmberTimeline.note('Reading the returned evidence.');EmberTimeline.flush();
});await page.waitForSelector('[data-ef-sources]');
await page.locator('[data-ef-sources] .ek-txt').first().click({position:{x:20,y:8}});check('entire search row expands sources',await page.locator('.ek-src').first().evaluate(d=>d.open));
check('source links retain exact returned URLs',await page.locator('.ek-link').first().getAttribute('href')==='https://example.com/evidence');
const saved=await page.evaluate(()=>{const s=EmberTimeline.snapshot();EmberTimeline.drop();document.getElementById('log').innerHTML=EmberTimeline.savedHtml(s);return s;});
check('search sources survive saved snapshot',JSON.stringify(saved).includes('https://example.com/evidence'));
await page.evaluate(()=>{document.querySelector('.et-saved').open=true;});await page.waitForTimeout(100);await page.screenshot({path:path.join(out,'sources-desktop.png')});
check('enabled toggle style has blue accent',await page.evaluate(()=>{const n=document.createElement('button');n.className='sw on';document.body.append(n);const bg=getComputedStyle(n).backgroundImage;n.remove();return /36, 110, 233|73, 182, 255/.test(bg);}));
check('timeline connector is yellow',await page.locator('.ek-row').first().evaluate(n=>getComputedStyle(n,'::before').backgroundColor==='rgb(243, 204, 83)'));
check('reduced-motion disables flicker',await (async()=>{await page.emulateMedia({reducedMotion:'reduce'});return page.evaluate(()=>{EmberTimeline.begin();const n=document.querySelector('#typ .et-egg');return !n||getComputedStyle(n).animationName==='none';});})());
check('no uncaught browser errors',errors.length===0);
fs.writeFileSync(path.join(out,'test-results.json'),JSON.stringify({checks,errors,pages:count},null,2));
console.log('ALL '+checks.length+' CHECKS PASSED; PDF pages='+count);
} finally {await browser.close();}
})().catch(e=>{fs.writeFileSync(path.join(out,'test-results.json'),JSON.stringify({checks,error:e.stack},null,2));console.error(e);process.exitCode=1;});
