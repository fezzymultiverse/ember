/* Ember 1.10.51: isolated key management, appearance and observed activity UI.
 * Uses the existing Prov store/router; does not migrate or export credentials. */
'use strict';
(() => {
  const W = window, D = document, $ = id => D.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TIERS = {
    gemini: ['Free tier on eligible models; quota is project/model-specific. Catalog access alone does not prove generation access.', 'https://ai.google.dev/gemini-api/docs/pricing'],
    groq: ['Free-plan allowances depend on your organization and model. Multiple keys do not multiply an organization’s quota.', 'https://console.groq.com/docs/rate-limits'],
    mistral: ['Free mode includes limited monthly API usage. Check your organization’s Limits page; paid usage depends on your account settings.', 'https://docs.mistral.ai/admin/billing-usage/usage-limits'],
    cohere: ['Evaluation keys: 1,000 calls/month; listed chat models typically 20 requests/minute. Production keys may be paid.', 'https://docs.cohere.com/docs/rate-limits'],
    openrouter: ['Auto routing uses zero-price text variants only. Account-wide free limits and model availability still apply; an explicit paid-model pin can cost money.', 'https://openrouter.ai/docs/api_reference/limits'],
    plugsky: ['Free plan includes plugsky-micro / plugsky-lite; availability and fair-use limits depend on your plan. Auto use remains opt-in.', 'https://plugsky.com/articles/ai-api-for-professional-services-use-cases-security-and-deployment-options'],
    anthropic: ['Claude API is metered; any trial/subscriber credits are account-dependent. Explicit provider pin required by Ember’s existing policy.', 'https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers'],
    stability: ['Image/media API, not a chat engine. New-account credits are limited; later generations use the account’s credit balance.', 'https://docs.stability.ai/pricing']
  };
  let theme = 'dark';
  try { theme = localStorage.getItem('ember_appearance') || 'dark'; } catch (_) {}
  function setTheme(next) {
    theme = ['dark','light','system'].includes(next) ? next : 'dark';
    const light = theme === 'light' || (theme === 'system' && W.matchMedia('(prefers-color-scheme: light)').matches);
    D.documentElement.dataset.emberTheme = light ? 'light' : 'dark';
    D.documentElement.style.colorScheme = light ? 'light' : 'dark';
    try { localStorage.setItem('ember_appearance',theme); } catch (_) {}
    const meta = D.querySelector('meta[name="theme-color"]'); if (meta) meta.content = light ? '#f6f7fa' : '#000000';
    D.querySelectorAll('[data-ember-appearance]').forEach(s => { s.value = theme; });
  }
  setTheme(theme);
  W.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (theme === 'system') setTheme(theme); });
  function boot() {
    const P = W.Prov; if (!P) return;
    let lastFocus = null, prior = [], checking = false, adding = false;
    const backdrop = D.createElement('button'); backdrop.id = 'ekmBackdrop'; backdrop.hidden = true; backdrop.setAttribute('aria-label','Close API keys');
    const panel = D.createElement('aside'); panel.id = 'emberKeyManager'; panel.hidden = true; panel.inert = true;
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-labelledby','ekmTitle');
    panel.innerHTML = '<header><div><small>EMBER / CONNECTIONS</small><h2 id="ekmTitle">API keys</h2><p>Add, check or remove your AI keys. Routing stays in Settings.</p></div><button type="button" id="ekmClose" aria-label="Close API keys">×</button></header>' +
      '<div class="ekm-body"><form id="ekmForm"><label for="ekmProvider">AI provider</label><select id="ekmProvider">' + P.IDS.map(id => '<option value="'+esc(id)+'">'+esc(P.CFG[id].name)+(id==='stability'?' · media only':'')+'</option>').join('')+'</select>'+
      '<p id="ekmTier" class="ekm-hint"></p><label for="ekmInput">API key</label><div class="ekm-entry"><input id="ekmInput" type="password" placeholder="Paste a key" autocomplete="off" autocapitalize="none" spellcheck="false" required><button type="submit" id="ekmAdd">Add key</button></div></form>'+
      '<p id="ekmStatus" role="status" aria-live="polite">Keys stay in this app’s local storage. They are sent only to their provider; not included in this release ZIP.</p>'+
      '<div class="ekm-toolbar"><h3>Saved keys</h3><button type="button" id="ekmCheck">Refresh catalogs</button></div><p class="ekm-hint">Catalog checks do not generate replies or prove available chat quota. The model is selected automatically when you send a message, unless you explicitly pinned one.</p><div id="ekmList"></div></div>';
    D.body.append(backdrop,panel);
    function tier() { const t = TIERS[$('ekmProvider').value]; $('ekmTier').innerHTML = esc(t[0])+' <a href="'+t[1]+'" target="_blank" rel="noopener noreferrer">Provider details ↗</a>'; }
    function status(text) { $('ekmStatus').textContent = text; }
    function paint() {
      if (panel.hidden) return;
      const list = $('ekmList');
      const html = P.IDS.map(id => {
        const entries = P.entries(id) || []; if (!entries.length) return '';
        const logo = W.EmberProviderBadge ? W.EmberProviderBadge(id) : '';
        return '<section class="ekm-group"><h4>'+logo+esc(P.CFG[id].name)+'<small>'+entries.length+'</small></h4>'+entries.map((e,i) => {
          const st = e.st, msg = !st ? 'Saved · not checked' : st.lat && st.ok ? 'Replied successfully · '+(st.model||'') : st.limited ? 'Limited · '+(st.msg||'wait for quota reset') : st.ok ? 'Catalog reachable · generation not verified' : 'Check failed · '+(st.code||'network');
          return '<div class="ekm-key"><div><b>'+esc(P.mask(e.key))+'</b><small>'+esc(msg)+'</small></div><button type="button" data-ekm-remove="'+esc(id)+'" data-ekm-index="'+i+'" aria-label="Remove '+esc(P.CFG[id].name)+' key '+(i+1)+'">Remove</button></div>';
        }).join('')+'</section>';
      }).join('') || '<p class="ekm-empty">No AI keys saved. Add your first key above.</p>';
      if (list.dataset.rendered !== html) { list.innerHTML = html; list.dataset.rendered = html; }
    }
    function close() {
      panel.hidden = true; panel.inert = true; backdrop.hidden = true; D.body.classList.remove('ember-keys-open');
      prior.forEach(([node,inert]) => { node.inert = inert; }); prior = [];
      if (lastFocus?.isConnected && !lastFocus.closest('[inert]')) lastFocus.focus({preventScroll:true});
    }
    function open(provider) {
      if (!panel.hidden) return;
      lastFocus = D.activeElement;
      // Older key summary panel stays unused; no duplicate credential stores.
      const old = $('keysSidePanel'); if (old) { old.classList.remove('show'); old.setAttribute('aria-hidden','true'); }
      const oldBg = $('kspBackdrop'); if (oldBg) oldBg.hidden = true;
      $('headerActionsMenu')?.classList.add('hidden');
      prior = ['app','settings','emberRightPanel','emberCommandCenter'].map($).filter(Boolean).map(n => [n,n.inert]);
      prior.forEach(([n]) => { n.inert = true; });
      panel.hidden = false; panel.inert = false; backdrop.hidden = false; D.body.classList.add('ember-keys-open');
      if (provider && P.CFG[provider]) $('ekmProvider').value = provider;
      tier(); paint(); $('ekmProvider').focus({preventScroll:true});
    }
    W.EmberKeyManager = { open, close, isOpen: () => !panel.hidden, tiers: TIERS, version:'1.10.51' };
    W.EmberAppearance = {set:setTheme,get:()=>theme};
    $('ekmClose').onclick = close; backdrop.onclick = close;
    $('ekmProvider').onchange = tier;
    $('ekmForm').addEventListener('submit', async e => {
      e.preventDefault(); if (adding) return;
      const id = $('ekmProvider').value, key = $('ekmInput').value;
      if (!P.clean(key)) { status('Paste an API key first.'); return; }
      adding = true; $('ekmAdd').disabled = true; status('Saving key and loading the provider’s available catalog…');
      try {
        const r = await P.addKey(id,key); $('ekmInput').value = '';
        status(!r.ok ? r.why === 'already added' ? 'This key is already saved.' : 'The key could not be added.' : r.e?.st?.ok ? 'Key saved. Catalog reachable; generation will be checked by your next chat message.' : 'Key saved, but its catalog check failed. Check the provider/account restrictions and connectivity.');
        W.dispatchEvent(new Event('ember-names'));
      } catch (_) { status('Check failed. The provider may be offline or blocked; any saved key is kept for retry.'); }
      finally { adding=false; $('ekmAdd').disabled=false; paint(); }
    });
    $('ekmList').addEventListener('click', e => {
      const b = e.target.closest('[data-ekm-remove]'); if (!b) return;
      const id = b.dataset.ekmRemove, entry = P.entries(id)?.[Number(b.dataset.ekmIndex)];
      if (entry) { P.removeKey(id,entry.key); status(P.CFG[id].name+' key removed.'); paint(); W.dispatchEvent(new Event('ember-names')); }
    });
    $('ekmCheck').onclick = async () => {
      if (checking) return; checking=true; $('ekmCheck').disabled=true; status('Refreshing saved-key catalogs. No chat generation is sent.');
      try { await P.healthAll(); status('Catalog refresh finished. A successful chat is still needed to verify generation quota.'); }
      catch (_) { status('Some catalog checks failed. Check connectivity and provider account settings.'); }
      finally { checking=false; $('ekmCheck').disabled=false; paint(); }
    };
    W.addEventListener('ember-provider-stats',paint);
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button:not(:disabled),input,select,a[href]')].filter(n => n.getClientRects().length);
      if (!nodes.length) return;
      if (e.shiftKey && D.activeElement===nodes[0]) { e.preventDefault(); nodes.at(-1).focus(); }
      else if (!e.shiftKey && D.activeElement===nodes.at(-1)) { e.preventDefault(); nodes[0].focus(); }
    });
    D.addEventListener('click', e => {
      const entry = e.target.closest('[data-open-key-manager],[data-name="AI providers & API keys"]');
      if (entry) { e.preventDefault(); e.stopImmediatePropagation(); open(); }
    },true);
    // Move only the crowded credential-entry cards out of the old settings page.
    ['pkBox','notes'].forEach(id => { const card=$(id)?.closest('.card'); if (card) { card.classList.add('ember-legacy-key-card'); card.setAttribute('aria-hidden','true'); } });
    const host = $('cockpit_engine') || $('cockpit_keys') || $('kList')?.closest('.cockpit-section');
    if (host) {
      const entry=D.createElement('div');entry.className='card ekm-settings-entry';entry.innerHTML='<div class="ct">API keys</div><p class="hint">Key entry has its own panel. Your engine pins, fallbacks and routing options remain below.</p><button type="button" class="btn g" data-open-key-manager>Manage API keys →</button>';host.prepend(entry);
    }
    // A separate appearance entry does not modify the current settings categories.
    const menu=$('cockpitMenu') || $('cockpitSettingsMenu') || D.querySelector('#settings .cockpit-menu');
    const appearance=D.createElement('div');appearance.className='ekm-appearance';appearance.innerHTML='<label for="emberAppearanceSelect">Appearance</label><select id="emberAppearanceSelect" data-ember-appearance><option value="dark">Dark</option><option value="light">Light</option><option value="system">Use device setting</option></select>';
    if (menu) {
      const keyEntry=D.createElement('button');keyEntry.type='button';keyEntry.className='cmenu-row';keyEntry.dataset.openKeyManager='';keyEntry.innerHTML='<span class="cmenu-t"><b>API keys</b><small>Add or remove AI keys in a dedicated right-side panel</small></span><span class="cmenu-c" aria-hidden="true">›</span>';
      menu.prepend(keyEntry);menu.prepend(appearance);
      const routing=menu.querySelector('[data-crow="keys"]'); if(routing){routing.querySelector('b').textContent='AI providers & routing';routing.querySelector('small').textContent='Choose engines, model pins, routing and fallback policies';}
    } else { const sb=$('settings')?.querySelector('.sb'); if(sb)sb.prepend(appearance); }
    $('emberAppearanceSelect')?.addEventListener('change',e=>setTheme(e.target.value)); setTheme(theme);
    tier();
  }
  if (D.readyState==='loading') D.addEventListener('DOMContentLoaded',boot); else boot();
})();
