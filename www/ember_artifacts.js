// Ember local exports: PDF generation never calls a hosted provider. Earlier: artifacts: markdown, document, pdf (real PDF files via ember_pdf.js), svg (preview + PNG), html, code, json, csv.
// HTML previews run in a sandboxed iframe; SVG previews render through <img> so scripts can never run.
'use strict';
(() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const T = m => { try { (window.toast || console.log)(m); } catch (_) { /* no toast */ } };
  const safeName = (s, fallback) => {
    let n = String(s || fallback || 'artifact.txt').split(/[\\/]/).pop().replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim().slice(0, 100);
    return n || fallback || 'artifact.txt';
  };
  const baseName = t => String(t || 'artifact').replace(/\.[A-Za-z0-9]{1,5}$/, '') || 'artifact';
  const isMd = t => t === 'markdown' || t === 'md';
  const normType = t => { t = String(t || 'code').toLowerCase().trim(); return t === 'md' ? 'markdown' : /^(doc|docx|document|letter|report)$/.test(t) ? 'document' : /^(svg|image\/svg\+xml)$/.test(t) ? 'svg' : t; };
  function parse(text) {
    const src = String(text == null ? '' : text), items = [];
    const re = /<artifact\b([^>]*)>([\s\S]*?)<\/artifact\s*>/gi;
    let m, clean = '', last = 0;
    while ((m = re.exec(src))) {
      clean += src.slice(last, m.index);
      const attrs = m[1] || '', get = name => { const a = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", 'i').exec(attrs); return a ? a[2] : ''; };
      const type = normType(get('type'));
      const language = get('language') || (type === 'html' ? 'html' : isMd(type) ? 'markdown' : type);
      const fallback = ({markdown:'notes.md',html:'index.html',code:'script.' + (language === 'python' ? 'py' : language === 'bash' ? 'sh' : language === 'javascript' ? 'js' : 'txt'),json:'data.json',csv:'data.csv',pdf:'document.pdf',document:'document.md',svg:'image.svg',image:'image.png'})[type] || 'artifact.txt';
      let title = safeName(get('title'), fallback);
      if (type === 'pdf') title = baseName(title) + '.pdf';
      else if (type === 'svg') title = baseName(title) + '.svg';
      const opts = {}; ['theme', 'accent', 'cover', 'toc', 'orientation', 'subtitle', 'author', 'date'].forEach(k => { const v = get(k); if (v) opts[k] = v; });
      items.push({ type, language, title, opts, content:m[2].replace(/^\r?\n|\r?\n$/g, '') });
      last = re.lastIndex;
    }
    clean += src.slice(last);
    return { text:clean.trim(), items };
  }
  function figureHtml(alt, src) {
    const cap = esc(String(alt || '').trim()), u = String(src || '').trim(), st = 'margin:14px 0;padding:10px;border-radius:12px;background:rgba(255,106,0,.07);text-align:center';
    if (/^https:\/\//i.test(u) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(u)) return '<figure style="' + st + '"><img src="' + esc(u) + '" alt="' + cap + '" loading="lazy" referrerpolicy="no-referrer" style="max-width:100%;max-height:340px;border-radius:8px">' + (cap ? '<figcaption style="font-size:12px;opacity:.75;margin-top:6px">' + cap + '</figcaption>' : '') + '</figure>';
    const what = /^img:/i.test(u) && !/^img:media:/i.test(u) ? 'not available (built-in only)' : 'loaded when you tap Save PDF';
    return '<figure style="' + st + '"><div style="font-size:26px;line-height:1">\uD83D\uDDBC\uFE0F</div><figcaption style="font-size:12px;opacity:.8;margin-top:6px">' + (cap ? '<b>' + cap + '</b><br>' : '') + 'Picture ' + what + '</figcaption></figure>';
  }
  function markdownHtml(src) {
    const inline = value => {
      let x=esc(value);
      x=x.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
      x=x.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      return x;
    };
    const lines=String(src||'').replace(/\r/g,'').split('\n'), out=[]; let list='', para=[], code=false, codeLines=[], table=[], items=[];
    const flushPara=()=>{if(para.length){out.push('<p>'+para.map(inline).join('<br>')+'</p>');para=[];}};
    const flushList=()=>{if(list){out.push('<'+list+'>'+items.map(x=>'<li>'+inline(x)+'</li>').join('')+'</'+list+'>');list='';items=[];}};
    const flushTable=()=>{if(table.length){const rows=table.filter(x=>!/^\s*\|?\s*:?-{3,}/.test(x));if(rows.length){out.push('<table>'+rows.map((r,i)=>'<tr>'+r.trim().replace(/^\||\|$/g,'').split('|').map(c=>'<'+(i?'td':'th')+'>'+inline(c.trim())+'</'+(i?'td':'th')+'>').join('')+'</tr>').join('')+'</table>');}table=[];}};
    for(const line of lines){
      if(/^```/.test(line)){flushPara();flushList();flushTable();if(code){out.push('<pre><code>'+esc(codeLines.join('\n'))+'</code></pre>');codeLines=[];code=false;}else code=true;continue;}
      if(code){codeLines.push(line);continue;}
      if(/^\s*\|.*\|\s*$/.test(line)){flushPara();flushList();table.push(line);continue;}else flushTable();
      const h=/^(#{1,6})\s+(.+)$/.exec(line); if(h){flushPara();flushList();out.push('<h'+h[1].length+'>'+inline(h[2])+'</h'+h[1].length+'>');continue;}
      const im=/^\s*!\[([^\]]*)\]\(\s*(.+?)\s*\)\s*$/.exec(line); if(im){flushPara();flushList();out.push(figureHtml(im[1],im[2]));continue;}
      if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)){flushPara();flushList();out.push('<hr>');continue;}
      const q=/^\s*>\s?(.*)$/.exec(line); if(q){flushPara();flushList();out.push('<blockquote>'+inline(q[1])+'</blockquote>');continue;}
      const li=/^\s*([-*+] |\d+\. )(.+)$/.exec(line); if(li){flushPara();const next=/^\s*\d+\. /.test(line)?'ol':'ul';if(list&&list!==next)flushList();list=next;items.push(li[2]);continue;}
      if(!line.trim()){flushPara();flushList();continue;} flushList();para.push(line);
    }
    flushPara();flushList();flushTable();if(codeLines.length&&code)out.push('<pre><code>'+esc(codeLines.join('\n'))+'</code></pre>');
    return '<article class="artifact-markdown">'+out.join('\n')+'</article>';
  }
  function highlightCode(src) {
    const safe=esc(src), token=/(\/\*[^]*?\*\/|\/\/[^\n]*|#[^\n]*|\"(?:\\.|[^\"\\])*\"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|class|new|async|await|import|from|def|print|True|False|None|try|except|in|of|export|default)\b|\b\d+(?:\.\d+)?\b)/g;
    return safe.replace(token,m=>'<span class=\"code-'+(/^\/\//.test(m)||/^#/.test(m)||/^\/\*/.test(m)?'comment':/^[\"'`]/.test(m)?'string':/^\d/.test(m)?'number':'keyword')+'\">'+m+'</span>');
  }

  // ---- icons (outline, white; orange on hover/active via CSS) ----
  const I = {
    doc:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h5.5M9.5 15.5h5.5"/></svg>',
    code:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/></svg>',
    img:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3L16 12l4 4"/></svg>',
    web:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></svg>',
    data:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M10 4.5v15"/></svg>'
  };
  const iconFor = a => a.type === 'html' ? I.web : a.type === 'svg' || a.type === 'image' ? I.img : a.type === 'code' ? I.code : a.type === 'json' || a.type === 'csv' ? I.data : I.doc;
  const kindLabel = a => ({ pdf:'PDF', document:'DOCUMENT', markdown:'MARKDOWN', svg:'SVG IMAGE', image:'IMAGE', html:'HTML', code:'CODE', json:'JSON', csv:'CSV' })[a.type] || a.type.toUpperCase();

  function shelf(messages) {
    const found=[];(messages||[]).forEach((m,mi)=>{if(!m||m.r!=='a'||typeof m.t!=='string')return;parse(m.t).items.forEach((a,ai)=>found.push({a,mi,ai}));});
    if(!found.length)return '';
    return '<details class="artifact-shelf"><summary>Artifact shelf <span>'+found.length+'</span></summary><div>'+found.map(x=>'<div class="artifact-shelf-row"><b>'+esc(x.a.title)+'</b><button class="artifact-action" data-artifact-view="'+x.ai+'" data-message-index="'+x.mi+'">Open</button><button class="artifact-action secondary" data-artifact-download="'+x.ai+'" data-message-index="'+x.mi+'">'+(x.a.type==='pdf'?'Save PDF':'Download')+'</button>'+(x.a.type==='pdf'?'':'<button class=\"artifact-action secondary\" data-artifact-pdf=\"'+x.ai+'\" data-message-index=\"'+x.mi+'\">PDF</button>')+'</div>').join('')+'</div></details>';
  }
  function card(a, i, mi) {
    const html = a.type === 'html', pdf = a.type === 'pdf', doc = a.type === 'document', svg = a.type === 'svg', md = isMd(a.type);
    const at = (k, label, cls) => '<button class="artifact-action' + (cls ? ' ' + cls : '') + '" data-artifact-' + k + '="' + i + '" data-message-index="' + mi + '">' + label + '</button>';
    const view = html || md || pdf || doc || svg || ['code','json','csv'].includes(a.type);
    return '<section class="artifact-card" aria-label="Artifact '+esc(a.title)+'"><div class="artifact-icon" aria-hidden="true">'+iconFor(a)+'</div><div class="artifact-info"><b>'+esc(a.title)+'</b><small>'+kindLabel(a)+(a.language && a.type === 'code' ? ' · '+esc(a.language) : '')+' · '+a.content.length.toLocaleString()+' chars</small></div>'
      +(view?at('view', html?'Live Preview':a.type==='code'?'View code':'View'):'')
      +(pdf?at('pdf','Save PDF'):at('pdf','PDF','secondary'))
      +(doc?at('doc','Word','secondary'):'')
      +(svg?at('png','PNG','secondary'):'')
      +(a.type==='code'?at('copy','Copy','secondary')+(window.EmberNative&&window.EmberNative.openTermux?at('termux','Open in Termux','secondary'):''):'')
      +(pdf?'':at('download', svg?'SVG':'Download','secondary'))+'</section>';
  }
  function render(text, mi) {
    const p = parse(text);
    if (!p.items.length) return null;
    const intro = p.text ? '<div class="artifact-intro">'+esc(p.text).replace(/\n/g,'<br>')+'</div>' : '';
    return { text:p.text || 'Artifact ready.', html:intro+'<div class="artifact-list">'+p.items.map((a,i)=>inlineOk(a)?inline(a,i,mi):card(a,i,mi)).join('')+'</div>' };
  }
  // ---- pictures drop straight into the chat bubble (no card, no panel to hunt for) ----
  // type="svg": the SVG itself. type="image": content is an https/data URL, or media:<id> for a picture saved on this phone (Stability).
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const mediaCache = new Map();
  const imgRef = c => { c = String(c || '').trim(); return /^media:[\w-]+$/.test(c) ? { media: c.slice(6) } : /^(https:\/\/|data:image\/)/i.test(c) ? { url: c } : null; };
  const inlineOk = a => (a.type === 'svg' && !!cleanSvg(a.content)) || (a.type === 'image' && !!imgRef(a.content));
  function inline(a, i, mi) {
    const at = (k, label, cls) => '<button class="artifact-action' + (cls ? ' ' + cls : '') + '" data-artifact-' + k + '="' + i + '" data-message-index="' + mi + '">' + label + '</button>';
    let img, acts;
    if (a.type === 'svg') { img = '<img class="artifact-inline-img" alt="' + esc(a.title) + '" src="' + svgUrl(cleanSvg(a.content)) + '">'; acts = at('png', 'Save PNG') + at('download', 'SVG', 'secondary') + at('pdf', 'PDF', 'secondary'); }
    else {
      const r = imgRef(a.content);
      img = r.media ? '<img class="artifact-inline-img" alt="' + esc(a.title) + '" data-ember-media="' + esc(r.media) + '" src="' + (mediaCache.get(r.media) || BLANK) + '">'
                    : '<img class="artifact-inline-img" alt="' + esc(a.title) + '" referrerpolicy="no-referrer" loading="lazy" src="' + esc(r.url) + '">';
      acts = at('download', 'Save image') + at('pdf', 'PDF', 'secondary');
    }
    return '<figure class="artifact-inline"><button type="button" class="artifact-inline-open" data-artifact-view="' + i + '" data-message-index="' + mi + '" aria-label="Open ' + esc(a.title) + ' full size">' + img + '</button><figcaption>' + acts + '</figcaption></figure>';
  }
  async function mediaUrl(id) {
    if (mediaCache.has(id)) return mediaCache.get(id);
    const M = window.EmberMedia; if (!M || !M.get) return null;
    const rec = await M.get(id); if (!rec || !rec.blob) return null;
    const u = URL.createObjectURL(rec.blob); mediaCache.set(id, u); return u;
  }
  function hydrate(root) {
    (root || document).querySelectorAll('img[data-ember-media]').forEach(async im => {
      if (im.dataset.embBusy || im.getAttribute('src') !== BLANK) return; im.dataset.embBusy = '1';
      let u = null; try { u = await mediaUrl(im.dataset.emberMedia); } catch (_) { /* storage blocked */ }
      if (u) im.src = u; else im.alt = 'This picture is no longer stored on this device';
    });
  }
  async function imageBlob(a) {
    const r = imgRef(a.content); if (!r) return null;
    if (r.media) { const rec = window.EmberMedia && window.EmberMedia.get ? await window.EmberMedia.get(r.media) : null; return rec && rec.blob || null; }
    const res = await fetch(r.url, { referrerPolicy: 'no-referrer' }); if (!res.ok) throw new Error('HTTP ' + res.status); return res.blob();
  }
  async function saveImage(a) {
    try {
      const b = await imageBlob(a); if (!b || !b.size) throw new Error('empty');
      const ext = ((b.type || 'image/png').split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\+.*/, '');
      await saveBlob(b, baseName(a.title).replace(/[^\w.-]+/g, '_') + '.' + ext);
    } catch (_) {
      const r = imgRef(a.content);
      if (r && r.url && !/^data:/i.test(r.url)) { try { window.open(r.url, '_blank'); T('Could not save in-app. Opened the picture; press and hold to save.'); } catch (_e) { T('Could not save the image'); } }
      else T('Could not save the image');
    }
  }
  function copyContent(text) {
    try { if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text).then(()=>true,()=>false); } catch(_) {}
    try { const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0;top:0;left:0';document.body.appendChild(ta);ta.focus();ta.select();const ok=document.execCommand('copy');ta.remove();return Promise.resolve(!!ok); } catch(_) { return Promise.resolve(false); }
  }
  function getArtifact(mi, ai) {
    const msgs = window.EmberBridge && window.EmberBridge.getConversation ? window.EmberBridge.getConversation() : null;
    const msg = msgs && msgs[mi]; if (!msg || typeof msg.t !== 'string') return null;
    return parse(msg.t).items[ai] || null;
  }

  // ---- saving: the APK WebView ignores blob downloads, so there the share sheet ("Save to Files") goes first ----
  const blobB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || '').split(',')[1] || ''); r.onerror = () => rej(r.error || new Error('could not read the file')); r.readAsDataURL(blob); });
  function devicePlugin() {
    const cap = window.Capacitor; if (!cap) return null;
    try { const P = cap.Plugins || {}; if (P.EmberDevice) return P.EmberDevice; if (cap.isNativePlatform && cap.isNativePlatform() && cap.isPluginAvailable && cap.isPluginAvailable('EmberDevice') && cap.registerPlugin) return cap.registerPlugin('EmberDevice'); } catch (_) { /* not available */ }
    return null;
  }
  async function nativeSave(blob, name) {
    const dev = devicePlugin(); if (!dev || typeof dev.saveFile !== 'function') return { ok: false, why: 'The phone side of Save is missing. Rebuild the APK with the latest EmberDevicePlugin.kt.' };
    try { const r = await dev.saveFile({ name, mime: blob.type || 'application/octet-stream', data: await blobB64(blob) }); return { ok: true, path: (r && r.path) || 'Downloads/Ember/' + name }; }
    catch (e) { const m = String(e && e.message || e || 'failed'); return { ok: false, why: /not implemented|not available/i.test(m) ? 'This APK has no direct Save yet. Rebuild it with the latest EmberDevicePlugin.kt.' : m.slice(0, 120) }; }
  }
  async function saveBlob(blob, name) {
    name = String(name || 'ember-file').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').slice(0, 120) || 'ember-file';
    if (!blob || !blob.size) { T('Nothing to save: the file is empty'); return false; }
    const cap = window.Capacitor, native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
    let note = '';
    if (native) { const r = await nativeSave(blob, name); if (r.ok) { T('Saved to ' + r.path); return true; } note = r.why; }
    let file = null; try { file = new File([blob], name, { type: blob.type }); } catch (_) { /* old WebView */ }
    const share = async () => {
      if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: name }); return true; } catch (e) { if (e && e.name === 'AbortError') return true; }
      }
      return false;
    };
    if (native && await share()) { T('Pick where to save ' + name); return true; }
    if (native) { // the WebView ignores blob downloads: show the file in a viewer tab instead
      try { const u = URL.createObjectURL(blob), w = window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000); if (w) { T('Opened ' + name + '. Use the viewer to save it.' + (note ? ' ' + note : '')); return true; } } catch (_) { /* blocked */ }
    }
    try {
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      T(native ? 'Download started for ' + name + (note ? '. ' + note : '') : 'Saved ' + name); return true;
    } catch (_) { /* fall through */ }
    if (!native && await share()) return true;
    if (/^text\/|json|xml|svg/i.test(blob.type || '')) { try { if (await copyContent(await blob.text())) { T('Could not save the file, so its text was copied instead'); return true; } } catch (_) { /* no clipboard */ } }
    T('Could not save ' + name + (note ? '. ' + note : '')); return false;
  }
  const looksHtml = s => /^\s*(<!doctype|<html|<body|<div|<h[1-6][\s>]|<p[\s>]|<table|<section|<article)/i.test(s);
  const mdOf = a => (a.type === 'html' || looksHtml(a.content)) && window.EmberDeliverables && window.EmberDeliverables.htmlToMarkdown ? window.EmberDeliverables.htmlToMarkdown(a.content) : a.content;
  // ---- PDF export for EVERY artifact type. Each type is turned into structured Markdown (cover, stat cards, tables, charts, code with line numbers) and built by the local pdfmake engine. ----
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 102.4) / 10 + ' KB' : n + ' B';
  const fence = (txt, lang) => { const f = String(txt).includes('```') ? '~~~' : '```'; return f + (lang || '') + '\n' + txt + '\n' + f; };
  const cellText = v => String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').slice(0, 160);
  function parseCsv(text) {
    const src = String(text || '').replace(/^\ufeff/, ''), first = (src.split(/\r?\n/)[0] || ''), delim = [',', ';', '\t', '|'].map(d => [d, first.split(d).length]).sort((x, y) => y[1] - x[1])[0][0];
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }
  function tableMd(rows, limit) {
    const w = Math.max(...rows.map(r => r.length)), pad = r => Array.from({ length: w }, (_, i) => cellText(r[i])), body = rows.slice(1, 1 + limit);
    return '| ' + pad(rows[0]).join(' | ') + ' |\n|' + Array(w).fill(' --- ').join('|') + '|\n' + body.map(r => '| ' + pad(r).join(' | ') + ' |').join('\n');
  }
  const statsMd = pairs => '```stats\n' + pairs.map(p => p[0] + ': ' + p[1]).join('\n') + '\n```';
  function dataUrlOf(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('could not read the picture')); r.readAsDataURL(blob); }); }
  // Any picture source -> a PNG/JPEG data URL pdfmake can embed (webp and svg are redrawn on a canvas, big ones are scaled down).
  function rasterise(url, maxW) {
    return new Promise((res, rej) => {
      const im = new Image(); im.onload = () => {
        try {
          let w = im.naturalWidth || im.width || 800, h = im.naturalHeight || im.height || 600; const k = Math.min(1, (maxW || 1600) / w); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
          const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
          res({ data: c.toDataURL('image/jpeg', .92), w, h });
        } catch (e) { rej(e); }
      };
      im.onerror = () => rej(new Error('the picture did not load')); im.src = url;
    });
  }
  async function pdfSource(a) {
    const name = baseName(a.title), t = a.type, o = Object.assign({ structured: true }, a.opts || {});
    if (o.orientation && /^land/i.test(o.orientation)) o.pageOrientation = 'landscape';
    if (o.toc !== undefined) o.toc = /^(true|yes|on|1)$/i.test(String(o.toc));
    if (o.cover !== undefined) o.cover = /^(true|yes|on|1)$/i.test(String(o.cover));
    const lines = String(a.content || '').split('\n').length, head = '# ' + name.replace(/[-_]+/g, ' ').replace(/^Ember\s+/i, '').trim() + '\n\n';
    if (t === 'code') {
      o.lineNumbers = true; o.language = a.language || ''; o.kind = 'Code' + (a.language ? ' · ' + a.language : '');
      return { md: head + statsMd([['Language', a.language || 'text'], ['Lines', String(a.content.replace(/\n+$/, '').split('\n').length.toLocaleString('en-US'))], ['Size', kb(a.content.length)]]) + '\n\n' + fence(a.content.replace(/\n+$/, ''), a.language || ''), o };
    }
    if (t === 'json') {
      let data = null; try { data = JSON.parse(a.content); } catch (_) { /* shown as text */ }
      o.kind = 'JSON'; o.autoCharts = false; let md = head;
      if (data === null) return { md: md + '> [!WARNING] This JSON did not parse, so it is shown as plain text.\n\n' + fence(a.content, 'json'), o };
      const arr = Array.isArray(data), keys = arr ? data.length : Object.keys(data || {}).length;
      md += statsMd([['Type', arr ? 'Array' : typeof data === 'object' ? 'Object' : typeof data], [arr ? 'Items' : 'Top-level keys', String(keys)], ['Size', kb(a.content.length)]]) + '\n\n';
      if (arr && data.length && data.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
        const cols = []; data.slice(0, 300).forEach(x => Object.keys(x).forEach(k => { if (!cols.includes(k) && cols.length < 10) cols.push(k); }));
        o.pageOrientation = cols.length > 5 ? 'landscape' : o.pageOrientation;
        md += '## Records\n\n' + tableMd([cols].concat(data.slice(0, 300).map(x => cols.map(k => x[k]))), 300) + (data.length > 300 ? '\n\n> Showing the first 300 of ' + data.length + ' records.' : '') + '\n\n';
      } else if (!arr && data && typeof data === 'object') {
        const flat = Object.keys(data).slice(0, 40).map(k => [k, typeof data[k] === 'object' ? (Array.isArray(data[k]) ? 'Array (' + data[k].length + ')' : 'Object (' + Object.keys(data[k] || {}).length + ')') : data[k]]);
        md += '## Top-level fields\n\n' + tableMd([['Field', 'Value']].concat(flat), 40) + '\n\n';
      }
      const pretty = JSON.stringify(data, null, 2);
      md += '## Full JSON\n\n' + (pretty.split('\n').length > 1500 ? '> Long file: showing the first 1,500 lines.\n\n' + fence(pretty.split('\n').slice(0, 1500).join('\n'), 'json') : fence(pretty, 'json'));
      o.lineNumbers = true; return { md, o };
    }
    if (t === 'csv') {
      const rows = parseCsv(a.content); o.kind = 'CSV';
      if (!rows.length) return { md: head + '> [!WARNING] This file has no rows.', o };
      const w = Math.max(...rows.map(r => r.length)); if (w > 6) o.pageOrientation = 'landscape';
      let md = head + statsMd([['Rows', String(rows.length - 1)], ['Columns', String(w)], ['Size', kb(a.content.length)]]) + '\n\n## Data\n\n';
      if (w > 24) md += '> [!WARNING] More than 24 columns. Showing the first 24.\n\n';
      const cut = rows.map(r => r.slice(0, 24));
      md += tableMd(cut, 1000) + (rows.length > 1001 ? '\n\n> Showing the first 1,000 of ' + (rows.length - 1) + ' rows.' : '');
      return { md, o };
    }
    if (t === 'svg' || t === 'image') {
      let url = '', note = '';
      if (t === 'svg') { const sv = cleanSvg(a.content); if (!sv) throw new Error('that SVG is not valid'); url = svgUrl(sv); }
      else { const b = await imageBlob(a); if (!b) throw new Error('the picture is not available'); url = await dataUrlOf(b); }
      const img = await rasterise(url, t === 'svg' ? 1800 : 1600); o.kind = t === 'svg' ? 'SVG image' : 'Picture'; o.cover = false;
      o._images = { 'artifact:picture': img }; o.images = false;
      return { md: head + '![' + name.replace(/[\]\n]/g, ' ') + '](artifact:picture)\n\n' + statsMd([['Format', t === 'svg' ? 'SVG (vector)' : 'Picture'], ['Size', img.w + ' x ' + img.h + ' px']]) + note, o };
    }
    if (t === 'html' || looksHtml(a.content)) {
      let md = mdOf(a); const ti = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(a.content); o.kind = 'Web page';
      if (!/^\s*#\s/m.test(md)) md = '# ' + (ti ? ti[1].replace(/\s+/g, ' ').trim() : name.replace(/[-_]+/g, ' ')) + '\n\n' + md;
      return { md, o };
    }
    o.kind = t === 'document' ? 'Document' : t === 'pdf' ? '' : 'Notes';
    let md = mdOf(a); if (!/^\s*---[ \t]*\r?\n/.test(md) && !/^\s*#\s/m.test(md)) md = head + md;
    return { md, o };
  }
  let pdfBusy = false;
  async function exportPdf(a) {
    const D = window.EmberDeliverables, name = baseName(a.title);
    if (pdfBusy) { T('A PDF is already being built. One moment.'); return; }
    if (!D || !D.pdf) { T('The PDF engine did not load. Opening the print view instead.'); printArtifact(a); return; }
    pdfBusy = true;
    try {
      T('Building the PDF...');
      const src = await pdfSource(a), pics = /!\[[^\]]*\]\((?!artifact:)[^)]+\)/.test(src.md);
      if (pics) T('Building the PDF and loading its pictures. This can take a minute.');
      const o = Object.assign({}, src.o, { onStep: m => T(m) });
      await saveBlob(await D.pdf(src.md, name, o), name + '.pdf');
    } catch (e) {
      T('PDF engine failed: ' + String(e && e.message || e).slice(0, 110) + '. Opening the print view so you can still save a PDF.');
      try { printArtifact(a); } catch (_) { /* no print view */ }
    } finally { pdfBusy = false; }
  }
  function cleanSvg(src) {
    let s = String(src || ''); const a = s.search(/<svg[\s>]/i), b = s.toLowerCase().lastIndexOf('</svg>');
    if (a < 0 || b < 0) return null;
    s = s.slice(a, b + 6)
      .replace(/<script[\s\S]*?<\/script\s*>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '');
    if (!/<svg[^>]*\sxmlns\s*=/i.test(s)) s = s.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    return s;
  }
  const svgUrl = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  function svgPng(a) {
    const s = cleanSvg(a.content); if (!s) { T('That is not a valid SVG'); return; }
    let w = 1200, h = 1200;
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(s);
    if (vb && +vb[1] > 0 && +vb[2] > 0) h = Math.round(w * vb[2] / vb[1]);
    else { const ww = /<svg[^>]*\swidth\s*=\s*["']?([\d.]+)/i.exec(s), hh = /<svg[^>]*\sheight\s*=\s*["']?([\d.]+)/i.exec(s); if (ww && hh && +ww[1] > 0) h = Math.round(w * hh[1] / ww[1]); }
    h = Math.min(Math.max(h, 64), 4000);
    const img = new Image();
    img.onload = () => {
      try { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); c.toBlob(b => { if (b) saveBlob(b, baseName(a.title) + '.png'); else T('PNG export failed'); }, 'image/png'); } catch (e) { T('PNG export failed'); }
    };
    img.onerror = () => T('PNG export failed: the SVG did not render');
    img.src = svgUrl(s);
  }
  function wordDoc(a) {
    const body = markdownHtml(mdOf(a));
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(baseName(a.title)) + '</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;color:#111}h1{font-size:22pt;border-bottom:2px solid #ff6a00;padding-bottom:4pt}h2{font-size:16pt}h3{font-size:13pt}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4pt 7pt}th{background:#ffeedd}pre,code{font-family:Consolas,Courier New,monospace;font-size:9.5pt;background:#f4f4f5}blockquote{border-left:3px solid #ff6a00;margin-left:0;padding-left:10pt;color:#444}</style></head><body>' + body + '</body></html>';
  }
  async function exportWord(a) {
    const D = window.EmberDeliverables;
    if (D) { try { await saveBlob(await D.word(mdOf(a), baseName(a.title)), baseName(a.title) + '.docx'); return; } catch (e) { T('DOCX engine failed; exporting legacy Word HTML (.doc) instead'); } }
    await saveBlob(new Blob(['\ufeff', wordDoc(a)], { type: 'application/msword' }), baseName(a.title) + '.doc');
  }
  function download(a) {
    if (a.type === 'pdf') { exportPdf(a); return; }
    if (a.type === 'image') { saveImage(a); return; }
    const ext = a.title.split('.').pop().toLowerCase();
    const mime = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'md' ? 'text/markdown' : ext === 'json' ? 'application/json' : ext === 'csv' ? 'text/csv' : ext === 'svg' ? 'image/svg+xml' : ext === 'py' ? 'text/x-python' : ext === 'js' ? 'text/javascript' : 'text/plain';
    let name = a.title, data = a.content;
    if (a.type === 'document' && !/\.md$/i.test(name)) name = baseName(name) + '.md';
    if (a.type === 'svg') data = cleanSvg(a.content) || a.content;
    saveBlob(new Blob([data], { type: mime + ';charset=utf-8' }), name);
  }
  function printArtifact(a) {
    let content='';
    if(a.type==='html'){
      const doc=new DOMParser().parseFromString(a.content,'text/html');
      doc.querySelectorAll('script,iframe,object,embed,form,base,meta[http-equiv]').forEach(n=>n.remove());
      doc.querySelectorAll('*').forEach(el=>Array.from(el.attributes).forEach(attr=>{if(/^on/i.test(attr.name)||((attr.name==='href'||attr.name==='src')&&/^\s*javascript:/i.test(attr.value)))el.removeAttribute(attr.name);}));
      content=doc.documentElement.outerHTML;
    } else content='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(a.title)+'</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 28px;color:#222}pre,code{font-family:ui-monospace,monospace}pre{white-space:pre-wrap}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px 10px}a{color:#0645ad}</style></head><body>'+(isMd(a.type)||a.type==='document'?markdownHtml(a.content):'<pre>'+esc(a.content)+'</pre>')+'</body></html>';
    const w=window.open('','_blank'); if(!w){T('Allow pop-ups to print or save as PDF');return;}
    w.document.open();w.document.write(content);w.document.close();setTimeout(()=>{try{w.focus();w.print();}catch(_){}},350);
  }

  // ---- viewer ----
  function close() { const old=document.getElementById('artifactOverlay'); if(old) old.remove(); }
  function view(a) {
    close(); const overlay=document.createElement('div'); overlay.id='artifactOverlay'; overlay.className='artifact-overlay';
    const html=a.type==='html', svg=a.type==='svg', paper=a.type==='pdf'||a.type==='document';
    let body, sub, foot = '';
    const fb = (k, label, cls) => '<button type="button" class="artifact-action' + (cls ? ' ' + cls : '') + '" data-vact="' + k + '">' + label + '</button>';
    if (html) { body = '<iframe class="artifact-frame" title="Preview of '+esc(a.title)+'" sandbox="allow-scripts allow-downloads" referrerpolicy="no-referrer"></iframe>'; sub = 'Sandboxed preview'; foot = fb('pdf', 'Save PDF') + fb('print', 'Print view', 'secondary') + fb('download', 'Download', 'secondary'); }
    else if (svg) { const s = cleanSvg(a.content); body = s ? '<div class="artifact-svg" id="artSvg"><img alt="' + esc(a.title) + '" src="' + svgUrl(s) + '"></div>' : '<pre class="artifact-text">' + esc(a.content) + '</pre>'; sub = s ? 'SVG image' : 'Not a valid SVG - showing source'; foot = fb('png', 'Save PNG') + fb('pdf', 'PDF', 'secondary') + fb('download', 'Save SVG', 'secondary') + fb('bg', 'Background', 'secondary') + fb('copy', 'Copy code', 'secondary'); }
    else if (a.type === 'image') { const r = imgRef(a.content); body = r ? '<div class="artifact-svg" id="artSvg">' + (r.media ? '<img alt="' + esc(a.title) + '" data-ember-media="' + esc(r.media) + '" src="' + (mediaCache.get(r.media) || BLANK) + '">' : '<img alt="' + esc(a.title) + '" referrerpolicy="no-referrer" src="' + esc(r.url) + '">') + '</div>' : '<pre class="artifact-text">' + esc(a.content) + '</pre>'; sub = 'Picture'; foot = fb('download', 'Save image') + fb('pdf', 'PDF', 'secondary') + fb('bg', 'Background', 'secondary'); }
    else if (paper) { body = '<div class="artifact-paper-wrap"><div class="artifact-paper">' + markdownHtml(mdOf(a)) + '</div></div>'; sub = a.type === 'pdf' ? 'PDF preview - Save PDF builds the real file' : 'Document preview'; foot = fb('pdf', 'Save PDF') + (a.type === 'document' ? fb('doc', 'Word .docx', 'secondary') : '') + fb('copy', 'Copy', 'secondary') + (a.type === 'document' ? fb('download', 'Markdown', 'secondary') : ''); }
    else if (isMd(a.type)) { body = '<div class="artifact-dark">' + markdownHtml(a.content) + '</div>'; sub = 'Markdown'; foot = fb('pdf', 'Save PDF') + fb('download', 'Download .md', 'secondary') + fb('copy', 'Copy', 'secondary'); }
    else { body = '<pre class="artifact-text'+(a.type==='code'?' artifact-code':'')+'">'+(a.type==='code'?highlightCode(a.content):esc(a.content))+'</pre>'; sub = 'Artifact preview'; foot = fb('copy', 'Copy') + fb('pdf', 'PDF', 'secondary') + fb('download', 'Download', 'secondary'); }
    overlay.innerHTML='<div class="artifact-viewer" role="dialog" aria-modal="true" aria-label="'+esc(a.title)+'"><header class="artifact-viewer-head"><div><b>'+esc(a.title)+'</b><small>'+sub+'</small></div><button type="button" class="artifact-close" aria-label="Close preview">×</button></header><div class="artifact-viewer-body'+(html?' is-html':'')+'">'+body+'</div>'+(foot?'<footer class="artifact-viewer-foot">'+foot+'</footer>':'')+'</div>';
    document.body.appendChild(overlay); hydrate(overlay);
    overlay.querySelector('.artifact-close').onclick=close;
    overlay.addEventListener('click',e=>{
      if(e.target===overlay){close();return;}
      const b=e.target.closest&&e.target.closest('[data-vact]'); if(!b)return;
      const k=b.dataset.vact;
      if(k==='pdf') exportPdf(a);
      else if(k==='print') printArtifact(a);
      else if(k==='doc') exportWord(a);
      else if(k==='png') svgPng(a);
      else if(k==='download') download(a);
      else if(k==='copy') copyContent(a.content).then(ok=>T(ok?'Copied':'Could not copy'));
      else if(k==='bg'){ const s=overlay.querySelector('#artSvg'); if(s) s.classList.toggle('dark'); }
    });
    if(html) overlay.querySelector('iframe').srcdoc='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: https:; media-src data: blob:; style-src \'unsafe-inline\' https:; font-src data: https:; script-src \'unsafe-inline\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'"><meta name="viewport" content="width=device-width,initial-scale=1">'+a.content;
  }
  document.addEventListener('click', e => {
    const q = k => e.target.closest && e.target.closest('[data-artifact-' + k + ']');
    const v=q('view'), d=q('download'), pdf=q('pdf'), cp=q('copy'), tx=q('termux'), dc=q('doc'), pn=q('png'), pr=q('print');
    const b=v||d||pdf||cp||tx||dc||pn||pr; if(!b) return;
    e.preventDefault();
    const key = v?'view':d?'download':pdf?'pdf':cp?'copy':tx?'termux':dc?'doc':pr?'print':'png';
    const a=getArtifact(Number(b.dataset.messageIndex),Number(b.dataset['artifact'+key[0].toUpperCase()+key.slice(1)]));
    if(!a) { T('Artifact is no longer available'); return; }
    if(v) view(a); else if(pdf) exportPdf(a); else if(pr) printArtifact(a); else if(dc) exportWord(a); else if(pn) svgPng(a); else if(cp) copyContent(a.content).then(ok=>T(ok?'Code copied':'Could not copy code')); else if(tx) copyContent(a.content).then(async ok=>{if(!ok){T('Could not copy code');return;}const N=window.EmberNative;if(N&&N.openTermux){await N.openTermux();T('Code copied. Paste it in Termux; it has not been run.');}else T('Code copied; Termux is unavailable in this view.');}); else download(a);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  (() => { const log = document.getElementById('log'); if (!log) return; let raf = 0; new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => hydrate(log)); }).observe(log, { childList: true, subtree: true }); hydrate(log); })();
  window.EmberArtifacts={hydrate,parse,render,shelf,markdownHtml,highlightCode,cleanSvg,exportPdf,pdfSource,exportWord,svgPng,wordDoc,view,download,copyContent,saveBlob};
})();
