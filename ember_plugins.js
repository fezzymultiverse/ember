// Ember V1.10.18-p11 - ember_plugins.js: the Plugins sheet behind the "+" menu (Web & Scraping, Media & Music)
// p11: the Web scraping switch is the first row again (the keyless panel now sits BELOW it), repaints keep scroll and never wipe the keyless panel,
// and Stability AI lives here (Media & Music) as a content-creation engine: key, one-time status check, add and remove.
// and the live abilities line Ember reads every turn (through EmberPlus.stateLine).
// Reads the same storage as ai_scraper.js (ember_scrape, ember_agent). It only COUNTS keys: no key value is shown, logged or put in a prompt.
'use strict';
(() => {
  const D = document, $ = id => D.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SCR = [['firecrawl', 'Firecrawl'], ['browserless', 'Browserless'], ['scraperapi', 'ScraperAPI'], ['scraperbee', 'ScrapingBee'], ['sting', 'Sting'], ['zenrows', 'ZenRows'], ['tavily', 'Tavily'], ['serpapi', 'SerpApi'], ['brightdata', 'Bright Data'], ['octoparse', 'Octoparse']];
  const SEARCHERS = ['serpapi', 'brightdata', 'firecrawl', 'scraperapi', 'scraperbee'];
  const load = k => { try { const o = JSON.parse(localStorage.getItem(k) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  function scrapers() {
    const s = load('ember_scrape'), a = load('ember_agent'), keys = s.keys || {}, more = s.more || {};
    const list = SCR.map(([id, name]) => {
      let n = id === 'tavily' ? (a.tavily ? 1 : 0) : (keys[id] ? 1 : 0);
      if (Array.isArray(more[id])) n += more[id].filter(Boolean).length;
      const ready = n > 0 && (id !== 'sting' || /^https:\/\//i.test(s.stingEndpoint || ''));
      return { id, name, n, ready };
    });
    const on = typeof s.on === 'boolean' ? s.on : list.some(x => x.n > 0);
    return { on, reader: s.reader !== false, list, live: list.filter(x => x.ready) };
  }
  function setScr(field, v) { const s = load('ember_scrape'); s[field] = !!v; try { localStorage.setItem('ember_scrape', JSON.stringify(s)); } catch (e) { /* storage blocked */ } }
  const P = () => window.EmberPlus;
  const songOk = () => { try { return !!(window.EmberAudd && window.EmberAudd.hasKey()); } catch (e) { return false; } };

  function abilities() {
    const s = scrapers(), p = P(), out = ['YOUR ABILITIES (live state of this phone for this turn; never claim anything not listed):'];
    if (s.on) out.push('Reading pages (scrape_url) is ON' + (s.live.length ? ', using his keys for ' + s.live.map(x => x.name + (x.n > 1 ? ' x' + x.n : '')).join(', ') + ' (keyed first, they take turns)' : ', but no scraper keys are saved') + (s.reader ? ', with the free reader as the last fallback.' : '; the free reader is OFF.'));
    else out.push('Reading pages (scrape_url) is OFF: if he wants a link read, tell him to switch on + > Web & Scraping > Web scraping.');
    const tav = s.list.find(x => x.id === 'tavily');
    out.push('Web search (web_search): ' + (tav && tav.n ? 'Tavily first' : 'no Tavily key') + (s.live.some(x => SEARCHERS.includes(x.id)) ? ', then his scraper search keys' : '') + ', then the built-in search.' + (p && p.isOn('web') ? ' Search is FORCED on for this chat.' : ''));
    out.push('Media (+ > Media & Music): Create image (Pollinations, Forge, Stability if a key is saved), Create audio and Create video (Stability), Create PDF. Stability bridge is ' + (p && p.isOn('stab') ? 'ON.' : 'OFF.'));
    out.push(songOk() ? 'Song ID works (Audd token saved).' : 'Song ID needs his Audd.io token (Settings > Music).');
    out.push('Music Brain (+ > Music Brain) is ' + (p && p.isOn('musicbrain') ? 'ON: music_lyrics, music_facts, music_search work with no key.' : 'OFF: lyrics and music facts are not looked up; say so if he asks.'));
    out.push('GitHub Brain, repos and GitHub settings live in Settings > Command Centre.');
    out.push('If a tool returns an error, quote the exact error.');
    return out.join(' ');
  }

  function section(tab) {
    close();
    if (window.EmberHub && window.EmberHub.section) return window.EmberHub.section(tab);
    const b = $('bSet'); if (!b) return;
    if (!$('settings') || !$('settings').classList.contains('show')) b.click();
    setTimeout(() => { const t = D.querySelector('#stabs [data-st="' + tab + '"]'); if (t) t.click(); }, 90);
  }

  const sw = (attrs, icon, title, sub, onv) => '<button type="button" class="epl-row" role="switch" aria-checked="' + !!onv + '" ' + attrs + '><span class="epl-ic">' + icon + '</span><span class="epl-tx"><b>' + title + '</b><small>' + sub + '</small></span><span class="epl-sw' + (onv ? ' on' : '') + '"></span></button>';
  const go = (attrs, icon, title, sub, dot) => '<button type="button" class="epl-row" ' + attrs + '>' + (dot ? '<span class="epl-dot ' + dot + '"></span>' : '') + '<span class="epl-ic">' + icon + '</span><span class="epl-tx"><b>' + title + '</b><small>' + sub + '</small></span><span class="epl-go">›</span></button>';

  function webView() {
    const s = scrapers(), p = P();
    let h = '<div class="epl-grp">' +
      sw('data-scr="on"', '🕸', 'Web scraping', s.on ? s.live.length + ' keyed provider' + (s.live.length === 1 ? '' : 's') + ' ready · they take turns' : 'Off: Ember cannot read links', s.on) +
      sw('data-flip="web"', '🌐', 'Force web search', 'This chat: search before answering anything current', p && p.isOn('web')) +
      sw('data-scr="reader"', '📖', 'Free reader fallback', 'Only used after every saved key has failed', s.reader) +
      '</div><h4 class="epl-h">Your scraper keys</h4><div class="epl-grp">';
    s.list.forEach(x => {
      const st = x.ready ? 'ok' : x.n ? 'warn' : 'none';
      const what = x.id === 'octoparse' ? 'task rows' : SEARCHERS.includes(x.id) ? 'read + search' : 'read';
      const sub = x.ready ? x.n + ' key' + (x.n === 1 ? '' : 's') + ' · ' + what : x.n ? 'needs an https endpoint' : 'no key';
      h += go('data-sec="scraping"', '<span class="epl-ini">' + esc(x.name.slice(0, 2)) + '</span>', esc(x.name), sub, st);
    });
    return h + '</div><div class="epl-btns"><button type="button" class="epl-btn hot" data-sec="scraping">Add keys &amp; run tests</button></div>';
  }
  function mediaView() {
    const p = P(), is = id => !!(p && p.isOn(id)), ok = songOk();
    return stabilityCard() + '<h4 class="epl-h">Create (next message)</h4><div class="epl-grp">' +
      sw('data-flip="image"', '🎨', 'Create image', 'Pollinations, Forge, then Stability if a key is saved', is('image')) +
      sw('data-flip="audio_gen"', '🎵', 'Create audio', 'Music or sound, made by Stability AI', is('audio_gen')) +
      sw('data-flip="video_gen"', '🎬', 'Create video', 'Stability images + music, composed on this phone', is('video_gen')) +
      sw('data-flip="pdf"', '📄', 'Create PDF', 'A full PDF document as an artifact', is('pdf')) +
      '</div><h4 class="epl-h">Always on</h4><div class="epl-grp">' +
      sw('data-flip="stab"', '⚡', 'Stability bridge', 'Ask in plain chat for images, audio or video', is('stab')) +
      '</div><h4 class="epl-h">Music</h4><div class="epl-grp">' +
      sw('data-flip="musicbrain"', '🎧', 'Music Brain', 'Real lyrics + facts from open sources, no key. Never guessed', is('musicbrain')) +
      go('data-fire="audio"', '👂', 'Identify a song', ok ? 'Listens for 10 seconds' : 'Needs your Audd.io token', ok ? 'ok' : 'none') +
      go('data-fire="upload"', '📎', 'Identify from a file', 'Pick an audio file') +
      go('data-sec="music"', '🎧', 'Music settings', 'Player, song ID token, music control') +
      go('data-sec="keys"', '🎛', 'Media engines', 'Engine choice, status and checks') +
      '</div>';
  }


  // ---------- Stability AI: a content-creation engine (image + audio), not a chat provider ----------
  // Keys still live in the router's store (Prov.keys().stability) so the media code keeps working; only the UI moved here.
  // Status is checked ONCE (when the card is first opened with a key that has no fresh status) or when Check is tapped. Never on every paint.
  const STAB_LINK = 'https://platform.stability.ai/dashboard/api-keys';
  let stabBusy = false, stabMsg = '', stabAuto = false;
  const stabState = () => { const Pv = window.Prov; try { return Pv && Pv.stateOf ? Pv.stateOf('stability') : 'none'; } catch (e) { return 'none'; } };
  function stabilityCard() {
    const Pv = window.Prov; if (!Pv || !Pv.CFG || !Pv.CFG.stability) return '';
    const list = (Pv.entries('stability') || []), st = stabState(), n = list.length;
    const dot = stabBusy ? '' : st === 'ok' ? 'ok' : (st === 'limited' || st === 'unknown') ? 'warn' : '';
    const line = stabBusy ? 'Checking the key…' : st === 'none' ? 'No key saved' : st === 'ok' ? 'Key works · image and audio ready' : st === 'limited' ? 'Key is valid but resting (rate limited)' : st === 'bad' ? 'Key rejected or unreachable' : 'Key saved · not checked yet';
    let h = '<h4 class="epl-h">Stability AI · image &amp; audio engine</h4><div class="epl-grp" id="eplStab">' +
      '<div class="epl-row epl-static">' + (dot || stabBusy ? '<span class="epl-dot ' + dot + '"></span>' : '<span class="epl-dot"></span>') + '<span class="epl-ic">🎨</span><span class="epl-tx"><b>Stability AI</b><small>' + esc(stabMsg || line) + (n ? ' · ' + n + ' key' + (n === 1 ? '' : 's') : '') + '</small></span></div>';
    list.forEach(e => {
      const bad = e.st && e.st.ok === false;
      h += '<div class="epl-row epl-static"><span class="epl-ic">🔑</span><span class="epl-tx"><b>' + esc(Pv.mask(e.key)) + '</b><small>' + esc(!e.st ? 'not checked yet' : e.st.ok ? (e.st.limited ? 'valid · resting' : 'authenticated') : (bad ? String(e.st.msg || 'rejected').slice(0, 60) : '')) + '</small></span><button type="button" class="epl-mini" data-stab-rm="' + esc(e.key) + '" aria-label="Remove this key">✕</button></div>';
    });
    h += '<div class="epl-row epl-static epl-keyrow"><input type="password" id="eplStabKey" class="epl-in" placeholder="Paste a Stability API key (sk-…)" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Stability API key"><button type="button" class="epl-mini hot" data-stab-add>Add</button></div>' +
      '</div><div class="epl-btns epl-btns2"><button type="button" class="epl-btn" data-stab-check' + (n && !stabBusy ? '' : ' disabled') + '>' + (stabBusy ? 'Checking…' : 'Check key') + '</button><button type="button" class="epl-btn" data-link="' + STAB_LINK + '">Get a key ↗</button></div>';
    return h;
  }
  async function stabCheck(force) {
    const Pv = window.Prov; if (!Pv || stabBusy) return; if (!(Pv.entries('stability') || []).length) return;
    stabBusy = true; stabMsg = ''; paint(true);
    try { await Pv.ping('stability'); } catch (e) { stabMsg = 'Could not reach Stability'; }
    stabBusy = false; paint(true); try { window.dispatchEvent(new Event('ember-names')); } catch (e) { /* header refresh is best effort */ }
  }
  async function stabAdd() {
    const Pv = window.Prov, i = $('eplStabKey'); if (!Pv || !i) return;
    const v = i.value.trim(); if (!v) { stabMsg = 'Paste a key first'; return paint(true); }
    stabBusy = true; stabMsg = ''; paint(true);
    let r; try { r = await Pv.addKey('stability', v); } catch (e) { r = { ok: false, why: 'failed' }; }
    stabBusy = false; stabMsg = r && r.ok ? '' : r && r.why === 'already added' ? 'That key is already saved' : 'That key could not be saved'; paint(true);
    try { window.dispatchEvent(new Event('ember-names')); } catch (e) { /* header refresh is best effort */ }
  }

  let sheet = null, back = null, tab = 'web', lastFocus = null, hideT = 0;
  function build() {
    back = D.createElement('div'); back.className = 'epl-back'; back.hidden = true;
    sheet = D.createElement('section'); sheet.id = 'emberPlugins'; sheet.className = 'epl'; sheet.hidden = true;
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Plugins');
    sheet.innerHTML = '<div class="epl-grab"></div><div class="epl-head"><b>Plugins</b><button type="button" class="epl-x" data-x aria-label="Close">✕</button></div>' +
      '<div class="epl-tabs" role="tablist"><button type="button" role="tab" data-tab="web">Web &amp; Scraping</button><button type="button" role="tab" data-tab="media">Media &amp; Music</button></div>' +
      '<div class="epl-body" id="eplBody"><div id="eplView"></div></div>';
    D.body.append(back, sheet);
    back.addEventListener('click', close);
    sheet.addEventListener('click', onClick);
  }
  // paint(force): rewrites ONLY #eplView (the keyless panel is its sibling and is never touched), keeps the scroll position, and
  // skips the repaint while a field in the view has focus (typing a key) unless force is set by the card itself.
  function paint(force) {
    if (!sheet || sheet.hidden) return;
    const body = $('eplBody'); if (!body) return;
    let view = $('eplView'); if (!view) { view = D.createElement('div'); view.id = 'eplView'; body.prepend(view); }
    if (!force && D.activeElement && view.contains(D.activeElement) && /^(INPUT|TEXTAREA)$/.test(D.activeElement.tagName)) return;
    sheet.querySelectorAll('[data-tab]').forEach(b => { const v = b.dataset.tab === tab; b.classList.toggle('on', v); b.setAttribute('aria-selected', String(v)); });
    const keep = body.scrollTop, typed = $('eplStabKey') ? $('eplStabKey').value : '', hadFocus = D.activeElement && D.activeElement.id === 'eplStabKey';
    view.innerHTML = tab === 'web' ? webView() : mediaView();
    const inp = $('eplStabKey'); if (inp) { inp.value = typed; if (hadFocus) try { inp.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }
    body.scrollTop = keep;
    if (tab === 'media' && !stabAuto && !stabBusy && stabState() === 'unknown') { stabAuto = true; setTimeout(() => stabCheck(false), 0); } // one status check, not one per paint
  }
  function open(t) {
    if (!sheet) build(); if (t) tab = t;
    clearTimeout(hideT); lastFocus = D.activeElement; sheet.hidden = false; back.hidden = false; D.body.classList.add('epl-on');
    requestAnimationFrame(() => sheet.classList.add('show')); paint();
    const x = sheet.querySelector('[data-x]'); if (x) try { x.focus({ preventScroll: true }); } catch (e) { /* no focus */ }
  }
  function close() {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove('show'); back.hidden = true; D.body.classList.remove('epl-on'); hideT = setTimeout(() => { sheet.hidden = true; }, 180);
    if (lastFocus && lastFocus.isConnected) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ }
  }
  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-x]')) return close();
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; const b0 = $('eplBody'); paint(true); if (b0) b0.scrollTop = 0; return; }
    const sa = t.closest('[data-stab-add]'); if (sa) return stabAdd();
    const sk = t.closest('[data-stab-check]'); if (sk) return stabCheck(true);
    const sr = t.closest('[data-stab-rm]'); if (sr) { try { window.Prov.removeKey('stability', sr.dataset.stabRm); } catch (e) { /* already gone */ } stabMsg = ''; try { window.dispatchEvent(new Event('ember-names')); } catch (e) { /* best effort */ } return paint(true); }
    const sc = t.closest('[data-scr]');
    if (sc) {
      const f = sc.dataset.scr, nv = !scrapers()[f]; setScr(f, nv);
      sc.setAttribute('aria-checked', String(nv)); const sp = sc.querySelector('.epl-sw'); if (sp) sp.classList.toggle('on', nv); // instant, before the repaint
      try { const tt = $('toast'); if (tt) { tt.textContent = (f === 'on' ? 'Web scraping ' : 'Free reader fallback ') + (nv ? 'on' : 'off'); tt.classList.add('show'); clearTimeout(onClick.t); onClick.t = setTimeout(() => tt.classList.remove('show'), 1800); } } catch (e) { /* toast optional */ }
      paintMenu(); try { window.dispatchEvent(new Event('ember-plus-change')); } catch (e) { /* listeners optional */ } return paint(true);
    }
    const fl = t.closest('[data-flip]'); if (fl) { const p = P(); if (!p || !p.flip) return; const id = fl.dataset.flip, v = p.flip(id); if (v && ['image', 'audio_gen', 'video_gen', 'pdf'].includes(id)) close(); else paint(); return; }
    const fi = t.closest('[data-fire]'); if (fi) { close(); const p = P(); if (p && p._fire) p._fire(fi.dataset.fire); return; }
    const se = t.closest('[data-sec]'); if (se) section(se.dataset.sec);
  }
  function paintMenu() {
    const s = scrapers(), p = P(), a = $('pmWebSum'), b = $('pmMediaSum');
    if (a) a.textContent = (s.on ? 'Scraping on · ' + s.live.length + ' keyed' : 'Scraping off') + (p && p.isOn('web') ? ' · search forced' : '');
    if (b) b.textContent = (songOk() ? 'Song ID ready' : 'Song ID needs token') + ' · bridge ' + (p && p.isOn('stab') ? 'on' : 'off');
  }
  D.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet && !sheet.hidden) { e.stopPropagation(); close(); } });
  window.addEventListener('ember-plus-change', () => { paint(); paintMenu(); });
  window.addEventListener('storage', () => { paint(); paintMenu(); });
  D.addEventListener('click', e => { if (e.target.closest && e.target.closest('#bPlus')) paintMenu(); });
  window.EmberPlugins = { open, close, abilities, scrapers, paintMenu };
  paintMenu();
})();
