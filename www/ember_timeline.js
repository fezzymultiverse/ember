// Ember V1.9.42 - ember_timeline.js (single owner of the live thinking card; ReAct feeds it via upsert())
// Ember V1.9.31 - ember_timeline.js
// "Summary" card while Ember works on a reply: grey dot = thought, terminal icon = tool call
// (SUCCESS / FAILED pill), orange radar = active "Thinking...". Does NOT touch ember_think_inline.js
// or the ReAct process: during a run_react job this panel hides, letting the existing
// Summary card handle it.
// API surface unchanged so app.js wiring needs no edit:
//   begin()           – insert the panel (replaces the three typing dots)
//   note(text, key?)  – add a line of thinking text
//   tool(name, args)  – add a tool-call line; .end(result) marks it done / failed
//   snapshot()        – data to save on the reply (null when no tool ran)
//   drop()            – remove the panel
//   liveHtml()        – used by renderLog() to keep the panel alive
//   savedHtml(tl)     – "Thought for Xs" row above the final reply
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '\u2026' : s; };

  const CHEV = '<svg class="et-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';

  // V1.9.39: header like the mockup - spark icon + shimmering "Thinking…" / "Executing Tool…", then "Thought for Xs"
  const SPARK = '<svg class="tl-spark" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>';
  const DOWN = '<svg class="tl-chv" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';
  const secsOf = ms => ms ? (ms / 1000).toFixed(1) + 's' : '\u2013';
  const titleHtml = (running, tooling, ms) => '<h2 class="tl-title">' + SPARK + (running
    ? '<span class="tl-shimmer">' + (tooling ? 'Executing Tool\u2026' : 'Thinking\u2026') + '</span>'
    : '<span class="tl-done-t">Thought for ' + secsOf(ms) + '</span>') + '</h2>';

  const reactOn = () => false; // V1.9.42: one card for every run; ember_think_inline.js feeds ReAct steps into it

  // ---------- tool label helpers ----------
  const host = u => { try { return new URL(/^https?:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch (e) { return clip(u, 30); } };
  function label(tool, a) {
    a = a && typeof a === 'object' ? a : {};
    const q = a.query || a.q || a.text || a.goal || a.title || a.name || '';
    switch (tool) {
      case 'scrape_url':          return 'Reading ' + (a.url ? host(a.url) : 'a page');
      case 'web_search':          return 'Searching the web' + (q ? ': \u201c' + clip(q, 40) + '\u201d' : '');
      case 'search_in_document':
      case 'search_documents':    return 'Searching your document' + (q ? ': \u201c' + clip(q, 40) + '\u201d' : '');
      case 'read_document_chunk':
      case 'read_document':       return 'Reading your document' + (a.chunk ? ' (chunk #' + a.chunk + ')' : '');
      case 'get_document_outline':return 'Reading the document outline';
      case 'list_documents':      return 'Listing your documents';
      case 'youtube_search':      return 'Searching YouTube' + (q ? ': \u201c' + clip(q, 40) + '\u201d' : '');
      case 'run_react':           return 'Working it out step by step';
      case 'youtube_download':    return 'Downloading audio';
      case 'see_image':           return 'Looking at the image';
      case 'find_in_app':         return 'Looking in the app' + (q ? ': \u201c' + clip(q, 36) + '\u201d' : '');
      default: return clip(String(tool || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) + (q ? ': \u201c' + clip(q, 36) + '\u201d' : ''), 90);
    }
  }
  const failed = r => !!(r && typeof r === 'object' && (r.error || r.ok === false));

  // ---------- styles: 'tl' = existing Summary card, 'dd' = compact dropdown, 'claude' = animated status line ----------
  const SK = 'ember_think_style_v2'; // V1.9.43: start with the requested Claude-style dropdown by default
  const getStyle = () => { try { const v = localStorage.getItem(SK); return ['tl', 'dd', 'claude'].includes(v) ? v : 'claude'; } catch (e) { return 'claude'; } };
  const setStyle = v => { try { localStorage.setItem(SK, v); } catch (e) { /* private mode */ } };
  const nextStyle = () => ({ tl: 'dd', dd: 'claude', claude: 'tl' }[getStyle()] || 'tl');

  // ---------- state ----------
  const MAX = 20;
  let live = null; // { lines:[{text,bad}], t0, open, seen:{}, toolRan }

  // ---------- core ----------
  function begin() {
    live = { lines: [], t0: Date.now(), open: true, seen: {}, toolRan: false };
    // Hide the welcome hero as soon as a turn starts; otherwise it can sit behind
    // the live Summary card while the first user/assistant rows are being rendered.
    const empty = $('empty'); if (empty) empty.classList.add('hidden');
    const old = $('typ'); if (old) old.remove();
    const log = $('log'); if (!log) return;
    log.insertAdjacentHTML('beforeend', outerHtml());
    log.scrollTop = log.scrollHeight;
  }
  function drop() { live = null; const old = $('typ'); if (old) old.remove(); }

  function paint() {
    const el = $('typ'); if (!el || !live) return;
    el.className = 'et-think' + (reactOn() ? ' et-hide' : '');
    el.innerHTML = innerHtml();
    if (el.querySelectorAll) { // V1.9.39: only the new rows animate in
      const items = el.querySelectorAll('.tl-item:not(.tl-now)'), seen = live.shown || 0;
      items.forEach((it, i) => { if (i >= seen) it.classList.add('tl-new'); });
      live.shown = items.length;
    }
    const log = $('log'); if (log) log.scrollTop = log.scrollHeight;
  }

  function addLine(text, bad) {
    if (!live) return null;
    const line = { text, bad: !!bad, k: 't', st: '' };
    live.lines.push(line);
    if (live.lines.length > MAX) live.lines.shift();
    paint();
    return line;
  }

  function note(text, key) {
    if (!live || !text) return;
    text = clip(text, 120);
    if (key) { if (live.seen[key]) return; live.seen[key] = 1; }
    const last = live.lines[live.lines.length - 1];
    if (last && last.text === text) return;
    addLine(text, false);
  }

  function tool(name, args) {
    if (live) live.toolRan = true;
    const line = live ? addLine(label(name, args), false) : null;
    if (line) { line.k = 'a'; line.st = 'run'; paint(); } // V1.9.39: repaint so the RUNNING pill / "Executing Tool…" show while the tool works (they were set after the paint)
    return {
      end(res) { if (line) { line.bad = failed(res); line.st = line.bad ? 'bad' : 'ok'; paint(); } }
    };
  }

  // V1.9.42: keyed lines so ReAct can add a step once and update it as it moves thinking -> running -> done
  function upsert(key, text, k, st, opt) {
    if (!live || !key || !text) return null;
    opt = opt || {};
    live.keyed = live.keyed || {};
    let line = live.keyed[key];
    if (!line) {
      line = { text: '', bad: false, k: 't', st: '', key };
      live.keyed[key] = line; live.lines.push(line);
      if (live.lines.length > MAX) live.lines.shift();
    }
    line.text = clip(text, opt.max || 120); line.k = k || line.k || 't'; line.st = st || '';
    line.bad = st === 'bad'; line.pill = opt.pill || ''; line.err = opt.err ? clip(opt.err, 140) : '';
    if (line.k === 'a') live.toolRan = true;
    paint();
    return line;
  }
  function unkey(key) {
    if (!live || !live.keyed || !live.keyed[key]) return;
    const l = live.keyed[key]; live.lines = live.lines.filter(x => x !== l); delete live.keyed[key]; paint();
  }
  function collapse() { if (!live) return; live.open = false; paint(); }
  function snapshot() {
    if (!live || (!live.toolRan && live.lines.length < 2)) return null;
    return { ms: Date.now() - live.t0, lines: live.lines.slice(-MAX).map(l => [l.text, l.bad ? 1 : 0, l.k || 't', l.pill || '', l.err || '']) };
  }

  // ---------- html ----------
  const TERM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l6-6-6-6M12 19h8"/></svg>';
  const row = (text, k, st, pill, err) => {
    if (k !== 'a') return '<div class="tl-item"><div class="tl-ico"><div class="tl-dot"></div></div><div class="tl-txt">' + esc(text) + '</div></div>';
    const p = pill ? '<span class="tl-pill tl-pill-warn">' + esc(pill) + '</span>'
      : st === 'ok' ? '<span class="tl-pill tl-pill-ok">SUCCESS</span>'
      : st === 'bad' ? '<span class="tl-pill tl-pill-bad">FAILED</span>'
      : '<span class="tl-pill tl-pill-run">RUNNING</span>';
    return '<div class="tl-item tl-act' + (st === 'bad' ? ' tl-end-bad' : '') + '"><div class="tl-ico"><div class="tl-tool">' + TERM + '</div></div><div class="tl-txt"><span class="tl-name">' + esc(text) + '</span>' + p
      + (err ? '<div class="tl-err">' + esc(err) + '</div>' : '') + '</div></div>';
  };
  const nowRow = '<div class="tl-item tl-now"><div class="tl-ico"><div class="tl-live"></div></div><div class="tl-txt">Thinking<span class="tl-ell"></span></div></div>';

  function linesHtml(lines, active) {
    return '<div class="tl">' + (lines || []).map(l => row(l.text, l.k, l.st, l.pill, l.err)).join('') + (active ? nowRow : '') + '</div>';
  }

  const SW = '<button class="tl-x et-sw" data-et="style" aria-label="Switch thinking display" title="Switch thinking display">\u21c4</button>';
  function innerHtml() { // live only
    if (getStyle() === 'claude') {
      const last = live.lines[live.lines.length - 1];
      const status = last ? last.text : 'Preparing your response';
      const rows = live.lines.map(l => '<p class="et-line' + (l.bad ? ' et-bad' : '') + '">' + esc(l.text) + '</p>').join('');
      return '<div class="et-inner et-claude' + (live.open ? ' et-open' : '') + '">'
        + '<div class="et-hdr" data-et="toggle"><span class="et-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="et-status">' + esc(clip(status, 100)) + '</span>' + SW + CHEV + '</div>'
        + '<div class="et-body"><div class="et-lines"><div class="et-claude-log">' + (rows || '<p class="et-line et-muted">Getting started…</p>') + '</div></div></div></div>';
    }
    if (getStyle() === 'dd') {
      return '<div class="et-inner' + (live.open ? ' et-open' : '') + '">'
        + '<div class="et-hdr" data-et="toggle">' + CHEV + '<span class="et-shimmer">Thinking\u2026</span>' + SW + '</div>'
        + '<div class="et-body"><div class="et-lines">' + (live.lines.length ? live.lines.map(l => '<p class="et-line' + (l.bad ? ' et-bad' : '') + '">' + esc(l.text) + '</p>').join('') : '<p class="et-line et-muted">Starting\u2026</p>') + '</div></div></div>';
    }
    return '<div class="tl-card tl-run' + (live.open ? ' tl-open' : '') + '">'
      + '<div class="tl-hdr" data-et="toggle">' + titleHtml(true, (live.lines[live.lines.length - 1] || {}).st === 'run', 0) + '<span class="tl-meta">' + live.lines.length + ' steps</span>' + SW
      + '<span class="tl-chev2" data-et="toggle" aria-label="Collapse">' + DOWN + '</span></div>'
      + '<div class="tl-body">' + linesHtml(live.lines, true) + '</div></div>';
  }

  function outerHtml() {
    return '<div id="typ" class="et-think' + (reactOn() ? ' et-hide' : '') + '">' + innerHtml() + '</div>';
  }

  function liveHtml() { return live ? outerHtml() : ''; }

  function savedHtml(tl) {
    if (!tl || !Array.isArray(tl.lines) || !tl.lines.length) return '';
    const secs = tl.ms ? (tl.ms / 1000).toFixed(1) + 's' : '\u2013';
    if (getStyle() === 'claude') {
      const lns = tl.lines.map(l => '<p class="et-line' + (l[1] ? ' et-bad' : '') + '">' + esc(l[0]) + '</p>').join('');
      return '<details class="et-saved et-claude-saved"><summary><span class="et-dots et-done" aria-hidden="true"><i></i><i></i><i></i></span><span>Thought for ' + secs + '</span></summary><div class="et-lines"><div class="et-claude-log">' + lns + '</div></div></details>';
    }
    if (getStyle() === 'dd') {
      const lns = tl.lines.map(l => '<p class="et-line' + (l[1] ? ' et-bad' : '') + '">' + esc(l[0]) + '</p>').join('');
      return '<details class="et-saved"><summary>' + CHEV + '<span>Thought for ' + secs + '</span></summary><div class="et-lines">' + lns + '</div></details>';
    }
    const rows = tl.lines.map(l => row(l[0], l[2] === 'a' ? 'a' : 't', l[2] === 'a' ? (l[1] ? 'bad' : 'ok') : '', l[3], l[4])).join('');
    return '<div class="et-saved et-think"><div class="tl-card tl-saved"><div class="tl-hdr" data-et="saved">' + titleHtml(false, false, tl.ms) + '<span class="tl-meta">' + tl.lines.length + ' steps</span><span class="tl-chev2">' + DOWN + '</span></div><div class="tl-body"><div class="tl">' + rows + '</div></div></div></div>';
  }

  // ---------- events ----------
  // toggle open/closed: lightweight class flip, no innerHTML rebuild needed
  document.addEventListener('click', e => {
    const sw = e.target.closest && e.target.closest('[data-et="style"]');
    if (sw && live) { e.stopPropagation(); setStyle(nextStyle()); paint(); return; }
    const b = e.target.closest && e.target.closest('[data-et="toggle"]');
    if (!b || !live) return;
    live.open = !live.open;
    const c = b.closest('.tl-card'); if (c) c.classList.toggle('tl-open', live.open);
    const d = b.closest('.et-inner'); if (d) d.classList.toggle('et-open', live.open);
  });

  document.addEventListener('click', e => { // V1.9.39: saved "Thought for Xs" card opens / closes
    const h = e.target.closest && e.target.closest('[data-et="saved"]'); if (!h) return;
    const c = h.closest('.tl-card'); if (c) c.classList.toggle('tl-open');
  });

  // hide/show when ReAct starts or ends
  window.addEventListener('ember-react', e => {
    const t = (e.detail || {}).type;
    if (t === 'start' || t === 'end') paint();
  });

  window.addEventListener('ember-try', e => { const d = e.detail || {}; note('Asking ' + d.name + (d.model && d.model != 'openai' ? ' (' + d.model + ')' : '') + '…'); });
  // Keep provider fallback visible in the same thinking card used by every routed engine.
  // The router emits this only after a different engine has successfully answered.
  window.addEventListener('ember-switch', e => {
    const d = e.detail || {};
    const label = id => { try { return window.Prov && Prov.label ? Prov.label(id) : String(id || 'engine'); } catch (_) { return String(id || 'engine'); } };
    const why = Number(d.status) === 429 ? 'was rate limited'
      : Number(d.status) === 401 || Number(d.status) === 403 ? 'key was rejected'
      : 'was unavailable';
    note(label(d.from) + ' ' + why + '; switching to ' + label(d.to));
  });
  window.EmberTimeline = { getStyle, setStyle, begin, drop, note, tool, upsert, unkey, collapse, snapshot, liveHtml, savedHtml, label, _failed: failed, _live: () => live };
})();
