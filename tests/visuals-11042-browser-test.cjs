'use strict';
// Ember V1.10.42 visuals add-on test. Headless Chromium, offline. Rows/footers are injected with the same markup the app renders.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../www'),out=process.env.EMBER_VERIFY_DIR||path.resolve(__dirname,'../verification-visuals');fs.mkdirSync(out,{recursive:true});
const results=[];function check(name,ok){assert(ok,name);results.push({name,status:'PASS'});console.log('PASS '+name);}
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const server=http.createServer((q,r)=>{const f=path.join(root,q.url.split('?')[0]==='/'?'index.html':decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(b);});});
(async()=>{
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const ctx=await browser.newContext({viewport:{width:412,height:915},serviceWorkers:'block'});const external=[];
 await ctx.route('https://**/*',r=>{external.push(r.request().url());r.abort();});
 await ctx.addInitScript(()=>{localStorage.setItem('regression-untouched','keep-this-setting');});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.waitForFunction(()=>window.EmberVisuals&&document.documentElement.classList.contains('ember-ready'),null,{timeout:20000});
 check('app boots with visuals loaded and no runtime errors',errors.length===0);
 check('existing stored settings untouched',await page.evaluate(()=>localStorage.getItem('regression-untouched')==='keep-this-setting'));
 check('no horizontal overflow on phone',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 // 4 empty state
 check('empty-state art inserted once, first child of #empty',await page.evaluate(()=>{const e=document.getElementById('empty');return e.querySelectorAll('.vb-empty-art').length===1&&e.firstElementChild.classList.contains('vb-empty-art')&&e.querySelectorAll('.vb-sp').length===6;}));
 check('empty-state art makes no external requests and is not interactive',external.length===0&&await page.evaluate(()=>getComputedStyle(document.querySelector('.vb-empty-art')).pointerEvents==='none'));
 // 1 provider badge
 await page.evaluate(()=>{const log=document.getElementById('log');log.insertAdjacentHTML('beforeend',
  ['10:01 · Groq llama-3 120ms','10:02 · Free','10:03 · Gemini gemini-pro · Groq pin failed','10:04 · Claude','10:05 · OpenRouter x','10:06 · Cohere','10:07 · Mistral','10:08 · LongCat AI','10:09 · Plugsky AI','10:10 · Unknown Engine','10:11'].map((t,i)=>'<div class="msg a" data-fx="'+i+'"><div class="ember-message-body">hi</div><div class="mt"><span>'+t+'</span><button>Copy</button></div></div>').join('')+
  '<div class="msg u"><div class="ember-message-body">you</div><div class="mt"><span>10:12 · Groq</span></div></div>');});
 await page.waitForFunction(()=>document.querySelectorAll('#log .vb-prov').length>=8);
 const badges=await page.evaluate(()=>[...document.querySelectorAll('#log .msg')].map(m=>({u:m.classList.contains('u'),t:m.querySelector('.mt > span:not(.vb-prov)')?.textContent,b:m.querySelectorAll('.vb-prov').length,title:m.querySelector('.vb-prov')?.title||'',src:m.querySelector('.vb-prov img')?.getAttribute('src')||'',free:!!m.querySelector('.vb-free')})));
 const by=s=>badges.find(x=>x.t&&x.t.includes(s));
 check('Groq reply gets Groq logo from local provider-icons',by('Groq llama').b===1&&by('Groq llama').src==='provider-icons/groq.svg'&&by('Groq llama').title==='Answered by Groq');
 check('Free reply gets the flame chip',by('10:02').free&&by('10:02').title==='Answered by Free mode');
 check('pin-failed footer badges the engine that answered (Gemini), not the failed pin',by('Gemini').src==='provider-icons/gemini.svg');
 check('Claude, OpenRouter, Cohere, Mistral, LongCat, Plugsky all badge from local files',['10:04','10:05','10:06','10:07','10:08','10:09'].every(k=>by(k).b===1&&by(k).src.startsWith('provider-icons/')));
 check('unknown engine, bare time and user messages get no badge',by('Unknown').b===0&&by('10:11').b===0&&badges.find(x=>x.u).b===0);
 check('no duplicate badges after more DOM changes',await page.evaluate(async()=>{document.getElementById('log').insertAdjacentHTML('beforeend','<div></div>');await new Promise(r=>setTimeout(r,150));return[...document.querySelectorAll('#log .msg.a .mt')].every(m=>m.querySelectorAll('.vb-prov').length<=1);}));
 check('every referenced provider icon file exists in www/provider-icons',['groq.svg','gemini.svg','anthropic.svg','openrouter.svg','cohere.svg','mistral.svg','longcat.svg','plugsky.ico'].every(f=>fs.existsSync(path.join(root,'provider-icons',f))));
 // 2 artifact badges
 await page.evaluate(()=>{const host=document.getElementById('artList')||(()=>{const d=document.createElement('div');d.id='artList';document.body.appendChild(d);return d;})();
  host.innerHTML=['PDF','DOC','MARKDOWN','SVG','IMAGE','HTML','CODE · python','JSON','CSV','WEIRD'].map(k=>'<button type="button" class="art-row"><span class="art-ic" aria-hidden="true">📦</span><span class="art-tx"><b>T</b><small>'+k+' · chat · now</small></span></button>').join('');});
 await page.waitForFunction(()=>document.querySelectorAll('#artList .art-ic.vb-ai').length>=9);
 const types=await page.evaluate(()=>[...document.querySelectorAll('#artList .art-row')].map(r=>({k:r.querySelector('small').textContent.split(' · ')[0],t:r.querySelector('.art-ic').dataset.vt||'',svg:!!r.querySelector('.art-ic svg'),col:getComputedStyle(r.querySelector('.art-ic')).color})));
 check('PDF, Doc/Markdown, SVG, Image, HTML, Code, JSON/CSV map to the right type',['pdf','doc','doc','svg','image','html','code','data','data'].every((t,i)=>types[i].t===t&&types[i].svg));
 check('unknown artifact type keeps its original tile',types[9].t===''&&!types[9].svg);
 check('PDF and Doc tiles have different colours',types[0].col!==types[1].col);
 // 3 thinking animation
 await page.evaluate(()=>document.getElementById('log').insertAdjacentHTML('beforeend','<div class="msg a typing" id="vbTyp"><i></i><i></i><i></i></div>'));
 check('typing indicator uses the ember-flicker animation',await page.evaluate(()=>{const i=document.querySelectorAll('#vbTyp i');return i.length===3&&[...i].every(x=>getComputedStyle(x).animationName==='vb-flick');}));
 await page.emulateMedia({reducedMotion:'reduce'});
 check('reduced-motion turns the flicker and spark animations off',await page.evaluate(()=>getComputedStyle(document.querySelector('#vbTyp i')).animationName==='none'&&getComputedStyle(document.querySelector('.vb-sp')).animationName==='none'));
 await page.emulateMedia({reducedMotion:'no-preference'});
 // 5 blue toggles
 const blue=await page.evaluate(()=>{const isBlue=c=>{const m=c.match(/\d+/g).map(Number);return m[2]>m[0]+60;};const res={};
  const perm=document.querySelector('#cockpit_permissions .sw');if(perm){perm.classList.add('on');const bi=getComputedStyle(perm).backgroundImage,nums=(bi.match(/rgb\((\d+), (\d+), (\d+)\)/g)||[]).map(x=>x.match(/\d+/g).map(Number));res.perm=nums.length>0&&nums.every(m=>m[2]>m[0]+60);}else res.perm=null;
  document.body.classList.add('cockpit-ui');const ef=document.querySelector('.ef-switch');if(ef){ef.classList.add('on');res.ef=isBlue(getComputedStyle(ef).backgroundColor);}else res.ef=null;
  const k=document.createElement('button');k.className='ekl-switch on';document.body.appendChild(k);res.ekl=isBlue(getComputedStyle(k).backgroundColor);return res;});
 check('Permissions switch is blue when on',blue.perm===true);
 check('cockpit feature switch is blue when on',blue.ef===true);
 check('keyless switch is blue when on',blue.ekl===true);
 // removed providers + untouched areas
 const src=['providers.js','ember_keys.js','ember_prov_ui.js','index.html'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
 check('Together AI and Fireworks are not offered as providers',!/CFG\s*=.*(together|fireworks)/i.test(src)&&await page.evaluate(()=>!(Prov.IDS||[]).concat(Prov.ACTIVE_IDS||[]).some(i=>/together|fireworks/i.test(i))));
 check('visuals add no runtime errors',errors.length===0);
 await page.screenshot({path:path.join(out,'visuals-mobile.png')});
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({count:results.length,results},null,1));console.log(results.length+' checks passed');
}finally{await browser.close();server.close();}
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
