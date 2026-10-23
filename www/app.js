// Ember V1.3.0 - UI: chat, history, settings (keys, about, persona, memory + context, look, data).
'use strict';
(() => {
const { $, esc, LS, uid } = U;
const DEF = { name: '', about: '', pname: 'Ember', interests: 'how minds work, slang and language, music and how it gets made, strange history, ethics puzzles, space, why people do what they do, small design details', mode: 'sharp', learn: true, ctx: 'normal', summarize: true, persona: '', showEng: false, accent: '#FF005F', warm: 'warm', direct: 'balanced', humor: 'dry', pace: 'normal', talk: '' };
const WINS = { short: 1, normal: 1, long: 1 };
const ACCENTS = ['#FF005F', '#AF5FFF', '#00E5FF', '#5FFF00'];
let S = Object.assign({}, DEF, LS.get('ember_set', {}));
const MEM_DEF = () => ({ facts: [], threads: [], callbacks: [], patterns: {}, moodLog: [], futureLetters: [], deck: [] });
const migrateMem = m => {
  const base = MEM_DEF();
  if (!m || typeof m !== 'object') return base;
  const arr = k => (Array.isArray(m[k]) ? m[k] : []);
  return Object.assign(base, m, { facts: arr('facts'), threads: arr('threads'), callbacks: arr('callbacks'), patterns: (m.patterns && typeof m.patterns === 'object' && !Array.isArray(m.patterns)) ? m.patterns : {}, moodLog: arr('moodLog'), futureLetters: arr('futureLetters'), deck: arr('deck') });
};
let mem = MEM_DEF();
let conv = null, busy = false, lastErr = null, backupKeys = false;
const saveS = () => LS.set('ember_set', S);
const saveMem = () => Store.setKV('mem', mem);
const SPARK = '[Start the conversation yourself. Bring something fresh: pull one of the open threads or one of your own curiosities, or pose a sharp thought experiment. No generic greeting, no "how can I help". One specific idea or question, kept short.]';
const DEEPER = '[He wants you to go deeper on what we have been talking about. Give one genuine realisation that reframes it, tied to things he actually said, then one question that opens it further. Do not summarise or repeat his words.]';

// ---------- small helpers ----------
let tt = 0;
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }
function fmt(t) { return esc(t).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/\n/g, '<br>'); }
function dlg(o) {
  return new Promise(res => {
    $('dT').textContent = o.title || ''; $('dX').textContent = o.text || '';
    const i = $('dI'); i.classList.toggle('hidden', o.input == null); i.value = o.input || '';
    $('dOk').textContent = o.ok || 'OK'; $('dOk').classList.toggle('danger', !!o.danger);
    $('dNo').classList.toggle('hidden', o.cancel === false);
    $('dlg').classList.add('show'); if (o.input != null) setTimeout(() => i.focus(), 60);
    const done = v => { $('dlg').classList.remove('show'); $('dOk').onclick = $('dNo').onclick = null; res(v); };
    $('dOk').onclick = () => done(o.input != null ? i.value : true);
    $('dNo').onclick = () => done(o.input != null ? null : false);
  });
}
const sure = (title, text) => dlg({ title, text, ok: 'Yes', danger: true });

// ---------- chat ----------
function newConv(priv) { return { id: uid(), title: 'New chat', auto: true, created: Date.now(), updated: Date.now(), priv: !!priv, msgs: [], sum: '' }; }
function ensure() { if (!conv) conv = newConv(false); }
async function persist() { if (conv && conv.msgs.length) { conv.updated = Date.now(); const ok = await Store.put(conv); if (!ok) toast('Could not save this chat (storage full?)'); } }
function bub(x, last) {
  const eng = S.showEng && x.eng ? ' · ' + Prov.label(x.eng.p) + ' ' + x.eng.ms + 'ms' : '';
  const regen = last && x.r == 'a' ? '<button data-act="regen">↻ again</button>' : '';
  return '<div class="msg ' + x.r + '"><div>' + fmt(x.t) + '</div><div class="mt"><span>' + U.time(x.ts) + (x.deep ? ' · 💡' : '') + eng + '</span>' + regen + '</div></div>';
}
function renderLog() {
  const m = conv ? conv.msgs : [];
  $('empty').classList.toggle('hidden', m.length > 0);
  $('noKey').classList.toggle('hidden', Prov.hasKeys());
  $('log').innerHTML = m.map((x, i) => bub(x, i == m.length - 1)).join('') +
    (lastErr ? '<div class="msg e"><div>' + esc(lastErr) + '</div><div class="mt"><button data-act="retry">Try again</button><button data-act="keys">Open Keys</button></div></div>' : '');
  if (Safety.lastLevel() >= 2 && m.length) $('log').insertAdjacentHTML('beforeend', Safety.crisisCard()); // local card: never saved, shows even if every engine is down
  down(); renderTop();
}
function down() { const l = $('log'); l.scrollTop = l.scrollHeight; }
function typing(on) {
  const old = $('typ'); if (old) old.remove();
  if (on) { $('log').insertAdjacentHTML('beforeend', '<div class="msg a typing" id="typ"><i></i><i></i><i></i></div>'); down(); }
}
function renderTop() {
  $('pName').textContent = S.pname || 'Ember';
  $('pName').classList.toggle('support-dot', Safety.lastLevel() >= 2);
  $('fBadge').classList.toggle('hidden', !Prov.freeOn());
  const st = Prov.status();
  $('engs').innerHTML = Prov.IDS.map(id => '<i class="' + st[id] + '" title="' + Prov.CFG[id].name + ': ' + st[id] + '">' + Prov.CFG[id].name.slice(0, 3).toUpperCase() + '</i>').join('');
  document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m == S.mode));
  const p = conv && conv.priv; $('bPriv').textContent = p ? '🔒 Private' : '🔓 Normal'; $('bPriv').classList.toggle('on', !!p);
  const h = new Date().getHours();
  $('eHi').textContent = h < 5 ? 'Still up. What is going on in your head?' : h < 12 ? 'Morning. Say anything.' : h < 18 ? 'Hey. Say anything.' : 'Evening. Say anything.';
}
function laneFor() {
  if (S.mode == 'deep') return { lane: 'deep', deep: true };
  if (S.mode == 'sharp' && conv) {
    const n = conv.msgs.filter(m => m.r == 'a').length, last = conv.msgs[conv.msgs.length - 1];
    if (n % 4 == 3 || (last && last.r == 'u' && last.t.length > 280)) return { lane: 'deep', deep: true };
  }
  return { lane: 'fast', deep: false };
}
async function reply(o) {
  o = o || {}; if (busy) return;
  busy = true; lastErr = null; $('bSend').disabled = true; typing(true);
  const L = o.force ? { lane: 'deep', deep: true } : laneFor();
  try {
    const r = await Persona.respond(conv, { S, mem, directive: o.directive, lane: L.lane, deep: L.deep });
    conv.msgs.push({ r: 'a', t: r.text, ts: Date.now(), deep: L.deep || undefined, eng: { p: r.provider, m: r.model, ms: r.ms } });
    await persist();
  } catch (e) { lastErr = e.message || 'Something broke.'; }
  busy = false; $('bSend').disabled = false; typing(false); renderLog();
  after();
}
async function after() {
  if (!conv || conv.priv || !S.learn || !conv.msgs.length) return;
  if (Safety.lastLevel() >= 2 || conv.msgs.slice(-14).some(m => m.r == 'u' && Safety.detect(m.t).level >= 2)) return; // never learn from a crisis, now or while it is still in the learning window
  const n = conv.msgs.filter(m => m.r == 'u').length;
  if (!(n == 2 || (n > 2 && n % 6 == 0))) return;
  const c = conv;
  try {
    const j = await Persona.learn(c, mem);
    if (j) { if (j.title && c.auto) c.title = j.title; if (j.summary) c.sum = j.summary; await saveMem(); await Store.put(c); }
  } catch (e) { /* memory is best effort */ }
}
async function send() {
  const t = $('inp').value.trim(); if (!t || busy) return;
  ensure();
  conv.msgs.push({ r: 'u', t, ts: Date.now() });
  Safety.mark(Safety.detect(t).level); // card + dot appear instantly, before any engine answers
  if (conv.auto && conv.title == 'New chat') conv.title = t.length > 38 ? t.slice(0, 38).trim() + '…' : t;
  $('inp').value = ''; grow(); await persist(); renderLog(); reply();
}
function needKeys() { return false; } // Free Mode means a chat never needs a key
$('bSend').onclick = send;
$('inp').addEventListener('keydown', e => { if (e.key == 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });
function grow() { const i = $('inp'); i.style.height = 'auto'; i.style.height = Math.min(140, i.scrollHeight) + 'px'; }
$('inp').addEventListener('input', grow);
const spark = async () => { if (busy || needKeys()) return; ensure(); reply({ directive: SPARK }); };
$('bSpark').onclick = spark; $('bSpark2').onclick = spark;
$('bDeep').onclick = () => { if (busy || needKeys()) return; if (!conv || conv.msgs.length < 2) { toast('Say a little more first'); return; } reply({ directive: DEEPER, force: true }); };
$('bPriv').onclick = () => { ensure(); conv.priv = !conv.priv; renderTop(); toast(conv.priv ? 'Private: this chat will not be learned from' : 'Normal: it can learn from this chat'); persist(); };
document.querySelectorAll('#modes button').forEach(b => b.onclick = () => { S.mode = b.dataset.m; saveS(); renderTop(); });
$('log').addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act == 'keys') openSettings();
  else if (a.dataset.act == 'retry') { if (conv && conv.msgs.length) reply({ directive: conv.msgs[conv.msgs.length - 1].r == 'a' ? SPARK : undefined }); }
  else if (a.dataset.act == 'regen' && conv && !busy) {
    const last = conv.msgs[conv.msgs.length - 1]; if (!last || last.r != 'a') return;
    conv.msgs.pop(); const prevUser = conv.msgs.length && conv.msgs[conv.msgs.length - 1].r == 'u';
    reply({ directive: prevUser ? undefined : SPARK });
  }
});

// ---------- history ----------
async function renderHist() {
  const q = $('hq').value.trim().toLowerCase();
  let all = (await Store.all()).filter(c => c.msgs && c.msgs.length).sort((a, b) => b.updated - a.updated);
  if (q) all = all.filter(c => c.title.toLowerCase().includes(q) || c.msgs.some(m => m.t.toLowerCase().includes(q)));
  $('hlist').innerHTML = all.map(c => {
    const hit = q ? c.msgs.find(m => m.t.toLowerCase().includes(q)) : null, last = c.msgs[c.msgs.length - 1];
    const snip = (hit || last).t.replace(/\s+/g, ' ').slice(0, 70);
    return '<div class="hi' + (conv && conv.id == c.id ? ' on' : '') + '" data-id="' + c.id + '"><b>' + (c.priv ? '🔒 ' : '') + esc(c.title) + '</b><small>' + U.day(c.updated) + ' · ' + esc(snip) + '</small><div class="ha"><span data-a="ren">Rename</span><span class="del" data-a="del">Delete</span></div></div>';
  }).join('') || '<p class="hint">' + (q ? 'Nothing matches.' : 'No chats yet.') + '</p>';
}
function drawer(on) { $('drawer').classList.toggle('show', on); $('scrim').classList.toggle('show', on); if (on) { $('hq').value = ''; renderHist(); } }
$('bHist').onclick = () => drawer(true); $('bDx').onclick = () => drawer(false); $('scrim').onclick = () => drawer(false);
$('hq').addEventListener('input', renderHist);
$('bNew').onclick = () => { if (busy) return; Safety.mark(0); conv = null; lastErr = null; renderLog(); drawer(false); $('inp').focus(); };
$('hlist').addEventListener('click', async e => {
  const card = e.target.closest('.hi'); if (!card) return;
  const id = card.dataset.id, act = e.target.dataset.a;
  if (act == 'ren') {
    const c = await Store.get(id); if (!c) return;
    const v = await dlg({ title: 'Rename chat', input: c.title }); if (v && v.trim()) { c.title = v.trim().slice(0, 60); c.auto = false; await Store.put(c); if (conv && conv.id == id) conv = c; renderHist(); }
  } else if (act == 'del') {
    if (!(await sure('Delete this chat?', 'It will be gone for good.'))) return;
    await Store.del(id); if (conv && conv.id == id) { conv = null; renderLog(); } renderHist();
  } else if (!busy) { const c = await Store.get(id); if (c) { conv = c; lastErr = null; Safety.mark(0); renderLog(); drawer(false); } }
});

// ---------- settings ----------
const DOT = { ok: 'ok', limited: 'limited', bad: 'bad' };
function renderKeys() {
  let h = '';
  Prov.IDS.forEach(id => Prov.entries(id).forEach(e => {
    const st = e.st, cls = !st ? '' : st.ok ? (st.limited ? 'limited' : 'ok') : 'bad';
    const line = !st ? 'not checked yet' : st.ok ? (st.limited ? st.msg : '✓ working · ' + st.ms + ' ms · ' + st.model) : '✗ ' + st.msg;
    h += '<div class="kr"><span class="d ' + (DOT[cls] || '') + '"></span><div class="kt"><b>' + Prov.CFG[id].name + ' · ' + esc(Prov.mask(e.key)) + '</b><small>' + esc(line) + '</small></div><button data-k="chk" data-id="' + id + '" data-key="' + esc(e.key) + '" title="Check">↻</button><button data-k="rm" data-id="' + id + '" data-key="' + esc(e.key) + '" title="Remove">✕</button></div>';
  }));
  $('kList').innerHTML = h || '<p class="hint">No keys yet.</p>';
}
function renderMem() {
  const row = (k, a) => a.map((f, i) => '<div class="mi' + (S.learn ? '' : ' off') + '"><span>' + esc(f.t) + '</span><button class="ed" data-m="' + k + '" data-i="' + i + '" data-e="1">Edit</button><button data-m="' + k + '" data-i="' + i + '" title="Delete">✕</button></div>').join('') || '<p class="hint">Nothing yet.</p>';
  $('mFacts').innerHTML = row('facts', mem.facts); $('mThreads').innerHTML = row('threads', mem.threads);
}
function renderSet() {
  renderKeys(); renderMem();
  $('sName').value = S.name; $('sAbout').value = S.about; $('sPname').value = S.pname; $('sInt').value = S.interests;
  $('sWarm').value = S.warm; $('sDirect').value = S.direct; $('sHumor').value = S.humor; $('sPace').value = S.pace; $('sTalk').value = S.talk || '';
  $('sCtx').value = WINS[S.ctx] ? S.ctx : 'normal'; $('sPersona').value = S.persona || ''; $('swSum').classList.toggle('on', !!S.summarize); $('mPause').classList.toggle('hidden', !!S.learn);
  $('swLearn').classList.toggle('on', !!S.learn); $('swEng').classList.toggle('on', !!S.showEng); $('swBk').classList.toggle('on', backupKeys); $('swFree').classList.toggle('on', Prov.freeOn());
  $('acc').innerHTML = ACCENTS.map(c => '<div class="chip' + (c == S.accent ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '"></div>').join('');
}
function openSettings() { drawer(false); renderSet(); $('settings').classList.add('show'); }
function closeSettings() { $('settings').classList.remove('show'); S.name = $('sName').value.trim(); S.about = $('sAbout').value; S.pname = $('sPname').value.trim() || 'Ember'; S.interests = $('sInt').value.trim() || DEF.interests; S.persona = $('sPersona').value.trim().slice(0, 2000); S.talk = $('sTalk').value.trim().slice(0, 300); saveS(); renderLog(); }
$('bSet').onclick = openSettings; $('bSx').onclick = closeSettings; $('bGoKeys').onclick = openSettings;
function accent(c) { document.documentElement.style.setProperty('--ac', c); document.querySelector('meta[name=theme-color]').content = '#07060b'; }
$('acc').addEventListener('click', e => { const c = e.target.dataset.c; if (!c) return; S.accent = c; saveS(); accent(c); renderSet(); });
$('swLearn').onclick = () => { S.learn = !S.learn; saveS(); renderSet(); toast(S.learn ? 'Persistent Memory on' : 'Persistent Memory off: Core Memory is paused'); };
$('swSum').onclick = () => { S.summarize = !S.summarize; saveS(); renderSet(); };
$('sWarm').onchange = () => { S.warm = $('sWarm').value; saveS(); };
$('sDirect').onchange = () => { S.direct = $('sDirect').value; saveS(); };
$('sHumor').onchange = () => { S.humor = $('sHumor').value; saveS(); };
$('sPace').onchange = () => { S.pace = $('sPace').value; saveS(); };
$('sCtx').onchange = () => { S.ctx = WINS[$('sCtx').value] ? $('sCtx').value : 'normal'; saveS(); };
$('sPersona').addEventListener('input', () => { S.persona = $('sPersona').value.slice(0, 2000); saveS(); });
$('swEng').onclick = () => { S.showEng = !S.showEng; saveS(); renderSet(); };
$('swBk').onclick = () => { backupKeys = !backupKeys; renderSet(); };
$('swFree').onclick = () => { Prov.setFree(!Prov.freeOn()); S.freeMode = Prov.freeOn(); saveS(); renderSet(); renderTop(); toast(S.freeMode ? 'Free Mode on: chats go through Pollinations first' : 'Free Mode off: keys first, Pollinations only as a last resort'); };

$('bIngest').onclick = async () => {
  const t = $('notes').value; if (!t.trim()) { toast('Paste your notes first'); return; }
  const b = $('bIngest'); b.disabled = true; b.textContent = 'Checking keys…'; $('kRep').innerHTML = '';
  try {
    const r = await Prov.ingest(t); $('notes').value = '';
    const f = r.found, nm = Prov.CFG;
    let h = 'Found <b>' + (f.groq + f.gemini + f.mistral + f.unknown) + '</b> possible key(s) in your notes.<br>';
    r.added.forEach(a => { h += (a.ok ? '<b>✓</b> ' : '<span class="w">✗</span> ') + nm[a.id].name + ' ' + esc(Prov.mask(a.key)) + (a.guess ? ' (no label, identified by testing it on Mistral)' : '') + '<br>'; });
    if (r.dupes) h += r.dupes + ' already added.<br>';
    if (r.rejected) h += '<span class="w">' + r.rejected + ' unlabeled 32-character string(s) were not a valid Mistral key and were ignored.</span><br>';
    if (!r.added.length && !r.dupes && !r.rejected) h = '<span class="w">No keys found. Groq keys start with gsk_, Gemini keys with AIza. Mistral keys have no prefix, so put the word Mistral on the line above or beside it.</span>';
    $('kRep').innerHTML = h;
  } catch (e) { $('kRep').innerHTML = '<span class="w">Failed: ' + esc(e.message) + '</span>'; }
  b.disabled = false; b.textContent = 'Extract + check keys'; renderKeys(); renderTop();
};
$('bCheckAll').onclick = async () => { const b = $('bCheckAll'); b.disabled = true; b.textContent = 'Checking…'; await Prov.healthAll(); b.disabled = false; b.textContent = 'Check all'; renderKeys(); renderTop(); };
$('bKAdd').onclick = async () => {
  const v = $('kIn').value.trim(); if (!v) return;
  const b = $('bKAdd'); b.disabled = true; const r = await Prov.addKey($('kProv').value, v); b.disabled = false;
  if (!r.ok) toast('Not added: ' + r.why); else { $('kIn').value = ''; toast(r.e.st && r.e.st.ok ? 'Key works' : 'Added, but: ' + (r.e.st && r.e.st.msg)); }
  renderKeys(); renderTop();
};
$('kList').addEventListener('click', async e => {
  const b = e.target.closest('button[data-k]'); if (!b) return; const id = b.dataset.id, key = b.dataset.key;
  if (b.dataset.k == 'rm') { if (await sure('Remove this key?', Prov.CFG[id].name + ' ' + Prov.mask(key))) { Prov.removeKey(id, key); renderKeys(); renderTop(); } }
  else { const en = Prov.entries(id).find(x => x.key == key); if (en) { b.textContent = '…'; await Prov.health(id, en); renderKeys(); renderTop(); } }
});
$('settings').addEventListener('click', async e => {
  const b = e.target.closest('button[data-m]'); if (!b) return;
  const list = mem[b.dataset.m], i = +b.dataset.i; if (!list || !list[i]) return;
  if (b.dataset.e) {
    const v = await dlg({ title: 'Edit memory', input: list[i].t, ok: 'Save' }); if (v == null) return;
    const t = String(v).trim().slice(0, 140); if (!t) { toast('Empty. Use ✕ to delete it'); return; }
    if (Persona.SECRET.test(t)) { toast('Not saved: looks like a password or key'); return; }
    list[i] = Object.assign({}, list[i], { t, u: true }); await saveMem(); renderMem(); return;
  }
  list.splice(i, 1); await saveMem(); renderMem();
});
$('bMemClr').onclick = async () => { if (await sure('Clear memory?', 'It forgets everything it learned about you. Your chats stay.')) { mem = MEM_DEF(); await saveMem(); renderMem(); toast('Memory cleared'); } };

// ---------- data ----------
$('bExp').onclick = async () => {
  const d = { v: 1, app: 'ember', at: Date.now(), settings: S, mem, convs: await Store.all() };
  if (backupKeys) d.keys = Prov.keys();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' }));
  a.download = 'ember-backup-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Backup saved' + (backupKeys ? ' (with keys, keep it private)' : ''));
};
$('bImp').onclick = () => $('fImp').click();
$('fImp').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || d.app != 'ember' || !Array.isArray(d.convs)) throw new Error('not an Ember backup');
    if (!(await dlg({ title: 'Import backup?', text: d.convs.length + ' chats. Chats with the same id are replaced; everything else is kept.', ok: 'Import' }))) return;
    for (const c of d.convs) if (c && c.id && Array.isArray(c.msgs)) await Store.put(c);
    if (d.mem && typeof d.mem == 'object') {
      const imp = migrateMem(d.mem), key = x => String((x && (x.t || x.name || x.text)) || '').toLowerCase();
      ['facts', 'threads', 'callbacks', 'futureLetters', 'deck'].forEach(k => imp[k].forEach(x => { if (x && key(x) && !mem[k].some(y => key(y) == key(x))) mem[k].push(x); }));
      imp.moodLog.forEach(x => { if (x && x.ts && !mem.moodLog.some(y => y.ts == x.ts)) mem.moodLog.push(x); });
      Object.keys(imp.patterns).forEach(k => { if (k != '__proto__' && k != 'constructor' && !(k in mem.patterns)) mem.patterns[k] = imp.patterns[k]; });
      await saveMem();
    }
    if (d.settings) { S = Object.assign({}, DEF, d.settings); saveS(); accent(S.accent); Prov.setFree(S.freeMode); }
    if (d.keys) { const cur = LS.get('ember_keys', {}); Prov.IDS.forEach(id => (d.keys[id] || []).forEach(k => { cur[id] = cur[id] || []; if (k && k.key && !cur[id].some(x => x.key == k.key)) cur[id].push({ key: k.key, st: null }); })); LS.set('ember_keys', cur); Prov.reload(); }
    renderSet(); renderLog(); toast('Backup imported');
  } catch (er) { toast('Import failed: ' + er.message); }
};
$('bWipe').onclick = async () => {
  if (!(await sure('Delete everything?', 'All chats, memory, settings and keys on this device. This cannot be undone.'))) return;
  await Store.wipe(); ['ember_set', 'ember_keys', 'ember_models'].forEach(k => LS.del(k)); location.reload();
};

// ---------- start ----------
(async function init() {
  await Store.init();
  mem = migrateMem(await Store.getKV('mem', mem));
  Prov.setFree(S.freeMode); accent(S.accent); renderLog();
  try { if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
  window.__ember = { ready: true };
})();
window.addEventListener('error', e => { try { console.error('Ember error:', e.message); } catch (x) {} });
})();
