// Ember V1.9.102 - ember_hub.js: NEW right-hand side panel ("Ember Hub").
// Opens when you tap Settings in the header dropdown. Your existing Settings screen is not modified:
// it stays available, untouched, through "Open classic settings" and through every row in this panel.
//   1) Ember Command Centre sits at the bottom as a live widget: tap it to expand.
//   2) API Keys: tap to drop down every provider with its logo, key count and masked keys.
//   3) Every Settings section listed as a clear option row.
// Key values are only ever shown masked (first 6 + last 4 characters, via Prov.mask).
'use strict';
(() => {
  const D = document, $ = id => D.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SECTIONS = [
    { id: 'general', ico: '☰', title: 'General, Persona & Memory', desc: 'Free Mode, your name, voice and pacing, memory, look, backup' },
    { id: 'keys', ico: '⛁', title: 'Engine Keys & Providers', desc: 'Which engine answers, API keys, Puter token, engine names' },
    { id: 'github', ico: '⌥', title: 'GitHub', desc: 'Knowledge Brain Repo, token, live files and activity' },
    { id: 'features', ico: '✦', title: 'Features', desc: 'AI routing, media artifacts, downloads and Repo Runner' },
    { id: 'advanced', ico: '⚙', title: 'Advanced', desc: 'Optional GitHub Actions Runner for builds and tests' },
    { id: 'scraping', ico: '🕸', title: 'Web Scraping', desc: 'Scraper keys, the free reader, health checks and tests' },
    { id: 'hacking', ico: '💻', title: 'Termux & Hacking', desc: 'Termux mode, pen-test persona and the built-in terminal' },
    { id: 'music', ico: '♫', title: 'Music', desc: 'Player, song identification, music control, documents' },
    { id: 'permissions', ico: '🔔', title: 'Permissions, Voice & Background', desc: 'Notifications, mic, battery, keep-alive, read aloud' }
  ];
  const STATE_LABEL = { ok: 'working', limited: 'rate-limited', bad: 'failing', unknown: 'not checked', none: 'no key' };
  const TAB_FOR_KIND = { scraper: 'scraping', 'web search': 'scraping', 'code host': 'github', 'song id': 'music' };
  const CC_WAIT = /^(No three-phase|Waiting for)/;

  let ccOpen = false;
  let isOpen = false, keysOpen = false, lastFocus = null, painting = false, checking = false;
  const openProv = new Set();
  let panel = null, backdrop = null;

  function ready(fn) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', fn); else fn(); }
  function badge(id) {
    try { if (window.EmberProviderBadge) return window.EmberProviderBadge(id); } catch (e) { /* logo is cosmetic */ }
    return '<span class="ehub-fallback" aria-hidden="true">' + esc(String(id).slice(0, 2).toUpperCase()) + '</span>';
  }

  function build() {
    backdrop = D.createElement('button');
    backdrop.type = 'button'; backdrop.id = 'ehubBackdrop'; backdrop.className = 'ehub-backdrop';
    backdrop.setAttribute('aria-label', 'Close side panel'); backdrop.tabIndex = -1; backdrop.hidden = true;

    panel = D.createElement('aside');
    panel.id = 'emberHub'; panel.className = 'ehub';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'ehubTitle'); panel.setAttribute('aria-hidden', 'true'); panel.inert = true;
    panel.innerHTML =
      '<div class="ehub-head"><div><span class="ehub-eyebrow">EMBER / SIDE PANEL</span><h2 id="ehubTitle">Settings</h2></div>' +
      '<button type="button" id="ehubClose" class="ehub-x" aria-label="Close side panel">✕</button></div>' +
      '<div class="ehub-body">' +

      '<section class="ehub-sec" aria-label="API keys">' +
        '<button type="button" class="ehub-row ehub-keys-btn" id="ehubKeysBtn" aria-expanded="false" aria-controls="ehubKeysList">' +
          '<span class="ehub-ico ehub-ico-green" aria-hidden="true">⛁</span>' +
          '<span class="ehub-rt"><b>API Keys</b><small id="ehubKeysSum">Tap to drop down every provider</small></span>' +
          '<span class="ehub-chev" aria-hidden="true">›</span></button>' +
        '<div id="ehubKeysList" class="ehub-keys" hidden></div>' +
      '</section>' +

      '<section class="ehub-sec" aria-label="GitHub">' +
        '<button type="button" class="ehub-row" id="ehubGitBtn">' +
          '<span class="ehub-ico ehub-ico-orange" aria-hidden="true">⌥</span>' +
          '<span class="ehub-rt"><b>GitHub · Brain &amp; Repos</b><small id="ehubGitSum">Load brain, find repos, clone and push</small></span>' +
          '<span class="ehub-chev" aria-hidden="true">›</span></button>' +
      '</section>' +

      '<section class="ehub-sec" aria-label="All settings">' +
        '<h3 class="ehub-h">All settings</h3>' +
        SECTIONS.map(s =>
          '<button type="button" class="ehub-row" data-go="' + s.id + '"><span class="ehub-ico" aria-hidden="true">' + s.ico + '</span>' +
          '<span class="ehub-rt"><b>' + esc(s.title) + '</b><small>' + esc(s.desc) + '</small></span><span class="ehub-chev" aria-hidden="true">›</span></button>'
        ).join('') +
      '</section>' +


      '<section class="ehub-cc" id="ehubCC" aria-label="Ember Command Centre widget">' +
        '<button type="button" class="ehub-cc-top" id="ehubCCToggle" aria-expanded="false" aria-controls="ehubCCBody"><span class="ehub-cc-ico" aria-hidden="true">◫</span>' +
        '<div class="ehub-cc-t"><b>Ember Command Centre</b><small id="ehubCCCtx">Waiting for a model request.</small></div>' +
        '<span class="ehub-chip"><i class="ehub-live"></i>LIVE</span><span class="ehub-chev" aria-hidden="true">›</span></button>' +
        '<div class="ehub-cc-body" id="ehubCCBody" hidden>' +
        '<div class="ehub-tiles">' +
          '<div class="ehub-tile"><small>Memory files</small><b id="ehubCCMem">0</b></div>' +
          '<div class="ehub-tile"><small>Terminal</small><b id="ehubCCTerm">Idle</b></div>' +
          '<div class="ehub-tile"><small>Log lines</small><b id="ehubCCLines">0</b></div>' +
        '</div>' +
        '<div class="ehub-cc-git"><small>GITHUB</small><p id="ehubCCGit">GitHub engine not loaded.</p></div>' +
        '<div class="ehub-cc-thought"><small>THOUGHT SUMMARY</small><p id="ehubCCThought">No three-phase summary yet.</p></div>' +
        '<div class="ehub-cc-btns"><button type="button" class="ehub-btn ehub-btn-hot" id="ehubCCOpen">Open Command Centre</button>' +
        '<button type="button" class="ehub-btn" id="ehubCCRepos">GitHub &amp; Repos</button></div>' +
      '</div>' +
      '</section>' +
      '</div>';

    D.body.appendChild(backdrop);
    D.body.appendChild(panel);
  }

  /* ---------------- open / close ---------------- */
  function setOpen(open) {
    if (open === isOpen || !panel) return;
    isOpen = open;
    if (open) lastFocus = D.activeElement;
    panel.classList.toggle('ehub-open', open);
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    backdrop.hidden = !open;
    D.body.classList.toggle('ehub-on', open);
    if (open) { paintCC(); paintKeys(); const c = $('ehubClose'); if (c) c.focus({ preventScroll: true }); }
    else if (lastFocus && lastFocus.isConnected) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* element may be gone */ } }
  }

  // Opens the original, untouched Settings screen (optionally on one section).
  function classic(tab) {
    setOpen(false);
    const bSet = $('bSet'); if (!bSet) return;
    if (!$('settings').classList.contains('show')) bSet.click(); // synthetic click: our interceptor ignores it, the original handler runs
    if (!tab) return;
    setTimeout(() => {
      const t = D.querySelector('#stabs [data-st="' + tab + '"]'); if (t) t.click();
      // the older keys side panel auto-opens on the Keys section; this panel replaces it, so tuck it away
      setTimeout(() => { const k = $('keysSidePanel'); if (k && k.classList.contains('show')) { const x = $('kspClose'); if (x) x.click(); } }, 260);
    }, 90);
  }

  function openCommandCentre(repos) {
    setOpen(false);
    setTimeout(() => {
      const b = $('bCommandCenter'), ecc = $('emberCommandCenter');
      if (b && !(ecc && ecc.classList.contains('ecc-open'))) b.click();
      if (repos) setTimeout(() => { const r = $('eccRepos'); if (r) r.click(); }, 380);
    }, 250);
  }

  /* ---------------- Command Centre widget ---------------- */
  function txt(id, fallback) { const e = $(id); return e && e.textContent != null && e.textContent !== '' ? e.textContent : fallback; }
  function paintCC() {
    if (!panel) return;
    const set = (id, v) => { const e = $(id); if (e && e.textContent !== v) e.textContent = v; };
    const thought = txt('eccThought', '').replace(/\s+/g, ' ').trim();
    set('ehubCCThought', !thought || CC_WAIT.test(thought) ? 'No three-phase summary yet. It appears here after Ember’s next reply.' : (thought.length > 220 ? thought.slice(0, 220) + '…' : thought));
    set('ehubCCMem', txt('eccMemoryCount', '0'));
    set('ehubCCTerm', txt('eccTerminalStatus', 'Idle'));
    set('ehubCCLines', (txt('eccTerminalCount', '0 lines').match(/\d+/) || ['0'])[0]);
    set('ehubCCCtx', txt('eccContextStatus', 'Waiting for a model request.'));
    try {
      if (window.EmberGit) {
        const g = window.EmberGit.summary();
        set('ehubCCGit', window.EmberGit.line());
        set('ehubGitSum', g.ready ? (g.synced ? g.brain + ' · ' + g.files + ' files' : 'Brain not loaded yet') + ' · ' + g.linked + ' linked · tap to manage' : 'Load brain, find repos, clone and push');
      }
    } catch (e) { /* github state is cosmetic here */ }
    const live = D.querySelector('#ehubCC .ehub-live'); if (live) live.classList.toggle('busy', /active/i.test(txt('eccTerminalStatus', '')));
  }
  function watchCC() {
    if (!window.MutationObserver) return;
    const mo = new MutationObserver(() => { if (isOpen) paintCC(); });
    ['eccThought', 'eccMemoryCount', 'eccTerminalStatus', 'eccTerminalCount', 'eccContextStatus'].forEach(id => {
      const e = $(id); if (e) mo.observe(e, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ---------------- API keys dropdown ---------------- */
  function keyState(e) {
    if (!e) return { cls: 'none', text: 'empty' };
    if (e.bad) return { cls: 'bad', text: 'rejected' };
    const s = e.st; if (!s) return { cls: 'unknown', text: 'not checked yet' };
    if (s.ok) return s.limited ? { cls: 'limited', text: 'rate-limited, key is valid' } : { cls: 'ok', text: 'working' + (s.ms ? ' · ' + s.ms + ' ms' : '') };
    return { cls: 'bad', text: s.msg || 'failed' };
  }
  function maskKey(P, k) {
    const v = String(k == null ? '' : k);
    try { if (P && typeof P.mask === 'function') return P.mask(v); } catch (e) { /* fall through */ }
    return v.length > 12 ? v.slice(0, 6) + '…' + v.slice(-4) : v.slice(0, 3) + '…';
  }
  function paintKeys() {
    if (!panel || painting) return;
    painting = true;
    try {
      const list = $('ehubKeysList'), sum = $('ehubKeysSum'), P = window.Prov;
      if (!list) return;
      if (!P || !P.IDS) { list.innerHTML = '<p class="ehub-note">Providers are not ready yet. Close and reopen this panel in a moment.</p>'; return; }
      let withKeys = 0, total = 0, html = '';
      P.IDS.forEach(id => {
        const c = P.CFG[id] || { name: id };
        let entries = []; try { entries = P.entries(id) || []; } catch (e) { /* state is cosmetic */ }
        let st = entries.length ? 'unknown' : 'none'; try { st = P.stateOf(id); } catch (e) { /* state is cosmetic */ }
        if (entries.length) withKeys++; total += entries.length;
        const open = openProv.has(id);
        html += '<div class="ehub-prov' + (open ? ' open' : '') + (entries.length ? '' : ' dim') + '" data-prov="' + esc(id) + '">' +
          '<button type="button" class="ehub-prow" aria-expanded="' + open + '" data-toggle="' + esc(id) + '">' +
            '<span class="ehub-dot ' + esc(st) + '" aria-hidden="true"></span>' + badge(id) +
            '<span class="ehub-rt"><b class="provider-title">' + esc(c.name) + '</b>' +
            '<small>' + (entries.length ? entries.length + ' key' + (entries.length === 1 ? '' : 's') + ' · ' + esc(STATE_LABEL[st] || st) : 'no key yet') + '</small></span>' +
            '<span class="ehub-chev" aria-hidden="true">›</span></button>' +
          '<div class="ehub-pbody"' + (open ? '' : ' hidden') + '>' +
            (entries.length ? entries.map((e, i) => {
              const ks = keyState(e);
              return '<div class="ehub-key"><span class="ehub-kn">#' + (i + 1) + '</span><code>' + esc(maskKey(P, e && e.key)) + '</code>' +
                '<span class="ehub-kst ' + ks.cls + '">' + esc(ks.text) + '</span></div>';
            }).join('') : '<p class="ehub-note">No key saved for ' + esc(c.name) + '. Add one in Engine Keys.</p>') +
            '<div class="ehub-pact">' +
              (entries.length ? '<button type="button" class="ehub-btn ehub-sm" data-check="' + esc(id) + '">Check key' + (entries.length === 1 ? '' : 's') + '</button>' : '') +
              '<button type="button" class="ehub-btn ehub-sm" data-manage="1">' + (entries.length ? 'Manage' : 'Add a key') + '</button>' +
            '</div>' +
          '</div></div>';
      });

      // Other keys Ember tracks (scrapers, Tavily, GitHub, Audd). Names and counts only.
      let extra = [];
      try {
        const K = window.EmberKeys; if (K && K.inventory) extra = K.inventory().filter(x => P.IDS.indexOf(x.id) < 0);
      } catch (e) { /* inventory is cosmetic */ }
      if (extra.length) {
        html += '<h4 class="ehub-h2">Search, scraping &amp; other keys</h4>';
        extra.forEach(x => {
          if (x.saved) { withKeys++; total += x.saved; }
          html += '<button type="button" class="ehub-prow ehub-extra' + (x.saved ? '' : ' dim') + '" data-go="' + esc(TAB_FOR_KIND[x.kind] || 'keys') + '">' +
            '<span class="ehub-dot ' + (x.saved ? 'ok' : 'none') + '" aria-hidden="true"></span>' +
            '<span class="ehub-fallback" aria-hidden="true">' + esc(String(x.name || x.id).slice(0, 2).toUpperCase()) + '</span>' +
            '<span class="ehub-rt"><b class="provider-title">' + esc(x.name) + '</b><small>' + esc(x.kind) + ' · ' + (x.saved ? x.saved + ' saved' : 'no key yet') + '</small></span>' +
            '<span class="ehub-chev" aria-hidden="true">›</span></button>';
        });
      }
      html += '<p class="ehub-note">Keys stay on this phone and are only shown masked. A provider with no key can never show green.</p>';
      list.innerHTML = html;
      if (sum) sum.textContent = total + ' key' + (total === 1 ? '' : 's') + ' across ' + withKeys + ' provider' + (withKeys === 1 ? '' : 's') + ' · tap to ' + (keysOpen ? 'close' : 'drop down');
    } finally { painting = false; }
  }
  function setCCOpen(open) {
    ccOpen = open;
    const cc = $('ehubCC'), btn = $('ehubCCToggle'), body = $('ehubCCBody');
    if (cc) cc.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', String(open));
    if (body) body.hidden = !open;
    if (open) { paintCC(); if (cc) setTimeout(() => { try { cc.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch (e) { /* older WebView */ } }, 30); }
  }
  function setKeysOpen(open) {
    keysOpen = open;
    const btn = $('ehubKeysBtn'), list = $('ehubKeysList');
    if (btn) { btn.setAttribute('aria-expanded', String(open)); btn.classList.toggle('open', open); }
    if (list) list.hidden = !open;
    paintKeys();
    if (open && btn) setTimeout(() => { try { btn.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { /* older WebView */ } }, 30);
  }
  async function checkProvider(id, btn) {
    const P = window.Prov; if (!P || typeof P.ping !== 'function' || checking) return;
    checking = true;
    const old = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
    try { await P.ping(id); } catch (e) { /* ping records its own failure state */ }
    checking = false; paintKeys();
  }

  /* ---------------- wiring ---------------- */
  ready(() => {
    if ($('emberHub')) return;
    build(); watchCC();

    // Real taps on Settings (header dropdown) open this panel. Programmatic clicks (other features) keep the classic screen.
    D.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('#bSet');
      if (!b || !e.isTrusted) return;
      e.preventDefault(); e.stopImmediatePropagation();
      setOpen(true);
    }, true);

    panel.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('#ehubClose')) { setOpen(false); return; }
      if (t.closest('#ehubKeysBtn')) { setKeysOpen(!keysOpen); return; }
      if (t.closest('#ehubCCToggle')) { setCCOpen(!ccOpen); return; }
      if (t.closest('#ehubCCOpen')) { openCommandCentre(false); return; }
      if (t.closest('#ehubCCRepos') || t.closest('#ehubGitBtn')) { if (window.EmberGit) { window.EmberGit.open(); } else { openCommandCentre(true); } return; }
      const chk = t.closest('[data-check]'); if (chk) { checkProvider(chk.getAttribute('data-check'), chk); return; }
      if (t.closest('[data-manage]')) { classic('keys'); return; }
      const tog = t.closest('[data-toggle]');
      if (tog) { const id = tog.getAttribute('data-toggle'); if (openProv.has(id)) openProv.delete(id); else openProv.add(id); paintKeys(); return; }
      const go = t.closest('[data-go]'); if (go) classic(go.getAttribute('data-go'));
    });
    backdrop.addEventListener('click', () => setOpen(false));
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); setOpen(false); } });

    // swipe right on the panel to dismiss
    let sx = 0, sy = 0, tracking = false;
    panel.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = e.touches.length === 1; }, { passive: true });
    panel.addEventListener('touchend', e => {
      if (!tracking) return; tracking = false;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = Math.abs(t.clientY - sy);
      if (dx > 90 && dy < 50) setOpen(false);
    }, { passive: true });

    window.addEventListener('ember-provider-stats', () => { if (isOpen) paintKeys(); });
    window.addEventListener('ember-names', () => { if (isOpen) paintKeys(); });
    window.addEventListener('ember-git-state', () => { if (isOpen) paintCC(); });
    window.EmberHub = { open: () => setOpen(true), close: () => setOpen(false), isOpen: () => isOpen };
  });
})();
