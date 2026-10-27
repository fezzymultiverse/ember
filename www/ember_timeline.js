// Ember V1.9.31 - ember_timeline.js
// Claude-style collapsible "Thinking…" panel while Ember works on a reply.
// Shows a shimmer header + collapsible text notes. Does NOT touch ember_think_inline.js
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

  const reactOn = () => {
    try { const s = window.EmberEngine && window.EmberEngine.react && window.EmberEngine.react.state && window.EmberEngine.react.state(); return !!(s && s.status === 'running'); }
    catch (e) { return false; }
  };

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
      case 'youtube_download':    return 'Downloading audio';
      case 'see_image':           return 'Looking at the image';
      case 'find_in_app':         return 'Looking in the app' + (q ? ': \u201c' + clip(q, 36) + '\u201d' : '');
      default: return clip(String(tool || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) + (q ? ': \u201c' + clip(q, 36) + '\u201d' : ''), 90);
    }
  }
  const failed = r => !!(r && typeof r === 'object' && (r.error || r.ok === false));

  // ---------- state ----------
  const MAX = 20;
  let live = null; // { lines:[{text,bad}], t0, open, seen:{}, toolRan }

  // ---------- core ----------
  function begin() {
    live = { lines: [], t0: Date.now(), open: true, seen: {}, toolRan: false };
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
    const log = $('log'); if (log) log.scrollTop = log.scrollHeight;
  }

  function addLine(text, bad) {
    if (!live) return null;
    const line = { text, bad: !!bad };
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
    return {
      end(res) { if (line) { line.bad = failed(res); paint(); } }
    };
  }

  function snapshot() {
    if (!live || !live.toolRan) return null;
    return { ms: Date.now() - live.t0, lines: live.lines.slice(-MAX).map(l => [l.text, l.bad ? 1 : 0]) };
  }

  // ---------- html ----------
  function linesHtml(lines) {
    if (!lines || !lines.length) return '<p class="et-line et-muted">Starting\u2026</p>';
    return lines.map(l => '<p class="et-line' + (l.bad ? ' et-bad' : '') + '">' + esc(l.text) + '</p>').join('');
  }

  function innerHtml() { // live only
    const openCls = live.open ? ' et-open' : '';
    return '<div class="et-inner' + openCls + '">'
      + '<div class="et-hdr" data-et="toggle">' + CHEV + '<span class="et-shimmer">Thinking\u2026</span></div>'
      + '<div class="et-body"><div class="et-lines">' + linesHtml(live.lines) + '</div></div>'
      + '</div>';
  }

  function outerHtml() {
    return '<div id="typ" class="et-think' + (reactOn() ? ' et-hide' : '') + '">' + innerHtml() + '</div>';
  }

  function liveHtml() { return live ? outerHtml() : ''; }

  function savedHtml(tl) {
    if (!tl || !Array.isArray(tl.lines) || !tl.lines.length) return '';
    const secs = tl.ms ? (tl.ms / 1000).toFixed(1) + 's' : '\u2013';
    const lns = tl.lines.map(l => '<p class="et-line' + (l[1] ? ' et-bad' : '') + '">' + esc(l[0]) + '</p>').join('');
    return '<details class="et-saved"><summary>' + CHEV + '<span>Thought for ' + secs + '</span></summary><div class="et-lines">' + lns + '</div></details>';
  }

  // ---------- events ----------
  // toggle open/closed: lightweight class flip, no innerHTML rebuild needed
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-et="toggle"]');
    if (!b || !live) return;
    live.open = !live.open;
    const inner = b.closest('.et-inner'); if (inner) inner.classList.toggle('et-open', live.open);
  });

  // hide/show when ReAct starts or ends
  window.addEventListener('ember-react', e => {
    const t = (e.detail || {}).type;
    if (t === 'start' || t === 'end') paint();
  });

  window.EmberTimeline = { begin, drop, note, tool, snapshot, liveHtml, savedHtml, label, _failed: failed, _live: () => live };
})();
