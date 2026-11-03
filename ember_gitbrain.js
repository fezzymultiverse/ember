/* Ember 1.10.27 - GitHub, one widget at the bottom of Settings.
   Loads ONLY Ember's Brain. Search repos (read-only) -> View -> Add -> Push into the Brain.
   Keeps the GitHub Terminal. No runner, no Actions, no output repo, no SSH, no whole-repo sync. */
'use strict';
(() => {
  const W = window, D = document, $ = id => D.getElementById(id);
  const G = W.EmberGithub, B = W.EmberBrainPush;
  const settings = $('settings'), sb = settings && settings.querySelector('.sb');
  if (!G || !B || !sb) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = G._clean.cleanRepo, QK = 'ember_gitbrain_queue_v1', TAB_K = 'ember_gitbrain_tab';
  const rd = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch (_) { return f; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage blocked */ } };
  const stamp = () => new Date().toLocaleTimeString([], { hour12: false });
  const ago = t => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const toast = t => { try { W.emberToast && W.emberToast(String(t).slice(0, 140)); } catch (_) { /* toast optional */ } };

  let queue = (Array.isArray(rd(QK, [])) ? rd(QK, []) : []).map(x => ({ repo: clean(x && x.repo), description: String(x && x.description || '').slice(0, 200) })).filter(x => x.repo).slice(0, 15);
  let found = { query: '', page: 1, more: false, total: 0, rows: [] }, shown = [], busy = false, viewing = '';

  const w = D.createElement('section');
  w.id = 'gitWidget'; w.className = 'gw'; w.dataset.open = 'false'; w.dataset.tab = 'brain'; w.setAttribute('aria-label', 'GitHub · Ember’s Brain');
  w.innerHTML =
    '<button type="button" class="gw-head" id="gwHead" aria-expanded="false" aria-controls="gwBody">' +
      '<span class="gw-ic" aria-hidden="true">ϟ</span><span class="gw-t"><b>GitHub</b><small id="gwLine">Ember’s Brain</small></span>' +
      '<span class="gw-chip" id="gwChip">—</span><span class="gw-chev" aria-hidden="true">⌃</span></button>' +
    '<div class="gw-body" id="gwBody" hidden>' +
      '<div class="gw-tabs" role="tablist" aria-label="GitHub">' +
        '<button type="button" role="tab" data-gwt="brain">Brain</button><button type="button" role="tab" data-gwt="search">Search</button>' +
        '<button type="button" role="tab" data-gwt="queue">Push <i id="gwQn">0</i></button><button type="button" role="tab" data-gwt="term">Terminal</button></div>' +
      '<div class="gw-pane" data-p="brain">' +
        '<div class="gw-k">Brain repository</div><div class="gw-brain"><code id="gwBrainRepo"></code><span>only this repo is loaded</span></div>' +
        '<div class="gw-btns"><button type="button" class="btn" data-gw="load">Load brain</button></div><p class="gw-s" id="gwBrainStatus" role="status"></p>' +
        '<label class="lb" for="gwTok">GitHub token</label><input type="password" id="gwTok" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<div class="gw-btns"><button type="button" class="btn" data-gw="save-token">Save token</button><button type="button" class="btn g" data-gw="check-token">Check access</button><button type="button" class="btn g danger" data-gw="remove-token">Remove</button></div>' +
        '<p class="gw-s" id="gwTokStatus" role="status"></p></div>' +
      '<div class="gw-pane" data-p="search">' +
        '<div id="gwSearchView"><label class="lb" for="gwQ">Search GitHub repositories</label>' +
        '<div class="gw-row"><input type="search" id="gwQ" placeholder="topic, language or owner/repo" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="btn" data-gw="search">Search</button></div>' +
        '<p class="gw-s" id="gwSearchStatus" role="status">Search is read-only. View a repo, Add it, then Push.</p><div id="gwResults"></div>' +
        '<div class="gw-btns"><button type="button" class="btn g" data-gw="more" id="gwMore" hidden>More results</button></div></div>' +
        '<div id="gwDetail" hidden></div></div>' +
      '<div class="gw-pane" data-p="queue">' +
        '<p class="gw-s">Added repos wait here. Nothing is written until you press Push. Max 15 per push, one commit, no force-push.</p>' +
        '<div id="gwQueue"></div><div class="gw-btns"><button type="button" class="btn" data-gw="push" id="gwPush">Push to Brain</button><button type="button" class="btn g" data-gw="clear-queue" id="gwClear">Clear list</button></div>' +
        '<p class="gw-s" id="gwPushStatus" role="status"></p></div>' +
      '<div class="gw-pane" data-p="term">' +
        '<div class="gw-btns"><button type="button" class="btn g" data-gw="term-copy">Copy</button><button type="button" class="btn g" data-gw="term-clear">Clear</button></div>' +
        '<pre id="gwTerm" role="log" aria-live="polite" tabindex="0">GitHub Terminal ready. Every Brain, search, view and push step shows here with its time.</pre></div>' +
    '</div>';
  sb.append(w);

  // ---------- GitHub Terminal ----------
  const term = $('gwTerm'); let termClean = true, lastLine = '';
  function line(text, stream) {
    if (!term) return;
    if (termClean) { term.textContent = ''; termClean = false; }
    if (lastLine === text) return; lastLine = text;
    const row = D.createElement('span'); row.className = 'gw-l ' + (stream === 'stderr' ? 'err' : ''); row.textContent = '[' + stamp() + '] ' + text + '\n';
    term.append(row);
    while (term.childNodes.length > 400) term.firstChild.remove();
    term.scrollTop = term.scrollHeight;
    const n = $('gwTermCount'); if (n) n.textContent = String(term.childNodes.length);
  }
  let mirrored = false;
  const CC = W.EmberCommandCenter;
  if (CC && typeof CC.write === 'function') {
    const original = CC.write; mirrored = true;
    CC.write = function (data) {
      try { if (data && typeof data === 'object' && String(data.tag || '').toUpperCase() === 'GIT') line(String(data.text || ''), data.stream); } catch (_) { /* terminal is cosmetic */ }
      return original.apply(this, arguments);
    };
  }
  function log(text, stream) {
    if (mirrored) { try { CC.write({ tag: 'GIT', source: 'GitHub', stream: stream || 'status', text: String(text) }); return; } catch (_) { /* fall through */ } }
    line(text, stream);
  }

  // ---------- status ----------
  function summary() {
    let dg = null, st = { running: false, repos: {} };
    try { dg = G.digestOf(G.knowledgeSources()[0]); } catch (_) { /* no cache yet */ }
    try { st = G.syncState(); } catch (_) { /* idle */ }
    const live = Object.keys(st.repos || {}).map(k => st.repos[k]).filter(Boolean)[0];
    return { ready: true, token: G.on(), brain: G.knowledgeRepo(), files: dg ? dg.files || 0 : 0, synced: dg ? dg.syncedAt || 0 : 0, running: !!st.running, msg: live ? live.msg || '' : '', pct: live && live.pct ? live.pct : 0, queued: queue.length };
  }
  let lastSig = '';
  function paintStatus() {
    const s = summary();
    $('gwBrainRepo').textContent = s.brain;
    $('gwQn').textContent = String(queue.length);
    const chip = s.running ? 'SYNCING' : s.synced ? 'LOADED' : s.token ? 'TOKEN SAVED' : 'NO TOKEN';
    if ($('gwChip').textContent !== chip) $('gwChip').textContent = chip;
    $('gwLine').textContent = s.running ? 'Loading ' + s.brain + (s.pct ? ' · ' + Math.round(s.pct) + '%' : '…') : s.synced ? s.brain + ' · ' + s.files + ' files · ' + ago(s.synced) : s.brain + ' · not loaded yet';
    $('gwBrainStatus').textContent = s.running ? (s.msg || 'Loading the Brain…') : s.synced ? s.files + ' files loaded ' + ago(s.synced) + '.' : (s.token ? 'Brain not loaded yet. Press Load brain.' : 'Save a token, then load the Brain.');
    $('gwTok').placeholder = s.token ? 'Token saved. Paste to replace.' : 'Paste GitHub token';
    $('gwPush').disabled = !queue.length || !s.token || busy;
    $('gwClear').disabled = !queue.length || busy;
    const sig = chip + '|' + $('gwLine').textContent;
    if (sig !== lastSig) { lastSig = sig; try { W.dispatchEvent(new CustomEvent('ember-git-state')); } catch (_) { /* listeners optional */ } }
  }

  // ---------- queue ----------
  const inQueue = r => queue.some(x => x.repo.toLowerCase() === r.toLowerCase());
  function persist() { wr(QK, queue); }
  function paintQueue() {
    $('gwQueue').innerHTML = queue.length ? queue.map(x => '<div class="gw-item"><div class="gw-it"><b>' + esc(x.repo) + '</b><small>' + esc(x.description || 'no description') + '</small></div><div class="gw-ib"><button type="button" class="btn g" data-gw="view" data-repo="' + esc(x.repo) + '">View</button><button type="button" class="btn g danger" data-gw="remove" data-repo="' + esc(x.repo) + '" aria-label="Remove ' + esc(x.repo) + '">✕</button></div></div>').join('') : '<p class="gw-s">Nothing added yet. Search, View, then Add.</p>';
    paintStatus();
  }
  function add(repo, description) {
    const r = clean(repo); if (!r) return false;
    if (r.toLowerCase() === G.knowledgeRepo().toLowerCase()) { log('The Brain cannot be added to itself.', 'stderr'); return false; }
    if (inQueue(r)) return true;
    if (queue.length >= 15) { log('Push list is full (15). Push first, then add more.', 'stderr'); toast('Push list is full (15).'); return false; }
    queue.push({ repo: r, description: String(description || '').slice(0, 200) }); persist(); paintQueue(); paintResults();
    log('Added ' + r + ' to the push list (' + queue.length + ').'); toast('Added ' + r + '. Open Push to send it to the Brain.');
    return true;
  }

  // ---------- search + view ----------
  function paintResults() {
    $('gwResults').innerHTML = found.rows.map(x => '<div class="gw-item"><div class="gw-it"><b>' + esc(x.repo) + '</b><small>' + esc(x.description || 'no description') + '</small><small class="gw-m">★ ' + (x.stars || 0) + (x.lang ? ' · ' + esc(x.lang) : '') + (x.license ? ' · ' + esc(x.license) : '') + (x.private ? ' · private' : '') + '</small></div>' +
      '<div class="gw-ib"><button type="button" class="btn g" data-gw="view" data-repo="' + esc(x.repo) + '">View</button><button type="button" class="btn" data-gw="add" data-repo="' + esc(x.repo) + '"' + (inQueue(x.repo) ? ' disabled>Added ✓' : '>Add') + '</button></div></div>').join('');
    $('gwMore').hidden = !found.more;
  }
  async function doSearch(page) {
    const q = page > 1 ? found.query : $('gwQ').value.trim();
    if (!q) { $('gwSearchStatus').textContent = 'Type search words first.'; return; }
    if (!G.on()) { $('gwSearchStatus').textContent = 'Save your GitHub token on the Brain tab first.'; log('Search blocked: no GitHub token.', 'stderr'); return; }
    $('gwSearchStatus').textContent = 'Searching…'; log('Searching GitHub: "' + q + '"' + (page > 1 ? ' · page ' + page : ''));
    const t0 = performance.now();
    try {
      const r = await B.search(q, page);
      found = { query: q, page: r.page, more: r.more, total: r.total, rows: page > 1 ? found.rows.concat(r.repositories) : r.repositories };
      shown = found.rows.map(x => ({ repo: x.repo, description: x.description }));
      paintResults();
      $('gwSearchStatus').textContent = found.rows.length ? found.rows.length + ' of ' + r.total + ' repositories. View one, then Add.' : 'No repositories found.';
      log('Found ' + r.total + ' repositories for "' + q + '" in ' + Math.round(performance.now() - t0) + 'ms (showing ' + found.rows.length + ').');
    } catch (e) { $('gwSearchStatus').textContent = e.message; log('Search failed: ' + e.message, 'stderr'); }
  }
  function showSearchList() { viewing = ''; $('gwDetail').hidden = true; $('gwSearchView').hidden = false; }
  async function view(full) {
    const r = clean(full); if (!r) return;
    setTab('search'); viewing = r;
    const box = $('gwDetail'); $('gwSearchView').hidden = true; box.hidden = false;
    box.innerHTML = '<button type="button" class="btn g" data-gw="back">‹ Back</button><p class="gw-s">Reading ' + esc(r) + '…</p>';
    log('Viewing ' + r + ' (read-only)'); const t0 = performance.now();
    try {
      const d = await B.dossier(r);
      if (viewing !== r) return;
      const files = d.items.slice(0, 80).map(x => x.path).join('\n') + (d.items.length > 80 ? '\n… and ' + (d.items.length - 80) + ' more' : '');
      box.innerHTML = '<button type="button" class="btn g" data-gw="back">‹ Back</button>' +
        '<h4 class="gw-dh">' + esc(d.full) + '</h4><p class="gw-s">' + esc(d.desc || 'No description.') + '</p>' +
        '<div class="gw-facts"><span>★ ' + d.stars + '</span><span>' + esc(d.lang || 'unknown') + '</span><span>' + esc(d.license || 'no licence') + '</span><span>' + d.items.length + ' files</span><span>' + esc(d.branch) + '</span></div>' +
        (d.readme ? '<div class="gw-k">README</div><pre class="gw-pre">' + esc(d.readme.slice(0, 2500)) + (d.readme.length > 2500 ? '\n… cut for display' : '') + '</pre>' : '<p class="gw-s">No README.</p>') +
        (files ? '<div class="gw-k">File map</div><pre class="gw-pre">' + esc(files) + '</pre>' : '') +
        '<div class="gw-btns"><button type="button" class="btn" data-gw="add" data-repo="' + esc(d.full) + '"' + (inQueue(d.full) ? ' disabled>Added ✓' : '>Add to Brain') + '</button><a class="btn g gw-link" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">Open on GitHub</a></div>';
      log('Read ' + d.full + ': ' + d.items.length + ' files in ' + Math.round(performance.now() - t0) + 'ms');
    } catch (e) {
      if (viewing !== r) return;
      box.innerHTML = '<button type="button" class="btn g" data-gw="back">‹ Back</button><p class="gw-s">' + esc(e.message) + '</p>'; log('View failed: ' + e.message, 'stderr');
    }
  }

  // ---------- push ----------
  async function push() {
    if (busy || !queue.length) return;
    if (!G.on()) { $('gwPushStatus').textContent = 'Save your GitHub token first.'; return; }
    const list = queue.map(x => x.repo);
    if (!W.confirm('Push ' + list.length + ' repo' + (list.length === 1 ? '' : 's') + ' into ' + G.knowledgeRepo() + '? One commit, no force-push. Only notes about the repos are written; nothing is run.')) return;
    busy = true; paintStatus(); $('gwPushStatus').textContent = 'Pushing…'; log('Push started: ' + list.join(', '));
    try {
      const r = await B.write(list, { query: found.query, shown });
      queue = queue.filter(x => !r.written.some(y => y.toLowerCase() === x.repo.toLowerCase())); persist();
      $('gwPushStatus').innerHTML = 'Pushed ' + r.written.length + ' to ' + esc(r.brain) + ' · <a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.commit.slice(0, 7)) + '</a>' + (r.failed.length ? '<br>Skipped: ' + esc(r.failed.join('; ')) : '');
      toast('Pushed to ' + r.brain); log('Push done · commit ' + r.commit.slice(0, 7) + ' · ' + r.url);
    } catch (e) { $('gwPushStatus').textContent = e.message; log('Push failed: ' + e.message, 'stderr'); }
    finally { busy = false; paintQueue(); paintResults(); }
  }

  // ---------- tabs and open/close ----------
  function setTab(name) {
    if (!['brain', 'search', 'queue', 'term'].includes(name)) name = 'brain';
    w.dataset.tab = name; wr(TAB_K, name);
    w.querySelectorAll('[data-gwt]').forEach(b => { const on = b.dataset.gwt === name; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function expand(on) {
    w.dataset.open = String(on); $('gwHead').setAttribute('aria-expanded', String(on)); $('gwBody').hidden = !on;
    if (on) { paintStatus(); requestAnimationFrame(() => { try { w.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch (_) { /* old webview */ } }); }
  }
  function open(tab) {
    if (W.EmberCockpit && !settings.classList.contains('show')) W.EmberCockpit.open();
    else if (W.EmberCockpit && settings.classList.contains('cview-section')) W.EmberCockpit.open();
    if (tab) setTab(tab); expand(true);
  }

  w.addEventListener('click', async e => {
    if (e.target.closest('#gwHead')) { expand(w.dataset.open !== 'true'); return; }
    const t = e.target.closest('[data-gwt]'); if (t) { setTab(t.dataset.gwt); if (t.dataset.gwt === 'queue') paintQueue(); return; }
    const b = e.target.closest('[data-gw]'); if (!b || b.disabled) return;
    const a = b.dataset.gw, repo = b.dataset.repo;
    if (a === 'search') await doSearch(1);
    else if (a === 'more') await doSearch(found.page + 1);
    else if (a === 'view') await view(repo);
    else if (a === 'back') showSearchList();
    else if (a === 'add') { const row = found.rows.find(x => x.repo === repo); if (add(repo, row && row.description)) { b.disabled = true; b.textContent = 'Added ✓'; } }
    else if (a === 'remove') { queue = queue.filter(x => x.repo !== repo); persist(); paintQueue(); paintResults(); log('Removed ' + repo + ' from the push list.'); }
    else if (a === 'clear-queue') { if (queue.length && W.confirm('Clear the push list?')) { queue = []; persist(); paintQueue(); paintResults(); log('Push list cleared.'); } }
    else if (a === 'push') await push();
    else if (a === 'term-clear') { term.textContent = 'Cleared.'; termClean = true; }
    else if (a === 'term-copy') { try { await navigator.clipboard.writeText(term.textContent); toast('Terminal copied.'); } catch (_) { toast('Copy is blocked here.'); } }
    else if (a === 'load') {
      if (!G.on()) { $('gwBrainStatus').textContent = 'Save a token first.'; return; }
      b.disabled = true; log('Loading Brain ' + G.knowledgeRepo() + ' (only this repo)…');
      try { await G.syncAll({ force: true }); const s = summary(); log('Brain loaded: ' + s.files + ' files.'); } catch (er) { log('Brain load failed: ' + (er.message || er), 'stderr'); }
      finally { b.disabled = false; paintStatus(); }
    } else if (a === 'save-token') {
      const v = $('gwTok').value; if (!v.trim()) { $('gwTokStatus').textContent = 'Paste a token first. Your saved token was not changed.'; return; }
      const ok = G.setToken(v); $('gwTok').value = ''; $('gwTokStatus').textContent = ok ? 'Token saved on this device.' : 'Invalid token. Paste a GitHub token.'; log(ok ? 'Token saved.' : 'Token rejected (bad format).', ok ? 'status' : 'stderr'); paintStatus();
    } else if (a === 'remove-token') { G.setToken(''); $('gwTok').value = ''; $('gwTokStatus').textContent = 'Token removed.'; log('Token removed.'); paintStatus();
    } else if (a === 'check-token') {
      $('gwTokStatus').textContent = 'Checking…'; b.disabled = true;
      try { const r = await G.status(), bad = r.repo_errors && r.repo_errors.length; $('gwTokStatus').textContent = r.ok && !bad ? 'Token works for ' + r.user + ' · ' + G.knowledgeRepo() : (bad ? r.repo_errors.join(' ') : r.error) || r.warning || 'Access check failed.'; log($('gwTokStatus').textContent, r.ok && !bad ? 'status' : 'stderr'); }
      catch (er) { $('gwTokStatus').textContent = er.message || 'Access check failed.'; log($('gwTokStatus').textContent, 'stderr'); }
      finally { b.disabled = false; }
    }
  });
  w.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'gwQ') { e.preventDefault(); doSearch(1); } });
  w.querySelector('.gw-tabs').addEventListener('keydown', e => {
    const tabs = [...w.querySelectorAll('[data-gwt]')], i = tabs.indexOf(D.activeElement); if (i < 0) return;
    let n = -1; if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i + tabs.length - 1) % tabs.length; if (n < 0) return;
    e.preventDefault(); tabs[n].focus(); tabs[n].click();
  });
  // Terminal tab shows a live count of lines.
  const tabTerm = w.querySelector('[data-gwt="term"]'); tabTerm.insertAdjacentHTML('beforeend', ' <i id="gwTermCount">0</i>');
  G.sub(e => { if (e.type === 'state' || e.type === 'feed') paintStatus(); });
  W.addEventListener('ember-brain-pushed', paintStatus);
  setInterval(paintStatus, 30000);
  let saved = 'brain'; try { saved = localStorage.getItem(TAB_K); saved = saved ? JSON.parse(saved) : 'brain'; } catch (_) { saved = 'brain'; }
  setTab(saved); paintQueue(); paintResults(); paintStatus();

  // One GitHub entry point for everything that used to open the Command Centre repo cockpit.
  W.EmberGitBrain = { open, close: () => expand(false), isOpen: () => w.dataset.open === 'true', add, view, log, summary, queue: () => queue.map(x => ({ ...x })) };
})();
