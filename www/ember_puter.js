// Ember V1.9.78 - ember_puter.js: the Connect Puter button (Settings > Keys).
// Puter has no API key. One tap loads puter.js, he signs in in Puter's own window, and Puter joins the automatic route (last in line).
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const paint = () => {
    const b = $('bPuter'), s = $('puterSt'); if (!b || !s || !window.Prov) return;
    const on = window.Prov.puterOn();
    b.textContent = on ? 'Disconnect Puter' : 'Connect Puter (free, no key)';
    s.textContent = on ? 'Connected. Puter answers only if the engines before it fail.' : 'Not connected. Tap Connect, then sign in or create a free Puter account.';
  };
  const wire = () => {
    const b = $('bPuter'); if (!b || b.dataset.wired) return; b.dataset.wired = '1'; paint();
    b.onclick = async () => {
      const s = $('puterSt'); if (!window.Prov) return;
      if (window.Prov.puterOn()) { window.Prov.puterOff(); paint(); return; }
      b.disabled = true; s.textContent = 'Opening Puter sign-in…';
      try { await window.Prov.puterConnect(); } catch (e) { s.textContent = 'Could not connect: ' + String((e && e.message) || 'sign-in was closed').slice(0, 120); b.disabled = false; return; }
      b.disabled = false; paint();
    };
  };
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
