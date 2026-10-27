// Ember V1.9.20 - ember_timeline.js: the live thinking timeline inside chat replies (add-on pattern, like ai_music.js).
// While Ember works, a card replaces the three typing dots: grey dots for what it is thinking, square terminal icons for each tool it runs
// (with a SUCCESS / FAILED pill), and an orange radar dot on "Thinking…". When the reply lands the card is saved on that message as a
// collapsed "Worked through N steps" row. It shows only what really happened: tool names, results, ReAct thoughts. Nothing is invented.
// app.js calls: begin(), note(), tool(), snapshot(), drop(), liveHtml(), savedHtml(). ReAct thoughts arrive through the 'ember-react' event.
'use strict';
(() => {
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const MAX_STEPS = 30, TEXT_MAX = 110;
const TERM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l6-6-6-6M12 19h8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let live = null, open = true; // live = { steps: [{ k: 't'|'x', text, st: 'run'|'ok'|'bad', ms }], t0, seen: {} }

// ---------- words for tools ----------
const host = u => { try { return new URL(/^https?:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch (e) { return clip(u, 30); } };
function label(tool, a) {
  a = a && typeof a == 'object' ? a : {};
  const q = a.query || a.q || a.text || a.goal || a.title || a.name || '';
  switch (tool) {
    case 'scrape_url': return 'Reading ' + (a.url ? host(a.url) : 'a page');
    case 'web_search': return 'Searching the web' + (q ? ': ' + clip(q, 40) : '');
    case 'search_in_document': return 'Searching a document' + (q ? ': ' + clip(q, 40) : '');
    case 'read_document_chunk': return 'Reading document chunk' + (a.chunk ? ' #' + clip(a.chunk, 8) : '');
    case 'get_document_outline': return 'Reading the document outline';
    case 'read_document': return 'Reading a document';
    case 'list_documents': return 'Listing your documents';
    case 'find_in_app': return 'Looking inside the app' + (q ? ': ' + clip(q, 40) : '');
    case 'run_react': return 'Working it out step by step';
    case 'run_plan': return 'Running a plan';
    case 'list_sites': return 'Checking your saved sites';
    default: return clip(String(tool || 'tool').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) + (q ? ': ' + clip(q, 36) : ''), 70);
  }
}
const failed = r => !!(r && typeof r == 'object' && (r.error || r.ok === false));

// ---------- the run ----------
function begin() {
  live = { steps: [], t0: Date.now(), seen: {} };
  const old = $('typ'); if (old) old.remove();
  const log = $('log'); if (!log) return;
  log.insertAdjacentHTML('beforeend', '<div class="msg a tlive" id="typ">' + cardInner(live.steps, true, 0) + '</div>');
  log.scrollTop = log.scrollHeight;
}
function drop() { live = null; const old = $('typ'); if (old) old.remove(); }
function paint() {
  const el = $('typ'); if (!el || !live) return;
  el.innerHTML = cardInner(live.steps, true, 0);
  const log = $('log'); if (log) log.scrollTop = log.scrollHeight;
}
function push(s) { if (!live) return null; live.steps.push(s); if (live.steps.length > MAX_STEPS) live.steps.shift(); return s; }
function note(text, key) {
  if (!live || !text) return;
  if (key) { if (live.seen[key]) return; live.seen[key] = 1; }
  const t = clip(text, TEXT_MAX), last = live.steps[live.steps.length - 1];
  if (last && last.k == 't' && last.text == t) return;
  push({ k: 't', text: t, st: 'ok' }); paint();
}
// wraps one tool call: const h = tool(name, args); ...run...; h.end(result)
function tool(name, args) {
  const s = push({ k: 'x', text: label(name, args), st: 'run', t0: Date.now() });
  if (s) paint();
  return { end(res) { if (!s) return; s.st = failed(res) ? 'bad' : 'ok'; s.ms = Date.now() - s.t0; paint(); } };
}
// what gets saved on the reply: only when a tool ran or ReAct thought out loud (a plain answer keeps no card)
function snapshot() {
  if (!live) return null;
  const st = live.steps.filter(s => s.st != 'run' || s.k == 'x');
  if (!st.some(s => s.k == 'x')) return null;
  return { ms: Date.now() - live.t0, s: st.slice(-MAX_STEPS).map(s => [s.k, clip(s.text, TEXT_MAX), s.st == 'run' ? 'bad' : s.st, s.ms || 0]) };
}

// ---------- html ----------
function row(s) {
  if (s.k == 'x') {
    const pill = s.st == 'ok' ? '<span class="tl-pill ok">SUCCESS</span>' : s.st == 'bad' ? '<span class="tl-pill bad">FAILED</span>' : '';
    return '<div class="tl-i act' + (s.st == 'run' ? ' run' : '') + '"><div class="tl-ic"><div class="tl-tool">' + TERM_SVG + '</div></div><div class="tl-c">' + esc(s.text) + pill + '</div></div>';
  }
  return '<div class="tl-i"><div class="tl-ic"><div class="tl-dot"></div></div><div class="tl-c">' + esc(s.text) + '</div></div>';
}
function cardInner(steps, isLive, ms) {
  const head = isLive ? 'Thinking…' : 'Summary';
  const body = open ? '<div class="tl-line">' + steps.map(row).join('') + (isLive ? '<div class="tl-i think"><div class="tl-act"><div class="tl-adot"></div></div><div class="tl-c">Thinking<span class="tl-el">…</span></div></div>' : '') + '</div>' : '';
  return '<div class="tl-h"><b>' + head + (ms ? ' <small>' + (ms / 1000).toFixed(1) + 's</small>' : '') + '</b><button class="tl-x" data-tl="toggle" aria-label="' + (open ? 'Collapse' : 'Expand') + ' thinking">' + (open ? '×' : '⌄') + '</button></div>' + body;
}
function liveHtml() { return live ? '<div class="msg a tlive" id="typ">' + cardInner(live.steps, true, 0) + '</div>' : ''; }
function savedHtml(tl) {
  if (!tl || !Array.isArray(tl.s) || !tl.s.length) return '';
  const n = tl.s.filter(x => x[0] == 'x').length, bad = tl.s.filter(x => x[0] == 'x' && x[2] == 'bad').length;
  const sum = 'Worked through ' + n + (n == 1 ? ' action' : ' actions') + (bad ? ' · ' + bad + ' failed' : '') + (tl.ms ? ' · ' + (tl.ms / 1000).toFixed(1) + 's' : '');
  const rows = tl.s.map(x => row({ k: x[0], text: x[1], st: x[2] }));
  return '<details class="tlsaved"><summary>' + esc(sum) + '</summary><div class="tl-line">' + rows.join('') + '</div></details>';
}

// ---------- events ----------
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-tl="toggle"]'); if (!b) return;
  open = !open; paint();
});
// ReAct thoughts: tool rows come from app.js runTool, so only the model's thinking is added here
window.addEventListener('ember-react', e => {
  const d = e.detail || {}; if (!live || d.type != 'thought') return;
  const RX = window.EmberEngine && window.EmberEngine.react, s = RX && RX.state && RX.state();
  const en = s && s.entries && s.entries.find(x => x.n === d.n && x.type == 'step');
  if (en && en.thought) note(en.thought, 'rx' + (s.startedAt || '') + ':' + d.n);
});

window.EmberTimeline = { begin, drop, note, tool, snapshot, liveHtml, savedHtml, label, _live: () => live, _failed: failed };
})();
