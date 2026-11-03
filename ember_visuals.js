/* Ember V1.10.42 - ember_visuals.js: additive visuals. Never changes routing, keys, providers, settings or any stored data.
   1 provider badge on each reply (read from the reply's own footer text, which comes from the engine that really answered)
   2 artifact type badges (replaces the emoji tile in the Artifacts list with a typed line icon)
   4 empty-state art (inserted once into #empty). Items 3 and 5 are CSS only. */
'use strict';
(() => {
  const D = document;
  const ICONS = { // local files already shipped in provider-icons/
    'OpenRouter': 'openrouter.svg', 'Plugsky AI': 'plugsky.ico', 'LongCat AI': 'longcat.svg', 'Stability AI': 'stability.svg',
    'Groq': 'groq.svg', 'Mistral': 'mistral.svg', 'Gemini': 'gemini.svg', 'Cohere': 'cohere.svg', 'Claude': 'anthropic.svg'
  };
  const NAMES = Object.keys(ICONS).concat(['Free']);
  const FLAME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1a0800" d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/></svg>';

  /* ---- 1. provider badge ---- */
  function badgeFor(name) {
    const b = D.createElement('span'); b.className = 'vb-prov'; b.title = 'Answered by ' + (name === 'Free' ? 'Free mode' : name); b.setAttribute('role', 'img'); b.setAttribute('aria-label', b.title);
    if (name === 'Free') { b.classList.add('vb-free'); b.innerHTML = FLAME; return b; }
    const img = D.createElement('img'); img.alt = ''; img.decoding = 'async'; img.src = 'provider-icons/' + ICONS[name];
    img.onerror = () => { b.textContent = name.charAt(0); b.classList.add('vb-letter'); img.remove(); };
    b.appendChild(img); return b;
  }
  function answeringName(text) { // first " · " segment that starts with a known engine name (the answering engine comes before any "pin failed" note)
    const parts = String(text || '').split(' · ');
    for (let i = 1; i < parts.length; i++) {
      for (const n of NAMES) { if (parts[i] === n || parts[i].startsWith(n + ' ')) return n; }
    }
    return '';
  }
  function paintProviders() {
    D.querySelectorAll('#log .msg.a .mt').forEach(mt => {
      if (mt.querySelector('.vb-prov')) return;
      const span = mt.querySelector(':scope > span'); if (!span) return;
      const n = answeringName(span.textContent); if (!n) return;
      mt.insertBefore(badgeFor(n), mt.firstChild);
    });
  }

  /* ---- 2. artifact type badges ---- */
  const L = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const FILE = '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>';
  const TYPE = {
    pdf:   { t: 'pdf',   svg: L(FILE + '<path d="M9.5 16.5h5M9.5 13.5h5"/>') },
    doc:   { t: 'doc',   svg: L(FILE + '<path d="M9.5 11h5M9.5 14h5M9.5 17h3"/>') },
    svg:   { t: 'svg',   svg: L('<path d="M5 18c3-9 5-9 7-4s4 3 7-6"/><circle cx="5" cy="18" r="1.6"/><circle cx="19" cy="8" r="1.6"/>') },
    image: { t: 'image', svg: L('<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3 2-2L19 17"/>') },
    html:  { t: 'html',  svg: L('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>') },
    code:  { t: 'code',  svg: L('<path d="M9 8l-4 4 4 4M15 8l4 4-4 4M13 6l-2 12"/>') },
    data:  { t: 'data',  svg: L('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M4 14.5h16M10 5v14"/>') }
  };
  const kindToType = k => { // from the row's own "Kind · chat · time" line
    k = String(k || '').split(' · ')[0].trim().toLowerCase();
    return k === 'pdf' ? TYPE.pdf : (k === 'doc' || k === 'markdown') ? TYPE.doc : k === 'svg' ? TYPE.svg : k === 'image' ? TYPE.image
      : k === 'html' ? TYPE.html : k === 'code' ? TYPE.code : (k === 'json' || k === 'csv') ? TYPE.data : null;
  };
  function paintArtifacts() {
    D.querySelectorAll('#artList .art-row').forEach(row => {
      const ic = row.querySelector('.art-ic'); if (!ic || ic.dataset.vb) return;
      const small = row.querySelector('.art-tx small'); const ty = kindToType(small && small.textContent); if (!ty) return;
      ic.dataset.vb = '1'; ic.dataset.vt = ty.t; ic.classList.add('vb-ai'); ic.innerHTML = ty.svg;
    });
  }

  /* ---- 4. empty-state art ---- */
  function paintEmpty() {
    const e = D.getElementById('empty'); if (!e || e.querySelector('.vb-empty-art')) return;
    const s = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'vb-empty-art'); s.setAttribute('viewBox', '0 0 260 64'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.innerHTML = '<defs><radialGradient id="vbGlow" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="#ff6a00" stop-opacity=".38"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/></radialGradient></defs>'
      + '<ellipse cx="130" cy="62" rx="120" ry="30" fill="url(#vbGlow)"/>'
      + '<circle class="vb-sp" cx="104" cy="52" r="2.4" fill="#ffb347"/><circle class="vb-sp" cx="122" cy="54" r="1.8" fill="#ff8a1f"/>'
      + '<circle class="vb-sp" cx="138" cy="52" r="2.6" fill="#ffd08a"/><circle class="vb-sp" cx="154" cy="55" r="1.9" fill="#ff6a00"/>'
      + '<circle class="vb-sp" cx="114" cy="56" r="1.6" fill="#ffd08a"/><circle class="vb-sp" cx="146" cy="56" r="2.1" fill="#ffb347"/>';
    e.insertBefore(s, e.firstChild);
  }

  let raf = 0;
  const tick = () => { raf = 0; try { paintProviders(); paintArtifacts(); } catch (_) { /* cosmetic only */ } };
  const queue = () => { if (!raf) raf = requestAnimationFrame(tick); };
  try { paintEmpty(); } catch (_) { /* cosmetic only */ }
  new MutationObserver(queue).observe(D.body, { childList: true, subtree: true });
  queue();
  window.EmberVisuals = { providerName: answeringName, artifactType: k => { const t = kindToType(k); return t ? t.t : ''; } };
})();
