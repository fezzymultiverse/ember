/* Ember 1.10.21: one menu for chat engines + keyless media tools, each with its own ON/OFF toggle. No media API keys. */
'use strict';
(() => {
 const W = window, $ = id => document.getElementById(id);
 const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CHAT = [['groq','Groq'],['mistral','Mistral AI'],['gemini','Google Gemini'],['cohere','Cohere'],['openrouter','OpenRouter (opt-in)'],['plugsky','Plugsky AI (opt-in)']];
 const row = (id, label, sub, on) => '<div class="ef-switch-row"><span>' + esc(label) + (sub ? '<small class="em-sub">' + esc(sub) + '</small>' : '') + '</span><button type="button" class="ef-switch ' + (on ? 'on' : '') + '" data-em="' + esc(id) + '" role="switch" aria-checked="' + !!on + '">' + (on ? 'ON' : 'OFF') + '</button></div>';
 const chatOn = id => { let e = {}; try { e = JSON.parse(localStorage.getItem('ember_route_enabled') || '{}') || {}; } catch (_) {} return (id === 'openrouter' || id === 'plugsky') ? e[id] === true : e[id] !== false; };
 const live = id => { try { return ((W.Prov.keys()[id]) || []).filter(e => e && !e.bad).length; } catch (_) { return 0; } };
 function paint(card) {
  const KL = W.EmberKeyless, tools = (KL && KL.tools ? KL.tools() : []);
  let h = '<div class="ct">Engines &amp; media menu</div><div class="ef-content"><p class="hint">Every engine and tool has its own switch. Chat engines need your key; media tools are keyless and never ask for one.</p><div class="em-g">Chat AI engines</div>';
  CHAT.forEach(([id, name]) => { const n = live(id); h += row('chat:' + id, name, n ? n + ' live key' + (n > 1 ? 's' : '') : 'no live key — skipped', chatOn(id)); });
  const groups = {}; tools.forEach(t => (groups[t.group] = groups[t.group] || []).push(t));
  ['Images', 'Audio', 'Documents', 'Code & Data', 'Local'].forEach(g => { if (!groups[g]) return; h += '<div class="em-g">Media · ' + esc(g) + ' (keyless)</div>'; groups[g].forEach(t => { h += row('tool:' + t.id, t.name, t.best, t.on); }); });
  h += '<p class="hint em-note">Stability AI makes audio and video and needs your own key (optional: images fall back to the keyless tools). Add it in Plugins &gt; Media &amp; Music.</p></div>';
  card.innerHTML = h;
 }
 function init() {
  if ($('efMenu') || !W.Prov) return;
  const host = $('acc_b_features') || document.querySelector('#settings .sb'); if (!host) return;
  const card = document.createElement('div'); card.id = 'efMenu'; card.className = 'card'; card.dataset.tab = 'features';
  paint(card); host.prepend(card);
  card.addEventListener('click', e => {
   const b = e.target.closest('[data-em]'); 
   if (b) {
    const [kind, id] = b.dataset.em.split(':'), on = b.getAttribute('aria-checked') !== 'true';
    if (kind === 'chat') { W.Prov.setEnabled(id, on); if (!on && W.Prov.getPinned && W.Prov.getPinned() === id) W.Prov.setPinned(null); try { localStorage.removeItem('ember_last_good'); } catch (_) {} }
    else if (W.EmberKeyless) W.EmberKeyless.toggle(id, on);
    paint(card); return;
   }
    });
  W.addEventListener('ember-provider-stats', () => { if ($('settings') && $('settings').classList.contains('show')) paint(card); });
  W.addEventListener('ember-plus-change', () => paint(card));
 }
 const go = () => { init(); if (!$('efMenu')) setTimeout(init, 800); };
 if (document.readyState === 'complete') go(); else W.addEventListener('load', go);
})();
