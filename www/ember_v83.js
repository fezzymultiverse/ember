// Ember V1.9.84 - ember_v83.js: the Modes pill (Chill / Sharp / Deep live behind it) and the Device tools button in Settings.
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const pill = $('bModes'), pop = $('modes'), lbl = $('modesLbl');
  if (pill && pop && lbl) {
    document.body.appendChild(pop); // out of the composer, so no row can clip it; the three buttons and their handlers are the same nodes app.js already wired
    const NAMES = { chill: 'Chill', sharp: 'Sharp', deep: 'Deep' };
    const current = () => {
      const on = pop.querySelector('button.on'); if (on && NAMES[on.dataset.m]) return on.dataset.m;
      try { const m = (JSON.parse(localStorage.getItem('ember_set') || '{}') || {}).mode; if (NAMES[m]) return m; } catch (e) { /* storage blocked */ }
      return 'chill';
    };
    const sync = () => { const m = current(); lbl.textContent = NAMES[m]; pop.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', b.dataset.m == m ? 'true' : 'false')); };
    const place = () => { const r = pill.getBoundingClientRect(); pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - pop.offsetWidth - 12)) + 'px'; pop.style.bottom = Math.max(12, window.innerHeight - r.top + 8) + 'px'; pop.style.top = 'auto'; };
    const isOpen = () => !pop.classList.contains('hidden');
    const set = v => { pop.classList.toggle('hidden', !v); pill.setAttribute('aria-expanded', v ? 'true' : 'false'); if (v) { sync(); place(); } };
    pill.addEventListener('click', e => { e.stopPropagation(); set(!isOpen()); });
    pop.addEventListener('click', e => { if (e.target.closest('button[data-m]')) setTimeout(() => { sync(); set(false); }, 0); });
    document.addEventListener('click', e => { if (isOpen() && !pop.contains(e.target) && !pill.contains(e.target)) set(false); });
    document.addEventListener('keydown', e => { if (e.key == 'Escape' && isOpen()) set(false); });
    window.addEventListener('resize', () => { if (isOpen()) place(); });
    if (window.MutationObserver) new MutationObserver(sync).observe(pop, { attributes: true, attributeFilter: ['class'], subtree: true });
    sync(); setTimeout(sync, 400);
  }
  // Device tools moved here from the + menu
  const dev = $('bDevOpen');
  if (dev) dev.onclick = () => {
    const x = $('bSx'); if (x) x.click();
    setTimeout(() => { const b = $('bDevice'); if (b) b.click(); }, 80);
  };
})();

// ---- GitHub pill: toggles Ember's GitHub tools (read, and write where a repo slot allows it) ----
(() => {
  const $ = id => document.getElementById(id), b = $('bGhPill'); if (!b) return;
  const G = () => window.EmberGithub;
  const toast = m => { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
  const paint = () => { const on = !!(G() && G().pill && G().pill.get()); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  b.addEventListener('click', () => {
    const g = G(); if (!g || !g.pill) return toast('GitHub did not load.');
    const v = !g.pill.get(); g.pill.set(v); paint();
    if (!v) return toast('GitHub off');
    let n = 0; try { n = g.slots().length; } catch (e) { n = 0; }
    toast(!g.token() ? 'GitHub on, but no token yet: Settings > GitHub' : !n ? 'GitHub on, but no repo slot yet: Settings > GitHub' : 'GitHub on: Ember can read and write your repo');
  });
  window.addEventListener('ember-gh-pill', paint); paint();
})();
