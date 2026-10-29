/* Run every top-level test, never short circuit or silently turn skips into passes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tests/results/wired/suite');fs.mkdirSync(out,{recursive:true});
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>/-test\.(?:js|cjs)$/.test(f)).sort();
const summary=[];
function execute(file){return new Promise(resolve=>{
 const start=Date.now(),p=spawn(process.execPath,['--require',path.join(__dirname,'test-preload.cjs'),'tests/'+file],{cwd:root,detached:true,env:{...process.env,PW:require.resolve('playwright')}});
 const log=fs.createWriteStream(path.join(out,file+'.log'));let text='',timedOut=false;
 // Historical tests expecting removed UI fail promptly; comprehensive current-release browser tests get longer budgets.
 const timeout=file==='keyless-browser-test.cjs'?180000:/^(?:wired-browser|cockpit-browser|term)-test/.test(file)?90000:Number(process.env.EMBER_TEST_TIMEOUT_MS)||45000;
 const timer=setTimeout(()=>{timedOut=true;try{process.kill(-p.pid,'SIGKILL');}catch{}},timeout);
 for(const stream of [p.stdout,p.stderr])stream.on('data',d=>{text+=d;log.write(d);});
 p.on('error',e=>{text+='\n'+e.message;});
 p.on('close',(code,signal)=>{
  clearTimeout(timer);log.end();
  // Some old tests print FAIL but incorrectly leave exitCode zero. Never hide those failures.
  const failures=text.match(/^FAIL(?:\s|:).*$/gm)||[],skips=text.match(/^.*\bSKIP(?:\s|:).*$/gmi)||[];
  const status=timedOut?'TIMEOUT':code!==0||failures.length?'FAIL':skips.length?'SKIP':'PASS';
  summary.push({test:file,status,exit:code,signal,timedOut,durationMs:Date.now()-start,failures,skips});
  console.log(status+' '+file+' ('+(Date.now()-start)+' ms)');
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({version:require('../package.json').version,total:tests.length,completed:summary.length,results:summary},null,2)+'\n');
  // Kill leftover server children even when a historical harness forgot cleanup.
  try{process.kill(-p.pid,'SIGTERM');}catch{}resolve();
 });
});}
(async()=>{
 // Most historical browser harnesses use fixed ports, so serialize browser tests; unit tests are cheap.
 for(const file of tests)await execute(file);
 const counts=summary.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});console.log(JSON.stringify(counts));
 process.exitCode=summary.some(r=>r.status!=='PASS')?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
