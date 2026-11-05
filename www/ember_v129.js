// Ember V1.10.32 - Permissions & background summary banner (add-on, additive: reads the existing status pills, never changes them).
'use strict';
(() => {
  const D = document;
  const rows = () => Array.from(D.querySelectorAll('#cockpit_permissions .prow')).filter(r => r.querySelector('.pstatus'));
  const stateOf = r => { const p = r.querySelector('.pstatus'); return p.classList.contains('ok') ? 'ok' : p.classList.contains('bad') ? 'bad' : p.classList.contains('warn') ? 'warn' : 'na'; };
  const labelOf = r => ((r.querySelector(':scope > span:first-child') || r).textContent || '').trim();
  let box = null, raf = 0, signature = '';
  function el(tag, cls, text) { const e = D.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function paint() {
    raf = 0;
    const sec = D.getElementById('cockpit_permissions'); if (!sec) return;
    const list = rows().map(r => ({ r, s: stateOf(r) })).filter(x => x.s !== 'na');
    if (!list.length) return;
    const next = list.map(x => x.s + ':' + labelOf(x.r)).join('|');
    if (next === signature && box?.isConnected) return; signature = next;
    if (!box || !box.isConnected) { box = el('div'); box.id = 'pmSummary'; box.setAttribute('role', 'status'); const first = sec.querySelector('.card'); sec.insertBefore(box, first || null); }
    const ok = list.filter(x => x.s === 'ok').length, need = list.filter(x => x.s !== 'ok');
    const pct = Math.round(ok * 100 / list.length);
    box.classList.toggle('pm-ok', !need.length);
    const ring = el('div', 'pm-ring'); ring.style.setProperty('--p', String(pct));
    const num = el('b', '', String(ok)); num.append(el('small', '', '/' + list.length)); ring.append(num);
    const txt = el('div', 'pm-txt');
    txt.append(el('p', 'pm-h', need.length ? (need.length === 1 ? '1 thing needs attention' : need.length + ' things need attention') : 'All set'));
    txt.append(el('p', 'pm-s', need.length ? 'Tap one to jump to it.' : 'Ember can notify you and keep running in the background.'));
    if (need.length) {
      const chips = el('div', 'pm-chips');
      need.forEach(x => { const b = el('button', 'pm-chip', labelOf(x.r).replace(/\s*\(.*?\)\s*/g, ' ').trim()); b.type = 'button';
        b.onclick = () => { x.r.scrollIntoView({ block: 'center', behavior: 'smooth' }); x.r.classList.remove('pm-flash'); void x.r.offsetWidth; x.r.classList.add('pm-flash'); };
        chips.append(b); });
      txt.append(chips);
    }
    box.replaceChildren(ring, txt);
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
  function start() {
    const sec = D.getElementById('cockpit_permissions');
    if (!sec) { setTimeout(start, 600); return; }
    const host = sec.querySelector('.card') || sec;
    new MutationObserver(queue).observe(host, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    queue();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
