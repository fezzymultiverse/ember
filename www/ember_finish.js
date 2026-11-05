/* Ember 1.10.48 UI-only decorations; no router, state or conversation writes. */
'use strict';
(() => {
  const W = window, A = W.EmberArtifacts;
  if (W.EmberFinish) return;
  const esc = s => String(s || '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const path = {
    PDF: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M8 12h8M8 15h5"/>',
    DOC: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M8 11h7M8 14h7M8 17h4"/>',
    SVG: '<path d="M4 4h16v16H4zM4 16l5-6 4 4 3-3 4 5"/><circle cx="15" cy="8" r="1"/>',
    IMAGE: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m4 17 5-5 4 3 3-4 4 6"/>',
    HTML: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>',
    MD: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 15V9l3 3 3-3v6m3-3 3 3 3-3m-3 3V8"/>'
  };
  const svg = label => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(path[label] || path.DOC)+'</svg>';
  const kind = type => ({pdf:'PDF',document:'DOC',docx:'DOC',markdown:'MD',md:'MD',svg:'SVG',image:'IMAGE',html:'HTML'})[type] || String(type || 'DOC').toUpperCase();
  function badge(type) { const label = kind(type); return '<span class="ef-type-badge ef-type-'+label.toLowerCase()+'">'+svg(label)+'<span>'+esc(label)+'</span></span>'; }
  function providerBadge(eng) {
    if (!eng?.p) return '<span class="ef-answer-provider ef-answer-provider-unknown" title="No answering-provider metadata was stored for this reply">'+svg('DOC')+'<span>Provider not recorded</span></span>';
    const cfg = W.Prov?.CFG?.[eng.p], label = cfg?.name || (W.Prov?.label ? W.Prov.label(eng.p) : eng.p);
    // Read only the provider actually stored on this message, never the active provider or attempted fallback.
    const text = String(label), logos = {openrouter:'openrouter.svg',plugsky:'plugsky.ico',stability:'stability.svg',groq:'groq.svg',mistral:'mistral.svg',gemini:'gemini.svg',cohere:'cohere.svg',anthropic:'anthropic.svg'}, logo = logos[eng.p];
    const fallback = '<span class="ef-answer-provider-letter" aria-hidden="true">'+esc(text.slice(0,2).toUpperCase())+'</span>';
    return '<span class="ef-answer-provider" data-provider="'+esc(eng.p)+'" title="Answered by '+esc(text)+(eng.m?' · '+esc(eng.m):' · model not disclosed')+'">'+fallback+(logo?'<img src="provider-icons/'+logo+'" alt="" loading="lazy" decoding="async">':'')+'<span>'+esc(text)+'</span></span>';
  }
  let raf = 0;
  function decorate() {
    let messages = []; try { messages = W.EmberBridge?.getConversation?.() || []; } catch (_) {}
    document.querySelectorAll('#log .msg.a:not(.typing):not(.stream-preview)').forEach(row => {
      if (row.querySelector('.ef-answer-provider')) return;
      const copy = row.querySelector('[data-act="copy"][data-i]'), message = copy ? messages[+copy.dataset.i] : null;
      if (!copy || !message) return;
      const footer = row.querySelector('.mt'); if (footer) footer.insertAdjacentHTML('afterbegin', providerBadge(message.eng));
    });
    document.querySelectorAll('.artifact-card').forEach(card => {
      if (card.querySelector('.ef-type-badge')) return;
      const label = card.querySelector('.artifact-info small')?.textContent?.split(/[ ·]/)[0] || 'DOC';
      const type = label.toLowerCase() === 'document' ? 'document' : label.toLowerCase();
      card.querySelector('.artifact-info')?.insertAdjacentHTML('beforeend', badge(type));
      const icon = card.querySelector('.artifact-icon'); if (icon) icon.innerHTML = svg(kind(type));
    });
    document.querySelectorAll('.artifact-shelf-row').forEach(row => {
      if (row.querySelector('.ef-type-badge')) return;
      const button = row.querySelector('[data-message-index]'); if (!button) return;
      const mi = +button.dataset.messageIndex, ai = +(button.dataset.artifactView || button.dataset.artifactDownload || 0), artifact = A?.parse(messages[mi]?.t || '').items[ai];
      if (artifact) row.insertAdjacentHTML('afterbegin', badge(artifact.type));
    });
    document.querySelectorAll('.artifact-inline').forEach(figure => {
      if (figure.querySelector('.ef-type-badge')) return;
      figure.querySelector('figcaption')?.insertAdjacentHTML('afterbegin', badge(figure.querySelector('[data-artifact-png]') ? 'svg' : 'image'));
    });
    document.querySelectorAll('.ef-artifact').forEach(row => {
      if (row.querySelector('.ef-type-badge')) return;
      const image = row.querySelector('img'); row.insertAdjacentHTML('afterbegin', badge(image ? 'image' : 'document'));
    });
    document.querySelectorAll('#artList .art-row').forEach(row => {
      if (row.querySelector('.ef-type-badge')) return;
      const label = row.querySelector('.art-tx small')?.textContent.split(' · ')[0].trim().toLowerCase() || 'document';
      row.querySelector('.art-tx')?.insertAdjacentHTML('beforeend', badge(label === 'doc' ? 'document' : label));
    });
    document.querySelectorAll('.ek-row:has(.ek-src),.tl-item:has(.ek-src)').forEach(row => {
      if (row.dataset.efSources) return; row.dataset.efSources = '1';
      const details = row.querySelector('.ek-src'); row.tabIndex = 0; row.setAttribute('aria-label', 'Search activity. Expand returned sources'); row.setAttribute('aria-expanded', String(details.open));
      details.addEventListener('toggle', () => row.setAttribute('aria-expanded', String(details.open)));
    });
    const empty = document.getElementById('empty');
    if (empty && !empty.querySelector('.ef-empty-art')) { const im = document.createElement('img'); im.className = 'ef-empty-art'; im.src = 'ember-empty.svg'; im.alt = ''; im.setAttribute('aria-hidden','true'); im.width = 300; im.height = 160; empty.prepend(im); }
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; decorate(); }); }
  const log = document.getElementById('log'); if (log) new MutationObserver(schedule).observe(log,{childList:true,subtree:true});
  const media = document.getElementById('efArtifacts'); if (media) new MutationObserver(schedule).observe(media,{childList:true,subtree:true});
  const artList = document.getElementById('artList'); if (artList) new MutationObserver(schedule).observe(artList,{childList:true,subtree:true});
  document.addEventListener('click', e => {
    if (e.target.closest('a,button,input,select,summary,.ek-links')) return;
    const row = e.target.closest('[data-ef-sources]'); const details = row?.querySelector('.ek-src'); if (details) details.open = !details.open;
  });
  document.addEventListener('keydown', e => {
    if (!/^(Enter| )$/.test(e.key) || !e.target.matches('[data-ef-sources]')) return;
    const details = e.target.querySelector('.ek-src'); if (details) { e.preventDefault(); details.open = !details.open; }
  });
  document.addEventListener('error', e => { const im = e.target; if (im?.matches?.('.ef-answer-provider img')) im.remove(); }, true);
  const emit = ['ember-saved-row-changed','ember-boot-ready','ember-media-update']; emit.forEach(name => W.addEventListener(name, schedule));
  W.EmberFinish = {version:'1.10.48',decorate,providerBadge,badge}; decorate();
})();
