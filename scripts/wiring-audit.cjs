/* AST-backed inventory and static application asset closure. No execution of application code. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),acorn=require('acorn'),walk=require('acorn-walk');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
function files(dir){return fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).flatMap(e=>e.name==='node_modules'||e.name==='.git'?[]:e.isDirectory()?files(path.posix.join(dir,e.name)):[path.posix.join(dir,e.name)]);}
const html=()=>read('www/index.html');
function assetManifest(){
 const h=html(),direct=[...h.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1].split('?')[0]).filter(x=>!/^https?:|^data:|^#/.test(x));
 const lazy=['vendor/pdfmake-0.2.20.min.js','vendor/pdfmake-0.2.20-fonts.js','vendor/docx-9.5.1.iife.js','vendor/libsodium-0.7.15.js','vendor/libsodium-wrappers-0.7.15.js','repo-runner-template.cjs','keyless-health.json'];
 const resources=['./','index.html',...[...h.matchAll(/<(?:img|source)\b[^>]*src=["']([^"']+)["']/g)].map(m=>m[1]),'icon-192.png','icon-512.png',...files('www/provider-icons').filter(f=>!f.endsWith('.txt')).map(f=>f.slice(4))];
 for(const css of direct.filter(x=>x.endsWith('.css'))){for(const m of read('www/'+css).matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g))if(!/^(?:https?:|data:|#)/.test(m[1]))resources.push(path.posix.normalize(path.posix.join(path.posix.dirname(css),m[1])));}
 return {direct:[...new Set(direct)],lazy,resources:[...new Set(resources)],files:[...new Set([...resources,...direct,...lazy])].sort()};
}
const pos=(node,file)=>({file,line:node.loc.start.line});
function analyze(){
 const assets=assetManifest(),events=[],apis=[],storage=[],dynamic=[],rows=[],references=[];
 const sources=files('www').filter(f=>/\.(?:js|cjs)$/.test(f)&&!f.startsWith('www/vendor/'));
 sources.push('www/index.html');
 const literal=(n,consts)=>{if(!n)return undefined;if(n.type==='Literal')return n.value;if(n.type==='Identifier')return consts.get(n.name);if(n.type==='TemplateLiteral'&&!n.expressions.length)return n.quasis[0].value.cooked;if(n.type==='BinaryExpression'&&n.operator==='+'){const a=literal(n.left,consts),b=literal(n.right,consts);if(typeof a==='string'&&typeof b==='string')return a+b;}return undefined;};
 const name=n=>n?.type==='Identifier'?n.name:n?.type==='ThisExpression'?'this':n?.type==='MemberExpression'?(name(n.object)+'.'+(n.computed?(n.property.value??'[]'):n.property.name)):n?.type==='ChainExpression'?name(n.expression):'';
 for(const file of sources){
  const text=read(file),chunks=file.endsWith('.html')?[...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].filter(m=>m[1].trim()).map(m=>({text:m[1],offset:text.slice(0,m.index+ m[0].indexOf('>')+1).split('\n').length-1})):[{text,offset:0}];
  const row={file,bytes:Buffer.byteLength(text),loaded:assets.direct.includes(file.slice(4)),cached:assets.files.includes(file.slice(4)),purpose:text.split('\n').slice(0,4).join(' ').replace(/\s+/g,' ').slice(0,240),exports:[],dispatches:[],listens:[],storage:[],dependencies:[]};rows.push(row);
  for(const chunk of chunks){let ast;try{ast=acorn.parse(chunk.text,{ecmaVersion:'latest',sourceType:'script',locations:true,allowReturnOutsideFunction:true});}catch(e){row.parseError=e.message;continue;}
   const consts=new Map();walk.simple(ast,{VariableDeclarator(n){const v=literal(n.init,consts);if(n.id.type==='Identifier'&&v!==undefined)consts.set(n.id.name,v);}});
   const location=n=>({...pos(n,file),line:n.loc.start.line+chunk.offset});
   const event=(n,kind,arg,target)=>{const v=literal(arg,consts);if(typeof v==='string'&&v.startsWith('ember-')){const e={...location(n),name:v,kind,target:target||'helper'};events.push(e);row[kind==='listen'?'listens':'dispatches'].push(v);}else if(v===undefined)dynamic.push({...location(n),kind:'event',expression:chunk.text.slice(n.start,n.end).slice(0,220)});};
   walk.simple(ast,{
    AssignmentExpression(n){const full=name(n.left);if(/^(?:window|W|win|globalThis)\./.test(full)){const canonical=full.replace(/^[^.]+/,'window'),api=canonical.split('.')[1];apis.push({...location(n),name:canonical,root:api,kind:n.right.type,operator:n.operator});row.exports.push(canonical);}},
    NewExpression(n){if(['CustomEvent','Event'].includes(name(n.callee)))event(n,'dispatch',n.arguments[0],'see dispatch target');},
    CallExpression(n){const full=name(n.callee),short=full.split('.').at(-1),a=n.arguments;
     if(short==='addEventListener')event(n,'listen',a[0],full.slice(0,-17));
     if(['emit','emitEv','fire','ev'].includes(full))event(n,'dispatch',a[0]);
     if(full==='on'&&a.length>=3)event(n,'listen',a[1],name(a[0]));
     if(['getItem','setItem','removeItem','getKV','setKV','delKV','get','set','del','open','createObjectStore','transaction'].includes(short)&&/(?:localStorage|indexedDB|\bLS\.|\bls\.|Store\.|\bdb\.|\bd\.)/.test(full)){
      const v=literal(a[0],consts);const key=typeof v==='string'?v:chunk.text.slice(a[0]?.start||n.start,a[0]?.end||n.end).slice(0,100);storage.push({...location(n),key,operation:short,dynamic:typeof v!=='string',adapter:full});row.storage.push(key);
     }
    },
    MemberExpression(n){const full=name(n);if(/^(?:window|W|win|globalThis)\./.test(full)){const api=full.split('.')[1];references.push({...location(n),name:api});row.dependencies.push(api);}}
   });
  }
  for(const k of ['exports','dispatches','listens','storage','dependencies'])row[k]=[...new Set(row[k])];
 }
 // Names used inside native WebView JavaScript are real emitters, not missing web modules.
 for(const f of files('android_patch').filter(x=>x.endsWith('.kt'))){const s=read(f);for(const m of s.matchAll(/new (?:CustomEvent|Event)\(['"](ember-[^'"]+)['"]/g))events.push({file:f,line:s.slice(0,m.index).split('\n').length,name:m[1],kind:'dispatch',target:'native window'});}
 return {schema:1,version:JSON.parse(read('package.json')).version,assets,files:rows,events,apis,storage,references,dynamic};
}
function write(){const a=analyze();fs.writeFileSync(path.join(ROOT,'docs/WIRING_AUDIT.json'),JSON.stringify(a,null,2)+'\n');fs.writeFileSync(path.join(ROOT,'docs/ASSET_MANIFEST.json'),JSON.stringify(a.assets,null,2)+'\n');console.log('Inventoried '+a.files.length+' source files; '+a.events.length+' event sites; '+a.storage.length+' storage sites.');return a;}
if(require.main===module){if(process.argv.includes('--write'))write();else console.log(JSON.stringify(analyze(),null,2));}
module.exports={ROOT,read,files,assetManifest,analyze,write};
