// Ember V1.9.8 - ember_prov_ui.js: the Providers chip in the header (dropdown of every engine with a LIVE status dot)
// and the 📎 Docs quick button that replaced the dictation button.
// Dots are never guessed: no key = grey, never green. Opening the dropdown lists each key's models (no chat call, no credit) to check it.
'use strict';
(() => {
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TXT = { ok: 'working', limited: 'rate limited, key is valid', bad: 'key rejected or unreachable', none: 'no key saved', unknown: 'key saved, not checked yet' };
let open = false, busy = false, lastAt = 0;

function rowFor(id) {
  const P = window.Prov, st = P.stateOf(id), n = P.entries(id).length, c = P.CFG[id];
  const proto = c.status === 'prototype' ? ' <i class="pdproto">prototype</i>' : '';
  const sub = n ? TXT[st] + ' · ' + n + ' key' + (n === 1 ? '' : 's') : TXT.none;
  return '<button class="pdrow" role="menuitem" data-id="' + esc(id) + '"><span class="pdd ' + (busy && n ? 'chk' : st) + '"></span><span class="pdn">' + esc(c.name) + proto + '</span><small>' + esc(busy && n ? 'checking…' : sub) + '</small></button>';
}
function freeRow() {
  const P = window.Prov, on = P.freeOn();
  return '<button class="pdrow" role="menuitem" data-id="free"><span class="pdd ' + (on ? 'free' : 'none') + '"></span><span class="pdn">Free Mode <i class="pdproto">no key</i></span><small>' + (on ? 'on · third-party, model unknown' : 'off') + '</small></button>';
}
function paint() {
  const d = $('provDrop'), P = window.Prov; if (!d || !P) return;
  d.innerHTML = '<div class="pdh"><b>Providers</b><button class="pdre" id="pdRe" aria-label="Check all now">' + (busy ? '…' : '↻') + '</button></div>' +
    P.IDS.map(rowFor).join('') + freeRow() +
    '<div class="pdleg"><span><i class="pdd ok"></i>working</span><span><i class="pdd limited"></i>limited</span><span><i class="pdd bad"></i>rejected</span><span><i class="pdd none"></i>no key</span></div>' +
    '<p class="pdnote">' + (lastAt ? 'Checked ' + new Date(lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '. ' : '') + 'A provider with no key can never show green.</p>';
}
async function check() {
  const P = window.Prov; if (!P || busy) return;
  busy = true; if (open) paint();
  try { await P.pingAll(); } catch (e) { /* offline: dots keep their last honest state */ }
  busy = false; lastAt = Date.now();
  if (open) paint();
  try { window.dispatchEvent(new Event('ember-names')); } catch (e) { /* header refresh is best effort */ }
}
function toggle(force) {
  const d = $('provDrop'), b = $('bProv'); if (!d || !b) return;
  open = force === undefined ? !open : !!force;
  d.classList.toggle('hidden', !open); b.classList.toggle('on', open); b.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) { paint(); check(); }
}
if ($('bProv')) {
  $('bProv').addEventListener('click', e => { e.stopPropagation(); toggle(); });
  $('provDrop').addEventListener('click', e => {
    e.stopPropagation();
    if (e.target.closest('#pdRe')) { check(); return; }
    const r = e.target.closest('.pdrow'); if (!r) return;
    toggle(false);
    const s = $('bSet'); if (s) s.click();
    setTimeout(() => { const t = document.querySelector('.stab[data-st="keys"]'); if (t) t.click(); }, 60);
  });
  document.addEventListener('click', e => { if (open && !e.target.closest('#provDrop') && !e.target.closest('#bProv')) toggle(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) toggle(false); });
  window.addEventListener('ember-names', () => { if (open && !busy) paint(); });
  // quiet first check so the header pill and the dots are right without opening anything
  setTimeout(() => { try { if (window.Prov && window.Prov.hasKeys()) check(); } catch (e) { /* not ready */ } }, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && window.Prov && window.Prov.hasKeys() && Date.now() - lastAt > 5 * 60 * 1000) check(); });
}

// 📎 Docs: opens the Documents tab (one paperclip there attaches files or a note)
if ($('bDocsQuick')) $('bDocsQuick').onclick = () => { if (window.EmberBrowser) window.EmberBrowser.open('docs'); };
})();
