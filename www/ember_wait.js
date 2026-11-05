// Ember 1.10.53: live "waiting Ns" counter on the routing pill, so a slow engine never looks like a frozen app.
// Display only. It reads the existing ember-try / ember-token events and never touches routing, requests or replies.
'use strict';
(() => {
  const W = window;
  let name = '', model = '', t0 = 0, got = false, timer = null;
  const base = () => 'Trying ' + name + (model && model !== 'openai' ? ' · ' + model : '');
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function tick() {
    const b = document.getElementById('engs');
    if (!b || !b.classList.contains('working')) { stop(); return; }
    const sp = b.querySelector('span'); if (!sp || !name) return;
    const secs = Math.max(0, Math.round((Date.now() - t0) / 1000));
    if (got) sp.textContent = 'Writing · ' + name + (model && model !== 'openai' ? ' · ' + model : '');
    else if (secs >= 6) sp.textContent = base() + ' · waiting ' + secs + 's';
  }
  W.addEventListener('ember-try', e => {
    const d = e.detail || {};
    name = String(d.name || ''); model = String(d.model || ''); t0 = Date.now(); got = false;
    if (!timer) timer = setInterval(tick, 1000);
  });
  W.addEventListener('ember-token', () => { got = true; });
  W.EmberWait = { state: () => ({ name, model, secs: t0 ? Math.round((Date.now() - t0) / 1000) : 0, receiving: got, running: !!timer }) };
})();
