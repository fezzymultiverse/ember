// Ember V1.10.19 - ember_cohere_lock.js: Cohere 24/7 lock, UI side.
// The router (providers.js) already sends every chat lane to Cohere only. This file keeps the screens honest:
// it hides the controls for engines that can no longer answer (Free Mode, strict pin, OpenRouter / Plugsky fallback toggles)
// and shows one live "Cohere · 24/7" status line: keys, the model in use, and the seconds left if a key is resting.
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ID = 'cohere';

  const css = document.createElement('style');
  css.textContent = '#cohereLive{margin:8px 0 2px;padding:10px 12px;border-radius:12px;border:1px solid rgba(0,229,255,.28);background:rgba(0,229,255,.06);font-size:13px;line-height:1.45}' +
    '#cohereLive b{letter-spacing:.2px}#cohereLive .cl-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:baseline;background:#8a8f98}' +
    '#cohereLive.ok .cl-dot{background:#5FFF00;box-shadow:0 0 8px #5FFF00}#cohereLive.limited .cl-dot{background:#ffb020;box-shadow:0 0 8px #ffb020}' +
    '#cohereLive.bad .cl-dot{background:#FF005F;box-shadow:0 0 8px #FF005F}#cohereLive small{display:block;opacity:.75;margin-top:2px}';
  css.textContent += '#cardFreeMode[hidden],.card[hidden],.ef-switch-row[hidden],.pdrow[hidden]{display:none!important}';
  document.head.appendChild(css);

  function hideLegacy() {
    ['efStrict', 'efOpenrouter', 'efPlugsky'].forEach(id => { const b = $(id); const r = b && b.closest('.ef-switch-row'); if (r) r.hidden = true; });
    const f = $('swFree'); const card = f && f.closest('.card'); if (card) card.hidden = true;
    const rows = document.querySelectorAll('#provDrop .pdrow[data-id="free"]'); rows.forEach(r => { r.hidden = true; });
  }

  function state() {
    const P = window.Prov; if (!P) return null;
    const list = P.entries(ID) || [], usable = list.filter(e => !e.bad).length;
    const st = P.stateOf(ID), d = P.detail(ID);
    return { n: list.length, usable, st, model: d.model || '', lat: d.lat || 0, retry: d.retry || 0, msg: d.msg || '' };
  }

  function paint() {
    hideLegacy();
    const sel = $('engPin'); if (!sel) return;
    let el = $('cohereLive');
    if (!el) { el = document.createElement('div'); el.id = 'cohereLive'; el.setAttribute('aria-live', 'polite'); sel.parentNode.insertBefore(el, sel); }
    const s = state(); if (!s) return;
    let head, sub = '';
    if (!s.n) { el.className = 'bad'; head = 'Cohere · 24/7 · no key saved'; sub = 'Add a Cohere key below. Ember has no other engine to fall back on.'; }
    else if (!s.usable) { el.className = 'bad'; head = 'Cohere · 24/7 · every key rejected'; sub = s.msg || 'Replace the key in Settings > Keys.'; }
    else if (s.st === 'limited') { el.className = 'limited'; head = 'Cohere · 24/7 · resting'; sub = 'Rate limited' + (s.retry ? ', ready again in ' + s.retry + ' s' : '') + '. Ember waits and retries on the same engine. More keys spread the load.'; }
    else { el.className = 'ok'; head = 'Cohere · 24/7 · ready'; sub = s.n + ' key' + (s.n === 1 ? '' : 's') + (s.usable !== s.n ? ' (' + s.usable + ' usable)' : '') + (s.model ? ' · ' + s.model : '') + (s.lat ? ' · ' + s.lat + ' ms' : '') + (s.n < 2 ? ' · a second key helps with rate limits' : ''); }
    el.innerHTML = '<i class="cl-dot"></i><b>' + esc(head) + '</b><small>' + esc(sub) + '</small>';
  }

  function start() {
    paint();
    ['ember-provider-stats', 'ember-names'].forEach(n => window.addEventListener(n, paint));
    setInterval(paint, 2000);
    // settings and the providers drop-down are built lazily: hide the legacy rows whenever the DOM changes
    try { let q = 0; new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; hideLegacy(); }); }).observe(document.body, { childList: true, subtree: true }); } catch (_) { /* polling above covers it */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
