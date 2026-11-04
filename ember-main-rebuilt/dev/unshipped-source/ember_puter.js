// Ember V1.9.84 - ember_puter.js: the Puter token slot (Settings > Keys > Puter).
// Puter runs on its auth token through its OpenAI-compatible endpoint (api.puter.com/puterai/openai/v1), saved like any other engine key.
// Paste the token, Save, done: no email, no sign-in window, nothing opens in a browser.
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const toast = m => { try { if (window.emberToast) return window.emberToast(m); } catch (e) { /* fall through */ } const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
  const P = () => window.Prov;
  const entries = () => (P() && P().entries ? P().entries('puter') : []) || [];
  const refresh = () => { try { if (window.emberRenderKeys) window.emberRenderKeys(); } catch (e) { /* settings not drawn yet */ } paint(); };

  function paint() {
    const s = $('puterSt'); if (!s || !P()) return;
    const list = entries(), n = list.length, last = list[list.length - 1], st = last && last.st;
    const rm = $('puterRm'), ck = $('puterCheck'); if (rm) rm.disabled = !n; if (ck) ck.disabled = !n;
    s.textContent = !n ? 'No Puter token saved yet. Paste it in the box below and tap Save token.'
      : !st ? 'Puter token saved (' + n + '). Not checked yet: tap Check.'
      : st.ok && !st.limited ? 'Puter token saved (' + n + ') and working' + (st.model ? ' · ' + st.model : '') + '. It answers last in the automatic order, or first while Puter is pinned.'
      : st.ok ? 'Puter token saved (' + n + '). Puter says it is rate limited right now; the token itself is valid.'
      : 'Puter did not accept the token: ' + String(st.msg || 'rejected') + ' Paste a fresh one and tap Save token. Get it at puter.com/dashboard > Account > Auth Token > Copy (the whole token, no spaces); a token from before a sign-out or password change stops working.';
  }

  async function save() {
    const box = $('puterTok'), b = $('puterSave'); if (!box || !b || !P()) return;
    const v = String(box.value || '').trim();
    if (!v) { toast('Paste the Puter token first'); box.focus(); return; }
    b.disabled = true; const lbl = b.textContent; b.textContent = 'Checking…';
    let r; try { r = await P().addKey('puter', v); } catch (e) { r = { ok: false, why: (e && e.message) || 'failed' }; }
    b.disabled = false; b.textContent = lbl;
    if (!r.ok) { toast(r.why == 'already added' ? 'That token is already saved' : 'Not saved: ' + r.why); refresh(); return; }
    box.value = '';
    const st = r.e && r.e.st;
    toast(st && st.ok ? 'Puter token saved and working' : 'Saved, but Puter said: ' + String((st && st.msg) || 'no answer').slice(0, 90));
    refresh();
  }

  async function check() {
    const b = $('puterCheck'); if (!b || !P()) return; const list = entries(); if (!list.length) { toast('No Puter token saved yet'); return; }
    b.disabled = true; const lbl = b.textContent; b.textContent = 'Checking…';
    try { for (const e of list) await P().health('puter', e); } catch (e) { /* the result is on each entry */ }
    b.disabled = false; b.textContent = lbl; refresh();
    const st = (entries().slice(-1)[0] || {}).st; toast(st && st.ok ? 'Puter token works' : 'Puter rejected the token');
  }

  function remove() {
    const list = entries(); if (!list.length || !P()) return;
    let go = true; try { go = confirm('Remove the saved Puter token?'); } catch (e) { go = true; }
    if (!go) return;
    list.slice().forEach(e => P().removeKey('puter', e.key)); toast('Puter token removed'); refresh();
  }

  const wire = () => {
    const b = $('puterSave'); if (!b || b.dataset.wired) return; b.dataset.wired = '1'; paint();
    b.onclick = save; $('puterCheck').onclick = check; $('puterRm').onclick = remove;
    const box = $('puterTok'); if (box) box.addEventListener('keydown', e => { if (e.key == 'Enter') { e.preventDefault(); save(); } });
    setInterval(paint, 4000);
  };
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
