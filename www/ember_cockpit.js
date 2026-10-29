/* Ember 1.10.14 — UI-only Cockpit. Existing routes and provider APIs remain authoritative. */
'use strict';
(() => {
  const W = window, D = document, $ = id => D.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch (_) { return fallback; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
  function init() {
    const settings = $('settings'), sb = settings?.querySelector('.sb'), R = W.EmberRepoRunner, G = W.EmberGithub;
    if (!sb || !R || !G) return;
    D.body.classList.add('cockpit-ui');
    // A full-screen cockpit is modal even on desktop; never leave the covered chat interactive.
    if (W.EmberPanelLayout) W.EmberPanelLayout.canDock = () => false;
    const titleOf = c => c.querySelector(':scope > .ct')?.textContent.trim() || '';
    const cards = Array.from(settings.querySelectorAll('.card[data-tab]'));
    const root = D.createElement('div'); root.id = 'cockpitSettings';
    const sections = {};
    const groups = [
      ['engine','Engine & Media Control','Pictures, PDFs, engine selection, key detection and notepad'],
      ['providers','Providers','Engine keys, live model catalogs, rotation and fallback'],
      ['features','Features','Free Mode and optional capabilities'],
      ['general','Memory and Settings','Personal details, persona, memory, appearance and Voice'],
      ['device','Device Tools','Device information and local diagnostics'],
      ['scraping','Web Scraping','Paste keys, reader, provider health and tests in one panel'],
      ['hacking','Hacking','Termux and YouTube / yt-dlp'],
      ['music','Music & Tools','Player, song identification, documents, agent APIs and system integration'],
      ['permissions','Permissions','Microphone, notifications, storage and background permissions']
    ];
    root.innerHTML = '<div class="cockpit-intro"><span class="cockpit-kicker">V1.10.15 / COCKPIT</span><p>One screen. Every control.</p><button type="button" class="btn g" id="cockpitCommand">Open Command Centre →</button></div>';
    groups.forEach(([id,title,desc]) => {
      const s = D.createElement('section'); s.id = 'cockpit_' + id; s.className = 'cockpit-section'; s.setAttribute('aria-labelledby', s.id + '_title');
      s.innerHTML = '<h2 id="' + s.id + '_title">' + title + '</h2><p class="cockpit-desc">' + desc + '</p>';
      sections[id] = s; root.append(s);
    });
    sb.prepend(root);
    cards.forEach(c => {
      const t = titleOf(c), tab = c.dataset.tab;
      let dest = tab;
      if (tab === 'keys') dest = 'engine';
      else if (tab === 'features') dest = 'providers';
      else if (/^Free Mode/i.test(t)) { dest = 'features'; c.querySelector('.ct').textContent = 'Free Mode · Features'; }
      else if (c.id === 'devToolsCard') dest = 'device';
      else if (/^Voice$/i.test(t)) dest = 'general';
      else if (/^System integrations/i.test(t)) dest = 'music';
      c.classList.remove('collapsed','mnu-open'); c.removeAttribute('hidden'); (sections[dest] || sections.general).append(c);
    });
    // Merge related controls without cloning nodes or losing their event listeners.
    function merge(group, predicate, title, id) {
      const matched = Array.from(group.querySelectorAll(':scope > .card')).filter(predicate);
      if (!matched.length) return null;
      const target = D.createElement('div'); target.className = 'card cockpit-merged'; if (id) target.id = id;
      target.innerHTML = '<div class="ct">' + title + '</div>';
      group.insertBefore(target, matched[0]);
      matched.forEach(c => {
        const h = c.querySelector(':scope > .ct'); if (h) { h.className = 'cockpit-subtitle'; h.setAttribute('role','heading'); h.setAttribute('aria-level','3'); }
        c.classList.remove('card'); c.classList.add('cockpit-control-group'); delete c.dataset.tab;
        target.append(c);
      });
      return target;
    }
    merge(sections.scraping, () => true, 'Reader, keys & checks', 'cockpitScrapingPanel');
    merge(sections.music, () => true, 'Music & Tools', 'cockpitMusicPanel');
    merge(sections.hacking, c => /termux/i.test(titleOf(c)), 'Termux', 'cockpitTermuxPanel');
    if ($('etPanel') && $('cockpitTermuxPanel')) {
      $('cockpitTermuxPanel').append($('etPanel'));
      // Inline terminal does not cover settings or require a second Termux page.
      $('etExp').hidden = true; $('etMin').hidden = true;
    }
    // One provider list accordion, with independent provider accordions inside it.
    const keyCard = $('kList')?.closest('.card');
    if (keyCard) {
      const fold = D.createElement('details'); fold.id = 'cockpitProviderList'; fold.className = 'cockpit-provider-list';
      fold.innerHTML = '<summary>Provider list · engine keys</summary>';
      keyCard.querySelector(':scope > .ct')?.remove();
      while (keyCard.firstChild) fold.append(keyCard.firstChild);
      keyCard.append(fold);
    }
    // Actual media controls live inline, including their original delegated handler root.
    const mediaCard = $('bMediaEng')?.closest('.card'), mediaSheet = $('xengines');
    if (mediaCard && mediaSheet) {
      W.EmberEngines.open(); W.EmberEngines.close();
      mediaSheet.classList.add('cockpit-inline-media'); mediaSheet.querySelector('.sh')?.remove();
      mediaSheet.removeAttribute('role'); mediaSheet.removeAttribute('aria-modal');
      mediaCard.append(mediaSheet); $('bMediaEng').remove();
      W.EmberEngines.open = () => openSettings('engine', mediaCard);
      W.EmberEngines.close = () => {};
    }
    // Downloads retain original on-click handlers; move the entire tail into Hacking.
    const routing = $('efRouting'), content = routing?.querySelector('.ef-content');
    if (content) {
      const start = Array.from(content.children).find(x => x.tagName === 'H3' && /playlist downloads/i.test(x.textContent));
      if (start) {
        const dl = D.createElement('div'); dl.id = 'cockpitYouTube'; dl.className = 'card';
        dl.innerHTML = '<div class="ct">YouTube / yt-dlp</div>';
        let n = start; while (n) { const next = n.nextSibling; dl.append(n); n = next; }
        sections.hacking.append(dl);
      }
      const yt = $('swYoutube')?.closest('.cr');
      if (yt && $('cockpitYouTube')) { const hint = yt.nextElementSibling; $('cockpitYouTube').append(yt); if (hint?.classList.contains('hint')) $('cockpitYouTube').append(hint); }
      routing.querySelector(':scope > .ct').textContent = 'Providers · routing policy';
      const guide = D.createElement('p'); guide.className = 'hint';
      guide.textContent = 'All bundled providers remain available in Engine & Media Control. Load a pinned engine’s live models to see your account’s catalog; OpenRouter :free models are labelled free. Multiple keys rotate, with key/model cooldowns and provider fallback unchanged. Claude is paid and pin-only; Stability is media-only. Free tiers and availability are determined by each provider, not guaranteed by Ember.';
      routing.querySelector(':scope > .ct').after(guide);
    }
    // Scraping health/test are adjacent controls, not another nested menu.
    sections.scraping.querySelector('.wtabs')?.remove();
    sections.scraping.querySelectorAll('.wpane').forEach(p => { p.classList.remove('hidden'); p.classList.add('cockpit-scrape-pane'); });
    // Only provider accordions collapse; all other Settings content is always exposed.
    settings.querySelectorAll('details:not(#cockpitProviderList):not(.cockpit-provider)').forEach(f => {
      f.open = true; f.classList.add('cockpit-flat-detail');
      const sum = f.querySelector(':scope > summary');
      if (sum) { sum.setAttribute('role','heading'); sum.setAttribute('aria-level','3'); sum.tabIndex = -1; sum.addEventListener('click', e => e.preventDefault()); }
    });
    if ($('accWrap')) $('accWrap').hidden = true; $('stabs').hidden = true;
    // Retire the duplicate command widget, keeping its live observer targets detached and safe.
    if ($('ccWidget')) $('ccWidget').hidden = true;
    const heading = settings.querySelector('.sh-t');
    if (heading) { heading.querySelector('b').textContent = 'Settings'; heading.querySelector('small').textContent = 'The Cockpit Update'; }
    settings.setAttribute('role','dialog'); settings.setAttribute('aria-modal','true'); settings.setAttribute('aria-label','Settings');
    let lastFocus;
    const originalOpen = $('bSet').onclick, originalClose = $('bSx').onclick;
    const map = { keys:'engine', features:'providers', general:'general', scraping:'scraping', hacking:'hacking', music:'music', permissions:'permissions' };
    function openSettings(section, target) {
      W.EmberCommandCenter.close();
      lastFocus = D.activeElement;
      originalOpen('general'); $('setTitle').textContent = 'Settings';
      D.body.classList.add('cockpit-settings-open'); $('app').inert = true;
      requestAnimationFrame(() => {
        if (section || target) (target || sections[map[section] || section])?.scrollIntoView({block:'start'});
        else sb.scrollTop = 0;
        $('bSx').focus({preventScroll:true});
      });
    }
    function closeSettings() {
      originalClose(); D.body.classList.remove('cockpit-settings-open'); $('app').inert = false;
      if (lastFocus?.isConnected && !$('emberCommandCenter').classList.contains('ecc-open')) lastFocus.focus({preventScroll:true});
    }
    $('bSet').onclick = () => openSettings(); $('bSx').onclick = closeSettings;
    W.EmberHub = {open:()=>openSettings(),close:closeSettings,isOpen:()=>settings.classList.contains('show'),section:id=>openSettings(id),openWorkspace:()=>W.EmberCommandCenter.open()};
    W.EmberMenu = {sync:()=>{},reveal:el=>openSettings(null,el),openCard:el=>openSettings(null,el),back:closeSettings};
    $('cockpitCommand').onclick = () => { closeSettings(); W.EmberWorkspace.open('connect'); };
    // All old settings shortcuts resolve to this single flat scroll, not hidden cards.
    D.addEventListener('click', e => {
      const b = e.target.closest('#bSetTop,#bGoKeys,#bKeys,#bKeysMenu,#bEngineKeys,#bAiFeatures,#efOpenSettings');
      if (!b) return; e.preventDefault(); e.stopImmediatePropagation();
      openSettings(['bGoKeys','bKeys','bKeysMenu','bEngineKeys'].includes(b.id) ? 'engine' : ['bAiFeatures','efOpenSettings'].includes(b.id) ? 'providers' : null);
    },true);
    $('stabs').addEventListener('click', e => { const t = e.target.closest('[data-st]'); if (t) setTimeout(() => (sections[map[t.dataset.st]] || sections.general).scrollIntoView({block:'start'}), 60); });
    D.addEventListener('keydown', e => {
      if (!settings.classList.contains('show')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSettings(); }
      if (e.key === 'Tab') {
        const list = Array.from(settings.querySelectorAll('button,input,select,textarea,summary,[tabindex="0"]')).filter(x => !x.disabled && x.getClientRects().length);
        const first = list[0], last = list.at(-1);
        if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    });
    // Remove the chat Panel affordance, not terminal connection/backend services.
    $('bPanelTop')?.remove(); $('bPanelTerm')?.remove();
    // Footer: Providers selector on the left (opens the real provider dropdown), verified API key count far right.
    const bar = $('chatProviderBar');
    if (bar) {
      $('bProv') && sections.providers.prepend($('bProv'));
      $('provDrop') && sections.providers.append($('provDrop'));
      const pb = $('bProv');
      if (pb) { if (!pb.querySelector(':scope > span')) { const l = D.createElement('span'); l.textContent = 'Providers'; pb.append(l); } bar.prepend(pb); }
      if ($('provDrop')) bar.append($('provDrop'));
      const badge = D.createElement('span'); badge.id = 'cockpitApiCount'; badge.setAttribute('role','status');
      bar.append(badge);
      function countKeys() {
        let active = 0, saved = 0;
        W.Prov.IDS.forEach(id => W.Prov.entries(id).forEach(e => { saved++; if (e.st?.ok && !e.st.limited && !W.Prov.isCool(e.key)) active++; }));
        const text = active + ' active API key' + (active === 1 ? '' : 's');
        if (badge.textContent !== text) badge.textContent = text;
        badge.title = active + ' verified usable · ' + saved + ' saved. Unchecked, rejected, rate-limited and cooling keys are not counted.';
        badge.setAttribute('aria-label',badge.title);
      }
      countKeys(); W.addEventListener('ember-provider-stats',countKeys); W.addEventListener('ember-names',countKeys); W.addEventListener('storage',countKeys);
      D.addEventListener('visibilitychange',()=>{if(!D.hidden)countKeys();});
      settings.addEventListener('input',countKeys);
      setInterval(()=>{if(!D.hidden && settings.classList.contains('show'))countKeys();},15000);
    }
    // Browser has a real Notes tab; reuse the original notes editor and autosave handlers inline.
    const notes = $('xcreate'), br = $('browser');
    if (notes && br) {
      const pane = D.createElement('div'); pane.id = 'brNotes'; pane.className = 'brbody hidden'; pane.append(notes); br.append(pane);
      notes.classList.add('cockpit-inline-notes');
      function selectNotes() {
        W.EmberCreate.open('notes'); $('brWeb').classList.add('hidden'); $('brDocs').classList.add('hidden'); pane.classList.remove('hidden');
        $('brTabs').querySelectorAll('.stab').forEach(b => b.classList.toggle('on', b.dataset.bt === 'notes'));
      }
      $('brTabs').addEventListener('click', e => {
        const b = e.target.closest('[data-bt]'); if (!b) return;
        if (b.dataset.bt === 'notes') { if (pane.classList.contains('hidden')) selectNotes(); } else { $('cX').click(); pane.classList.add('hidden'); }
      });
      $('dcNotesOpen')?.remove();
      const openNotes = W.EmberCreate.open;
      W.EmberCreate.open = t => { if (!br.classList.contains('show')) W.EmberBrowser.open(); openNotes(t); selectNotesOriginal(); };
      function selectNotesOriginal() { $('brWeb').classList.add('hidden'); $('brDocs').classList.add('hidden'); pane.classList.remove('hidden'); $('brTabs').querySelectorAll('.stab').forEach(b => b.classList.toggle('on',b.dataset.bt==='notes')); }
      // selectNotes uses the public wrapper, which delegates only once to the original editor.
      const browserOpen = W.EmberBrowser.open;
      W.EmberBrowser.open = which => { browserOpen(which); pane.classList.add('hidden'); if (which === 'notes') { openNotes('notes'); selectNotesOriginal(); } };
      $('brX').addEventListener('click', () => $('cX').click());
    }
    setupCommandCentre(R,G,closeSettings);
    W.EmberCockpit = {open:openSettings,close:closeSettings,version:'1.10.15'};
  }
  function setupCommandCentre(R,G,closeSettings) {
    const card = $('eccGitHub'), panel = $('emberCommandCenter'), host = panel.querySelector('.ecc-panel-content');
    host.prepend(card); // repository workflow comes first; diagnostics stay below it
    const tabs = card.querySelectorAll('[role="tab"]');
    tabs.forEach(t => { t.setAttribute('aria-controls','repoWorkspace'); });
    // Only one repo workflow: no alternative install/build panels bypassing the prerequisite.
    $('ghRunnerCard').hidden = true;
    const quick = card.querySelector('[data-ecc-action="build"]')?.closest('.rr-section');
    if (quick) { quick.querySelector('.ecc-actions')?.remove(); quick.querySelector('h3').textContent = 'Run status'; }
    card.querySelectorAll('#repoRunnerFeature [data-rr="brain-direct"],#repoRunnerFeature [data-rr="add"]').forEach(b => b.remove());
    const linked = $('rrSources')?.closest('.rr-section');
    if (linked) {
      linked.dataset.ghp = 'build';
      const stage = D.createElement('section'); stage.className = 'rr-section'; stage.dataset.ghp = 'repos';
      stage.innerHTML = '<h3>Or apply a repository URL</h3>';
      const label = $('rrSource').previousElementSibling;
      let n = label; while (n) { const next = n.nextSibling; stage.append(n); n = next; }
      $('repoRunnerFeature').append(stage);
    }
    const intro = card.querySelector('#repoRunnerFeature > p[data-ghp="repos"]');
    if (intro) intro.textContent = 'Search is read-only. Apply a result, tick Sync and confirm the waiting queue.';
    const direct = $('rrSource');
    if (direct) {
      direct.previousElementSibling.textContent = 'Stage a repository directly';
      const b = D.createElement('button'); b.type = 'button'; b.className = 'btn g'; b.id = 'cockpitStageDirect'; b.textContent = 'Apply → select to sync';
      direct.after(b); b.onclick = () => { const repo = G._clean.cleanRepo(direct.value); if (!repo) return status('Use owner/repository or a GitHub repository URL.'); candidates.set(repo.toLowerCase(),{repo}); renderQueue(); $('cockpitPending').scrollIntoView({block:'nearest'}); };
    }
    // Search terminal is a dropdown containing real search result nodes, status and pagination.
    const discovery = $('rrSearch')?.closest('.rr-section');
    const term = D.createElement('details'); term.id = 'cockpitRepoTerminal'; term.className = 'cockpit-terminal';
    term.innerHTML = '<summary>Live Terminal · repository discovery</summary><pre id="cockpitSearchLog" role="log" aria-live="polite">Waiting for repository search. Search is read-only.</pre>';
    if (discovery) { discovery.append(term); term.append($('rrResults')); term.append(discovery.querySelector('.rr-pagination')); }
    const queueKey = 'ember_cockpit_queue_v1', savedQueue = read(queueKey,[]);
    let queue = Array.isArray(savedQueue) ? savedQueue.filter(x => G._clean.cleanRepo(x?.repo)).map(x=>({repo:G._clean.cleanRepo(x.repo),selected:x.selected===true,state:'waiting'})).slice(0,100) : [];
    const candidates = new Map(); let committing = false;
    const q = D.createElement('section'); q.id = 'cockpitQueue'; q.className = 'rr-section'; q.dataset.ghp = 'repos build';
    q.innerHTML = '<h3>Sync queue <span id="cockpitQueueCount">0</span></h3><p class="hint">Apply a result, tick Sync, then confirm. Nothing is added to the runner or sent to GitHub until Run & Push is confirmed.</p><div id="cockpitPending"></div><button type="button" class="btn g" id="cockpitConfirmQueue">Confirm selected → add to Queue</button><div id="cockpitQueueItems"></div><p id="cockpitQueueStatus" class="hint" role="status"></p>';
    $('repoRunnerFeature').append(q);
    function status(t) { $('cockpitQueueStatus').textContent = t; }
    function persist() { if (!store(queueKey,queue)) status('Storage unavailable. Queue stays in this session only.'); }
    function renderQueue() {
      $('cockpitQueueCount').textContent = queue.length;
      $('cockpitPending').innerHTML = Array.from(candidates.values()).map(x=>'<label class="rr-check"><input type="checkbox" data-pending="'+esc(x.repo)+'"'+(x.selected?' checked':'')+'> Sync '+esc(x.repo)+'</label>').join('');
      $('cockpitQueueItems').innerHTML = queue.map(x=>'<div class="cockpit-queue-row"><label class="rr-check"><input type="checkbox" data-queue="'+esc(x.repo)+'"'+(x.selected?' checked':'')+'> '+esc(x.repo)+'<small>'+esc(x.state || 'waiting')+'</small></label><button type="button" class="btn g" data-remove-queue="'+esc(x.repo)+'" aria-label="Remove '+esc(x.repo)+' from queue">Remove</button></div>').join('') || '<p class="hint">Queue empty. No repository will be synced automatically.</p>';
      $('cockpitConfirmQueue').disabled = !Array.from(candidates.values()).some(x=>x.selected) || committing;
    }
    q.addEventListener('change',e=>{
      if(e.target.dataset.pending){const x=candidates.get(e.target.dataset.pending.toLowerCase());if(x)x.selected=e.target.checked; $('cockpitConfirmQueue').disabled=!Array.from(candidates.values()).some(x=>x.selected);}
      if(e.target.dataset.queue){const x=queue.find(x=>x.repo===e.target.dataset.queue);if(x)x.selected=e.target.checked; persist();}
    });
    q.addEventListener('click',e=>{const b=e.target.closest('[data-remove-queue]');if(b&&!committing){queue=queue.filter(x=>x.repo!==b.dataset.removeQueue);persist();renderQueue();}});
    $('cockpitConfirmQueue').onclick=()=>{
      const selected=Array.from(candidates.values()).filter(x=>x.selected); if(!selected.length)return;
      if(!W.confirm('Add '+selected.length+' selected repositories to the waiting queue? This does not sync or push.'))return;
      if(queue.length+selected.filter(x=>!queue.some(y=>y.repo.toLowerCase()===x.repo.toLowerCase())).length>100)return status('Queue limit: 100 repositories.');
      selected.forEach(x=>{if(!queue.some(y=>y.repo.toLowerCase()===x.repo.toLowerCase()))queue.push({repo:x.repo,selected:true,state:'waiting'});candidates.delete(x.repo.toLowerCase());});
      persist();renderQueue();status('Queued. Waiting for an explicit Run & Push confirmation.');
    };
    function decorateResults() { $('rrResults').querySelectorAll('[data-rr-add]').forEach(b=>{if(b.textContent!=='Apply')b.textContent='Apply';}); }
    new MutationObserver(decorateResults).observe($('rrResults'),{childList:true,subtree:true});
    const rrStatus=$('rrStatus'); let lastMessage='';
    new MutationObserver(()=>{const text=rrStatus.textContent;if(text===lastMessage)return;lastMessage=text;const log=$('cockpitSearchLog');log.textContent='['+new Date().toLocaleTimeString()+'] '+text;}).observe(rrStatus,{childList:true,characterData:true,subtree:true});
    card.addEventListener('click',e=>{
      const apply=e.target.closest('[data-rr-add]');
      if(apply){e.preventDefault();e.stopImmediatePropagation();const repo=G._clean.cleanRepo(apply.dataset.rrAdd);if(!repo)return;if(!candidates.has(repo.toLowerCase()))candidates.set(repo.toLowerCase(),{repo,selected:false});renderQueue();status('Applied '+repo+'. Tick Sync, then confirm to queue.');return;}
      const b=e.target.closest('[data-rr]');
      if(b&&['search','owned','prev','next'].includes(b.dataset.rr)){term.open=true;$('cockpitSearchLog').textContent='['+new Date().toLocaleTimeString()+'] Searching GitHub…';}
    },true);
    // Public SSH metadata only: never ask for or retain a private key.
    const ssh=D.createElement('section');ssh.id='cockpitSsh';ssh.className='rr-section';ssh.dataset.ghp='build';
    ssh.innerHTML='<h3>Linked SSH key · required</h3><p class="hint">Paste a PUBLIC SSH key already linked to your GitHub account. Verification checks the signed-in GitHub account, then reads its public authentication-key list. Never paste a private key. The existing runner still authenticates with your GitHub token; SSH verification is an additional UI prerequisite, not a change to its transport.</p><label class="lb" for="cockpitSshPublic">Public key</label><textarea id="cockpitSshPublic" rows="3" spellcheck="false" autocomplete="off" placeholder="ssh-ed25519 AAAA…"></textarea><button type="button" class="btn g" id="cockpitVerifySsh">Verify linked SSH key</button><p id="cockpitSshStatus" class="hint" role="status">Not verified. Run & Push is locked.</p><a href="https://github.com/settings/ssh/new" target="_blank" rel="noopener noreferrer">Link a public key in GitHub ↗</a>';
    $('repoRunnerFeature').append(ssh);
    const publish=Array.from(card.querySelectorAll('.rr-section')).find(x=>/Publish, run and inspect/.test(x.querySelector('h3')?.textContent||''));
    if(publish)publish.before(ssh);
    function publicKey(){const s=$('cockpitSshPublic').value.trim();if(/PRIVATE KEY/.test(s))throw new Error('Private keys are not accepted. Clear it and paste only a public SSH key.');const m=/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(?:256|384|521)|sk-ssh-ed25519@openssh.com|sk-ecdsa-sha2-nistp256@openssh.com)\s+([A-Za-z0-9+/]+={0,3})(?:\s.*)?$/.exec(s);if(!m)throw new Error('Paste a valid OpenSSH public key, not a fingerprint or private key.');return m[1]+' '+m[2];}
    async function verifySsh(){
      if(!G.on())throw new Error('Save your GitHub token on the Brain tab first.');
      const key=publicKey(); let found=false;
      const account=await G.managerRequest('/user');
      if(!account.ok || !/^[a-zA-Z0-9-]+$/.test(account.json?.login || '')) throw new Error(account.error || 'Cannot verify the signed-in GitHub account.');
      // The existing manager permits /user, not /user/keys. Do not widen its backend allowlist.
      // Authentication public keys are public metadata; fetch them without a token or credentials.
      const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),20000);
      try {
        for(let page=1;page<=20;page++){
          const response=await fetch('https://api.github.com/users/'+encodeURIComponent(account.json.login)+'/keys?per_page=100&page='+page,{credentials:'omit',headers:{Accept:'application/vnd.github+json'},signal:controller.signal});
          if(!response.ok)throw new Error('Cannot read public SSH keys (HTTP '+response.status+'). No workflow dispatched.');
          const keys=await response.json(); if(!Array.isArray(keys))throw new Error('Invalid SSH-key response.');
          if(keys.some(x=>String(x.key||'').trim().split(/\s+/).slice(0,2).join(' ')===key)){found=true;break;}
          if(keys.length<100)break;
        }
      } finally {clearTimeout(timeout);}
      if(!found)throw new Error('This public SSH key was not found on the authenticated GitHub account.');
      $('cockpitSshStatus').textContent='Linked public SSH key verified. Rechecked before each run.';return true;
    }
    $('cockpitVerifySsh').onclick=async e=>{e.currentTarget.disabled=true;try{await verifySsh();}catch(er){$('cockpitSshStatus').textContent=er.message;}finally{$('cockpitVerifySsh').disabled=false;}};
    $('cockpitSshPublic').addEventListener('input',()=>{$('cockpitSshStatus').textContent='Key changed. Verify again before running.';});
    // Replace duplicate publish actions with ONE transactional UI, using unchanged runner methods.
    publish?.querySelectorAll('[data-rr="install"],[data-rr="sync"]').forEach(b=>b.remove());
    const run=D.createElement('button');run.type='button';run.id='cockpitRunPush';run.className='btn';run.textContent='Run & Push · review queue';
    publish?.querySelector('.btnrow').prepend(run);
    run.onclick=async()=>{
      if(committing)return;
      committing=true; run.disabled=true; q.inert=true;const original=R.config();let staged=false, submitted=false;
      try{
        const selected=queue.filter(x=>x.selected);
        if(!selected.length)throw new Error('Tick at least one queued repository to sync.');
        const target=G._clean.cleanRepo($('rrTarget').value);if(!target)throw new Error('Set your output repository first.');
        if(!G.on())throw new Error('Save your GitHub token first.');
        await verifySsh();
        if(!W.confirm('Run & Push '+selected.length+' queued repositories into '+target+'? This installs/updates 3 managed runner files, provisions the existing encrypted token secret and dispatches GitHub Actions. The Brain is always included. A dispatch is not a completed build.'))return;
        const queuedNames = new Set(queue.map(x=>x.repo.toLowerCase()));
        const sources=original.sources.filter(x=>!queuedNames.has(x.repo.toLowerCase())).concat(selected.map(x=>({repo:x.repo})));
        R.save({target,branch:$('rrBranch').value.trim(),buildWorkflow:$('rrWorkflow').value.trim()||'build.yml',autoBuild:$('rrBuild').checked,autoSync:$('rrAuto').checked,sources});staged=true;
        selected.forEach(x=>x.state='dispatching');renderQueue();rrStatus.textContent='Installing runner and dispatching the confirmed queue…';
        const result=await R.install();submitted=!!result.dispatched;
        if(!result.ok)throw new Error(result.error||'Runner was not dispatched.');
        selected.forEach(x=>x.state='dispatched · check run status');persist();renderQueue();
        rrStatus.textContent='Workflow dispatched. Check run status for actual completion. '+(result.url||'');
        W.EmberCommandCenter.write({source:'Cockpit Queue',stream:'status',text:rrStatus.textContent});
      }catch(er){
        if(staged&&!submitted){R.save(original);queue.filter(x=>x.state==='dispatching').forEach(x=>x.state='waiting · review failure');persist();renderQueue();}
        rrStatus.textContent=er.message+' If installation started, remote files may already exist; inspect run status before retrying.';
        $('cockpitSshStatus').textContent=er.message; status(er.message);
      }finally{committing=false;run.disabled=false;q.inert=false;renderQueue();R.paintSources();}
    };
    // Gate keyboard/delegated legacy action paths too, should an add-on expose them later.
    card.addEventListener('click',e=>{const b=e.target.closest('[data-rr="install"],[data-rr="sync"],[data-ecc-action="build"],[data-ecc-action="push"],[data-gh-action="install-runner"]');if(b){e.preventDefault();e.stopImmediatePropagation();status('Use Run & Push to review the queue and verify a linked SSH key.');W.EmberWorkspace.setTab('build');}},true);
    // Search enter follows original runner search, and opens the terminal dropdown.
    $('rrSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')term.open=true;});
    renderQueue();
    W.EmberCockpitQueue={snapshot:()=>queue.map(x=>({...x})),pending:()=>Array.from(candidates.values()).map(x=>({...x}))};
  }
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',init);else init();
})();
