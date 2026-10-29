/* Prove the four requested wiring gates reject mutations, restoring all files in finally blocks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tests/results/wired');fs.mkdirSync(out,{recursive:true});
const run=()=>spawnSync(process.execPath,['tests/wiring-test.cjs'],{cwd:root,encoding:'utf8',timeout:20000});
const base=run();assert.equal(base.status,0,base.stdout+base.stderr);const results=[];
function mutation(name,file,change,expected){
 const p=path.join(root,file),exists=fs.existsSync(p),original=exists?fs.readFileSync(p):null;
 try{
  fs.writeFileSync(p,change(original?.toString()||''));
  const r=run();const text=r.stdout+r.stderr;
  assert.notEqual(r.status,0,name+' falsely passed');assert(text.includes(expected),name+' failed for an unrelated reason: '+text);
  results.push({name,rejected:true,exit:r.status,expectedFailure:expected});
 }finally{if(exists)fs.writeFileSync(p,original);else fs.unlinkSync(p);}
}
mutation('unloaded web script','www/ember_unwired_probe.js',()=>"'use strict';\n",'every web script');
mutation('emitted event without consumer','www/ember_wiring.js',s=>s+"\nwindow.dispatchEvent(new CustomEvent('ember-unwired-probe'));\n",'emitted application event');
mutation('duplicate public root API','www/ember_wiring.js',s=>s+'\nwindow.EmberWiring = {};\n','no public object API');
mutation('precache/page mismatch','www/sw.js',s=>s.replace('FILES = [','FILES = ["missing-probe.js",'),'service worker exact asset closure');
const after=run();assert.equal(after.status,0,after.stdout+after.stderr);fs.writeFileSync(path.join(out,'mutation-proof.json'),JSON.stringify({results,restoredBaselinePass:true},null,2)+'\n');console.log('PASS all four requested wiring failure gates rejected controlled mutations; restored baseline passes.');
