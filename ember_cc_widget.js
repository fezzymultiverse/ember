// Ember V1.10.5 - ember_cc_widget.js: fills the Command Centre widget at the bottom of Settings (the expandable one from V1.9.6) with the real controls.
// Brain (token + repo), Find & write (search -> write what you found into the brain -> push), Media (Stability / Puter), Live terminal.
'use strict';
(() => {
  const W = window, D = document, $ = id => D.getElementById(id), G = W.EmberGithub, R = W.EmberRepoRunner;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* storage blocked */ } } };
  const say = (text, stream) => { try { if (W.EmberCommandCenter) W.EmberCommandCenter.write({ tag: 'GIT', source: 'Command Centre', stream: stream || 'status', text: String(text) }); } catch (_) { /* terminal optional */ } };
  let open = false, busy = false, rows = [], picked = new Set(), query = '', msg = {}, urls = [];

  function mount() {
    const host = $('ccWidgetBody'); if (!host || $('cwxRoot')) return !!$('cwxRoot');
    const w = D.createElement('div'); w.id = 'cwxRoot'; w.className = 'cwx';
    w.innerHTML =
      '<div class="cwx-ticker" id="cwxTicker" aria-live="off">Live terminal: idle</div>' +
      '<div class="cwx-row"><button type="button" class="btn g" data-cw="term">Show live terminal</button><button type="button" class="btn g" data-cw="side">Context &amp; memory panel</button></div>' +

      '<h3 class="cwx-h"><span>1</span>Brain</h3>' +
      '<label class="cwx-lb" for="cwTok">GitHub token</label><input id="cwTok" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste token (kept on this phone only)">' +
      '<div class="cwx-row"><button type="button" class="btn g" data-cw="tok">Save token</button><button type="button" class="btn g" data-cw="check">Check access</button></div>' +
      '<label class="cwx-lb" for="cwBrain">Brain repo (also where everything is pushed)</label><input id="cwBrain" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="owner/repo or GitHub URL">' +
      '<button type="button" class="btn cwx-wide" data-cw="load">Load brain into Ember</button><p class="cwx-msg" id="cwBrainMsg" role="status"></p>' +

      '<h3 class="cwx-h"><span>2</span>Find repos &amp; write them to the brain</h3>' +
      '<input id="cwQ" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="What are you looking for?">' +
      '<div class="cwx-row"><button type="button" class="btn g" data-cw="search">Search GitHub</button><button type="button" class="btn g" data-cw="mine">My repos</button></div>' +
      '<div id="cwRes" class="cwx-list"></div>' +
      '<div class="cwx-row"><input id="cwOne" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="or paste owner/repo"><button type="button" class="btn g" data-cw="one">Add</button></div>' +
      '<button type="button" class="btn cwx-wide cwx-hot" id="cwPush" data-cw="push">Write to brain &amp; push</button><p class="cwx-msg" id="cwPushMsg" role="status"></p>' +

      '<h3 class="cwx-h"><span>3</span>Media</h3>' +
      '<div class="cwx-row"><button type="button" class="btn g" id="cwBridge" data-cw="bridge">Stability bridge: OFF</button><button type="button" class="btn g" data-cw="ai">All AI settings</button></div>' +
      '<div class="cwx-row"><select id="cwKind" aria-label="What to make"><option value="image">Image · Stability</option><option value="audio">Audio / music · Stability</option><option value="video">Video · Puter</option><option value="speech">Speech · Puter</option></select></div>' +
      '<textarea id="cwPrompt" rows="2" placeholder="Describe it, then Make"></textarea>' +
      '<button type="button" class="btn cwx-wide" data-cw="make">Make it</button><p class="cwx-msg" id="cwMediaMsg" role="status"></p><div id="cwArt" class="cwx-art"></div>';
    host.appendChild(w);
    w.addEventListener('click', onClick);
    w.addEventListener('keydown', e => { if (e.key !== 'Enter' || busy) return; if (e.target.id === 'cwQ') { e.preventDefault(); act('search'); } else if (e.target.id === 'cwOne') { e.preventDefault(); act('one'); } });
    const tk = $('eccTerminalTicker'); if (tk && W.MutationObserver) new MutationObserver(paintTicker).observe(tk, { childList: true, characterData: true, subtree: true });
    // the widget itself (ember_v96_ui.js) owns expand / collapse; this follows it
    if (W.MutationObserver) new MutationObserver(() => syncOpen()).observe(host, { attributes: true, attributeFilter: ['hidden'] });
    ['ember-git-state', 'ember-repo-config', 'ember-brain-pushed'].forEach(n => W.addEventListener(n, paint));
    W.addEventListener('ember-media-update', paintMedia); W.addEventListener('ember-plus-change', paintMedia); W.addEventListener('ember-plus-change', paintMedia);
    if (G && G.sub) G.sub(ev => { if (ev && ev.type === 'state') paint(); });
    syncOpen(); paintTicker(); return true;
  }
  function syncOpen() { const h = $('ccWidgetBody'); open = !!(h && !h.hidden); if (open) { paint(); paintMedia(); } else paintChip(); }
  function setOpen(v) { const t = $('ccWidgetToggle'); if (t && (!!v !== open)) t.click(); }
  function paintChip() {
    const c = D.querySelector('#ccWidget .ecc-chip'); if (!c) return;
    const on = !!(G && G.on()); let chip = on ? 'READY' : 'NO TOKEN';
    try { const st = G.syncState(), dg = G.digestOf(G.knowledgeSources()[0]); chip = st.running ? 'SYNCING' : dg && dg.syncedAt ? 'LOADED' : chip; } catch (_) { /* state not ready */ }
    if (c.textContent !== chip) c.textContent = chip;
  }
  const setMsg = (id, t) => { const e = $(id); if (e && e.textContent !== t) e.textContent = t; };
  function paintTicker() { const t = $('eccTerminalTicker'); const e = $('cwxTicker'); if (e) e.textContent = 'Live terminal: ' + ((t && t.textContent.trim()) || 'idle'); }
  function paint() {
    if (!$('cwxRoot')) return;
    paintChip();
    if (!open) return;
    const c = R ? R.config() : null, on = !!(G && G.on());
    if (c && D.activeElement !== $('cwBrain') && !$('cwBrain').value) $('cwBrain').value = c.brain;
    setMsg('cwBrainMsg', msg.brain || (on ? 'Token saved on this phone.' : 'Paste your token and press Save token.'));
    const linked = new Set(); $('cwRes').innerHTML = (msg.find ? '<p class="cwx-msg">' + esc(msg.find) + '</p>' : '') + rows.map(x => '<label class="cwx-repo"><input type="checkbox" data-pick="' + esc(x.repo) + '"' + (picked.has(x.repo) ? ' checked' : '') + '><span><b>' + esc(x.repo) + '</b>' + (x.private ? ' <em>private</em>' : '') + '<small>' + esc(x.description || '') + '</small></span></label>').join('') + (rows.length ? '<div class="cwx-row"><button type="button" class="btn g" data-cw="all">Tick top ' + Math.min(W.EmberBrainPush ? W.EmberBrainPush.MAX_REPOS : 15, rows.length) + '</button><button type="button" class="btn g" data-cw="none">Clear</button></div>' : '');
    $('cwPush').textContent = picked.size ? 'Write ' + picked.size + ' to brain & push' : 'Write to brain & push';
    setMsg('cwPushMsg', msg.push || 'Search, tick the repos, then push. One commit into your brain, no force-push.');
    const lk = $('cwPushMsg'); if (lk && msg.url) { const a = D.createElement('a'); a.href = msg.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = ' View commit'; lk.appendChild(a); }
  }
  async function paintMedia() {
    if (!$('ccWidget') || !open || !W.EmberMedia) return;
    const mp = W.EmberMediaPlus, b = $('cwBridge'); if (b) { const v = !!(mp && mp.bridgeOn()); b.textContent = 'Stability bridge: ' + (v ? 'ON' : 'OFF'); b.classList.toggle('cwx-on', v); }
    urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
    const box = $('cwArt'); if (!box) return; box.replaceChildren();
    for (const j of W.EmberMedia.jobs().filter(j => j.state === 'running')) { const p = D.createElement('p'); p.className = 'cwx-msg'; p.textContent = j.provider + ' ' + j.kind + ': running…'; const s = D.createElement('button'); s.type = 'button'; s.className = 'btn g'; s.textContent = 'Stop'; s.onclick = () => W.EmberMedia.cancel(j.id); p.append(' ', s); box.append(p); }
    try {
      for (const a of (await W.EmberMedia.list()).slice(0, 6)) {
        const card = D.createElement('div'); card.className = 'cwx-card'; const h = D.createElement('b'); h.textContent = a.name;
        const el = D.createElement(a.kind === 'image' ? 'img' : a.kind === 'video' ? 'video' : 'audio'), u = URL.createObjectURL(a.blob); urls.push(u); el.src = u; el.controls = true; el.preload = 'metadata'; el.alt = a.prompt || '';
        const dl = D.createElement('button'); dl.type = 'button'; dl.className = 'btn g'; dl.textContent = 'Download'; dl.onclick = () => W.EmberMedia.download(a);
        card.append(h, el, dl); box.append(card);
      }
    } catch (_) { /* artifact store unavailable */ }
  }
  function lockUI(v) { busy = v; const w = $('ccWidget'); if (!w) return; w.setAttribute('aria-busy', String(v)); w.querySelectorAll('button[data-cw]').forEach(b => { if (v) { b.dataset.was = b.disabled ? '1' : ''; b.disabled = true; } else { b.disabled = b.dataset.was === '1'; delete b.dataset.was; } }); }
  async function guard(fn, key) { if (busy) return; lockUI(true); try { await fn(); } catch (e) { msg[key] = String((e && e.message) || e); } finally { lockUI(false); paint(); paintMedia(); } }

  async function act(a) {
    if (a === 'term') { const bx = $('bSx'); if (bx) bx.click(); setTimeout(() => { const t = $('eccTerminalToggle'); if (t && t.getAttribute('aria-expanded') !== 'true') t.click(); const s = $('emberTerminal'); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' }); }, 200); return; }
    if (a === 'side') { const bx = $('bSx'); if (bx) bx.click(); setTimeout(() => { const b = $('bCommandCenter'); if (b) b.click(); }, 200); return; }
    if (a === 'ai') { if (W.EmberFeatures && W.EmberFeatures.open) { const acc = D.getElementById('acc_h_features'); if (acc) { acc.click(); setTimeout(() => { const e = $('efRouting'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 150); } else W.EmberFeatures.open(); } return; }
    if (a === 'bridge') { const P = W.EmberPlus; if (P && P._set) { P._set('stab', !P.isOn('stab')); if (P.isOn('stab') && W.EmberMediaPlus) W.EmberMediaPlus.enable(); paintMedia(); } return; }
    if (a === 'all') { rows.forEach(r => { if (picked.size < (W.EmberBrainPush ? W.EmberBrainPush.MAX_REPOS : 15)) picked.add(r.repo); }); paint(); return; }
    if (a === 'none') { picked.clear(); paint(); return; }
    if (a === 'tok') return guard(async () => { const v = $('cwTok').value; if (!v.trim()) { msg.brain = 'Paste a token first. The saved one was not changed.'; return; } const ok = G.setToken(v); $('cwTok').value = ''; msg.brain = ok ? 'Token saved on this phone.' : 'That does not look like a GitHub token.'; say('Token ' + (ok ? 'saved' : 'rejected')); }, 'brain');
    if (a === 'check') return guard(async () => { msg.brain = 'Checking access…'; paint(); const r = await G.status(); msg.brain = r.ok ? 'Connected as ' + (r.user || 'your account') + '. Brain repo reachable.' : (r.error || 'Access check failed.'); say('Access check: ' + msg.brain); }, 'brain');
    if (a === 'load') return guard(async () => { const res = R.applyBrain($('cwBrain').value); if (!res.ok) { msg.brain = res.error || 'Could not set the brain repo.'; return; } msg.brain = 'Loading ' + res.repo + '…'; paint(); say('Loading brain ' + res.repo); const out = await G.syncAll({ force: true }); msg.brain = out.ok ? 'Brain loaded: ' + res.repo + '. Ember uses it on every code question.' : (out.error || 'Sync failed.'); say('Brain sync ' + (out.ok ? 'finished' : 'failed: ' + msg.brain), out.ok ? 'status' : 'stderr'); }, 'brain');
    if (a === 'search' || a === 'mine') return guard(async () => {
      const q = $('cwQ').value.trim(); msg.url = ''; msg.push = '';
      if (a === 'search' && !q) { msg.find = 'Type what you are looking for first.'; rows = []; return; }
      msg.find = 'Searching…'; paint();
      const r = a === 'search' ? await R.search({ query: q, page: 1 }) : await R.owned({ page: 1 });
      if (!r.ok) { msg.find = r.error || 'Search failed.'; rows = []; return; }
      query = a === 'search' ? q : ''; rows = r.repositories || []; picked = new Set(rows.slice(0, 5).map(x => x.repo)); msg.find = rows.length ? (a === 'search' ? (r.total || rows.length) + ' result(s) for “' + q + '”. Top 5 are ticked.' : rows.length + ' of your repos. Top 5 are ticked.') : 'Nothing found.';
      say((a === 'search' ? 'Search “' + q + '”: ' : 'My repos: ') + rows.length + ' shown');
    }, 'find');
    if (a === 'one') return guard(async () => { const v = $('cwOne').value.trim(), c = G._clean.cleanRepo(v); if (!c) { msg.push = 'Use owner/repo or a GitHub URL.'; return; } if (!rows.some(r => r.repo.toLowerCase() === c.toLowerCase())) rows.unshift({ repo: c, description: 'added by hand' }); picked.add(c); $('cwOne').value = ''; msg.push = c + ' ticked.'; }, 'push');
    if (a === 'push') return guard(async () => {
      if (!W.EmberBrainPush) throw new Error('The brain writer did not load.');
      const list = [...picked]; if (!list.length) { msg.push = 'Tick at least one repo first.'; return; }
      msg.push = 'Reading ' + list.length + ' repo(s) and writing to the brain…'; msg.url = ''; paint();
      const r = await W.EmberBrainPush.write(list, { query, shown: rows });
      msg.push = 'Pushed ' + r.written.length + ' repo(s) to ' + r.brain + ' (' + r.commit.slice(0, 7) + ').' + (r.failed.length ? ' Skipped: ' + r.failed.join('; ') : ''); msg.url = r.url; picked.clear();
    }, 'push');
    if (a === 'make') return guard(async () => {
      const MP = W.EmberMediaPlus; if (!MP) throw new Error('The media engine did not load.');
      const kind = $('cwKind').value, p = $('cwPrompt').value.trim(); if (!p) { msg.media = 'Describe it first.'; setMsg('cwMediaMsg', msg.media); return; }
      setMsg('cwMediaMsg', 'Making ' + kind + '… this can take a few minutes.');
      const r = await MP.make(kind, kind === 'video' || kind === 'speech' ? 'puter' : 'stability', p);
      msg.media = r.ok ? 'Saved ' + r.name + ' in ' + r.secs + 's.' : r.error; setMsg('cwMediaMsg', msg.media);
    }, 'media');
  }
  function onClick(e) {
    const pk = e.target.closest('[data-pick]'); if (pk) { if (pk.checked) picked.add(pk.getAttribute('data-pick')); else picked.delete(pk.getAttribute('data-pick')); $('cwPush').textContent = picked.size ? 'Write ' + picked.size + ' to brain & push' : 'Write to brain & push'; return; }
    const b = e.target.closest('[data-cw]'); if (b && !b.disabled) act(b.getAttribute('data-cw'));
  }
  function start() {
    if (!G || !R) return;
    let n = 0; const t = setInterval(() => { if (mount() || ++n > 40) clearInterval(t); }, 150); // wait for the Settings widget to exist
    W.EmberCCWidget = { open: () => setOpen(true), close: () => setOpen(false), isOpen: () => open };
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
