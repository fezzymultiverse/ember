'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {ROOT,analyze,files}=require('../scripts/wiring-audit.cjs');
const a=analyze(),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');let passed=0;
const check=(n,fn)=>{try{fn();passed++;console.log('PASS '+n);}catch(e){console.error('FAIL '+n);throw e;}};
check('every application source parses',()=>assert.deepEqual(a.files.filter(f=>f.parseError),[]));
check('every web script is direct, lazily loaded or the service worker',()=>{
 const allowed=new Set([...a.assets.direct,...a.assets.lazy,'sw.js']);
 assert.deepEqual(files('www').filter(f=>/\.(?:js|cjs)$/.test(f)&&!allowed.has(f.slice(4))),[]);
});
check('every statically named emitted application event has a listener',()=>{
 const heard=new Set(a.events.filter(e=>e.kind==='listen').map(e=>e.name));
 assert.deepEqual([...new Set(a.events.filter(e=>e.kind==='dispatch'&&!heard.has(e.name)).map(e=>e.name))],[]);
});
check('no public object API has two owning root definitions',()=>{
 const objects=a.apis.filter(x=>/^window\.[^.]+$/.test(x.name)&&(['ObjectExpression','NewExpression','FunctionExpression','ArrowFunctionExpression','CallExpression'].includes(x.kind)||/^window\.(?:Ember|Prov$|Store$|Persona$|Safety$|U$)/.test(x.name)));
 const seen=new Map();for(const o of objects){assert(!seen.has(o.name),o.name+' defined at '+seen.get(o.name)+' and '+o.file+':'+o.line);seen.set(o.name,o.file+':'+o.line);}
});
check('service worker exact asset closure and requested cache name',()=>{
 const src=read('www/sw.js'),end=src.indexOf("self.addEventListener('install'");const values=vm.runInNewContext(src.slice(0,end)+';({V,FILES})');
 assert.equal(values.V,'ember-v1.10.17-wired');assert.deepEqual(Array.from(values.FILES).sort(),a.assets.files);assert.equal(new Set(values.FILES).size,values.FILES.length);
 for(const f of values.FILES)assert(fs.existsSync(path.join(ROOT,'www',f)),f+' missing');
});
check('protected backends match original supplied V1.10.16 hashes',()=>{
 for(const [file,hash] of Object.entries(require('./wired-protected-hashes.json')))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'www',file))).digest('hex'),hash,file);
});
check('all retired files have destinations, reasons and replacements',()=>{
 const moves=JSON.parse(read('docs/FILE_MOVES.json'));for(const [from,m] of Object.entries(moves)){assert(!fs.existsSync(path.join(ROOT,from)),from+' should be moved');assert(fs.existsSync(path.join(ROOT,m.destination)),m.destination);assert(m.reason&&m.replacement);}
});
check('retired Settings controllers cannot be reloaded by page or cache',()=>{
 for(const n of ['ember_acc.js','ember_cc_widget.js','ember_hub.js','ember_menu.js','ember_v108.js','ember_v96_ui.js']){assert(fs.existsSync(path.join(ROOT,'archive/www',n)));assert(!a.assets.files.includes(n));assert(!read('www/index.html').includes('src="'+n));}
});
check('no removed-service SDK or auth integration in the active web app',()=>{
 for(const f of files('www').filter(f=>/\.(js|html)$/.test(f)&&!f.includes('/vendor/')))assert(!/(?:js\.puter\.com|(?:window|W)\.puter\b|puter\.(?:auth|ai|fs)\b)/i.test(read(f)),f);
});
check('Android registration covers every supplied custom plugin',()=>{
 const main=read('android_patch/app/src/main/java/com/fezzy/ember/MainActivity.kt');for(const f of files('android_patch').filter(f=>/Plugin\.kt$/.test(f))){assert(main.includes('registerPlugin('+path.basename(f,'.kt')+'::class.java)'),f);const text=read(f),m=text.match(/@CapacitorPlugin\([\s\S]*?name\s*=\s*"([^"]+)"/);assert(m,f);assert(a.files.some(r=>read(r.file).includes(m[1])),m[1]+' has no JS caller');}
});
check('manifest additions agree with patcher permission names',()=>{
 const additions=read('android_patch/AndroidManifest.additions.xml'),script=read('scripts/apply_android_patch.py');const p=s=>[...new Set(s.match(/android\.permission\.[A-Z_]+/g)||[])].sort();assert.deepEqual(p(additions),p(script));
});
check('safety and persona still loaded before app and keyless adapters',()=>{const h=read('www/index.html');for(const f of ['safety.js','persona.js'])assert(h.indexOf('src="'+f)<h.indexOf('src="app.js'));assert(h.indexOf('src="ember_wiring.js')>h.indexOf('src="ember_keyless.js'));});
console.log('\n'+passed+' wiring checks passed. Dynamic event names and browser-only behavior are covered separately and explicitly listed in WIRING_MAP.');
