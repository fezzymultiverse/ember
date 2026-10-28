// Ember V1.9.80 - ember_puter.js: Puter runs on its auth token (a key like any other engine). No sign-in window, no puter.js.
// Paste the token in Settings > Keys (Paste & detect finds it, or pick Puter in "Add one by hand"). This file only paints the status line
// and opens Puter's dashboard, where the token is copied (Account > Auth Token).
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const paint = () => {
    const b = $('bPuter'), s = $('puterSt'); if (!b || !s || !window.Prov) return;
    const n = (window.Prov.keys().puter || []).length, st = window.Prov.stateOf('puter');
    b.textContent = n ? 'Open Puter dashboard' : 'Get my Puter token';
    s.textContent = !n ? 'No Puter token saved. Copy it from Puter (Account > Auth Token), then use Paste & detect above or pick Puter in the list.'
      : st == 'bad' ? 'Puter rejected the saved token. Copy a fresh one from your Puter dashboard and add it again.'
      : 'Puter token saved (' + n + '). It answers last in the automatic order, or first while Puter is pinned.';
  };
  const wire = () => {
    const b = $('bPuter'); if (!b || b.dataset.wired) return; b.dataset.wired = '1'; paint();
    b.onclick = () => { try { window.open('https://puter.com/dashboard#account', '_blank'); } catch (e) { location.href = 'https://puter.com/dashboard#account'; } };
    setInterval(paint, 4000);
  };
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
