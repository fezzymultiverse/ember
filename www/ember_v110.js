// Ember V1.10.10 - ember_v110.js: flashing blue dot (1.10.18: header gear removed, Settings lives in the right panel) in front of the name.
'use strict';
(() => {
  const D = document, $ = id => D.getElementById(id);

  function ensureDot() {
    const name = $('pName'); if (!name) return;
    const host = name.parentNode; if (!host) return;
    let dot = host.querySelector(':scope > .ember-dot');
    if (dot && dot.nextElementSibling === name) return;
    if (!dot) { dot = D.createElement('i'); dot.className = 'ember-dot'; dot.setAttribute('aria-hidden', 'true'); }
    host.insertBefore(dot, name);
  }

  // 1.10.18: the header gear is retired; Settings now lives only in the right panel (✦ > Settings & connections).
  function dropGear() { const g = $('bSetTop'); if (g) g.remove(); }
  function run() { dropGear(); ensureDot(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => { run(); setTimeout(run, 400); setTimeout(run, 1500); });
  else { run(); setTimeout(run, 400); setTimeout(run, 1500); }

  // keep the dot (and button) if any other script rebuilds the header
  const hdr = D.querySelector('header');
  if (hdr && window.MutationObserver) {
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 80); }).observe(hdr, { childList: true, subtree: true });
  }
})();
