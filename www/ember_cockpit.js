/* Ember 1.10.14 — UI-only Cockpit. Existing routes and provider APIs remain authoritative. */
'use strict';
(() => {
  const W = window, D = document, $ = id => D.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch (_) { return fallback; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
  function init() {
    const settings = $('settings'), sb = settings?.querySelector('.sb'), G = W.EmberGithub;
    if (!sb || !G) return;
    D.body.classList.add('cockpit-ui');
    // A full-screen cockpit is modal even on desktop; never leave the covered chat interactive.
    if (W.EmberPanelLayout) W.EmberPanelLayout.canDock = () => false;
    const titleOf = c => c.querySelector(':scope > .ct')?.textContent.trim() || '';
    const cards = Array.from(settings.querySelectorAll('.card[data-tab]'));
    const root = D.createElement('div'); root.id = 'cockpitSettings';
    const sections = {};
    let paintMedia = () => {};
    const groups = [
      ['features','Free Mode','Chat with no key needed, and the optional AI capabilities'],
      ['engine','AI keys','Which engine answers, every AI API key, and vision'],
      ['providers','AI providers & routing','Provider routing, live model catalogs, key rotation and fallback'],
      ['general','Memory & persona','Your name, persona, tone, read aloud and voice, memory, look, backup'],
      ['device','Device tools','Wi-Fi, storage and RAM, battery, local diagnostics and document reading'],
      ['scraping','Web scraping & search','Every scraper and search key, the free reader, health checks and tests'],
      ['hacking','Termux & terminal','Termux mode, pen-test persona and the built-in terminal'],
      ['music','Media','Picture and PDF engines, Stability key, music and video APIs, song ID, player, downloads'],
      ['permissions','Permissions & background','Notifications, mic, battery, keep-alive, pings and background replies']
    ];
    root.innerHTML = '<div class="cockpit-intro"><span class="cockpit-kicker">V1.10.15 / COCKPIT</span><p>One screen. Every control.</p><button type="button" class="btn g" id="cockpitCommand">Open Command Centre →</button></div>';
    groups.forEach(([id,title,desc]) => {
      const s = D.createElement('section'); s.id = 'cockpit_' + id; s.className = 'cockpit-section'; s.setAttribute('aria-labelledby', s.id + '_title');
      s.innerHTML = '<h2 id="' + s.id + '_title">' + title + '</h2><p class="cockpit-desc">' + desc + '</p>';
      sections[id] = s; root.append(s);
    });
    sb.prepend(root);
    // 1.10.18 Part 7: Settings is ONE panel. Eight rows, one job each; tap a row to open its sub menu.
    const ROWS = [
      {id:'general', title:'Memory & persona', desc:'Your name, persona, tone, read aloud and voice, memory, look, backup', sections:['general']},
      {id:'keys', title:'AI providers & API keys', desc:'Add keys, choose which engine answers, routing and fallback, all in one place', sections:['features','engine','providers']},
      {id:'scraping', title:'Web scraping & search', desc:'Every scraper and search key, the free reader, health checks and tests', sections:['scraping']},
      {id:'hacking', title:'Termux & terminal', desc:'Termux mode, pen-test persona and the built-in terminal', sections:['hacking']},
      {id:'device', title:'Device tools', desc:'Wi-Fi, storage and RAM, battery, diagnostics and document reading', sections:['device']},
      {id:'music', title:'Media', desc:'All media in one: picture and PDF engines, Stability key, music and video APIs, song ID, player, downloads', sections:['music']},
      {id:'permissions', title:'Permissions & background', desc:'Notifications, mic, battery, keep-alive, pings and background replies', sections:['permissions']}
    ];
    const menu = D.createElement('div'); menu.id = 'cockpitMenu';
    menu.innerHTML = ROWS.map(r => '<button type="button" class="cmenu-row" data-crow="' + r.id + '"><span class="cmenu-t"><b>' + esc(r.title) + '</b><small>' + esc(r.desc) + '</small></span><span class="cmenu-c" aria-hidden="true">\u2304</span></button>').join('');
    sb.prepend(menu);
    const backdrop = D.createElement('button'); backdrop.type = 'button'; backdrop.id = 'cockpitBackdrop'; backdrop.tabIndex = -1; backdrop.setAttribute('aria-label', 'Close settings'); D.body.append(backdrop);
    let view = 'menu';
    cards.forEach(c => {
      const t = titleOf(c), tab = c.dataset.tab;
      let dest = tab;
      if (tab === 'keys') dest = 'engine';
      else if (tab === 'features') dest = 'providers';
      else if (/^Free Mode/i.test(t)) { dest = 'features'; }
      else if (c.id === 'devToolsCard') dest = 'device';
      else if (/^Voice$/i.test(t)) { dest = 'general'; c.querySelector('.ct').textContent = 'Read aloud & voice engine'; }
      else if (/^Voice & pacing/i.test(t)) { c.querySelector('.ct').textContent = 'Tone & pacing'; }
      else if (/^System integrations/i.test(t)) dest = 'music';
      c.classList.remove('collapsed','mnu-open'); c.removeAttribute('hidden'); (sections[dest] || sections.general).append(c);
    });
    // Merge related controls without cloning nodes or losing their event listeners.
    function merge(group, predicate, title, id) {
      const matched = Array.from(group.querySelectorAll(':scope > .card')).filter(predicate);
      if (!matched.length) return null;
      const target = D.createElement('div'); target.className = 'card cockpit-merged'; if (id) target.id = id;
      target.innerHTML = '<div class="ct">' + title + '</div>';
      group.insertBefore(target, matched[0]);
      matched.forEach(c => {
        const h = c.querySelector(':scope > .ct'); if (h) { h.className = 'cockpit-subtitle'; h.setAttribute('role','heading'); h.setAttribute('aria-level','3'); }
        c.classList.remove('card'); c.classList.add('cockpit-control-group'); delete c.dataset.tab;
        target.append(c);
      });
      return target;
    }
    merge(sections.scraping, () => true, 'Reader, keys & checks', 'cockpitScrapingPanel');
    merge(sections.music, () => true, 'Music & Tools', 'cockpitMusicPanel');
    merge(sections.hacking, c => /termux/i.test(titleOf(c)), 'Termux', 'cockpitTermuxPanel');
    if ($('etPanel') && $('cockpitTermuxPanel')) {
      $('cockpitTermuxPanel').append($('etPanel'));
      // Inline terminal does not cover settings or require a second Termux page.
      $('etExp').hidden = true; $('etMin').hidden = true;
    }
    // 1.10.18 Part 5: Termux Mode and Ember Termux are ONE block: mode switch on top, the terminal right under it.
    (() => {
      const tp = $('cockpitTermuxPanel'); if (!tp) return;
      const groups = Array.from(tp.querySelectorAll(':scope > .cockpit-control-group')), mode = groups[0], et = groups[1];
      const title = tp.querySelector(':scope > .ct'); if (title) title.textContent = 'Ember Termux';
      if (mode && et) {
        et.querySelector(':scope > .cockpit-subtitle')?.remove();
        const divider = D.createElement('div'); divider.className = 'cockpit-termux-divider'; mode.append(divider);
        while (et.firstChild) mode.append(et.firstChild);
        et.remove();
      }
      if ($('etPanel')) (mode || tp).append($('etPanel'));
      tp.querySelectorAll('.hint').forEach(h => { if (/docked at the bottom of this tab/.test(h.textContent)) h.textContent = h.textContent.replace('The terminal is docked at the bottom of this tab:', 'The terminal sits right here under the switch:'); });
    })();
    // One provider list accordion, with independent provider accordions inside it.
    const keyCard = $('kList')?.closest('.card');
    if (keyCard) {
      const fold = D.createElement('details'); fold.id = 'cockpitProviderList'; fold.className = 'cockpit-provider-list';
      fold.innerHTML = '<summary>Provider list · engine keys</summary>';
      keyCard.querySelector(':scope > .ct')?.remove();
      while (keyCard.firstChild) fold.append(keyCard.firstChild);
      keyCard.append(fold);
    }
    // Automatic output capabilities have a read-only sheet under +, not Settings.
    const mediaCard = $('bMediaEng')?.closest('.card');
    if (mediaCard) mediaCard.remove();
    // Downloads retain original on-click handlers; move the entire tail into Hacking.
    const routing = $('efRouting'), content = routing?.querySelector('.ef-content');
    if (content) {
      const start = Array.from(content.children).find(x => x.tagName === 'H3' && /playlist downloads/i.test(x.textContent));
      if (start) {
        const dl = D.createElement('div'); dl.id = 'cockpitYouTube'; dl.className = 'card';
        dl.innerHTML = '<div class="ct">YouTube & yt-dlp downloads</div>';
        let n = start; while (n) { const next = n.nextSibling; dl.append(n); n = next; }
        sections.music.append(dl);
      }
      const yt = $('swYoutube')?.closest('.cr');
      if (yt && $('cockpitYouTube')) { const hint = yt.nextElementSibling; $('cockpitYouTube').append(yt); if (hint?.classList.contains('hint')) $('cockpitYouTube').append(hint); }
      routing.querySelector(':scope > .ct').textContent = 'Providers · routing policy';
      const guide = D.createElement('p'); guide.className = 'hint';
      guide.textContent = 'All bundled providers remain available in Engine & Media Control. Load a pinned engine’s live models to see your account’s catalog; OpenRouter :free models are labelled free. Multiple keys rotate, with key/model cooldowns and provider fallback unchanged. Claude is paid and pin-only. Optional media connections live under +, outside Settings. Free tiers and availability are determined by each provider, not guaranteed by Ember.';
      routing.querySelector(':scope > .ct').after(guide);
    }
    // 1.10.18 Part 7: every control lives in the row that matches its job. Nodes are moved, never cloned.
    (() => {
      const lift = id => { const head = $(id)?.closest('.cr'); if (!head) return []; const out = [head]; let n = head.nextElementSibling; while (n && !n.classList.contains('cr')) { out.push(n); n = n.nextElementSibling; } return out; };
      const card = (host, title, nodes) => { const nodesOk = nodes.filter(Boolean); if (!nodesOk.length) return null; const c = D.createElement('div'); c.className = 'card'; c.innerHTML = '<div class="ct">' + title + '</div>'; nodesOk.forEach(n => c.append(n)); host.append(c); return c; };
      const emptied = id => $(id)?.closest('.card, .cockpit-control-group');
      const agentHost = emptied('swAgent');
      // Web search (Tavily) is search, not music: it joins Web scraping & search.
      const web = lift('swAgent'); if (web.length && $('cockpitScrapingPanel')) { const g = D.createElement('div'); g.className = 'cockpit-control-group'; g.innerHTML = '<div class="cockpit-subtitle" role="heading" aria-level="3">Web search</div>'; web.forEach(n => g.append(n)); $('cockpitScrapingPanel').append(g); }
      // Vision reads images through the media engines: Engines, keys & routing.
      card(sections.engine, 'Vision', lift('swVision'));
      // Document reading is a device/vault tool, not a music setting.
      card(sections.device, 'Document reading', lift('swDocs'));
      // Background pings and background replies are permissions-side behaviour.
      card(sections.permissions, 'Background & pings', lift('swPing').concat(lift('swBgReply')));
      // The Agent card is now empty except its status line: park the status with YouTube, drop the shell.
      if (agentHost && !agentHost.querySelector('.cr')) { const st = $('agentStatus'); if (st && $('cockpitYouTube')) $('cockpitYouTube').append(st); agentHost.remove(); }
      // Titles that described the old mixed bundles.
      const rename = (id, text) => { const h = $(id)?.closest('.card, .cockpit-control-group')?.querySelector(':scope > .cockpit-subtitle, :scope > .ct'); if (h) h.textContent = text; };
      rename('swMusic', 'Music control');
      rename('swLyr', 'Lyrics & music widget');
    })();
    // V1.10.37: the Stability key and the keyless music/video endpoints moved here from + > Media & Music, so ALL media settings live on the Media page.
    (() => {
      const host = D.createElement('div'); host.id = 'cockpitMediaKeys'; host.className = 'card';
      sections.music.prepend(host);
      let busy = false, msg = '';
      const Pv = () => W.Prov;
      const stState = () => { try { return Pv().stateOf('stability'); } catch (_) { return 'none'; } };
      const html = () => {
        const P = Pv(); let h = '<div class="ct">Media keys &amp; engines</div><p class="hint">Picture and PDF engines that need no key are built in. Add your own Stability AI key for optional images, and connect keyless music or video APIs. Keys stay on this phone.</p>';
        if (P && P.CFG && P.CFG.stability) {
          const list = P.entries('stability') || [], st = stState(), n = list.length;
          const dot = busy ? '' : st === 'ok' ? 'ok' : (st === 'limited' || st === 'unknown') ? 'warn' : '';
          const line = busy ? 'Checking the key\u2026' : st === 'none' ? 'No key saved' : st === 'ok' ? 'Key authenticated \u00b7 image access depends on your account' : st === 'limited' ? 'Key is valid but resting (rate limited)' : st === 'bad' ? 'Key rejected or unreachable' : 'Key saved \u00b7 not checked yet';
          h += '<h4 class="epl-h">Stability AI \u00b7 optional image engine</h4><div class="epl-grp"><div class="epl-row epl-static"><span class="epl-dot ' + dot + '"></span><span class="epl-ic">\uD83C\uDFA8</span><span class="epl-tx"><b>Stability AI</b><small>' + esc(msg || line) + (n ? ' \u00b7 ' + n + ' key' + (n === 1 ? '' : 's') : '') + '</small></span></div>';
          list.forEach(e => { h += '<div class="epl-row epl-static"><span class="epl-ic">\uD83D\uDD11</span><span class="epl-tx"><b>' + esc(P.mask(e.key)) + '</b><small>' + esc(!e.st ? 'not checked yet' : e.st.ok ? (e.st.limited ? 'valid \u00b7 resting' : 'authenticated') : String(e.st.msg || 'rejected').slice(0, 60)) + '</small></span><button type="button" class="epl-mini" data-ms-rm="' + esc(e.key) + '" aria-label="Remove this key">\u2715</button></div>'; });
          h += '<div class="epl-row epl-static epl-keyrow"><input type="password" id="cmStabKey" class="epl-in" placeholder="Paste a Stability API key (sk-\u2026)" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Stability API key"><button type="button" class="epl-mini hot" data-ms-add>Add</button></div></div>' +
            '<div class="epl-btns epl-btns2"><button type="button" class="epl-btn" data-ms-check' + (n && !busy ? '' : ' disabled') + '>' + (busy ? 'Checking\u2026' : 'Check key') + '</button><a class="epl-btn" style="display:flex;align-items:center;justify-content:center;text-decoration:none;color:inherit" href="https://platform.stability.ai/dashboard/api-keys" target="_blank" rel="noopener noreferrer">Get a key \u2197</a></div>';
        }
        return h + '<div id="cmKeyless">' + (W.EmberKeylessMedia ? W.EmberKeylessMedia.panel() : '') + '</div>';
      };
      paintMedia = () => {
        const a = D.activeElement; if (a && host.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return;
        const keep = sb.scrollTop, typed = $('cmStabKey') ? $('cmStabKey').value : '';
        host.innerHTML = html(); if ($('cmStabKey')) $('cmStabKey').value = typed; sb.scrollTop = keep;
      };
      const names = () => { try { W.dispatchEvent(new Event('ember-names')); } catch (_) {} };
      host.addEventListener('click', async e => {
        const t = e.target, P = Pv(); if (!P) return;
        if (t.closest('[data-ms-add]')) {
          const i = $('cmStabKey'), v = i ? i.value.trim() : ''; if (!v) { msg = 'Paste a key first'; return paintMedia(); }
          busy = true; msg = ''; paintMedia(); let r; try { r = await P.addKey('stability', v); } catch (_) { r = {ok: false, why: 'failed'}; }
          busy = false; msg = r && r.ok ? '' : r && r.why === 'already added' ? 'That key is already saved' : 'That key could not be saved'; if (r && r.ok && $('cmStabKey')) $('cmStabKey').value = ''; names(); return paintMedia();
        }
        if (t.closest('[data-ms-check]')) { if (busy) return; busy = true; msg = ''; paintMedia(); try { await P.ping('stability'); } catch (_) { msg = 'Could not reach Stability'; } busy = false; names(); return paintMedia(); }
        const rm = t.closest('[data-ms-rm]'); if (rm) { try { P.removeKey('stability', rm.dataset.msRm); } catch (_) {} msg = ''; names(); return paintMedia(); }
      });
      ['ember-provider-stats', 'ember-names', 'ember-plus-change'].forEach(n => W.addEventListener(n, () => { if (settings.classList.contains('show')) paintMedia(); }));
      paintMedia();
    })();
    // Scraping health/test are adjacent controls, not another nested menu.
    sections.scraping.querySelector('.wtabs')?.remove();
    sections.scraping.querySelectorAll('.wpane').forEach(p => { p.classList.remove('hidden'); p.classList.add('cockpit-scrape-pane'); });
    // Only provider accordions collapse; all other Settings content is always exposed.
    settings.querySelectorAll('details:not(#cockpitProviderList):not(.cockpit-provider)').forEach(f => {
      f.open = true; f.classList.add('cockpit-flat-detail');
      const sum = f.querySelector(':scope > summary');
      if (sum) { sum.setAttribute('role','heading'); sum.setAttribute('aria-level','3'); sum.tabIndex = -1; sum.addEventListener('click', e => e.preventDefault()); }
    });
    if ($('accWrap')) $('accWrap').hidden = true; $('stabs').hidden = true;
    // Retire the duplicate command widget, keeping its live observer targets detached and safe.
    if ($('ccWidget')) $('ccWidget').hidden = true;
    const heading = settings.querySelector('.sh-t');
    if (heading) { heading.querySelector('b').textContent = 'Settings'; heading.querySelector('small').textContent = 'Settings'; }
    settings.setAttribute('role','dialog'); settings.setAttribute('aria-modal','true'); settings.setAttribute('aria-label','Settings');
    let lastFocus;
    const originalOpen = $('bSet').onclick, originalClose = $('bSx').onclick;
    const map = { keys:'engine', features:'providers', general:'general', scraping:'scraping', hacking:'hacking', music:'music', permissions:'permissions' };
    const homeName = () => ($('pName')?.textContent || '').trim() || 'Ember';
    function setHead(title, sub, back) {
      $('setTitle').textContent = title;
      const small = settings.querySelector('.sh-t small'); if (small) small.textContent = sub;
      const x = $('bSx'); x.textContent = back ? '\u2039' : '\u2715'; x.setAttribute('aria-label', back ? 'Back to Settings' : 'Close settings');
    }
    function showMenu() {
      view = 'menu'; settings.classList.add('cview-menu'); settings.classList.remove('cview-section');
      Object.values(sections).forEach(s => s.classList.remove('cshow')); root.classList.remove('cmulti');
      setHead(homeName(), 'Settings', false); sb.scrollTop = 0; resetSearch();
    }
    function showRow(row, target) {
      if (row.workspace) { closeSettings(); W.EmberWorkspace.open(row.workspace); return; }
      view = 'section'; settings.classList.add('cview-section'); settings.classList.remove('cview-menu');
      Object.entries(sections).forEach(([id, s]) => s.classList.toggle('cshow', row.sections.includes(id)));
      root.classList.toggle('cmulti', row.sections.length > 1);
      setHead(row.title, 'Settings', true); sb.scrollTop = 0;
      if (target) requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
    }
    function rowFor(section, target) {
      let id = null;
      const host = target?.closest?.('.cockpit-section'); if (host) id = host.id.replace('cockpit_', '');
      if (!id && section) id = map[section] || section;
      const row = id && ROWS.find(r => r.sections && r.sections.includes(id));
      return row ? {row, target: target || sections[id]} : null;
    }
    function openSettings(section, target) {
      W.EmberCommandCenter.close();
      lastFocus = D.activeElement;
      originalOpen('general');
      D.body.classList.add('cockpit-settings-open'); $('app').inert = true;
      paintMedia();
      const hit = rowFor(section, target);
      if (hit) showRow(hit.row, hit.target); else showMenu();
      requestAnimationFrame(() => $('bSx').focus({preventScroll:true}));
    }
    function closeSettings() {
      originalClose(); D.body.classList.remove('cockpit-settings-open'); $('app').inert = false;
      if (lastFocus?.isConnected && !$('emberCommandCenter').classList.contains('ecc-open')) lastFocus.focus({preventScroll:true});
    }
    const back = () => { if (view === 'section') { showMenu(); $('bSx').focus({preventScroll:true}); } else closeSettings(); };
    menu.addEventListener('click', e => { const b = e.target.closest('[data-crow]'); if (b) showRow(ROWS.find(r => r.id === b.dataset.crow)); });
    backdrop.addEventListener('click', closeSettings);
    $('bSet').onclick = () => openSettings(); $('bSx').onclick = back;
    W.EmberHub = {open:()=>openSettings(),close:closeSettings,isOpen:()=>settings.classList.contains('show'),section:id=>openSettings(id),openWorkspace:()=>W.EmberCommandCenter.open()};
    W.EmberMenu = {sync:()=>{},reveal:el=>openSettings(null,el),openCard:el=>openSettings(null,el),back:closeSettings};
    $('cockpitCommand').onclick = () => { closeSettings(); W.EmberWorkspace.open('connect'); };
    // 1.10.18 Part 9: the old bare sheet can never be the Settings on screen. Whatever opens #settings, if the black
    // cockpit state is missing it is routed into the black Settings; if the sheet closes behind our back, the lock is released.
    let guarding = false;
    new MutationObserver(() => {
      if (guarding) return;
      const shown = settings.classList.contains('show'), black = D.body.classList.contains('cockpit-settings-open');
      if (shown && !black) { guarding = true; try { openSettings(); } finally { guarding = false; } }
      else if (!shown && black) { D.body.classList.remove('cockpit-settings-open'); $('app').inert = false; }
    }).observe(settings, {attributes:true, attributeFilter:['class']});
    // All old settings shortcuts resolve to this single flat scroll, not hidden cards.
    D.addEventListener('click', e => {
      const b = e.target.closest('#bSetTop,#bGoKeys,#bKeys,#bKeysMenu,#bEngineKeys,#bAiFeatures,#efOpenSettings');
      if (!b) return; e.preventDefault(); e.stopImmediatePropagation();
      if (['bGoKeys','bKeys','bKeysMenu','bEngineKeys'].includes(b.id) && W.EmberKeyManager) return W.EmberKeyManager.open();
      openSettings(['bGoKeys','bKeys','bKeysMenu','bEngineKeys'].includes(b.id) ? 'engine' : ['bAiFeatures','efOpenSettings'].includes(b.id) ? 'providers' : null);
    },true);
    $('stabs').addEventListener('click', e => { const t = e.target.closest('[data-st]'); if (t) setTimeout(() => (sections[map[t.dataset.st]] || sections.general).scrollIntoView({block:'start'}), 60); });
    D.addEventListener('keydown', e => {
      if (!settings.classList.contains('show')) return;
      if (e.key === 'Escape') { e.preventDefault(); back(); }
      if (e.key === 'Tab') {
        const list = Array.from(settings.querySelectorAll('button,input,select,textarea,summary,[tabindex="0"]')).filter(x => !x.disabled && x.getClientRects().length);
        const first = list[0], last = list.at(-1);
        if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    });
    // Remove the chat Panel affordance, not terminal connection/backend services.
    $('bPanelTop')?.remove(); $('bPanelTerm')?.remove();
    // Footer: Providers selector on the left (opens the real provider dropdown), verified API key count far right.
    const bar = $('chatProviderBar');
    if (bar) {
      $('bProv') && sections.providers.prepend($('bProv'));
      $('provDrop') && sections.providers.append($('provDrop'));
      const pb = $('bProv');
      if (pb) { if (!pb.querySelector(':scope > span')) { const l = D.createElement('span'); l.textContent = 'Providers'; pb.append(l); } bar.prepend(pb); }
      if ($('provDrop')) bar.append($('provDrop'));
      const badge = D.createElement('span'); badge.id = 'cockpitApiCount'; badge.setAttribute('role','status');
      bar.append(badge);
      function countKeys() {
        let active = 0, saved = 0;
        (W.Prov.ACTIVE_IDS || W.Prov.IDS).forEach(id => W.Prov.entries(id).forEach(e => { saved++; if (!e.bad && e.st?.ok !== false && !W.Prov.isCool(e.key)) active++; }));
        const text = active + ' active API key' + (active === 1 ? '' : 's');
        if (badge.textContent !== text) badge.textContent = text;
        badge.title = active + ' usable · ' + saved + ' saved. Rejected and resting keys are not counted. Nothing is tested in the background.';
        badge.setAttribute('aria-label',badge.title);
      }
      countKeys(); W.addEventListener('ember-provider-stats',countKeys); W.addEventListener('ember-names',countKeys); W.addEventListener('storage',countKeys);
      D.addEventListener('visibilitychange',()=>{if(!D.hidden)countKeys();});
      settings.addEventListener('input',countKeys);
      setInterval(()=>{if(!D.hidden && settings.classList.contains('show'))countKeys();},15000);
    }
    // Browser has a real Notes tab; reuse the original notes editor and autosave handlers inline.
    const notes = $('xcreate'), br = $('browser');
    if (notes && br) {
      const pane = D.createElement('div'); pane.id = 'brNotes'; pane.className = 'brbody hidden'; pane.append(notes); br.append(pane);
      notes.classList.add('cockpit-inline-notes');
      function selectNotes() {
        W.EmberCreate.open('notes'); $('brWeb').classList.add('hidden'); $('brDocs').classList.add('hidden'); pane.classList.remove('hidden');
        $('brTabs').querySelectorAll('.stab').forEach(b => b.classList.toggle('on', b.dataset.bt === 'notes'));
      }
      $('brTabs').addEventListener('click', e => {
        const b = e.target.closest('[data-bt]'); if (!b) return;
        if (b.dataset.bt === 'notes') { if (pane.classList.contains('hidden')) selectNotes(); } else { $('cX').click(); pane.classList.add('hidden'); }
      });
      $('dcNotesOpen')?.remove();
      const openNotes = W.EmberCreate.open;
      W.EmberCreate.open = t => { if (!br.classList.contains('show')) W.EmberBrowser.open(); openNotes(t); selectNotesOriginal(); };
      function selectNotesOriginal() { $('brWeb').classList.add('hidden'); $('brDocs').classList.add('hidden'); pane.classList.remove('hidden'); $('brTabs').querySelectorAll('.stab').forEach(b => b.classList.toggle('on',b.dataset.bt==='notes')); }
      // selectNotes uses the public wrapper, which delegates only once to the original editor.
      const browserOpen = W.EmberBrowser.open;
      W.EmberBrowser.open = which => { browserOpen(which); pane.classList.add('hidden'); if (which === 'notes') { openNotes('notes'); selectNotesOriginal(); } };
      $('brX').addEventListener('click', () => $('cX').click());
    }
    // 1.10.27: Settings search. Finds any control, card or row across every Settings section and jumps to it.
    const sbox = D.createElement('div'); sbox.id = 'cockpitSearchBox';
    sbox.innerHTML = '<label><span aria-hidden="true">\u2315</span><input id="cockpitSearch" type="search" placeholder="Search settings" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search settings"><button type="button" id="cockpitSearchClear" aria-label="Clear search" hidden>\u2715</button></label>';
    const sres = D.createElement('div'); sres.id = 'cockpitSearchResults'; sres.hidden = true; sres.setAttribute('role', 'listbox'); sres.setAttribute('aria-label', 'Settings search results');
    sb.prepend(sres); sb.prepend(sbox);
    const sin = $('cockpitSearch'), sclear = $('cockpitSearchClear');
    const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
    let sidx = null, shits = [];
    function buildIndex() {
      const out = [];
      ROWS.forEach(r => out.push({row: r, el: null, title: r.title, where: 'Settings', snip: r.desc, text: norm(r.title + ' ' + r.desc)}));
      ROWS.forEach(r => (r.sections || []).forEach(id => {
        const sec = sections[id]; if (!sec) return;
        sec.querySelectorAll('.cr, .card, .cockpit-control-group, details.cockpit-provider').forEach(el => {
          const own = el.querySelector(':scope > .ct, :scope > .cockpit-subtitle, :scope > summary');
          const heading = (own && own.textContent.trim()) || (el.querySelector('.lb, label, b')?.textContent.trim()) || '';
          const parent = el.parentElement && el.parentElement.closest('.card, .cockpit-control-group');
          const ph = parent?.querySelector(':scope > .ct, :scope > .cockpit-subtitle')?.textContent.trim() || '';
          const extra = Array.from(el.querySelectorAll('input,textarea,select,button')).map(x => (x.placeholder || '') + ' ' + (x.getAttribute('aria-label') || '') + ' ' + (x.title || '')).join(' ');
          const full = (heading + ' ' + el.textContent + ' ' + extra).replace(/\s+/g, ' ').trim(); if (!full) return;
          const snip = el.textContent.replace(/\s+/g, ' ').trim().slice(0, 120);
          out.push({row: r, el, title: heading || ph || r.title, where: r.title + (ph && ph !== heading ? ' \u203a ' + ph : ''), snip, text: norm(full).slice(0, 5000)});
        });
      }));
      out.push({widget: true, title: 'GitHub \u00b7 Ember\u2019s Brain', where: 'GitHub', snip: 'Token, load the Brain, search repos, view, add and push, GitHub Terminal', text: 'github git brain repo repository repositories search view add push token terminal ember brain commit'});
      return out;
    }
    function runSearch(q) {
      const tokens = norm(q).split(' ').filter(Boolean); if (!tokens.length) return [];
      if (!sidx) sidx = buildIndex();
      let hit = sidx.filter(x => tokens.every(t => x.text.includes(t)));
      // Keep the most specific match: drop a block when something inside it matched too.
      hit = hit.filter(x => !x.el || !hit.some(y => y !== x && y.el && x.el.contains(y.el)));
      const score = x => (x.widget || !x.el ? 0 : 1) + (tokens.every(t => norm(x.title).includes(t)) ? 0 : 2);
      return hit.map((x, i) => ({x, i, sc: score(x)})).sort((a, b) => a.sc - b.sc || a.i - b.i).slice(0, 40).map(o => o.x);
    }
    function renderSearch() {
      const q = sin.value; sclear.hidden = !q;
      const on = !!norm(q); settings.classList.toggle('csearching', on); sres.hidden = !on;
      if (!on) { sres.replaceChildren(); shits = []; return; }
      shits = runSearch(q);
      sres.innerHTML = shits.length ? shits.map((h, i) => '<button type="button" class="csr" role="option" data-hit="' + i + '"><span class="csr-in">' + esc(h.where) + '</span><b>' + esc(h.title) + '</b><small>' + esc(h.snip) + '</small></button>').join('') : '<p class="csr-none">No setting matches \u201c' + esc(q.trim()) + '\u201d. Try fewer or different words.</p>';
    }
    function resetSearch() { sidx = null; if (sin) { sin.value = ''; renderSearch(); } }
    sin.addEventListener('input', renderSearch);
    sin.addEventListener('keydown', e => { if (e.key === 'Escape' && sin.value) { e.preventDefault(); e.stopPropagation(); sin.value = ''; renderSearch(); } if (e.key === 'Enter' && shits.length) { e.preventDefault(); sres.querySelector('.csr')?.click(); } });
    sclear.addEventListener('click', () => { sin.value = ''; renderSearch(); sin.focus(); });
    sres.addEventListener('click', e => {
      const b = e.target.closest('[data-hit]'); if (!b) return; const h = shits[Number(b.dataset.hit)]; if (!h) return;
      sin.value = ''; renderSearch();
      if (h.widget) { if (W.EmberGitBrain) W.EmberGitBrain.open(); return; }
      showRow(h.row, h.el || undefined);
      if (h.el) { h.el.classList.add('csr-hit'); setTimeout(() => h.el.classList.remove('csr-hit'), 2600); }
    });
    const dash = unifyCommandCentre(G);
    W.EmberCockpit = {open:openSettings,close:closeSettings,dash,version:'1.10.27',search:term => { openSettings(); sin.value = String(term || ''); renderSearch(); sin.focus({preventScroll:true}); }};
  }
  // 1.10.18 Part 4: ONE Command Centre dashboard. Tabs replace four stacked panels; GitHub (Brain, Search, Run & Push) is one tab.
  function unifyCommandCentre(G) {
    const panel = $('emberCommandCenter'), host = panel.querySelector('.ecc-panel-content');
    const routing = host.querySelector('.ef-panel');
    const head = c => (c.querySelector('h2,h3')?.textContent || '').trim();
    const others = Array.from(host.querySelectorAll(':scope > .ecc-card'));
    const thought = others.find(c => /thought/i.test(head(c))), memory = others.find(c => /memory/i.test(head(c)));
    const ov = D.createElement('section'); ov.id = 'eccOverview'; ov.className = 'ecc-card eccx-overview';
    ov.innerHTML = '<h2>Overview</h2><div id="eccxTiles" class="eccx-tiles"></div><h3 class="eccx-h">Providers, free models and key rotation</h3><div id="eccxTable" class="eccx-table" role="table" aria-label="Providers"></div><p class="hint eccx-note">Free Mode needs no key (Pollinations pictures, Forge community GPUs). Add several keys for one provider and Ember rotates between them: a rate-limited or rejected key rests and the next one answers, then the next provider takes over. OpenRouter :free models and Plugsky micro/lite are labelled free once their live catalog is loaded. Claude is paid and pin-only. Optional media connections live under +, outside Settings. Free tiers are set by each provider, not guaranteed by Ember.</p><div class="btnrow"><button type="button" class="btn g" id="eccxCheck">Check all keys</button><button type="button" class="btn g" id="eccxOpenKeys">Manage keys in Settings</button></div><p id="eccxStatus" class="hint" role="status"></p>';
    const panels = {overview: ov, routing, thought, memory};
    const LABEL = {overview:'Overview', routing:'Routing & keys', thought:'Inspector', memory:'Memory'};
    const bar = D.createElement('div'); bar.id = 'eccDash'; bar.className = 'eccx-tabs'; bar.setAttribute('role','tablist'); bar.setAttribute('aria-label','Command Centre');
    bar.innerHTML = Object.keys(panels).filter(k => panels[k]).map(k => '<button type="button" role="tab" data-dash="' + k + '" id="eccDash_' + k + '">' + LABEL[k] + '</button>').join('');
    host.prepend(ov); host.prepend(bar);
    let current = 'overview';
    function paint() {
      const P = W.Prov; if (!P) return;
      let active = 0, saved = 0, free = 0, cached = 0, rest = 0; const rows = [];
      P.ACTIVE_IDS.forEach(id => {
        const c = P.CFG[id], list = P.entries(id) || [], live = list.filter(e => e.st?.ok && !e.st.limited && !P.isCool(e.key)).length, cool = list.filter(e => P.isCool(e.key)).length;
        const d = P.detail(id) || {}, models = (P.cachedModels && P.cachedModels(id)) || [], fm = models.filter(m => /:free$|^plugsky-(micro|lite)$/.test(m)).length;
        active += live; saved += list.length; rest += cool; free += fm; cached += models.length ? 1 : 0;
        const type = id === 'anthropic' ? 'Paid · pin-only' : c.kind === 'media' ? 'Media only' : c.credits ? 'Opt-in · uses your credits' : c.optIn ? 'Opt-in · free models' : 'Chat · free tier by provider';
        let state = 'no key'; try { state = {ok:'working', limited:'rate-limited', bad:'failing', unknown:'not checked', none:'no key'}[P.stateOf(id)] || P.stateOf(id); } catch (_) { /* cosmetic */ }
        const rot = list.length < 2 ? (list.length ? '1 key · no rotation' : '—') : live + ' of ' + list.length + ' keys live · rotating' + (cool ? ' · ' + cool + ' resting' + (d.retry ? ' (' + d.retry + 's)' : '') : '');
        rows.push('<div class="eccx-row" role="row"><b role="cell">' + esc(c.name) + '</b><span role="cell">' + esc(type) + '</span><span role="cell">' + (models.length ? fm + ' free of ' + models.length : (list.length ? 'load catalog' : '—')) + '</span><span role="cell">' + esc(rot) + '</span><span role="cell" class="eccx-st" data-st="' + esc(state.replace(/\s/g,'-')) + '">' + esc(state) + '</span></div>');
      });
      $('eccxTable').innerHTML = '<div class="eccx-row eccx-hd" role="row"><span role="columnheader">Provider</span><span role="columnheader">Type</span><span role="columnheader">Free models</span><span role="columnheader">Key rotation</span><span role="columnheader">Status</span></div><div class="eccx-row" role="row"><b role="cell">Free Mode</b><span role="cell">Keyless</span><span role="cell">no key needed</span><span role="cell">—</span><span role="cell" class="eccx-st" data-st="working">always on</span></div>' + rows.join('');
      const q = W.EmberGitBrain ? W.EmberGitBrain.queue().length : 0, tok = (() => { try { return G.on(); } catch (_) { return false; } })();
      const tile = (k, v, sub) => '<div class="eccx-tile"><small>' + k + '</small><strong>' + esc(v) + '</strong><span>' + esc(sub) + '</span></div>';
      $('eccxTiles').innerHTML = tile('Providers', P.ACTIVE_IDS.length + ' AI engines', 'plus keyless Free Mode')
        + tile('Active keys', active + ' / ' + saved, rest ? rest + ' resting after a rate limit' : 'rotate automatically when one rests')
        + tile('Free models', cached ? String(free) : '—', cached ? 'from loaded catalogs' : 'load a catalog to count them')
        + tile('GitHub', tok ? 'Token saved' : 'No token', q + ' repo' + (q === 1 ? '' : 's') + ' waiting to push');
    }
    function setDash(name) {
      if (!panels[name]) name = 'overview'; current = name;
      Object.entries(panels).forEach(([k, el]) => { if (el) el.hidden = k !== name; });
      bar.querySelectorAll('[data-dash]').forEach(b => { const on = b.dataset.dash === name; b.setAttribute('aria-selected', String(on)); b.classList.toggle('on', on); b.tabIndex = on ? 0 : -1; });
      if (name === 'overview') paint();
      host.scrollTop = 0;
    }
    bar.addEventListener('click', e => { const b = e.target.closest('[data-dash]'); if (b) setDash(b.dataset.dash); });
    $('eccxOpenKeys').onclick = () => { W.EmberCommandCenter.close(); W.EmberCockpit.open('engine'); };
    $('eccxCheck').onclick = async e => {
      const b = e.currentTarget; b.disabled = true; $('eccxStatus').textContent = 'Checking every saved key…';
      try { await W.Prov.pingAll(); $('eccxStatus').textContent = 'Check finished.'; } catch (er) { $('eccxStatus').textContent = 'Check failed: ' + (er.message || er); }
      finally { b.disabled = false; paint(); }
    };
    for (const ev of ['ember-provider-stats', 'ember-names', 'ember-route', 'storage']) W.addEventListener(ev, () => { if (current === 'overview' && panel.classList.contains('ecc-open')) paint(); });
    setDash('overview');
    return setDash;
  }
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',init);else init();
})();
