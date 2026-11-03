/* Ember 1.10.48 — additive publication workspace. Original routing/storage remain owners. */
'use strict';
(() => {
  const W = window, D = W.EmberDeliverables, A = W.EmberArtifacts;
  if (!D || !A || W.EmberBuilds) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nameOf = a => String(a.title || 'Ember document').replace(/(?:\.(?:html?|pdf|md|docx?))+$/ig, '');
  let noteTimer;
  const note = s => { if (typeof W.toast === 'function') W.toast(s); else { const el = document.getElementById('toast'); if (el) { el.textContent = s; el.classList.add('show'); clearTimeout(noteTimer); noteTimer = setTimeout(() => el.classList.remove('show'), 3200); } } };
  const tasks = new Map(), cache = new Map(), scripts = new Map();
  function load(src) {
    if (!scripts.has(src)) scripts.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = src;
      const timer = setTimeout(() => fail(), 20000);
      function fail() { clearTimeout(timer); scripts.delete(src); s.remove(); reject(new Error('Local library could not load: ' + src)); }
      s.onload = () => { clearTimeout(timer); resolve(); }; s.onerror = fail; document.head.append(s);
    }));
    return scripts.get(src);
  }
  const originalResolve = D.resolveImages;
  // Three concurrent, bounded image decodes; preserve the original URL checks and placeholders.
  async function resolveImages(md, opts) {
    if (!originalResolve || !D.parse) return originalResolve ? originalResolve(md, opts) : {};
    const blocks = D.parse(md).filter(b => b.k === 'img'), list = [...new Map(blocks.map(b => [b.src, b])).values()];
    const out = {}; let cursor = 0;
    await Promise.all(Array.from({length: Math.min(3, list.length)}, async () => {
      while (cursor < list.length) {
        const index = cursor++, b = list[index];
        if (index >= 32) { out[b.src] = {error: '32-picture safety limit reached'}; continue; }
        if (opts && opts.cancelled && opts.cancelled()) throw new Error('Export cancelled');
        Object.assign(out, await originalResolve('![' + b.alt.replace(/[\]\n]/g, '') + '](' + b.src + ')', opts || {}));
      }
    }));
    return out;
  }
  D.resolveImages = resolveImages;
  const originalPdf = D.pdf;
  D.pdf = async (md, title, options) => {
    if (!D.parse || !originalResolve) return originalPdf(md, title, options);
    const opts = Object.assign({}, options || {});
    D.pdfDefinition(md, title, Object.assign({}, opts, {_images: {}}));
    const images = opts._images || (opts.images === false ? {} : await resolveImages(md, opts));
    await load('vendor/pdfmake-0.2.20.min.js'); await load('vendor/pdfmake-0.2.20-fonts.js');
    const definition = D.pdfDefinition(md, title, Object.assign({}, opts, {_images: images}));
    const blob = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PDF build exceeded 120 seconds; split the document and retry.')), 120000);
      try { W.pdfMake.createPdf(definition).getBlob(b => { clearTimeout(timer); resolve(b); }); }
      catch (e) { clearTimeout(timer); reject(e); }
    });
    return D.validatePdf(blob);
  };
  async function prepare(a, onStep) {
    const key = JSON.stringify([a.type, a.language, a.title, a.opts, a.content]);
    if (cache.has(key)) return cache.get(key);
    if (tasks.has(key)) return tasks.get(key);
    const task = (async () => {
      const src = A.pdfSource ? await A.pdfSource(a) : {md: a.type === 'html' && D.htmlToMarkdown ? D.htmlToMarkdown(a.content) : a.content, o: a.opts || {}};
      const blob = await D.pdf(src.md, nameOf(a), Object.assign({}, src.o, {onStep}));
      const result = {blob, source: src}; cache.set(key, result);
      while (cache.size > 2) cache.delete(cache.keys().next().value);
      return result;
    })();
    tasks.set(key, task);
    try { return await task; } finally { tasks.delete(key); }
  }
  async function exportPdf(a) {
    try { note('Building local PDF…'); const r = await prepare(a, note); return await A.saveBlob(r.blob, nameOf(a) + '.pdf'); }
    catch (e) { note('PDF export failed: ' + e.message); return false; }
  }
  // Full structured DOCX: nested/numbered lists, code, quotes, links, page breaks and embedded pictures.
  const oldWord = D.word;
  D.word = async (md, title, options) => {
    if (!D.parse) return oldWord(md, title);
    const opts = options || {};
    if (String(md).length > 2000000) throw new Error('Document exceeds the 2,000,000 character safety limit');
    await load('vendor/docx-9.5.1.iife.js'); const X = W.docx;
    const body = String(md).replace(/^\s*---\s*\n(?:[a-z]+\s*:.*\n)+---\s*\n/i, '');
    const images = await resolveImages(body, opts), blocks = D.parse(body), children = [];
    const runs = text => {
      const source = D.inline(String(text || ''));
      return source.map(r => r.link ? new X.ExternalHyperlink({link: r.link, children: [new X.TextRun({text: r.text, style: 'Hyperlink'})]}) : new X.TextRun({text: r.text, bold: !!r.bold, italics: !!r.italics, font: r.code ? 'Courier New' : 'Calibri'}));
    };
    let numberGroup = -1, wasList = false; const numbering = [];
    for (const b of blocks) {
      if (b.k === 'img') {
        const im = images[b.src];
        if (im && im.data) {
          const binary = atob(im.data.split(',')[1]), bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
          const ratio = Math.min(1, 630 / im.w, 700 / im.h);
          children.push(new X.Paragraph({children: [new X.ImageRun({data: bytes, type: /^data:image\/png/.test(im.data) ? 'png' : 'jpg', transformation: {width: Math.round(im.w * ratio), height: Math.round(im.h * ratio)}, altText: {title: b.alt || 'Document image', description: b.alt || ''}})], spacing: {after: 120}}));
        } else children.push(new X.Paragraph({children: [new X.TextRun({text: '[Image unavailable: ' + (b.alt || b.src) + ']', italics: true})]}));
        if (b.alt) children.push(new X.Paragraph({children: [new X.TextRun({text: b.alt, italics: true, size: 18})], spacing: {after: 180}}));
      } else if (b.k === 'table') {
        const width = Math.max(1, ...b.rows.map(r => r.length));
        if (width > 24) throw new Error('Split tables wider than 24 columns before exporting');
        children.push(new X.Table({width: {size: 100, type: X.WidthType.PERCENTAGE}, rows: b.rows.map((row, index) => new X.TableRow({tableHeader: index === 0, children: Array.from({length: width}, (_, c) => new X.TableCell({shading: index === 0 ? {fill: 'FFF0E5'} : undefined, children: [new X.Paragraph({children: runs(row[c] || '')})]}))}))}));
      } else if (b.k === 'dir' && b.d === 'pagebreak') children.push(new X.Paragraph({children: [new X.PageBreak()]}));
      else if (b.k === 'code') {
        for (const line of b.lines || []) children.push(new X.Paragraph({children: [new X.TextRun({text: line || ' ', font: 'Courier New', size: 18})], shading: {fill: 'F1F3F6'}, spacing: {after: 30}}));
      } else if (/^(stats|steps|chart)$/.test(b.k)) {
        // Preserve structured data instead of pretending a Word chart is the same as a PDF vector chart.
        children.push(new X.Paragraph({children: [new X.TextRun({text: b.k.toUpperCase(), bold: true, color: 'A64217'})]}));
        for (const line of b.lines || []) children.push(new X.Paragraph({children: runs(line), spacing: {after: 80}}));
      } else if (b.k !== 'dir') {
        const depth = Math.min(3, b.lvl || 0), ordered = b.k === 'li' && b.ord != null;
        if (ordered && !wasList) {
          numberGroup++;
          numbering.push({reference: 'ember-list-' + numberGroup, levels: Array.from({length: 4}, (_, level) => ({level, start: level === depth ? b.ord : 1, format: X.LevelFormat.DECIMAL, text: '%' + (level + 1) + '.', alignment: X.AlignmentType.START, style: {paragraph: {indent: {left: 360 * (level + 1), hanging: 240}}}}))});
        }
        const task = b.k === 'li' && b.box != null ? (b.box ? '[x] ' : '[ ] ') : '';
        children.push(new X.Paragraph({children: runs(task + (b.t || (b.k === 'hr' ? '—' : ''))),
          heading: b.k === 'h' ? X.HeadingLevel['HEADING_' + Math.min(6, b.n)] : undefined,
          keepNext: b.k === 'h', bullet: b.k === 'li' && !ordered && b.box == null ? {level: depth} : undefined,
          numbering: ordered ? {reference: 'ember-list-' + numberGroup, level: depth} : undefined,
          indent: /^(quote|callout)$/.test(b.k) ? {left: 300} : undefined,
          shading: b.k === 'callout' ? {fill: 'FFF0E5'} : undefined, spacing: {after: 150}}));
        wasList = ordered;
      }
      if (b.k !== 'li') wasList = false;
    }
    const doc = new X.Document({creator: 'Ember', title: String(title || 'Document'), numbering: {config: numbering}, sections: [{properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1280, right: 960, bottom: 1160, left: 960}}}, children: children.length ? children : [new X.Paragraph('')]}]});
    return X.Packer.toBlob(doc);
  };
  // Continue HTML and Markdown alike without dropping the unfinished line or closing fences.
  const oldContinue = D.continueArtifact;
  if (oldContinue) D.continueArtifact = async (text, run, options) => {
    const opts = Object.assign({}, options || {}); let cancelled = false;
    const upper = Math.min(16, Math.max(opts.maxParts || 4, Math.ceil((D.pageTarget ? D.pageTarget(opts.request, []) : 0) / 2), /\b(complex|long|comprehensive|book|full application|multi.page)\b/i.test(opts.request || '') ? 8 : 4));
    let last = String(text || ''), stalled = 0;
    const guardedRun = async input => {
      if (opts.cancelled && opts.cancelled()) { cancelled = true; return ''; }
      const html = /<artifact\b[^>]*type=["'](?:html|code)["']/i.test(last);
      input.system += '\nPreserve the original format, exact existing section order and source URLs. ' + (html ? 'This is HTML/code: continue valid syntax, not Markdown. Do not add closing tags or code fences until that file is actually finished.' : 'Do not invent citations, figures or image URLs.');
      const result = await run(input); const more = String(result || '');
      if (last.endsWith(more.trim()) || more.trim().length < 20) stalled++; else stalled = 0;
      last += more;
      return stalled >= 2 ? '' : more;
    };
    const out = await oldContinue(text, guardedRun, Object.assign({}, opts, {maxParts: upper}));
    if (D.hasOpenArtifact(out)) {
      const reason = cancelled || (opts.cancelled && opts.cancelled()) ? 'Build stopped. Partial file retained.' : 'Build is incomplete. Partial file retained; ask Ember to continue.';
      W.dispatchEvent(new CustomEvent('ember-build-incomplete', {detail: {reason, characters: out.length}})); note(reason);
    }
    return out;
  };
  // Add exact HTML type aliases without changing ordinary requests or tool routing.
  const oldIntent = D.intent;
  D.intent = prompt => {
    const t = String(prompt || '');
    if (/\b(make|create|generate|write|draft|build|export|prepare|produce)\b/i.test(t) && /\bhtml(?:\.html)?\b/i.test(t) && !/\bpdf\b/i.test(t) && !/\b(do not|don't|never)\b/i.test(t) && !/^\s*(how|why|what|explain)\b/i.test(t)) return {type: 'html', title: 'index.html'};
    return oldIntent(prompt);
  };
  const oldCtx = D.intentCtx;
  if (oldCtx) D.intentCtx = (prompt, msgs) => D.intent(prompt) || oldCtx(prompt, msgs);
  const oldNormalize = D.normalize;
  D.normalize = (reply, prompt) => {
    const want = D.intent(prompt), text = String(reply || '').trim();
    if (want && want.type === 'html' && !/<artifact\b/i.test(text) && /^\s*(?:```html\s*\n)?\s*(?:<!doctype|<html)/i.test(text)) return '<artifact type="html" title="index.html">\n' + text.replace(/^```html\s*\n/i, '').replace(/\n```\s*$/, '') + '\n</artifact>';
    return oldNormalize(reply, prompt);
  };
  let current = null, pdfjsPromise;
  async function pdfjs() {
    if (!pdfjsPromise) pdfjsPromise = import('./vendor/pdfjs/pdf.mjs').then(lib => { lib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.mjs', document.baseURI).href; return lib; }).catch(e => { pdfjsPromise = null; throw e; });
    return pdfjsPromise;
  }
  function close() {
    if (!current) return;
    const state = current; current = null; state.closed = true; clearTimeout(state.refreshTimer);
    if (state.observer) state.observer.disconnect(); if (state.resize) state.resize.disconnect();
    for (const job of state.rendering) { try { job.cancel(); } catch (_) {} }
    if (state.pdf) state.pdf.destroy().catch(() => {});
    if (state.loading) state.loading.destroy().catch(() => {});
    state.overlay.remove(); if (state.focus && state.focus.isConnected) state.focus.focus();
  }
  function canView(a) { return a && /^(pdf|document|markdown|md)$/.test(a.type); }
  async function view(a) {
    close(); document.getElementById('artifactOverlay')?.remove();
    const overlay = document.createElement('div'); overlay.id = 'artifactOverlay'; overlay.className = 'artifact-overlay eb-overlay';
    overlay.innerHTML = '<div class="artifact-viewer eb-viewer" role="dialog" aria-modal="true" aria-label="'+esc(a.title)+'"><header class="artifact-viewer-head"><div><b>'+esc(a.title)+'</b><small class="eb-status" role="status">Building the actual PDF preview locally…</small></div><button class="artifact-close" aria-label="Close preview">×</button></header><nav class="eb-toolbar" aria-label="Preview controls"><button data-eb="pages" aria-pressed="true">PDF pages</button><button data-eb="source" aria-pressed="false">Source</button><label>Zoom <select class="eb-zoom"><option value="fit">Fit width</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label><label>Page <select class="eb-page" aria-label="Go to page"><option>1</option></select></label><button data-eb="find-image">Find real image</button><label class="eb-upload">Add image<input type="file" accept="image/png,image/jpeg,image/webp" hidden></label></nav><div class="artifact-viewer-body eb-body"><div class="eb-progress">Preparing pages, charts and pictures…</div><div class="eb-pages"></div><pre class="eb-source" hidden></pre></div><footer class="artifact-viewer-foot"><button class="artifact-action" data-vact="pdf">Save PDF</button><button class="artifact-action secondary" data-vact="doc">Word .docx</button><button class="artifact-action secondary" data-eb="download">'+(a.type === 'html' ? 'Save HTML' : 'Save Markdown')+'</button><button class="artifact-action secondary" data-eb="copy">Copy source</button></footer></div>';
    document.body.append(overlay);
    const state = current = {overlay, artifact: a, closed: false, rendering: new Set(), queued: new Set(), chain: Promise.resolve(), zoom: 'fit', focus: document.activeElement};
    const body = overlay.querySelector('.eb-body'), pages = overlay.querySelector('.eb-pages'), status = overlay.querySelector('.eb-status'), source = overlay.querySelector('.eb-source'); source.textContent = a.content;
    const progress = text => { if (!state.closed) status.textContent = text; };
    overlay.querySelector('.artifact-close').onclick = close;
    overlay.onclick = e => { if (e.target === overlay) close(); };
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key !== 'Tab') return;
      const controls = [...overlay.querySelectorAll('button,input,select,a[href]')].filter(n => !n.disabled && n.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    });
    overlay.querySelector('.artifact-close').focus();
    overlay.querySelector('.eb-zoom').onchange = e => { state.zoom = e.target.value; refresh(); };
    overlay.querySelector('.eb-page').onchange = e => { pages.querySelector('[data-page="'+e.target.value+'"]')?.scrollIntoView({block: 'start', behavior: 'smooth'}); };
    overlay.querySelector('input[type=file]').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 12000000) { note('Choose an image smaller than 12 MB'); return; }
      const url = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
      const base = a.type === 'html' ? D.htmlToMarkdown(a.content) : a.content;
      view(Object.assign({}, a, {type: a.type === 'html' ? 'document' : a.type, content: base + '\n\n!['+file.name.replace(/[\]\n]/g, '')+']('+url+')\n'}));
      note('Image added to this preview copy; save to keep it. Original chat unchanged.');
    };
    overlay.addEventListener('click', async e => {
      const b = e.target.closest('[data-eb],[data-vact]'); if (!b) return;
      const action = b.dataset.eb || b.dataset.vact;
      if (action === 'source' || action === 'pages') {
        const raw = action === 'source'; source.hidden = !raw; pages.hidden = raw;
        overlay.querySelector('[data-eb=source]').setAttribute('aria-pressed', String(raw)); overlay.querySelector('[data-eb=pages]').setAttribute('aria-pressed', String(!raw));
        if (!raw) refresh(); return;
      }
      if (action === 'copy') { A.copyContent(a.content); return; }
      if (action === 'find-image') { W.EmberImageLookup?.open(a); return; }
      if (action === 'download') { A.saveBlob(new Blob([a.content], {type: a.type === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8'}), nameOf(a)+(a.type==='html'?'.html':'.md')); return; }
      b.disabled = true;
      try {
        if (action === 'pdf') { const r = state.result || await prepare(a, progress); await A.saveBlob(r.blob, nameOf(a)+'.pdf'); }
        if (action === 'doc') { const src = state.result?.source || (A.pdfSource ? await A.pdfSource(a) : {md: a.content}); await A.saveBlob(await D.word(src.md, nameOf(a)), nameOf(a)+'.docx'); }
      } catch (err) { progress('Export failed: '+err.message); }
      finally { if (b.isConnected) b.disabled = false; }
    });
    function invalidate(section) { section.dataset.drawn = ''; const canvas = section.querySelector('canvas'); if (canvas) { canvas.width = 1; canvas.height = 1; canvas.remove(); } section.querySelector('.eb-annotations')?.remove(); }
    async function draw(section) {
      if (state.closed || !state.pdf || section.dataset.drawn === state.zoom+'|'+body.clientWidth || state.queued.has(section)) return;
      state.queued.add(section);
      state.chain = state.chain.then(async () => {
        if (state.closed || pages.hidden) return;
        const layout = state.zoom+'|'+body.clientWidth;
        const page = await state.pdf.getPage(+section.dataset.page), unit = page.getViewport({scale: 1});
        const scale = state.zoom === 'fit' ? Math.max(.15, (body.clientWidth - 36) / unit.width) : +state.zoom;
        const viewport = page.getViewport({scale}), pixel = Math.min(W.devicePixelRatio || 1, 2, Math.sqrt(4000000 / (viewport.width * viewport.height)));
        const cv = document.createElement('canvas'); cv.width = Math.floor(viewport.width * pixel); cv.height = Math.floor(viewport.height * pixel); cv.style.width = viewport.width+'px'; cv.style.height = viewport.height+'px'; cv.setAttribute('aria-label', 'PDF page '+section.dataset.page); cv.setAttribute('role', 'img');
        invalidate(section); section.style.width = viewport.width+'px'; section.style.height = viewport.height+'px'; section.append(cv);
        const task = page.render({canvasContext: cv.getContext('2d'), viewport, transform: [pixel,0,0,pixel,0,0]}); state.rendering.add(task);
        try { await task.promise; } finally { state.rendering.delete(task); }
        if (state.closed) return;
        section.dataset.drawn = layout;
        const ann = document.createElement('div'); ann.className = 'eb-annotations';
        for (const x of await page.getAnnotations()) {
          if (!x.url || !/^https?:|^mailto:/i.test(x.url)) continue;
          const rect = viewport.convertToViewportRectangle(x.rect), link = document.createElement('a'); link.href = x.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.title = x.url; link.setAttribute('aria-label', x.url);
          Object.assign(link.style, {left: Math.min(rect[0],rect[2])+'px', top: Math.min(rect[1],rect[3])+'px', width: Math.abs(rect[2]-rect[0])+'px', height: Math.abs(rect[3]-rect[1])+'px'}); ann.append(link);
        }
        section.append(ann); page.cleanup();
      }).catch(err => { if (!state.closed && err.name !== 'RenderingCancelledException') progress('Page preview failed: '+err.message+' — Save PDF remains available.'); }).finally(() => state.queued.delete(section));
      return state.chain;
    }
    function refresh() {
      if (state.closed || !state.pdf) return;
      if (state.queued.size || state.rendering.size) { clearTimeout(state.refreshTimer); state.refreshTimer = setTimeout(refresh, 180); return; }
      const bounds = body.getBoundingClientRect(), layout = state.zoom+'|'+body.clientWidth;
      pages.querySelectorAll('.eb-sheet').forEach(section => { if (section.dataset.drawn !== layout) invalidate(section); const r = section.getBoundingClientRect(); if (r.bottom > bounds.top - 400 && r.top < bounds.bottom + 600) draw(section); });
    }
    try {
      state.result = await prepare(a, progress); if (state.closed) return;
      const lib = await pdfjs(); if (state.closed) return;
      state.loading = lib.getDocument({data: new Uint8Array(await state.result.blob.arrayBuffer()), isEvalSupported: false});
      state.pdf = await state.loading.promise; state.loading = null; if (state.closed) { state.pdf.destroy(); return; }
      const first = await state.pdf.getPage(1), dim = first.getViewport({scale: 1}); first.cleanup();
      overlay.querySelector('.eb-progress').remove();
      const pageSelect = overlay.querySelector('.eb-page'); pageSelect.replaceChildren();
      for (let n=1; n<=state.pdf.numPages; n++) {
        const section = document.createElement('section'); section.className = 'eb-sheet'; section.dataset.page = String(n); section.setAttribute('aria-label', 'Page '+n);
        const width = Math.max(120, body.clientWidth - 36); section.style.width = width+'px'; section.style.height = width * dim.height / dim.width+'px';
        pages.append(section); const option = document.createElement('option'); option.value = String(n); option.textContent = n+' / '+state.pdf.numPages; pageSelect.append(option);
      }
      progress(state.pdf.numPages+' real PDF page'+(state.pdf.numPages===1?'':'s')+' · preview and Save PDF use the same file');
      state.observer = new IntersectionObserver(entries => {
        for (const entry of entries) { if (entry.isIntersecting) draw(entry.target); else if (!state.queued.has(entry.target)) invalidate(entry.target); }
      }, {root: body, rootMargin: '600px 0px'});
      pages.querySelectorAll('.eb-sheet').forEach(el => state.observer.observe(el));
      let resizeTimer;
      state.resize = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(refresh, 150); }); state.resize.observe(body);
      await draw(pages.firstElementChild);
    } catch (err) {
      if (!state.closed) { progress('Actual PDF preview unavailable: '+err.message); overlay.querySelector('.eb-progress')?.remove(); source.hidden = false; source.textContent = a.content; }
    }
  }
  W.EmberBuilds = {version: '1.10.48', notify: note, canView, view, close, prepare, exportPdf, resolveImages, load};
})();
