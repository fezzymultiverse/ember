// Ember V1.9.75 - ember_github_ui.js: Settings > GitHub. One menu for everything GitHub.
//   Home     - sync switches, one-tap Sync all, and the exact text Ember is given about your repos
//   Repos    - the repo SLOTS: add by name or from your account, per-slot label / branch / role / write / sync / depth
//   Sync     - live progress per repo and a live feed of every file being indexed, read, changed or removed
//   Files    - browse the synced index of any repo, search paths or code, open a file
//   Activity - every GitHub call Ember itself made (so what it says it did can be checked)
//   Setup    - token, the optional cloud runner, cache and data
'use strict';
(() => {
const G = () => window.EmberGithub;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = () => $('ghHub');
if (!root() || !G()) return;

const VIEWS = [['home', 'Home'], ['repos', 'Repos'], ['sync', 'Sync'], ['files', 'Files'], ['act', 'Activity'], ['setup', 'Setup']];
const DEPTH_LABEL = { map: 'Map only', key: 'Key files', deep: 'Deep read' };
const DEPTH_HINT = { map: 'Index every path, read only the manifests (package.json etc.).', key: 'Index every path and read the README, manifests, configs and entry points.', deep: 'Index every path and read up to 80 source files, so Ember can search the code offline.' };
const KIND = { new: ['+', 'new'], changed: ['~', 'chg'], removed: ['−', 'del'], read: ['↓', 'rd'], same: ['=', 'inf'], skip: ['·', 'inf'], err: ['!', 'bad'], warn: ['!', 'chg'], info: ['i', 'inf'], done: ['✓', 'new'], run: ['▶', 'rd'] };
let advOpen = false, repl = null, view = 'home', filter = 'all', msg = {}, browse = null, fsel = '', fpath = '', fq = '', fmode = 'path', fc = null, openFile = null, rmId = '', rmT = 0, checking = false, status = null;

const toast = t => { const e = $('toast'); if (e) { e.textContent = t; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 2600); } };
const copy = async t => { try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); toast('Copied'); } catch (x) { toast('Could not copy'); } a.remove(); } };
const sw = (f, on, dis) => '<label class="gh-sw"><input type="checkbox" data-f="' + f + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '><span></span></label>';
const pct = n => '<div class="gh-bar"><i style="width:' + Math.max(0, Math.min(100, n | 0)) + '%"></i></div>';
const clock = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const slotById = id => G().slots().find(s => s.id == id);
const syncing = () => G().syncState().running;

// ---------- Home ----------
function home() {
  const g = G(), c = g.cfg(), sl = g.slots(), dg = g.digests(); let files = 0, cached = 0, last = 0;
  sl.forEach(s => { const d = dg[String(s.repo).toLowerCase()]; if (d) { files += d.files; cached += d.cached; last = Math.max(last, d.checkedAt || 0); } });
  const st = g.syncState(), prog = syncing() ? Object.keys(st.repos).map(k => st.repos[k]) : [];
  const avg = prog.length ? prog.reduce((a, x) => a + x.pct, 0) / prog.length : 0;
  return (g.token() ? '' : '<div class="gh-warn"><b>No token yet.</b> Public repos work without one, but private repos, writing and automatic sync need a Classic token. <button class="btn g gh-sm" data-a="view" data-v="setup">Add token</button></div>') +
    '<div class="gh-tiles"><div><b>' + sl.length + '<small>/' + g.MAX_SLOTS + '</small></b><span>repos</span></div><div><b>' + files.toLocaleString() + '</b><span>files indexed</span></div><div><b>' + cached.toLocaleString() + '</b><span>files read</span></div><div><b>' + (last ? g.ago(last).replace(' ago', '') : '–') + '</b><span>last check</span></div></div>' +
    '<div class="gh-sec"><div class="gh-row"><div><b>Let Ember use my repos in chat</b><small>On: every answer starts by reading the files your message points at. Nothing is written unless you ask.</small></div>' + sw('cfg.chat', c.chat) + '</div>' +
    '<div class="gh-row"><div><b>Sync my repos</b><small>Ember learns the repos in your slots straight from your token. No runner, no clone.</small></div>' + sw('cfg.sync', c.sync) + '</div>' +
    '<div class="gh-row"><div><b>Keep them fresh automatically</b><small>Checks when the app opens and every few minutes. Only changed files are fetched again.</small></div>' + sw('cfg.auto', c.auto, !c.sync) + '</div>' +
    '<div class="gh-row"><div><b>Check every</b></div><select data-f="cfg.interval"' + (c.sync && c.auto ? '' : ' disabled') + '>' + [5, 15, 30, 60, 120].map(m => '<option value="' + m + '"' + (c.interval == m ? ' selected' : '') + '>' + (m < 60 ? m + ' min' : m / 60 + ' h') + '</option>').join('') + '</select></div></div>' +
    '<div class="btnrow">' + (syncing() ? '<button class="btn danger" data-a="stop">Stop sync</button>' : '<button class="btn" data-a="syncall"' + (sl.length ? '' : ' disabled') + '>Sync all now</button>') + '<button class="btn g" data-a="view" data-v="sync">Watch live</button></div>' +
    (syncing() ? '<div class="gh-sec">' + pct(avg) + '<p class="hint">' + esc(prog.map(x => x.msg).slice(-1)[0] || 'Syncing...') + '</p></div>' : '') +
    (msg.home ? '<p class="hint">' + esc(msg.home) + '</p>' : '') +
    '<div class="gh-sec"><div class="gh-h">What Ember is told about your repos</div><p class="hint">This is the exact text added to her instructions. It is built from real sync results, never written by a model, and it comes with hard rules: read a file before explaining or editing it, a path that is not in the index does not exist, no placeholder code is ever pushed, and she can only say what a tool result says happened.</p>' +
    '<pre class="gh-pre">' + esc(g.stateBlock({ preview: true }) || 'Nothing yet. Add a repo in the Repos tab.') + '</pre><div class="btnrow"><button class="btn g" data-a="copyblock">Copy</button><button class="btn g" data-a="report">Open report as artifact</button></div></div>';
}

// ---------- Repos ----------
function slotCard(s, i) {
  const g = G(), d = g.digestOf(s), run = g.syncState().repos[s.id], busy = run && ['checking', 'indexing', 'reading'].includes(run.status), stale = d && Date.now() - d.checkedAt > g.cfg().interval * 120000;
  const dot = busy ? 'run' : run && run.status == 'error' ? 'bad' : !d ? 'off' : d.partial || (d.warn && d.warn.length) ? 'warn' : stale ? 'warn' : 'ok';
  const info = d ? d.files.toLocaleString() + ' files · ' + d.cached + ' read · ' + g.kb(d.bytes) + ' · checked ' + g.ago(d.checkedAt) + (d.stack.length ? '<br>' + esc(d.stack.join(' · ')) : '') : 'Not synced yet. Tap Sync now.';
  return '<div class="gh-slot"><div class="gh-sh"><span class="gh-dot ' + dot + '"></span><b>' + esc(s.repo) + '</b><span class="gh-n">Slot ' + (i + 1) + '</span></div>' +
    '<div class="gh-badges">' + (s.pin ? '<i class="b-rw">PINNED</i>' : '') + '<i class="' + (s.role == 'ref' ? 'b-ref' : 'b-mine') + '">' + (s.role == 'ref' ? 'REFERENCE' : 'MINE') + '</i>' + (s.write ? '<i class="b-rw">WRITE</i>' : '<i>READ-ONLY</i>') + (d && d.priv ? '<i>PRIVATE</i>' : '') + '<i>' + esc((d && d.branch) || s.branch || 'default branch') + (d ? '@' + esc(String(d.head).slice(0, 7)) : '') + '</i></div>' +
    '<p class="hint">' + info + (run && run.error ? '<br><span class="gh-bad">' + esc(run.error) + '</span>' : '') + (d && d.warn && d.warn.length ? '<br><span class="gh-amb">' + esc(d.warn[0]) + '</span>' : '') + '</p>' +
    '<div class="gh-grid"><label>Nickname<input type="text" data-s="' + s.id + '" data-f="label" value="' + esc(s.label) + '" placeholder="e.g. Ember app" maxlength="40" autocomplete="off"></label>' +
    '<label>Branch<input type="text" data-s="' + s.id + '" data-f="branch" value="' + esc(s.branch) + '" placeholder="default" autocapitalize="off" autocomplete="off" spellcheck="false"></label>' +
    '<label>Role<select data-s="' + s.id + '" data-f="role"><option value="mine"' + (s.role == 'mine' ? ' selected' : '') + '>Mine · read + write</option><option value="ref"' + (s.role == 'ref' ? ' selected' : '') + '>Reference · read-only</option></select></label>' +
    '<label>Depth<select data-s="' + s.id + '" data-f="depth">' + g.DEPTHS.map(k => '<option value="' + k + '"' + (s.depth == k ? ' selected' : '') + '>' + DEPTH_LABEL[k] + '</option>').join('') + '</select></label></div>' +
    '<p class="hint">' + esc(DEPTH_HINT[s.depth]) + '</p>' +
    '<div class="gh-row"><div><b>Pin (keep connected)</b><small>' + (s.pin ? 'Stays connected when you add new repos.' : 'When all slots are full, the oldest unpinned repo makes room for a new one.') + '</small></div>' + sw('pin:' + s.id, s.pin) + '</div>' +
    '<div class="gh-row"><div><b>Sync this repo</b></div>' + sw('sync:' + s.id, s.sync) + '</div>' +
    '<div class="gh-row"><div><b>Let Ember write to it</b><small>' + (s.role == 'ref' ? 'Reference repos are read-only.' : 'She still only pushes when you ask, and only files she has read.') + '</small></div>' + sw('write:' + s.id, s.write, s.role == 'ref') + '</div>' +
    '<div class="btnrow"><button class="btn gh-sm" data-a="syncone" data-s="' + s.id + '"' + (busy || syncing() ? ' disabled' : '') + '>Sync now</button><button class="btn g gh-sm" data-a="forcesync" data-s="' + s.id + '"' + (busy || syncing() ? ' disabled' : '') + '>Re-read all</button><button class="btn g gh-sm" data-a="browsefiles" data-s="' + s.id + '">Files</button><button class="btn g gh-sm" data-a="clear" data-s="' + s.id + '">Clear cache</button><button class="btn g danger gh-sm" data-a="remove" data-s="' + s.id + '">' + (rmId == s.id ? 'Tap again to remove' : 'Remove') + '</button></div></div>';
}
function repos() {
  const g = G(), sl = g.slots(), full = sl.length >= g.MAX_SLOTS, pins = sl.filter(s => s.pin).length;
  return '<div class="gh-sec"><div class="gh-h">' + (full ? 'Add a repo <small>slots full: adding replaces the oldest unpinned</small>' : 'Add a repo to slot ' + (sl.length + 1) + ' <small>' + sl.length + ' of ' + g.MAX_SLOTS + ' used · ' + pins + ' pinned</small>') + '</div>' +
    '<div class="btnrow"><input type="text" id="ghAdd" placeholder="owner/name or a github.com link" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn" data-a="add" style="width:auto;padding:0 16px">Add</button></div>' +
    (repl ? '<div class="gh-warn"><b>Make room?</b> ' + esc(repl.msg) + '<div class="btnrow"><button class="btn gh-sm" data-a="replaceok">Replace ' + esc(repl.victim.repo) + '</button><button class="btn g gh-sm" data-a="replaceno">Cancel</button></div></div>' : '') +
    '<div class="btnrow"><button class="btn g" data-a="browse"' + (g.token() ? '' : ' disabled') + '>Pick from my GitHub</button></div>' +
    (msg.add ? '<p class="hint ' + (msg.addBad ? 'gh-bad' : '') + '">' + esc(msg.add) + '</p>' : '<p class="hint">It is checked on GitHub first, then synced right away. Repos you can push to become <b>Mine</b>; the rest become <b>Reference</b>. You can change that per slot.</p>') +
    (browse ? '<div class="gh-list">' + (browse.loading ? '<p class="hint">Loading your repos...</p>' : browse.err ? '<p class="hint gh-bad">' + esc(browse.err) + '</p>' : browse.list.map(r => { const have = sl.some(s => s.repo.toLowerCase() == r.repo.toLowerCase()); return '<div class="gh-li"><div><b>' + esc(r.repo) + '</b><small>' + (r.priv ? 'private' : 'public') + (r.lang ? ' · ' + esc(r.lang) : '') + (r.push ? ' · you can push' : ' · read only') + (r.desc ? '<br>' + esc(r.desc) : '') + '</small></div>' + (have ? '<span class="gh-n">Added</span>' : '<button class="btn g gh-sm" data-a="addrepo" data-r="' + esc(r.repo) + '">Add</button>') + '</div>'; }).join('') + '<div class="btnrow"><button class="btn g gh-sm" data-a="closebrowse">Close list</button></div>') + '</div>' : '') +
    '<p class="hint" style="margin-top:10px">Ideas to study (read-only):</p><div>' + g.SUGGEST.filter(x => !sl.some(s => s.repo.toLowerCase() == x.toLowerCase())).map(x => '<button class="btn g gh-sm gh-chip" data-a="addref" data-r="' + esc(x) + '">+ ' + esc(x) + '</button>').join('') + '</div></div>' +
    (sl.length ? sl.map(slotCard).join('') : '<p class="hint">No repos yet. Add one above and Ember will learn it.</p>');
}

// ---------- Sync ----------
function progRows() {
  const g = G(), st = g.syncState(), ids = Object.keys(st.repos); if (!ids.length) return '<p class="hint">' + (st.last ? 'Last sync finished ' + g.ago(st.last) + '.' : 'Nothing is syncing. Tap Sync all.') + '</p>';
  return ids.map(k => { const x = st.repos[k], n = x.n; return '<div class="gh-pr"><div class="gh-sh"><b>' + esc(x.repo) + '</b><span class="gh-n ' + (x.status == 'error' ? 'gh-bad' : x.status == 'done' ? 'gh-ok' : '') + '">' + esc(x.status) + '</span></div>' + pct(x.pct) + '<p class="hint">' + esc(x.msg) + '<br>+' + n.new + ' new · ~' + n.changed + ' changed · −' + n.removed + ' removed · ↓' + n.read + ' read' + (n.same ? ' · ' + n.same + ' already cached' : '') + (n.err ? ' · ' + n.err + ' errors' : '') + '</p></div>'; }).join('');
}
function feedRows() {
  const all = G().feed(), keep = e => filter == 'all' || (filter == 'files' ? ['new', 'changed', 'removed', 'read'].includes(e.kind) : filter == 'bad' ? ['err', 'warn'].includes(e.kind) : e.kind == filter), rows = all.filter(keep).slice(-220).reverse();
  if (!rows.length) return '<p class="hint">' + (all.length ? 'No entries for this filter.' : 'The live feed fills as soon as a sync starts.') + '</p>';
  return rows.map(e => { const k = KIND[e.kind] || KIND.info; return '<div class="gh-fe ' + k[1] + '"><span class="gh-ic">' + k[0] + '</span><div><span class="gh-fp">' + esc(e.path || e.note) + '</span><small>' + esc(e.repo ? e.repo.split('/')[1] || e.repo : '') + (e.path && e.note ? ' · ' + esc(e.note) : '') + (e.size ? ' · ' + G().kb(e.size) : '') + ' · ' + clock(e.t) + '</small></div></div>'; }).join('');
}
function sync() {
  const g = G(), runs = g.logs().runs.slice().reverse().slice(0, 6), chips = [['all', 'All'], ['files', 'Files'], ['new', 'New'], ['changed', 'Changed'], ['removed', 'Removed'], ['bad', 'Problems']];
  return '<div class="btnrow">' + (syncing() ? '<button class="btn danger" data-a="stop">Stop</button>' : '<button class="btn" data-a="syncall">Sync all now</button>') + '</div><div id="ghProg">' + progRows() + '</div>' +
    '<div class="gh-chips">' + chips.map(c => '<button class="gh-chipb' + (filter == c[0] ? ' on' : '') + '" data-a="filter" data-v="' + c[0] + '">' + c[1] + '</button>').join('') + '</div><div id="ghFeed" class="gh-feed">' + feedRows() + '</div>' +
    (runs.length ? '<div class="gh-h" style="margin-top:12px">Recent syncs</div>' + runs.map(r => '<div class="gh-li"><div><b>' + g.ago(r.t) + (r.auto ? ' · auto' : '') + '</b><small>' + r.repos.map(x => esc(x.repo.split('/')[1] || x.repo) + (x.ok ? (x.same ? ' up to date' : ' +' + x.n + ' ~' + x.c + ' −' + x.r) : ' failed')).join(' · ') + ' · ' + Math.max(1, Math.round(r.dt / 1000)) + 's</small></div></div>').join('') : '');
}
function paintSync() { if (view != 'sync') return; const p = $('ghProg'), f = $('ghFeed'); if (p) p.innerHTML = progRows(); if (f) f.innerHTML = feedRows(); const b = root().querySelector('[data-a="syncall"],[data-a="stop"]'); if (b) { const s = syncing(); b.dataset.a = s ? 'stop' : 'syncall'; b.textContent = s ? 'Stop' : 'Sync all now'; b.classList.toggle('danger', s); } }

// ---------- Files ----------
async function loadFc() {
  const g = G(), s = slotById(fsel) || g.slots().find(x => g.digestOf(x)); if (!s) { fc = null; return; } fsel = s.id;
  const k = s.id + '|' + ((g.digestOf(s) || {}).head || ''); if (fc && fc.key == k) return;
  const t = await g.tree(s), f = await g.files(s); fc = { key: k, id: s.id, tree: t, files: f };
}
function filesView() {
  const g = G(), sl = g.slots(), ready = sl.filter(s => g.digestOf(s)); if (!sl.length) return '<p class="hint">Add a repo first.</p>'; if (!ready.length) return '<p class="hint">Nothing is synced yet. Sync a repo and its files show here.</p>';
  if (!fc || fc.id != (fsel || ready[0].id)) { loadFc().then(render); return '<p class="hint">Loading the index...</p>'; }
  const s = slotById(fc.id), t = fc.tree; if (!t) return '<p class="hint">No index for this repo yet.</p>';
  const pre = fpath ? fpath + '/' : '', dirs = {}, files = []; let out = '';
  const head = '<div class="gh-grid"><label>Repo<select data-f="fsel">' + ready.map(x => '<option value="' + x.id + '"' + (x.id == fc.id ? ' selected' : '') + '>' + esc(x.repo) + '</option>').join('') + '</select></label><label>Search<input type="text" id="ghQ" value="' + esc(fq) + '" placeholder="' + (fmode == 'code' ? 'text inside cached files' : 'part of a file path, * works') + '" autocapitalize="off" autocomplete="off" spellcheck="false"></label></div>' +
    '<div class="btnrow"><button class="gh-chipb' + (fmode == 'path' ? ' on' : '') + '" data-a="fmode" data-v="path">Paths</button><button class="gh-chipb' + (fmode == 'code' ? ' on' : '') + '" data-a="fmode" data-v="code">Inside code</button><span class="hint" style="margin:0 0 0 auto">' + t.items.length.toLocaleString() + ' files · ' + Object.keys(fc.files).length + ' read · ' + g.ago(t.at) + '</span></div>';
  if (fq.trim()) {
    const q = fq.trim().toLowerCase();
    if (fmode == 'code') { const hits = []; Object.keys(fc.files).sort().forEach(p => { const L = fc.files[p][1].split('\n'); for (let i = 0; i < L.length && hits.length < 60; i++) if (L[i].toLowerCase().includes(q)) hits.push([p, i + 1, L[i].trim().slice(0, 140)]); }); out = hits.length ? hits.map(h => '<div class="gh-li gh-tap" data-a="openfile" data-p="' + esc(h[0]) + '"><div><b>' + esc(h[0]) + ':' + h[1] + '</b><small class="gh-mono">' + esc(h[2]) + '</small></div></div>').join('') : '<p class="hint">No match in the ' + Object.keys(fc.files).length + ' cached files.</p>'; }
    else { const ws = q.split(/\s+/), hits = t.items.filter(i => { const l = i[0].toLowerCase(); return ws.every(w => w.includes('*') ? new RegExp(w.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'), 'i').test(i[0]) : l.includes(w)); }).slice(0, 100); out = hits.length ? hits.map(i => fileRow(i[0], i[2], i[0])).join('') : '<p class="hint">No path matches.</p>'; }
  } else {
    t.items.forEach(i => { if (!i[0].startsWith(pre)) return; const r = i[0].slice(pre.length), k = r.indexOf('/'); if (k < 0) files.push([r, i[2], i[0]]); else dirs[r.slice(0, k)] = (dirs[r.slice(0, k)] || 0) + 1; });
    const crumbs = ['<button class="gh-chipb" data-a="cd" data-p="">/</button>'].concat(fpath ? fpath.split('/').map((n, i, a) => '<button class="gh-chipb" data-a="cd" data-p="' + esc(a.slice(0, i + 1).join('/')) + '">' + esc(n) + '</button>') : []).join('');
    out = '<div class="gh-chips">' + crumbs + '</div>' + Object.keys(dirs).sort().map(n => '<div class="gh-li gh-tap" data-a="cd" data-p="' + esc(pre + n) + '"><div><b>📁 ' + esc(n) + '/</b><small>' + dirs[n] + ' files</small></div></div>').join('') + files.sort((a, b) => a[0].localeCompare(b[0])).slice(0, 200).map(f => fileRow(f[0], f[1], f[2])).join('') + (!Object.keys(dirs).length && !files.length ? '<p class="hint">Empty.</p>' : '');
  }
  return head + '<div class="gh-list">' + out + '</div>' + viewer(s);
}
const fileRow = (name, size, full) => { const c = fc.files[full] ? '<span class="gh-dot ok" title="read and cached"></span>' : '<span class="gh-dot off" title="indexed only"></span>'; return '<div class="gh-li gh-tap" data-a="openfile" data-p="' + esc(full) + '"><div><b>' + c + ' ' + esc(name) + '</b><small>' + G().kb(size) + '</small></div></div>'; };
function viewer(s) {
  if (!openFile) return ''; const o = openFile;
  return '<div class="gh-sec" id="ghView"><div class="gh-sh"><b class="gh-mono">' + esc(o.path) + '</b></div><p class="hint">' + esc(o.source || '') + (o.sha ? ' · ' + esc(String(o.sha).slice(0, 7)) : '') + '</p>' + (o.loading ? '<p class="hint">Loading...</p>' : o.err ? '<p class="hint gh-bad">' + esc(o.err) + '</p>' : '<pre class="gh-pre gh-code">' + esc(o.text.slice(0, 40000)) + (o.text.length > 40000 ? '\n… (showing the first 40,000 characters)' : '') + '</pre>') +
    '<div class="btnrow"><button class="btn g gh-sm" data-a="fcopy">Copy</button><button class="btn g gh-sm" data-a="fart">Open as artifact</button><button class="btn g gh-sm" data-a="flive">Load live</button><button class="btn g gh-sm" data-a="fclose">Close</button></div></div>';
}
async function openF(p) {
  const s = slotById(fc && fc.id); if (!s) return; const c = fc.files[p];
  if (c) { openFile = { path: p, text: c[1], sha: c[0], source: 'Cached copy from the last sync (' + G().ago(fc.tree.at) + ')' }; render(); scrollView(); return; }
  openFile = { path: p, loading: true, text: '' }; render(); const r = await G().readSlot(s, p, '', 0);
  openFile = r.ok ? { path: p, text: r.text, sha: r.sha, source: r.source + (r.more ? ' · first part only' : '') } : { path: p, text: '', err: r.error }; render(); scrollView();
}
const scrollView = () => setTimeout(() => { const v = $('ghView'); if (v && v.scrollIntoView) v.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);

// ---------- Activity ----------
function act() {
  const a = G().logs().act.slice().reverse();
  return '<p class="hint">Every GitHub call Ember made herself, newest first. If she says she read, searched or pushed something, it is listed here. If it is not listed, it did not happen.</p>' +
    (a.length ? a.slice(0, 80).map(x => '<div class="gh-li"><div><b><span class="gh-dot ' + (x.ok ? 'ok' : 'bad') + '"></span> ' + esc(x.tool) + '</b><small>' + esc((x.repo ? x.repo + ' · ' : '') + (x.path || '')) + '<br>' + (x.ok ? 'worked' : 'failed') + (x.note ? ': ' + esc(x.note) : '') + ' · ' + x.ms + ' ms · ' + clock(x.t) + '</small></div></div>').join('') : '<p class="hint">Nothing yet.</p>') +
    (a.length ? '<div class="btnrow"><button class="btn g danger" data-a="clearact">Clear log</button></div>' : '');
}

// ---------- Setup ----------
function setup() {
  const g = G(), c = g.cfg(), mine = g.slots().filter(s => s.role == 'mine'), r = g.rate();
  return '<div class="gh-sec"><div class="gh-h">Classic token</div><p class="hint">Make one at github.com/settings/tokens (Classic). Tick <b>repo</b> for private repos and writing' + (c.runner ? ', and <b>workflow</b> for the cloud runner' : '') + '. It stays on this phone, is never put in a backup, and is never shown to Ember or put in a prompt.</p>' +
    '<input type="password" id="ghTok" placeholder="' + (g.token() ? 'Token saved. Paste a new one to replace it.' : 'ghp_...') + '" autocomplete="off" spellcheck="false"><div class="btnrow"><button class="btn" data-a="savetok">Save token</button><button class="btn g" data-a="checktok"' + (g.token() ? '' : ' disabled') + '>' + (checking ? 'Checking...' : 'Check token') + '</button><button class="btn g danger" data-a="rmtok"' + (g.token() ? '' : ' disabled') + '>Remove</button></div>' +
    (status ? '<p class="hint ' + (status.ok ? 'gh-ok' : 'gh-bad') + '">' + (status.ok ? 'Token works for <b>' + esc(status.user) + '</b>. Scopes: ' + esc(status.scopes) + '.' + (status.rate_limit_left != null ? ' ' + status.rate_limit_left + ' API calls left this hour.' : '') + (status.warning ? '<br>' + esc(status.warning) : '') : esc(status.error)) + '</p>' : (r.remaining !== '' ? '<p class="hint">' + r.remaining + ' of ' + r.limit + ' GitHub API calls left this hour.</p>' : '')) + '</div>' +
    '<details class="gh-sec gh-adv" data-adv="1"' + (advOpen || c.runner ? ' open' : '') + '><summary class="gh-h">Advanced <small>cloud runner, optional</small></summary><div class="gh-row"><div><b>Allow GitHub Actions runs</b><small>Off by default. Repos sync without it. Turn it on only if you want Ember to run builds or tests on a GitHub machine.</small></div>' + sw('cfg.runner', c.runner) + '</div>' +
    (c.runner ? (mine.length ? '<div class="btnrow"><select id="ghRunRepo">' + mine.map(s => '<option value="' + esc(s.repo) + '">' + esc(s.repo) + '</option>').join('') + '</select><button class="btn g" data-a="installrunner"' + (g.token() ? '' : ' disabled') + '>Install runner</button></div>' : '<p class="hint">Add one of your own repos first.</p>') + (msg.runner ? '<p class="hint">' + esc(msg.runner) + '</p>' : '') + '<p class="hint">A public repo makes run logs and Release files public. Use a private repo for anything you do not want seen.</p>' : '') + '</details>' +
    '<div class="gh-sec"><div class="gh-h">How a sync works</div><p class="hint">1. Checks the branch head (one call; if nothing moved, it stops). 2. Downloads the full file tree: that is the index, so Ember knows every path that exists. 3. Reads the files that matter at the slot\'s depth, only the ones that changed. 4. Builds the repo profile from those facts. Secrets in file text are masked, and .env and key files are never read.</p></div>' +
    '<div class="gh-sec"><div class="gh-h">Data on this phone</div><div class="btnrow"><button class="btn g" data-a="clearall">Clear all synced data</button><button class="btn g danger" data-a="wipeall">Remove token, slots and data</button></div>' + (msg.data ? '<p class="hint">' + esc(msg.data) + '</p>' : '') + '</div>';
}

// ---------- shell ----------
let pend = 0;
function render() {
  const r = root(); if (!r) return; const a = document.activeElement; if (a && r.contains(a) && a.tagName == 'INPUT' && ['text', 'password', 'search'].includes(a.type) && a.id != 'ghAdd' && a.id != 'ghQ' && a.id != 'ghTok') return; // never redraw under a field he is typing in
  const body = view == 'home' ? home() : view == 'repos' ? repos() : view == 'sync' ? sync() : view == 'files' ? filesView() : view == 'act' ? act() : setup();
  const addv = $('ghAdd') ? $('ghAdd').value : '', qv = $('ghQ') ? $('ghQ').value : null, tv = $('ghTok') ? $('ghTok').value : '', hadQ = a && a.id == 'ghQ', hadA = a && a.id == 'ghAdd';
  r.innerHTML = '<div class="gh-nav">' + VIEWS.map(v => '<button class="gh-tab' + (view == v[0] ? ' on' : '') + '" data-a="view" data-v="' + v[0] + '">' + v[1] + (v[0] == 'sync' && syncing() ? ' <i class="gh-live"></i>' : '') + '</button>').join('') + '</div><div class="gh-body">' + body + '</div>';
  if ($('ghAdd') && addv) $('ghAdd').value = addv; if ($('ghTok') && tv) $('ghTok').value = tv; if ($('ghQ') && qv != null) { $('ghQ').value = qv; if (hadQ) { $('ghQ').focus(); try { const n = $('ghQ').value.length; $('ghQ').setSelectionRange(n, n); } catch (e) { /* not selectable */ } } } if (hadA && $('ghAdd')) $('ghAdd').focus();
}
const renderSoon = () => { clearTimeout(pend); pend = setTimeout(render, 160); };
const setView = v => { view = v; msg = {}; if (v == 'files') { fc = null; } render(); const s = $('settings'); if (s) s.scrollTop = 0; };

async function doSync(list, force, stay) {
  const g = G(); if (syncing()) return; msg.home = ''; if (!stay) setView('sync'); else render();
  const r = await g.syncAll({ slots: list, force: !!force }); msg.home = r.ok ? '' : r.error || ''; fc = null; render();
}
root().addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const g = G(), a = b.dataset.a, s = b.dataset.s ? slotById(b.dataset.s) : null;
  if (a == 'view') return setView(b.dataset.v);
  if (a == 'syncall') return doSync(null, false);
  if (a == 'stop') { g.cancelSync(); return toast('Stopping after the current file...'); }
  if (a == 'syncone' && s) return doSync([s], false);
  if (a == 'forcesync' && s) return doSync([s], true);
  if (a == 'browsefiles' && s) { fsel = s.id; fpath = ''; fq = ''; openFile = null; return setView('files'); }
  if (a == 'clear' && s) { await g.clearCache(s); fc = null; toast('Cache cleared for ' + s.repo); return render(); }
  if (a == 'remove' && s) { if (rmId == s.id) { rmId = ''; await g.removeSlot(s.id); toast('Removed ' + s.repo); return render(); } rmId = s.id; clearTimeout(rmT); rmT = setTimeout(() => { rmId = ''; render(); }, 3500); return render(); }
  if (a == 'filter') { filter = b.dataset.v; return render(); }
  if (a == 'copyblock') return copy(g.stateBlock({ preview: true }));
  if (a == 'report') { const A = window.EmberArtifacts; if (A && A.view) A.view({ type: 'markdown', language: 'markdown', title: 'github-hub-report.md', content: g.buildReport() }); else copy(g.buildReport()); return; }
  if (a == 'add' || a == 'addrepo' || a == 'addref') {
    const v = a == 'add' ? ($('ghAdd') || {}).value : b.dataset.r; if (!String(v || '').trim()) return; msg.add = 'Checking ' + v + ' on GitHub...'; msg.addBad = false; render();
    const r = await g.addSlot(v, a == 'addref' ? { role: 'ref' } : {}); if (r.full && r.victim) { repl = { v, ref: a == 'addref', victim: r.victim, msg: r.error }; msg.add = ''; msg.addBad = false; return render(); } repl = null; msg.addBad = !r.ok; msg.add = r.ok ? 'Added ' + r.slot.repo + ' as ' + (r.slot.role == 'ref' ? 'a reference repo (read-only)' : 'your repo (read + write)') + '. Syncing...' : r.error; if (r.ok && $('ghAdd')) $('ghAdd').value = '';
    render(); if (r.ok && g.cfg().sync) { fc = null; doSync([r.slot], false, true); } return;
  }
  if (a == 'replaceno') { repl = null; return render(); }
  if (a == 'replaceok' && repl) { const q = repl; repl = null; msg.add = 'Making room and checking ' + q.v + '...'; msg.addBad = false; render(); const r = await g.addSlot(q.v, Object.assign({ replace: true }, q.ref ? { role: 'ref' } : {})); msg.addBad = !r.ok; msg.add = r.ok ? 'Replaced ' + q.victim.repo + ' with ' + r.slot.repo + '. Syncing...' : r.error; if (r.ok && $('ghAdd')) $('ghAdd').value = ''; fc = null; render(); if (r.ok && g.cfg().sync) doSync([r.slot], false, true); return; }
  if (a == 'browse') { browse = { loading: true }; render(); const r = await g.myRepos(); browse = r.ok ? { list: r.repos } : { err: r.error }; return render(); }
  if (a == 'closebrowse') { browse = null; return render(); }
  if (a == 'cd') { fpath = b.dataset.p || ''; fq = ''; openFile = null; return render(); }
  if (a == 'fmode') { fmode = b.dataset.v; return render(); }
  if (a == 'openfile') return openF(b.dataset.p);
  if (a == 'fclose') { openFile = null; return render(); }
  if (a == 'fcopy' && openFile) return copy(openFile.text);
  if (a == 'fart' && openFile) { const A = window.EmberArtifacts; const ext = (openFile.path.split('.').pop() || '').toLowerCase(), lang = { py: 'python', sh: 'bash', js: 'javascript', kt: 'kotlin', md: 'markdown' }[ext] || ext; if (A && A.view) A.view({ type: ext == 'md' ? 'markdown' : 'code', language: lang, title: openFile.path.split('/').pop(), content: openFile.text }); return; }
  if (a == 'flive' && openFile && fc) { const sl = slotById(fc.id); openFile = Object.assign({}, openFile, { loading: true }); render(); const r = await g.readSlot(sl, openFile.path, '', 0); openFile = r.ok ? { path: openFile.path, text: r.text, sha: r.sha, source: r.source } : { path: openFile.path, text: '', err: r.error }; return render(); }
  if (a == 'clearact') { try { localStorage.removeItem('ember_gh_log'); } catch (x) { /* blocked */ } return render(); }
  if (a == 'savetok') { const el = $('ghTok'), had = !!(el && el.value.trim()), ok = had && g.setToken(el.value); if (el) el.value = ''; status = null; toast(ok ? 'GitHub token saved' : had ? 'That does not look like a GitHub token' : 'Paste a token first'); return render(); }
  if (a == 'rmtok') { g.setToken(''); status = null; toast('GitHub token removed'); return render(); }
  if (a == 'checktok') { checking = true; render(); status = await g.status(); checking = false; return render(); }
  if (a == 'installrunner') { const rp = ($('ghRunRepo') || {}).value; msg.runner = 'Installing the runner workflow in ' + rp + '...'; render(); const x = await g.installRunner(rp); msg.runner = x.ok ? 'Runner ' + x.action + ' in ' + x.repo + ' (' + x.file + ').' : 'Failed: ' + x.error; return render(); }
  if (a == 'clearall') { for (const x of g.slots()) await g.clearCache(x); fc = null; msg.data = 'Synced data cleared. Your slots and token are kept; Sync again to rebuild.'; return render(); }
  if (a == 'wipeall') { await g.wipe(); fc = null; openFile = null; msg.data = 'Token, slots and all synced data removed.'; return render(); }
});
root().addEventListener('change', e => {
  const el = e.target, f = el.dataset.f; if (!f) return; const g = G();
  if (f == 'cfg.sync') g.setCfg({ sync: el.checked }); else if (f == 'cfg.auto') g.setCfg({ auto: el.checked }); else if (f == 'cfg.runner') g.setCfg({ runner: el.checked }); else if (f == 'cfg.chat') g.setCfg({ chat: el.checked }); else if (f == 'cfg.interval') g.setCfg({ interval: el.value });
  else if (f == 'fsel') { fsel = el.value; fpath = ''; fq = ''; openFile = null; fc = null; }
  else if (f.startsWith('sync:')) g.updateSlot(f.slice(5), { sync: el.checked }); else if (f.startsWith('write:')) g.updateSlot(f.slice(6), { write: el.checked }); else if (f.startsWith('pin:')) g.updateSlot(f.slice(4), { pin: el.checked });
  else if (el.dataset.s) { const patch = {}; patch[f] = el.value; const r = g.updateSlot(el.dataset.s, patch); if (f == 'branch') toast('Branch saved. Sync to load it.'); if (!r.ok) toast(r.error); }
  render();
});
root().addEventListener('toggle', e => { if (e.target && e.target.dataset && e.target.dataset.adv) advOpen = e.target.open; }, true);
root().addEventListener('input', e => { if (e.target.id == 'ghQ') { fq = e.target.value; clearTimeout(pend); pend = setTimeout(render, 220); } });
root().addEventListener('keydown', e => { if (e.key == 'Enter' && e.target.id == 'ghAdd') { const b = root().querySelector('[data-a="add"]'); if (b) b.click(); } });
G().sub(ev => {
  if (!$('ghHub')) return;
  if (ev.type == 'feed' || ev.type == 'state') { if (view == 'sync') { clearTimeout(pend); pend = setTimeout(paintSync, 120); } else renderSoon(); }
  else if (ev.type == 'act' && view == 'act') renderSoon(); else if (ev.type == 'runs' && view == 'sync') renderSoon();
});
const tab = document.querySelector('.stab[data-st="github"]'); if (tab) tab.addEventListener('click', () => { render(); });
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-gh-open]'); if (b) { const st = document.querySelector('.stab[data-st="github"]'); if (st) st.click(); if (b.dataset.ghOpen) setView(b.dataset.ghOpen); } });
render();
window.EmberGithubUI = { render, setView };
})();
