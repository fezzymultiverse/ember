// Ember Add-On wiring (www/ai.js): Settings > Web Scraping (keys) and the Saved Sites list in the drawer.
// Loaded after app.js. State lives in EmberScraper / EmberSites, so app.js needs no settings of its own for this.
'use strict';
(() => {
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = m => { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3200); };

// ---------- universal router: toast when the engine switches (the routing itself is Prov.run in providers.js) ----------
let lastSw = { k: '', t: 0 };
window.addEventListener('ember-switch', e => {
  const d = e.detail || {}, nm = id => (window.Prov && Prov.label ? Prov.label(id) : id);
  const why = d.status == 429 ? 'rate limited' : (d.status == 401 || d.status == 403) ? 'key rejected' : 'unavailable';
  const k = d.from + '>' + d.to; if (k == lastSw.k && Date.now() - lastSw.t < 60000) return;
  lastSw = { k, t: Date.now() };
  toast('Switched to ' + nm(d.to) + ' (' + nm(d.from) + ' ' + why + ')');
});

// ---------- drawer tabs + saved AI prompts (V1.5.6) ----------
const PK = 'ember_prompts';
const loadP = () => { try { const a = JSON.parse(localStorage.getItem(PK) || '[]'); return Array.isArray(a) ? a.filter(x => x && x.n && x.t) : []; } catch (e) { return []; } };
const saveP = a => { try { localStorage.setItem(PK, JSON.stringify(a.slice(0, 40))); } catch (e) { toast('Could not save: storage is blocked'); } };
function renderPrompts() {
  const a = loadP(), el = $('plist'); if (!el) return;
  el.innerHTML = a.length ? a.map((x, i) => '<div class="prm"><button class="btn g go" data-i="' + i + '">' + esc(x.n) + '<small>' + esc(x.t) + '</small></button><button class="btn g x" data-i="' + i + '" aria-label="Delete prompt">✕</button></div>').join('') : '<p class="hint">No saved prompts yet. Add one below.</p>';
}
document.querySelectorAll('.dtab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.dtab').forEach(x => x.classList.toggle('on', x == b));
  document.querySelectorAll('.dpane').forEach(x => x.classList.toggle('hidden', x.id != 'dp_' + b.dataset.d));
  if (b.dataset.d == 'prompts') renderPrompts();
}));
if ($('pAdd')) {
  $('pAdd').onclick = () => {
    const n = $('pName').value.trim(), t = $('pText').value.trim();
    if (!n || !t) { toast('Give the prompt a name and some text'); return; }
    const a = loadP(); a.unshift({ n: n.slice(0, 40), t: t.slice(0, 1200) }); saveP(a);
    $('pName').value = ''; $('pText').value = ''; renderPrompts(); toast('Prompt saved');
  };
  $('plist').addEventListener('click', e => {
    const a = loadP();
    const del = e.target.closest('.x'), go = e.target.closest('.go');
    if (del) { a.splice(+del.dataset.i, 1); saveP(a); renderPrompts(); return; }
    if (go && a[+go.dataset.i]) {
      const inp = $('inp'); if (!inp) return;
      inp.value = a[+go.dataset.i].t; inp.dispatchEvent(new Event('input', { bubbles: true }));
      const d = $('bDx'); if (d) d.click(); inp.focus();
    }
  });
  renderPrompts();
}

const SC = window.EmberScraper, ST = window.EmberSites;
if (!SC || !ST || !$('swScrape')) return;

function renderKeys() {
  const s = SC.get();
  $('swScrape').classList.toggle('on', !!s.on);
  if ($('swReader')) $('swReader').classList.toggle('on', SC.readerOn());
  SC.KEY_IDS.forEach(id => { const el = $('wk_' + id); if (el && document.activeElement !== el) el.value = (s.keys || {})[id] || ''; });
  if ($('wk_stingEp') && document.activeElement !== $('wk_stingEp')) $('wk_stingEp').value = s.stingEndpoint || '';
  $('wkStatus').textContent = SC.available().length ? 'Order tried: ' + SC.available().map(id => SC.LABEL[id]).join(' → ') : 'Free reader is off and no scraping key is set yet.';
}
function renderSites() {
  const on = SC.enabled(), a = ST.list();
  const off = on ? '' : '<p class="hint">Saved, but Ember can only check them once Web Scraping is switched on in Settings.</p>';
  $('sitesBox').classList.remove('hidden');
  $('sitesList').innerHTML = off + (a.length ? a.map((x, i) => '<div class="cr"><button class="btn g siteGo" data-i="' + i + '" style="text-align:left;padding:10px 12px">' + esc(x.name) + '<span style="display:block;font-size:11px;font-weight:400;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(x.url) + '</span></button><button class="hb siteDel" data-i="' + i + '" aria-label="Remove">✕</button></div>').join('') : '<p class="hint">No saved sites yet.</p>');
}
function renderAll() { renderKeys(); renderSites(); }

// ---------- tabs ----------
document.querySelectorAll('.wtab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.wtab').forEach(x => x.classList.toggle('on', x == b));
  document.querySelectorAll('.wpane').forEach(x => x.classList.toggle('hidden', x.id != 'wp_' + b.dataset.t));
  if (b.dataset.t == 'health') renderLocal();
}));

// ---------- health ----------
const COL = { ok: '#5FFF00', fail: '#FF3B3B', none: '#777', info: '#E5B800' };
function renderLocal() {
  $('hLocal').innerHTML = SC.healthLocal().map(r => '<div class="hrow"><div class="l"><span class="dot" style="background:' + (r.ok ? COL.ok : COL.fail) + '"></span><div>' + esc(r.name) + '<small>' + esc(r.msg) + '</small></div></div></div>').join('');
}
function provRow(r) { return '<div class="hrow"><div class="l"><span class="dot" style="background:' + COL[r.state] + '"></span><div>' + esc(r.label) + '<small>' + esc(r.msg) + (r.state == 'ok' || r.state == 'fail' ? ' · ' + r.ms + ' ms' : '') + '</small></div></div>' + (r.state == 'none' || r.state == 'info' ? '' : '<button class="btn g hOne" data-id="' + r.id + '" style="width:auto;padding:6px 12px;font-size:12px">Retry</button>') + '</div>'; }
const hRows = {};
function drawProv() { $('hProv').innerHTML = ['reader'].concat(SC.KEY_IDS).map(id => provRow(hRows[id] || { id, label: SC.LABEL[id], state: id == 'reader' ? 'info' : SC.get().keys[id] ? 'info' : 'none', msg: id == 'reader' ? 'Not checked yet (no key needed)' : SC.get().keys[id] ? 'Not checked yet' : 'No key set', ms: 0 })).join(''); }
$('hRun').onclick = async () => {
  const b = $('hRun'); b.disabled = true; b.textContent = 'Checking…';
  for (const id of ['reader'].concat(SC.KEY_IDS)) { hRows[id] = { id, label: SC.LABEL[id], state: 'info', msg: 'Checking…', ms: 0 }; drawProv(); hRows[id] = await SC.healthCheck(id); drawProv(); }
  b.disabled = false; b.textContent = 'Check all providers'; $('hWhen').textContent = 'Last checked ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
$('hProv').addEventListener('click', async e => {
  const b = e.target.closest('.hOne'); if (!b) return; b.disabled = true; hRows[b.dataset.id] = { id: b.dataset.id, label: SC.LABEL[b.dataset.id], state: 'info', msg: 'Checking…', ms: 0 }; drawProv();
  hRows[b.dataset.id] = await SC.healthCheck(b.dataset.id); drawProv();
});

// ---------- test panel ----------
$('tRun').onclick = async () => {
  const b = $('tRun'); b.disabled = true; b.textContent = 'Running…'; $('tMeta').textContent = ''; $('tOut').classList.add('hidden');
  const r = await SC.test($('tUrl').value, $('tObj').value, $('tProv').value);
  $('tMeta').textContent = r.error ? 'Failed' + (r.ms ? ' after ' + r.ms + ' ms' : '') : r.provider + ' · ' + r.ms + ' ms · ' + r.chars + ' chars' + (r.trimmed ? ' · trimmed to the objective' : '');
  $('tOut').textContent = r.error || r.markdown.slice(0, 3000) + (r.markdown.length > 3000 ? '\n\n[preview cut at 3000 chars]' : ''); $('tOut').classList.remove('hidden');
  b.disabled = false; b.textContent = 'Run scrape test';
};
$('tSelf').onclick = () => {
  const t = SC.selfTest(), bad = t.filter(x => !x.ok).length;
  $('tMeta').textContent = bad ? bad + ' of ' + t.length + ' offline checks failed' : 'All ' + t.length + ' offline checks passed';
  $('tOut').textContent = t.map(x => (x.ok ? 'PASS ' : 'FAIL ') + x.name).join('\n'); $('tOut').classList.remove('hidden');
};


$('swScrape').onclick = () => { SC.setOn(!SC.enabled()); renderAll(); toast(SC.enabled() ? 'Web Scraping on' : 'Web Scraping off'); };
if ($('swReader')) $('swReader').onclick = () => { SC.setReader(!SC.readerOn()); renderAll(); toast(SC.readerOn() ? 'Free reader on (no key needed)' : 'Free reader off'); };
SC.KEY_IDS.forEach(id => { const el = $('wk_' + id); if (el) el.addEventListener('input', () => { SC.setKey(id, el.value); $('wkStatus').textContent = SC.available().length ? 'Order tried: ' + SC.available().map(k => SC.LABEL[k]).join(' → ') : 'Free reader is off and no scraping key is set yet.'; }); });
$('wk_stingEp').addEventListener('input', () => { SC.setStingEndpoint($('wk_stingEp').value); renderKeys(); });

$('siteAdd').onclick = () => {
  const r = ST.add($('siteName').value, $('siteUrl').value);
  if (r.error) { toast(r.error); return; }
  $('siteName').value = ''; $('siteUrl').value = ''; renderSites(); toast('Saved ' + r.name);
};
$('sitesList').addEventListener('click', e => {
  const del = e.target.closest('.siteDel'), go = e.target.closest('.siteGo');
  const a = ST.list();
  if (del && a[+del.dataset.i]) { ST.remove(a[+del.dataset.i].name); renderSites(); }
  else if (go && a[+go.dataset.i]) {
    $('bDx').click(); $('inp').value = 'Check my ' + a[+go.dataset.i].name; $('inp').dispatchEvent(new Event('input')); $('bSend').click();
  }
});
// refresh whenever the drawer or settings open
['bSet', 'bMenu', 'bHist'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => setTimeout(renderAll, 50)); });
new MutationObserver(renderAll).observe($('drawer'), { attributes: true, attributeFilter: ['class'] });
new MutationObserver(renderAll).observe($('settings'), { attributes: true, attributeFilter: ['class'] });
renderAll(); drawProv();
})();
