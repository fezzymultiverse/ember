// Ember V1.9.62 — structured assistant artifacts. HTML previews run in a sandboxed iframe.
'use strict';
(() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeName = (s, fallback) => {
    let n = String(s || fallback || 'artifact.txt').split(/[\\/]/).pop().replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim().slice(0, 100);
    return n || fallback || 'artifact.txt';
  };
  function parse(text) {
    const src = String(text == null ? '' : text), items = [];
    const re = /<artifact\b([^>]*)>([\s\S]*?)<\/artifact\s*>/gi;
    let m, clean = '', last = 0;
    while ((m = re.exec(src))) {
      clean += src.slice(last, m.index);
      const attrs = m[1] || '', get = name => { const a = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", 'i').exec(attrs); return a ? a[2] : ''; };
      const type = (get('type') || 'code').toLowerCase();
      const language = get('language') || (type === 'html' ? 'html' : type === 'markdown' ? 'markdown' : type);
      const fallback = ({markdown:'notes.md',md:'notes.md',html:'index.html',code:'script.' + (language === 'python' ? 'py' : language === 'bash' ? 'sh' : language === 'javascript' ? 'js' : 'txt'),json:'data.json',csv:'data.csv',pdf:'document.html'})[type] || 'artifact.txt';
      items.push({ type, language, title:safeName(get('title'), fallback), content:m[2].replace(/^\r?\n|\r?\n$/g, '') });
      last = re.lastIndex;
    }
    clean += src.slice(last);
    return { text:clean.trim(), items };
  }
  function card(a, i, mi) {
    const html = a.type === 'html';
    const icon = html ? '◇' : a.type === 'markdown' || a.type === 'md' ? '▤' : a.type === 'pdf' ? '▧' : a.type === 'json' || a.type === 'csv' ? '▦' : '⌘';
    const view = html || a.type === 'markdown' || a.type === 'md' || a.type === 'pdf';
    return '<section class="artifact-card" aria-label="Artifact '+esc(a.title)+'"><div class="artifact-icon" aria-hidden="true">'+icon+'</div><div class="artifact-info"><b>'+esc(a.title)+'</b><small>'+esc(a.type.toUpperCase())+(a.language && !['markdown','md','html','pdf','json','csv'].includes(a.type) ? ' · '+esc(a.language) : '')+' · '+a.content.length.toLocaleString()+' chars</small></div>'+(view?'<button class="artifact-action" data-artifact-view="'+i+'" data-message-index="'+mi+'">'+(html?'Live Preview':'View')+'</button>':'')+'<button class="artifact-action secondary" data-artifact-download="'+i+'" data-message-index="'+mi+'">Download</button></section>';
  }
  function render(text, mi) {
    const p = parse(text);
    if (!p.items.length) return null;
    const intro = p.text ? '<div class="artifact-intro">'+esc(p.text).replace(/\n/g,'<br>')+'</div>' : '';
    return { text:p.text || 'Artifact ready.', html:intro+'<div class="artifact-list">'+p.items.map((a,i)=>card(a,i,mi)).join('')+'</div>' };
  }
  function getArtifact(mi, ai) {
    const msgs = window.EmberBridge && window.EmberBridge.getConversation ? window.EmberBridge.getConversation() : null;
    const msg = msgs && msgs[mi]; if (!msg || typeof msg.t !== 'string') return null;
    return parse(msg.t).items[ai] || null;
  }
  function download(a) {
    const ext = a.title.split('.').pop().toLowerCase();
    const mime = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'md' ? 'text/markdown' : ext === 'json' ? 'application/json' : ext === 'csv' ? 'text/csv' : ext === 'py' ? 'text/x-python' : ext === 'js' ? 'text/javascript' : ext === 'pdf' ? 'text/html' : 'text/plain';
    const blob = new Blob([a.content], {type:mime+';charset=utf-8'}), url = URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url; link.download=a.title.endsWith('.pdf') ? a.title.replace(/\.pdf$/i,'.html') : a.title; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
    if (a.type === 'pdf') toast('Downloaded HTML source; PDF export is not available in this build');
  }
  function close() { const old=document.getElementById('artifactOverlay'); if(old) old.remove(); }
  function view(a) {
    close(); const overlay=document.createElement('div'); overlay.id='artifactOverlay'; overlay.className='artifact-overlay';
    const html=a.type==='html';
    const body=html ? '<iframe class="artifact-frame" title="Preview of '+esc(a.title)+'" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>' : '<pre class="artifact-text">'+esc(a.content)+'</pre>';
    overlay.innerHTML='<div class="artifact-viewer" role="dialog" aria-modal="true" aria-label="'+esc(a.title)+'"><header class="artifact-viewer-head"><div><b>'+esc(a.title)+'</b><small>'+ (html?'Sandboxed preview':a.type==='pdf'?'Document source · PDF export unavailable':'Artifact preview')+'</small></div><button type="button" class="artifact-close" aria-label="Close preview">×</button></header><div class="artifact-viewer-body">'+body+'</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.artifact-close').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    if(html) overlay.querySelector('iframe').srcdoc='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: https:; style-src \'unsafe-inline\' https:; font-src data: https:; script-src \'unsafe-inline\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1">'+a.content;
  }
  document.addEventListener('click', e => {
    const v=e.target.closest && e.target.closest('[data-artifact-view]'), d=e.target.closest && e.target.closest('[data-artifact-download]');
    const b=v||d; if(!b) return;
    e.preventDefault(); const a=getArtifact(Number(b.dataset.messageIndex),Number(v?v.dataset.artifactView:d.dataset.artifactDownload));
    if(!a) { if(window.toast) toast('Artifact is no longer available'); return; }
    if(v) view(a); else download(a);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  window.EmberArtifacts={parse,render};
})();
