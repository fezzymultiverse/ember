/* Current queue runtime fixtures adapted from cockpit-browser-test. Old hash/version/footer assertions are not applicable; original test is preserved. */
/* Run: npm run test:cockpit (requires Playwright Chromium: npx playwright install chromium).
   Browser integration tests use deterministic GitHub fixtures. No real repository writes. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const root=path.join(__dirname,'..'), out=path.join(__dirname,'panel-wired-results/command-queue');
fs.mkdirSync(out,{recursive:true});
let passed=0;const checks=[];
function check(name,condition){assert.ok(condition,name);passed++;checks.push(name);console.log('PASS '+name);}
const server=spawn(process.execPath,['serve.js','8125'],{cwd:root,stdio:'ignore'});
let browser;
(async()=>{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await ctx.newPage(), errors=[],requests=[];
  let accept=true,sshLinked=true,searchFails=false;
  const ssh='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIE1vY2tQdWJsaWNLZXlGb3JUZXN0c09ubHkxMjM0';
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>accept?d.accept():d.dismiss());
  await ctx.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.hostname==='127.0.0.1')return route.continue();
    if(u.hostname==='api.github.com'){
      requests.push({path:u.pathname,method:req.method()});
      if(req.method()!=='GET')return route.fulfill({status:500,body:JSON.stringify({message:'Unexpected write in UI test'})});
      if(u.pathname==='/user')return route.fulfill({json:{login:'cockpit-tester'}});
      if(u.pathname==='/users/cockpit-tester/keys')return route.fulfill({json:sshLinked?[{id:11,key:ssh}]:[]});
      if(u.pathname==='/search/repositories')return route.fulfill(searchFails?{status:403,json:{message:'Fixture rate limit'}}:{json:{total_count:2,items:[{full_name:'sample/cockpit-addon',description:'Fixture repo',html_url:'https://github.com/sample/cockpit-addon',license:{spdx_id:'MIT'}},{full_name:'sample/second',description:'Second fixture',html_url:'https://github.com/sample/second'}]}});
      if(u.pathname==='/user/repos')return route.fulfill({json:[]});
      return route.fulfill({json:{default_branch:'main',permissions:{push:true},workflow_runs:[]}});
    }
    return route.abort();
  });
  await page.addInitScript(()=>{
    // Seed health fixtures only once. These are dummy non-functional credentials.
    if(!localStorage.getItem('cockpit_test_seed')){
      localStorage.setItem('ember_keys',JSON.stringify({groq:[{key:'gsk_'+ 'a'.repeat(30),st:{ok:true,ms:50,model:'fixture-model'}},{key:'gsk_'+ 'b'.repeat(30)}],gemini:[{key:'AIza'+ 'c'.repeat(35),st:{ok:false,msg:'fixture rejected'}}]}));
      localStorage.setItem('cockpit_test_seed','1');
    }
  });
  await new Promise(r=>setTimeout(r,250));
  await page.goto('http://127.0.0.1:8125');
  await page.waitForFunction(()=>!!window.EmberCockpit && !!window.EmberWorkspace);
  page.setDefaultTimeout(6000);
  await page.evaluate(()=>EmberWorkspace.open('connect'));await page.waitForTimeout(350);
  check('Command Centre has exactly three workflow tabs',await page.locator('#eccGitHub [role="tab"]').count()===3);
  check('Files tab and all Files UI logic removed',await page.locator('#eccGTab_files,#ghFilePath,#ghFileList,#ghQuery').count()===0);
  for(const name of ['connect','repos','build']){
    await page.locator('#eccGTab_'+name).click();
    check('Command Centre '+name+' tab switches correctly',await page.locator('#eccGitHub').getAttribute('data-gtab')===name&&await page.locator('#eccGTab_'+name).getAttribute('aria-selected')==='true');
  }
  await page.locator('#eccGTab_connect').focus();await page.keyboard.press('ArrowRight');
  check('Command tabs support keyboard navigation',await page.locator('#eccGitHub').getAttribute('data-gtab')==='repos');
  await page.locator('#eccGTab_connect').click();await page.locator('#ghBrainRepo').fill('sample/brain');await page.locator('[data-gh-action="save-repo"]').click();
  check('Apply Brain uses existing handler',await page.evaluate(()=>EmberGithub.knowledgeRepo()==='sample/brain'));
  await page.locator('#ghTok').fill('ghp_'+'z'.repeat(40));await page.locator('[data-gh-action="save-token"]').click();
  check('existing token save works after Files removal',await page.evaluate(()=>EmberGithub.on()));
  await page.locator('#eccGTab_repos').click();await page.locator('#rrSearch').fill('cockpit');await page.locator('[data-rr="search"]').click();
  await page.waitForSelector('#rrResults [data-rr-add]');
  check('repo search automatically opens live terminal dropdown',await page.locator('#cockpitRepoTerminal').evaluate(x=>x.open));
  check('live terminal contains actual results and status',await page.locator('#cockpitRepoTerminal #rrResults').innerText().then(x=>x.includes('sample/cockpit-addon'))&&await page.locator('#cockpitSearchLog').innerText().then(x=>x.includes('repos in Repo Console')));
  await page.locator('#rrResults [data-rr-add]').first().click();
  check('Apply alone does not stage or enqueue',await page.evaluate(()=>EmberCockpitQueue.snapshot().length===0&&EmberRepoRunner.config().sources.length===1));
  await page.locator('[data-pending="sample/cockpit-addon"]').check();
  accept=false;await page.locator('#cockpitConfirmQueue').click();
  check('queue confirmation cancel is non-mutating',await page.evaluate(()=>EmberCockpitQueue.snapshot().length===0&&EmberRepoRunner.config().sources.length===1));
  accept=true;await page.locator('#cockpitConfirmQueue').click();
  check('confirmed selection waits in persistent queue',await page.evaluate(()=>EmberCockpitQueue.snapshot().length===1&&EmberCockpitQueue.snapshot()[0].state==='waiting'&&EmberRepoRunner.config().sources.length===1));
  check('queue flow made no GitHub writes',requests.every(x=>x.method==='GET'));
  await page.screenshot({path:path.join(out,'search-queue-412x915.png')});
  await page.locator('#eccGTab_build').click();await page.locator('#rrTarget').fill('sample/output');
  await page.evaluate(()=>{window.__installs=0;window.__originalInstall=EmberRepoRunner.install;EmberRepoRunner.install=async()=>{window.__installs++;return{ok:true,dispatched:true,url:'https://github.com/sample/output/actions'};};});
  await page.locator('#cockpitRunPush').click();
  check('Run blocked without linked public SSH key',await page.evaluate(()=>window.__installs===0)&&await page.locator('#rrStatus').innerText().then(x=>x.includes('public key')));
  await page.locator('#cockpitSshPublic').fill('-----BEGIN OPENSSH PRIVATE KEY-----');await page.locator('#cockpitVerifySsh').click();
  check('private SSH keys explicitly rejected',await page.locator('#cockpitSshStatus').innerText().then(x=>x.includes('Private keys are not accepted')));
  await page.locator('#cockpitSshPublic').fill(ssh);sshLinked=false;await page.locator('#cockpitRunPush').click();
  await page.waitForFunction(()=>document.getElementById('rrStatus').textContent.includes('not found'));
  check('unlinked SSH key cannot run',await page.evaluate(()=>window.__installs===0));
  sshLinked=true;accept=false;await page.locator('#cockpitRunPush').click();await page.waitForFunction(()=>!document.getElementById('cockpitRunPush').disabled);
  check('cancelled Run does not change configured sources',await page.evaluate(()=>window.__installs===0&&EmberRepoRunner.config().sources.length===1));
  accept=true;await page.locator('#cockpitRunPush').click();await page.waitForFunction(()=>window.__installs===1);
  await page.waitForFunction(()=>!document.getElementById('cockpitRunPush').disabled);
  check('confirmed Run stages chosen source using existing runner API',await page.evaluate(()=>EmberRepoRunner.config().sources.some(x=>x.repo==='sample/cockpit-addon')));
  check('dispatch labelled honestly, not claimed complete',await page.locator('#rrStatus').innerText().then(x=>x.includes('Workflow dispatched')&&x.includes('actual completion')));
  check('SSH public key is never stored',await page.evaluate(key=>!Object.keys(localStorage).some(k=>localStorage.getItem(k).includes(key)),ssh));
  await page.screenshot({path:path.join(out,'run-push-412x915.png')});
  await page.locator('[data-queue="sample/cockpit-addon"]').uncheck();await page.locator('#cockpitRunPush').click();
  check('unchecked queue cannot dispatch',await page.evaluate(()=>window.__installs===1));
  // Failed installation leaves queued work for retry, not a false success.
  await page.locator('[data-queue="sample/cockpit-addon"]').check();
  await page.evaluate(()=>EmberRepoRunner.install=async()=>{throw new Error('Fixture install failure');});
  await page.locator('#cockpitRunPush').click();await page.waitForFunction(()=>document.getElementById('rrStatus').textContent.includes('Fixture install failure'));
  check('failed Run leaves retryable queue',await page.evaluate(()=>EmberCockpitQueue.snapshot()[0].state==='waiting · review failure'));
  await page.reload();await page.waitForFunction(()=>window.EmberCockpitQueue);
  check('queue survives reload without automatic execution',await page.evaluate(()=>EmberCockpitQueue.snapshot().length===1&&EmberCockpitQueue.snapshot()[0].state==='waiting'));
  await page.evaluate(()=>EmberWorkspace.open('repos'));await page.waitForTimeout(350);searchFails=true;
  await page.locator('#rrSearch').fill('rate-limited');await page.locator('[data-rr="search"]').click();
  await page.waitForFunction(()=>document.getElementById('rrStatus').textContent.includes('Fixture rate limit'));
  check('search errors surfaced in live terminal',await page.locator('#cockpitSearchLog').innerText().then(x=>x.includes('Fixture rate limit')));
  await page.locator('#eccClose').click();
  await page.setViewportSize({width:1280,height:900});await page.click('#bActionMenu');await page.click('.erp-group-head >> nth=6');await page.click('[data-name="App settings"]');
  check('Settings remains full-screen on desktop',await page.locator('#settings').boundingBox().then(x=>x.width===1280&&x.height===900));
  await page.locator('#bSx').click();await page.evaluate(()=>EmberWorkspace.open('build'));await page.waitForTimeout(350);
  check('Command Centre remains unified on desktop',await page.locator('#emberCommandCenter').boundingBox().then(x=>x.width===1280));
  check('desktop full-screen Command Centre is modal',await page.locator('#emberCommandCenter').getAttribute('role')==='dialog'&&await page.locator('#app').evaluate(x=>x.inert));
  check('no JavaScript page errors',errors.length===0);
  const result={status:'passed',viewport:'412x915',additionalViewport:'1280x900',passed,checks,errors,githubWrites:requests.filter(x=>x.method!=='GET'),notes:'GitHub HTTP responses are fixtures; runner dispatch is stubbed. No real credentials, SSH sessions, repository writes or cloud builds were used.'};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');
  console.log('\n'+passed+' cockpit assertions passed. Screenshots and report: tests/cockpit-results');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.kill();});
