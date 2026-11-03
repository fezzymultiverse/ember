/* Real, attributable image lookup; no generation, no image URLs invented by the model. */
'use strict';
(() => {
  const W = window, resultsCache = new Map(); let pending = null;
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain = s => { const d = new DOMParser().parseFromString(String(s || ''), 'text/html'); return d.body.textContent.trim().slice(0, 400); };
  const safe = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && /(?:^|\.)(?:wikimedia\.org|wikipedia\.org)$/.test(u.hostname) ? u.href : ''; } catch (_) { return ''; } };
  async function search(query, count, signal) {
    query = String(query || '').replace(/[\x00-\x1f]/g, ' ').trim().slice(0, 180);
    if (!query) throw new Error('Enter a subject to search');
    count = Math.max(1, Math.min(8, Number(count) || 6)); const key = query.toLowerCase()+'|'+count;
    if (resultsCache.has(key)) return resultsCache.get(key);
    const ctl = new AbortController(), abort = () => ctl.abort(); signal?.addEventListener('abort', abort, {once: true});
    const timer = setTimeout(abort, 20000);
    try {
      const params = new URLSearchParams({action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrsearch: query+' filetype:bitmap', gsrlimit: String(count), prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1400'});
      const response = await fetch('https://commons.wikimedia.org/w/api.php?'+params, {signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer'});
      if (!response.ok) throw new Error('Image search returned HTTP '+response.status);
      const json = await response.json(); if (json.error) throw new Error(json.error.info || 'Image search failed');
      const list = Object.values(json.query?.pages || {}).sort((a,b) => (a.index || 0)-(b.index || 0)).flatMap(page => {
        const im = page.imageinfo?.[0]; if (!im) return [];
        const image = safe(im.thumburl || im.url), url = safe(im.descriptionurl); if (!image || !url) return [];
        const metadata = im.extmetadata || {}, field = name => plain(metadata[name]?.value || '');
        return [{title: String(page.title || '').replace(/^File:/, ''), url, image_url: image, original_url: safe(im.url), thumbnail: image, width: im.thumbwidth || im.width, height: im.thumbheight || im.height, artist: field('Artist'), license: field('LicenseShortName') || 'Check source license', license_url: field('LicenseUrl'), attribution: field('Attribution') || field('Credit'), source: 'Wikimedia Commons'}];
      });
      const result = {source: 'Wikimedia Commons', query, results: list, note: 'Real search matches, not guaranteed identity matches. Verify the subject and source license before use; include attribution.'};
      resultsCache.set(key, result); if (resultsCache.size > 16) resultsCache.delete(resultsCache.keys().next().value); return result;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  function open(artifact) {
    document.getElementById('emberImageLookup')?.remove(); pending?.abort();
    const panel = document.createElement('section'); panel.id = 'emberImageLookup'; panel.className = 'ei-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Find a real image');
    panel.innerHTML = '<header><div><b>Find a real image</b><small>Wikimedia Commons · verify subject and license</small></div><button data-ei="close" aria-label="Close image search">×</button></header><form><input type="search" aria-label="Image subject" placeholder="Specific subject, place, person or object" required maxlength="180"><button>Search</button></form><p class="ei-status" role="status">Search sends only your search words, not your document. No AI generation.</p><div class="ei-results"></div>';
    document.body.append(panel); const input = panel.querySelector('input'), status = panel.querySelector('.ei-status'), box = panel.querySelector('.ei-results'), focus = document.activeElement;
    const close = () => { pending?.abort(); panel.remove(); if (focus?.isConnected) focus.focus(); };
    panel.querySelector('[data-ei=close]').onclick = close;
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') { const items = [...panel.querySelectorAll('button,input,a')].filter(n => !n.disabled && n.getClientRects().length); if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); } }
    });
    input.focus();
    panel.querySelector('form').onsubmit = async e => {
      e.preventDefault(); pending?.abort(); const ctl = pending = new AbortController(); status.textContent = 'Looking for matching images…'; box.replaceChildren();
      try {
        const result = await search(input.value, 8, ctl.signal); if (!panel.isConnected || ctl.signal.aborted) return;
        status.textContent = result.results.length ? 'Verify the subject before adding it. Credits travel with the image.' : 'No verified matches returned. Try a more precise subject.';
        for (const image of result.results) {
          const card = document.createElement('article'); card.innerHTML = '<img src="'+esc(image.thumbnail)+'" alt="'+esc(image.title)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer"><b>'+esc(image.title)+'</b><small>'+esc(image.artist)+' · '+esc(image.license)+'</small><a href="'+esc(image.url)+'" target="_blank" rel="noopener noreferrer">Source & license</a><button type="button">'+(artifact && /^(pdf|document|markdown|md|html)$/.test(artifact.type) ? 'Add to preview copy' : 'Open real image')+'</button>';
          card.querySelector('img').onerror = e => { e.target.alt = 'Thumbnail unavailable — open source to inspect'; };
          card.querySelector('button').onclick = () => {
            close();
            if (artifact && /^(pdf|document|markdown|md|html)$/.test(artifact.type)) {
              const base = artifact.type === 'html' ? W.EmberDeliverables.htmlToMarkdown(artifact.content) : artifact.content;
              const caption = image.title.replace(/[\]\n]/g, ' '), credit = '\n\nImage credit: '+image.artist+' · '+image.license+' · [Source & license]('+image.url+')\n';
              W.EmberBuilds.view(Object.assign({}, artifact, {type: artifact.type === 'html' ? 'document' : artifact.type, content: base+'\n\n!['+caption+']('+image.image_url+')'+credit}));
              W.EmberBuilds?.notify('Added to this preview copy. Save the export to keep it; original chat unchanged.');
            } else W.EmberArtifacts.view({type: 'image', title: image.title, content: image.image_url});
          };
          box.append(card);
        }
      } catch (err) { if (panel.isConnected && !ctl.signal.aborted) status.textContent = 'Image search unavailable: '+err.message+'. You can still add a local image.'; }
    };
  }
  function enhance(overlay, artifact) {
    if (!overlay || !/^(html|svg|image)$/.test(artifact.type) || overlay.querySelector('[data-eb-extra]')) return;
    const footer = overlay.querySelector('.artifact-viewer-foot'); if (!footer) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'artifact-action secondary'; button.dataset.ebExtra = 'image'; button.textContent = 'Find real image'; button.onclick = () => open(artifact); footer.append(button);
    if (artifact.type === 'html') { const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'artifact-action secondary'; preview.textContent = 'PDF pages'; preview.title = 'Structured PDF conversion; arbitrary web CSS is not reproduced'; preview.onclick = () => W.EmberBuilds.view(artifact); footer.append(preview); }
  }
  const definition = {name: 'search_images', description: 'Find real, attributable Wikimedia Commons images for a specific subject. Returns exact image_url, source-page url, artist and license. Use these URLs in Markdown PDF/Word images instead of guessing image URLs or approximating a photo/logo with SVG. Verify relevance; do not promise an exact identity match.', parameters: {query: 'string', count: 'number? (1-8)'}};
  const Agent = W.EmberAgentAddon;
  if (Agent) {
    const oldTools = Agent.toolsFor, oldDispatch = Agent.dispatch, oldState = Agent.stateBlock;
    Agent.toolsFor = S => { const tools = oldTools(S); return S?.agentAddon ? tools.concat(definition) : tools; };
    Agent.dispatch = async (name, args) => {
      if (name !== 'search_images') return oldDispatch(name, args);
      try { return await search(args?.query, args?.count); } catch (e) { return {error: e.message, source: 'Wikimedia Commons'}; }
    };
    Agent.stateBlock = S => oldState(S) + (S?.agentAddon ? '\nsearch_images finds real attributable images. Use exact returned image_url with artist/license/source credit in PDF, Markdown, HTML or Word. Do not draw a guessed SVG when a real image is requested. No match means say so.' : '');
  }
  W.EmberImageLookup = {search, open, enhance};
})();
