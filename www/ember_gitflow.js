// Ember V1.9.102 - ember_gitflow.js: ONE GitHub panel that replaces the confusing two-feature flow.
//   Step 1  Brain   : save token, point at your Brain repo, load it (sync) so Ember can use it.
//   Step 2  Repos   : search GitHub or list your own repos, add whole repos to Ember.
//   Step 3  Update  : pick your output repo, then Clone & push (GitHub Actions clones the linked repos and pushes them into it).
// It only drives the existing engines (EmberGithub + EmberRepoRunner) so nothing is duplicated or changed there.
// The Command Centre and the Ember Hub show the same live state through the 'ember-git-state' event.
'use strict';
(() => {
  const D = document, $ = id => D.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const G = () => window.EmberGithub, R = () => window.EmberRepoRunner;

  let panel = null, backdrop = null, isOpen = false, busy = false, lastFocus = null, armed = 0, armTimer = 0, raf = 0;
  let find = { mode: 'search', query: '', page: 1, rows: [], more: false, total: 0, msg: '' };
  let tokMsg = '', brainMsg = '', urlMsg = '', outMsg = '', runMsg = '', runUrl = '';

  const ago = t => {
    if (!t) return 'never';
    const s = Math.max(1, Math.round((Date.now() - t) / 1000));
    return s < 60 ? s + 's ago' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago';
  };
  const log = (text, stream) => { try { if (window.EmberCommandCenter) window.EmberCommandCenter.write({ source: 'GitHub', stream: stream || 'status', text: String(text) }); } catch (e) { /* terminal is optional */ } };
  const announce = () => { try { window.dispatchEvent(new CustomEvent('ember-git-state')); } catch (e) { /* no listeners */ } };
  const ready = fn => { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); };

  /* ---------- shared state read (used by this panel, the Command Centre card and the Hub) ---------- */
  function summary() {
    const g = G(), r = R();
    if (!g || !r) return { ready: false };
    const c = r.config(); let dg = null, st = { running: false, repos: {} };
    try { dg = g.digestOf(g.knowledgeSources()[0]); } catch (e) { /* no cache yet */ }
    try { st = g.syncState(); } catch (e) { /* idle */ }
    const live = Object.keys(st.repos || {}).map(k => st.repos[k]).filter(Boolean)[0];
    return {
      ready: true, token: g.on(), brain: c.brain, target: c.target, linked: Math.max(0, c.sources.length - 1), sources: c.sources.map(s => s.repo),
      files: dg ? dg.files || 0 : 0, synced: dg ? dg.syncedAt || 0 : 0, branch: dg ? dg.branch || '' : '', head: dg ? dg.head || '' : '',
      running: !!st.running, msg: live ? live.msg || '' : '', pct: live && live.pct ? live.pct : 0
    };
  }
  function oneLine(s) {
    if (!s.ready) return 'GitHub engine not loaded.';
    const brain = s.running ? 'syncing ' + s.brain + (s.pct ? ' · ' + Math.round(s.pct) + '%' : '…') : s.synced ? s.brain + ' · ' + s.files + ' files · synced ' + ago(s.synced) : s.brain + ' · not loaded yet';
    return 'Brain: ' + brain + '\nLinked repos: ' + s.linked + ' · Output: ' + (s.target || 'not set') + ' · Token: ' + (s.token ? 'saved' : 'missing');
  }
  function chip(s) { return !s.ready ? 'OFF' : s.running ? 'SYNCING' : s.synced ? 'LOADED' : s.token ? 'READY' : 'NO TOKEN'; }

  /* ---------- panel ---------- */
  function build() {
    backdrop = D.createElement('button');
    backdrop.type = 'button'; backdrop.id = 'egitBackdrop'; backdrop.className = 'ehub-backdrop'; backdrop.tabIndex = -1; backdrop.hidden = true;
    backdrop.setAttribute('aria-label', 'Close GitHub panel');

    panel = D.createElement('aside');
    panel.id = 'emberGit'; panel.className = 'ehub egit';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'egitTitle');
    panel.setAttribute('aria-hidden', 'true'); panel.inert = true;
    panel.innerHTML =
      '<div class="ehub-head"><div><span class="ehub-eyebrow">EMBER / GITHUB</span><h2 id="egitTitle">GitHub</h2></div>' +
      '<button type="button" class="ehub-x" id="egitClose" aria-label="Close GitHub panel">✕</button></div>' +
      '<div class="ehub-body">' +

      '<section class="egit-strip" aria-live="polite"><div class="egit-strip-top"><b>Control Panel sync</b><span class="ehub-chip" id="egitChip">—</span></div>' +
      '<p id="egitLine"></p><div class="egit-bar" id="egitBarWrap" hidden><i id="egitBar"></i></div></section>' +

      '<section class="egit-step"><h3><span>1</span>Token &amp; Brain</h3>' +
        '<p class="egit-hint">Ember reads your Brain repo live and keeps a synced copy. Load it here once.</p>' +
        '<label class="egit-lb" for="egTok">GitHub token</label>' +
        '<input id="egTok" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste token (saved on this phone only)">' +
        '<div class="egit-row"><button type="button" class="ehub-btn ehub-sm" data-eg="tok-save">Save token</button><button type="button" class="ehub-btn ehub-sm" data-eg="tok-check">Check access</button></div>' +
        '<p class="egit-msg" id="egTokMsg"></p>' +
        '<label class="egit-lb" for="egBrain">Brain repo</label>' +
        '<input id="egBrain" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="owner/repo or GitHub URL">' +
        '<button type="button" class="ehub-btn ehub-btn-hot egit-wide" data-eg="brain-load">Load brain into Ember</button>' +
        '<p class="egit-msg" id="egBrainMsg"></p><div id="egBrainInfo" class="egit-info"></div></section>' +

      '<section class="egit-step"><h3><span>2</span>Find &amp; add repos</h3>' +
        '<p class="egit-hint">Search all of GitHub, or list your own repos. Adding links the whole repo for the clone step.</p>' +
        '<input id="egFindQ" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search words, topic or owner/repo">' +
        '<div class="egit-row"><button type="button" class="ehub-btn ehub-sm" data-eg="find-search">Search GitHub</button><button type="button" class="ehub-btn ehub-sm" data-eg="find-mine">My repos</button></div>' +
        '<div id="egFindRes" class="egit-list"></div>' +
        '<label class="egit-lb" for="egUrl">Or add one directly</label>' +
        '<div class="egit-row egit-inline"><input id="egUrl" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="owner/repo or URL"><button type="button" class="ehub-btn ehub-sm" data-eg="url-add">Add</button></div>' +
        '<p class="egit-msg" id="egUrlMsg"></p>' +
        '<h4 class="egit-h4">Linked repos</h4><div id="egLinked" class="egit-list"></div></section>' +

      '<section class="egit-step"><h3><span>3</span>Clone &amp; push update</h3>' +
        '<p class="egit-hint">Your output repo receives the clones. GitHub Actions does the cloning and pushing, never this phone, and nothing is force-pushed.</p>' +
        '<label class="egit-lb" for="egOut">Output repo (must be different from the brain)</label>' +
        '<div class="egit-row egit-inline"><input id="egOut" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="owner/repo"><button type="button" class="ehub-btn ehub-sm" data-eg="out-set">Set</button></div>' +
        '<p class="egit-msg" id="egOutMsg"></p>' +
        '<button type="button" class="ehub-btn ehub-btn-hot egit-wide" id="egClone" data-eg="clone">Clone &amp; push update</button>' +
        '<button type="button" class="ehub-btn egit-wide" data-eg="run-status">Check run status</button>' +
        '<p class="egit-msg" id="egRunMsg"></p></section>' +

      '<button type="button" class="ehub-btn egit-wide egit-classic" data-eg="classic">Open classic GitHub settings (unchanged)</button>' +
      '</div>';

    D.body.appendChild(backdrop); D.body.appendChild(panel);
    $('egBrain').value = R() ? R().config().brain : '';
    $('egOut').value = R() ? R().config().target : '';
  }

  /* ---------- painters (targeted, so typing is never interrupted) ---------- */
  function setText(id, v) { const e = $(id); if (e && e.textContent !== v) e.textContent = v; }
  function paintStrip() {
    const s = summary();
    setText('egitLine', oneLine(s)); setText('egitChip', chip(s));
    const w = $('egitBarWrap'), b = $('egitBar');
    if (w && b) { w.hidden = !s.running; b.style.width = Math.max(4, Math.min(100, s.pct || 4)) + '%'; }
  }
  function paintBrain() {
    const s = summary(); if (!s.ready) return;
    setText('egTokMsg', tokMsg || (s.token ? 'Token saved on this phone.' : 'No token yet. Without one GitHub allows very few reads.'));
    setText('egBrainMsg', brainMsg);
    const info = $('egBrainInfo'); if (!info) return;
    info.innerHTML = s.synced || s.running
      ? '<div><small>Repo</small><b>' + esc(s.brain) + '</b></div><div><small>Files</small><b>' + esc(s.files) + '</b></div><div><small>Synced</small><b>' + esc(s.running ? 'now…' : ago(s.synced)) + '</b></div>' +
        (s.running && s.msg ? '<p class="egit-msg">' + esc(s.msg) + '</p>' : '')
      : '<p class="egit-msg">Brain not loaded yet. Tap “Load brain into Ember”.</p>';
  }
  function repoCard(x, actions) {
    return '<article class="egit-repo"><div class="egit-rtop"><b>' + esc(x.repo) + '</b>' + (x.private ? '<span class="egit-tag">private</span>' : '') + (x.can_push ? '<span class="egit-tag egit-tag-ok">can push</span>' : '') + '</div>' +
      (x.description ? '<p>' + esc(x.description) + '</p>' : '') + (x.license ? '<small>License: ' + esc(x.license) + '</small>' : '') +
      '<div class="egit-row">' + actions + '</div></article>';
  }
  function paintFind() {
    const box = $('egFindRes'); if (!box) return;
    const r = R(); if (!r) { box.innerHTML = ''; return; }
    const c = r.config(), linked = c.sources.map(s => s.repo.toLowerCase());
    let html = find.msg ? '<p class="egit-msg">' + esc(find.msg) + '</p>' : '';
    if (find.rows.length) {
      html += '<p class="egit-msg">' + (find.mode === 'search' ? (find.total || find.rows.length) + ' result' + ((find.total || find.rows.length) === 1 ? '' : 's') + ' for “' + esc(find.query) + '”' : find.rows.length + ' of your repos') + '</p>';
      html += find.rows.map(x => {
        const on = linked.indexOf(x.repo.toLowerCase()) >= 0, isOut = c.target && c.target.toLowerCase() === x.repo.toLowerCase();
        return repoCard(x,
          '<button type="button" class="ehub-btn ehub-sm" data-eg="add" data-repo="' + esc(x.repo) + '"' + (on ? ' disabled' : '') + '>' + (on ? 'Linked' : 'Add') + '</button>' +
          (find.mode === 'mine' ? '<button type="button" class="ehub-btn ehub-sm" data-eg="use-out" data-repo="' + esc(x.repo) + '"' + (isOut || !x.can_push ? ' disabled' : '') + '>' + (isOut ? 'Output ✓' : 'Use as output') + '</button>' : ''));
      }).join('');
      if (find.more) html += '<button type="button" class="ehub-btn egit-wide" data-eg="find-more">Load more</button>';
    }
    box.innerHTML = html;
  }
  function paintLinked() {
    const box = $('egLinked'), r = R(); if (!box || !r) return;
    const c = r.config();
    box.innerHTML = c.sources.map(s => {
      const brain = s.repo.toLowerCase() === c.brain.toLowerCase();
      return '<div class="egit-link"><span class="egit-role' + (brain ? ' brain' : '') + '">' + (brain ? 'BRAIN' : 'REPO') + '</span><b>' + esc(s.repo) + '</b>' +
        (brain ? '' : '<button type="button" class="ehub-btn ehub-sm" data-eg="remove" data-repo="' + esc(s.repo) + '" aria-label="Remove ' + esc(s.repo) + '">Remove</button>') + '</div>';
    }).join('') + (c.sources.length < 2 ? '<p class="egit-msg">No extra repos yet. Search above and tap Add.</p>' : '');
  }
  function paintOut() {
    const s = summary(); if (!s.ready) return;
    setText('egUrlMsg', urlMsg);
    setText('egOutMsg', outMsg || (s.target ? 'Output: ' + s.target : 'No output repo set yet.'));
    const msg = $('egRunMsg');
    if (msg) { msg.textContent = runMsg; if (runUrl) { const a = D.createElement('a'); a.href = runUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = ' Open on GitHub'; msg.appendChild(a); } }
    const cb = $('egClone'); if (cb && !armed) cb.textContent = 'Clone & push update';
  }
  function paintAll() { if (!panel) return; paintStrip(); paintBrain(); paintLinked(); paintFind(); paintOut(); }
  function schedule() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (isOpen) paintAll(); announce(); }); }

  function setBusy(v) {
    busy = v; if (!panel) return;
    panel.setAttribute('aria-busy', String(v));
    panel.querySelectorAll('button[data-eg]').forEach(b => { if (v) { b.dataset.wasDisabled = b.disabled ? '1' : ''; b.disabled = true; } else { b.disabled = b.dataset.wasDisabled === '1'; delete b.dataset.wasDisabled; } });
  }
  async function guard(fn) {
    if (busy) return;
    setBusy(true);
    try { await fn(); } catch (e) { return String(e && e.message || e); } finally { setBusy(false); paintAll(); announce(); }
  }

  /* ---------- actions ---------- */
  async function tokenSave() {
    const v = $('egTok').value;
    if (!v.trim()) { tokMsg = 'Paste a token first. Your saved token was not changed.'; return; }
    const ok = G().setToken(v); $('egTok').value = '';
    tokMsg = ok ? 'Token saved on this phone.' : 'That does not look like a GitHub token.'; log('Token ' + (ok ? 'saved' : 'rejected'));
  }
  async function tokenCheck() {
    tokMsg = 'Checking access…'; paintBrain();
    const r = await G().status();
    if (r.ok) tokMsg = 'Connected as ' + (r.user || 'your account') + '. Brain repo reachable.';
    else tokMsg = r.error || 'Access check failed.';
    log('Access check: ' + tokMsg);
  }
  async function brainLoad() {
    const res = R().applyBrain($('egBrain').value);
    if (!res.ok) { brainMsg = res.error || 'Could not set the brain repo.'; return; }
    brainMsg = 'Loading ' + res.repo + '…'; paintBrain(); log('Loading brain ' + res.repo);
    const out = await G().syncAll({ force: true });
    brainMsg = out.ok ? 'Brain loaded. Ember will use ' + res.repo + ' on every code question.' : (out.error || 'Sync failed.');
    log('Brain sync ' + (out.ok ? 'finished' : 'failed: ' + brainMsg), out.ok ? 'status' : 'stderr');
  }
  async function findRun(mode, page, append) {
    const r = R(), q = $('egFindQ').value.trim();
    if (mode === 'search' && !q) { find.msg = 'Type search words first.'; find.rows = []; return; }
    const res = mode === 'search' ? await r.search({ query: q, page }) : await r.owned({ page });
    if (!res.ok) { find.msg = res.error || 'Search failed.'; return; }
    const rows = res.repositories || [];
    find = { mode, query: q, page, rows: append ? find.rows.concat(rows) : rows, total: res.total || 0, msg: rows.length || append ? '' : 'Nothing found.',
      more: mode === 'search' ? rows.length === 30 && page * 30 < (res.total || 0) && page < 34 : !!res.more };
    log((mode === 'search' ? 'Search “' + q + '”: ' : 'My repos: ') + rows.length + ' shown');
  }
  async function addRepo(repo, fromUrl) {
    try { const out = R().addSource(repo); if (fromUrl) { urlMsg = 'Added ' + out.repo + '.'; $('egUrl').value = ''; } log('Linked repo ' + out.repo); }
    catch (e) { if (fromUrl) urlMsg = e.message; else find.msg = e.message; }
  }
  async function removeRepo(repo) {
    try { const c = R().config(); R().save({ sources: c.sources.filter(s => s.repo.toLowerCase() !== repo.toLowerCase()) }); urlMsg = 'Removed ' + repo + '. Clone & push again to update the output repo.'; log('Unlinked repo ' + repo); }
    catch (e) { urlMsg = e.message; }
  }
  async function useOutput(repo) {
    try { R().setTarget(repo); outMsg = 'Output set to ' + repo + '.'; $('egOut').value = repo; log('Output repo ' + repo); }
    catch (e) { outMsg = e.message; }
  }
  async function setOutput() {
    try { const c = R().setTarget($('egOut').value); outMsg = 'Output set to ' + c.target + '.'; log('Output repo ' + c.target); }
    catch (e) { outMsg = e.message; }
  }
  async function clonePush() {
    const c = R().config();
    if (!c.target) { outMsg = 'Set your output repo first.'; return; }
    if (!G().on()) { runMsg = 'Save your GitHub token first (step 1).'; return; }
    if (!armed) { // two taps: this commits to the output repo, so ask once without a native dialog
      armed = Date.now(); const b = $('egClone'); if (b) b.textContent = 'Tap again to push to ' + c.target;
      clearTimeout(armTimer); armTimer = setTimeout(() => { armed = 0; paintOut(); }, 6000);
      runMsg = 'This publishes the runner and repo list to ' + c.target + ' and starts the clone on GitHub Actions.'; runUrl = ''; return;
    }
    clearTimeout(armTimer); armed = 0;
    runMsg = 'Pushing runner to ' + c.target + '…'; runUrl = ''; paintOut(); log('Clone & push: installing runner on ' + c.target + ' for ' + c.sources.length + ' repo(s)');
    const res = await R().install();
    runUrl = res.url || '';
    runMsg = res.ok ? 'Done. GitHub Actions is cloning ' + c.sources.length + ' repo' + (c.sources.length === 1 ? '' : 's') + ' into ' + c.target + ' under external/. Tap “Check run status” to follow it.' : (res.error || 'Push failed.');
    log('Clone & push ' + (res.ok ? 'dispatched' : 'failed: ' + runMsg), res.ok ? 'status' : 'stderr');
  }
  async function runStatus() {
    runMsg = 'Checking runs…'; runUrl = ''; paintOut();
    const res = await R().status();
    if (!res.ok) { runMsg = res.error || 'Could not read runs.'; return; }
    runMsg = res.runs.length ? res.runs.map(x => 'Run ' + x.id + ': ' + x.status + (x.conclusion ? ' / ' + x.conclusion : '')).join('\n') : 'No runs yet. Tap “Clone & push update” first.';
    runUrl = res.runs.length ? res.runs[0].url : '';
    log(runMsg);
  }

  /* ---------- open / close ---------- */
  function setOpen(open) {
    if (!panel || open === isOpen) return;
    isOpen = open;
    if (open) lastFocus = D.activeElement;
    panel.classList.toggle('ehub-open', open); panel.inert = !open; panel.setAttribute('aria-hidden', String(!open));
    backdrop.hidden = !open; D.body.classList.toggle('ehub-on', open);
    if (open) {
      const r = R(); if (r) { if (!D.activeElement || D.activeElement.id !== 'egBrain') $('egBrain').value = r.config().brain; if (D.activeElement !== $('egOut')) $('egOut').value = r.config().target; }
      paintAll(); const x = $('egitClose'); if (x) x.focus({ preventScroll: true });
    } else if (lastFocus && lastFocus.isConnected) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* element gone */ } }
  }
  function openPanel() {
    if (!G() || !R()) return;
    if (window.EmberHub && window.EmberHub.isOpen()) window.EmberHub.close();
    if (window.EmberCommandCenter) window.EmberCommandCenter.close();
    setTimeout(() => setOpen(true), 120);
  }

  /* ---------- Command Centre card + sync ---------- */
  function addCommandCentreCard() {
    const host = $('eccRepos') && $('eccRepos').closest('.ecc-card');
    if (!host || $('eccGitCard')) return;
    const card = D.createElement('section'); card.className = 'ecc-card'; card.id = 'eccGitCard';
    card.innerHTML = '<div class="ecc-card-title"><span class="ecc-icon">⌥</span><h3>GitHub · Brain &amp; Repos</h3><span class="ecc-chip" id="eccGitChip">—</span></div>' +
      '<pre id="eccGitLine" aria-live="polite"></pre><div class="ecc-workspace-actions"><button class="btn g" id="eccGitOpen" type="button">Open GitHub panel</button></div>';
    host.parentNode.insertBefore(card, host);
    $('eccGitOpen').addEventListener('click', openPanel);
  }
  function paintExternal() {
    const s = summary(); if (!s.ready) return;
    setText('eccGitLine', oneLine(s)); setText('eccGitChip', chip(s));
  }

  ready(() => {
    if (!G() || !R() || $('emberGit')) return;
    build(); addCommandCentreCard(); paintExternal();

    panel.addEventListener('click', e => {
      if (e.target.closest('#egitClose')) { setOpen(false); return; }
      const b = e.target.closest('[data-eg]'); if (!b || busy) return;
      const act = b.getAttribute('data-eg'), repo = b.getAttribute('data-repo') || '';
      const run = async fn => { const err = await guard(fn); if (err) { runMsg = err; paintAll(); } };
      if (act === 'tok-save') run(tokenSave);
      else if (act === 'tok-check') run(tokenCheck);
      else if (act === 'brain-load') run(brainLoad);
      else if (act === 'find-search') run(() => findRun('search', 1, false));
      else if (act === 'find-mine') run(() => findRun('mine', 1, false));
      else if (act === 'find-more') run(() => findRun(find.mode, find.page + 1, true));
      else if (act === 'add') run(() => addRepo(repo, false));
      else if (act === 'url-add') run(() => addRepo($('egUrl').value, true));
      else if (act === 'remove') run(() => removeRepo(repo));
      else if (act === 'use-out') run(() => useOutput(repo));
      else if (act === 'out-set') run(setOutput);
      else if (act === 'clone') run(clonePush);
      else if (act === 'run-status') run(runStatus);
      else if (act === 'classic') { setOpen(false); const w = window.EmberWorkspace; if (w && w.open) setTimeout(w.open, 150); }
    });
    panel.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || busy) return;
      if (e.target.id === 'egFindQ') { e.preventDefault(); guard(() => findRun('search', 1, false)).then(m => { if (m) { find.msg = m; paintFind(); } }); }
      else if (e.target.id === 'egUrl') { e.preventDefault(); guard(() => addRepo($('egUrl').value, true)); }
    });
    backdrop.addEventListener('click', () => setOpen(false));
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); setOpen(false); } });
    let sx = 0, sy = 0, tr = false;
    panel.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tr = e.touches.length === 1 && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName); }, { passive: true });
    panel.addEventListener('touchend', e => { if (!tr) return; tr = false; const t = e.changedTouches[0]; if (t.clientX - sx > 90 && Math.abs(t.clientY - sy) < 50) setOpen(false); }, { passive: true });

    // The Control Panel's "Repositories & Brain" now opens this single panel (real taps only; scripts still reach the classic screen).
    D.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('#eccRepos');
      if (!b || !e.isTrusted) return;
      e.preventDefault(); e.stopImmediatePropagation(); openPanel();
    }, true);

    const g = G();
    g.sub(ev => { if (ev && (ev.type === 'state' || ev.type === 'feed')) { paintExternal(); schedule(); } });
    window.addEventListener('ember-repo-config', () => { paintExternal(); schedule(); });
    window.addEventListener('ember-repo-runner-dispatched', () => { paintExternal(); schedule(); });
    setInterval(() => { paintExternal(); if (isOpen) paintStrip(); }, 30000); // keeps "synced 5 min ago" honest

    window.EmberGit = { open: openPanel, close: () => setOpen(false), isOpen: () => isOpen, summary, line: () => oneLine(summary()) };
    announce();
  });
})();
