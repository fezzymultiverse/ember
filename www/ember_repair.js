/* Ember 1.10.56: API keys + AI providers in one Settings screen (inline key form), appearance and observed activity UI.
 * Uses the existing Prov store/router; does not migrate or export credentials. */
'use strict';
(() => {
  const W = window, D = document, $ = id => D.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TIERS = {
    gemini: ['Free tier on eligible models; quota is project/model-specific. Catalog access alone does not prove generation access.', 'https://ai.google.dev/gemini-api/docs/pricing'],
    groq: ['Free-plan allowances depend on your organization and model. Multiple keys do not multiply an organization’s quota.', 'https://console.groq.com/docs/rate-limits'],
    mistral: ['Blocked in free-only mode: current Mistral docs require billing activation for API access. Your saved keys are retained.', 'https://docs.mistral.ai/admin/billing-usage/usage-limits'],
    cohere: ['Evaluation keys: 1,000 calls/month; listed chat models typically 20 requests/minute. Production keys may be paid.', 'https://docs.cohere.com/docs/rate-limits'],
    openrouter: ['Auto routing uses zero-price text variants only. Account-wide free limits and model availability still apply; paid-model pins are blocked too.', 'https://openrouter.ai/docs/api_reference/limits'],
    plugsky: ['Free plan includes plugsky-micro / plugsky-lite; availability and fair-use limits depend on your plan. Both free models can be used automatically unless you switch this provider off.', 'https://plugsky.com/articles/ai-api-for-professional-services-use-cases-security-and-deployment-options'],
    anthropic: ['Direct Claude API is blocked in free-only mode. Subscriber access is not a free API tier.', 'https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers'],
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
    let adding = false, pendingFree = null;
    // 1.10.56: API keys and AI providers are ONE place. The key form and the saved-key list live inline at the top of "AI providers & API keys";
    // the engine pin, routing and fallback are right under them. No side panel. Keys have no test button and no health bar: Ember simply uses them,
    // and a key that fails is skipped automatically. The only test is the "Test providers" button.
    const card = D.createElement('div'); card.className = 'card ekm-inline'; card.id = 'ekmInline';
    card.innerHTML = '<div class="ct">API keys</div><p class="hint">Add or remove keys here. Ember uses a key until it fails, then moves to the next one. Nothing is tested in the background.</p>' +
      '<form id="ekmForm"><label for="ekmProvider">AI provider</label><select id="ekmProvider">' + P.IDS.map(id => '<option value="'+esc(id)+'">'+esc(P.CFG[id].name)+(id==='stability'?' · media only':'')+'</option>').join('')+'</select>'+
      '<p id="ekmTier" class="ekm-hint"></p><label for="ekmInput">API key</label><div class="ekm-entry"><input id="ekmInput" type="password" placeholder="Paste a key" autocomplete="off" autocapitalize="none" spellcheck="false" required><button type="submit" id="ekmAdd" class="btn">Add key</button></div></form>' +
      '<p id="ekmStatus" role="status" aria-live="polite">Keys stay in this app’s local storage and go only to their own provider.</p>' +
      '<div id="ekmFreeConfirm" class="ekm-free-confirm" hidden><b>Confirm this key is Free / trial</b><p class="hint">Check the provider dashboard first: Groq must be on the Free plan, Gemini billing must be OFF, and Cohere must use a trial/evaluation key. A paid key can charge for the same model. Ember cannot independently verify the account plan. This confirmation expires in 30 days; revoke it if billing changes.</p><label><input id="ekmFreeCheck" type="checkbox"> I checked this exact key and account: it is Free / trial, not paid.</label><div class="ekm-free-actions"><button id="ekmFreeAccept" type="button" disabled>Confirm free key</button><button id="ekmFreeCancel" type="button">Cancel</button></div></div>' +
      '<div class="ekm-toolbar"><h3>Saved keys</h3></div><div id="ekmList"></div>';
    function tier() { const t = TIERS[$('ekmProvider').value]; $('ekmTier').innerHTML = t ? esc(t[0])+' <a href="'+t[1]+'" target="_blank" rel="noopener noreferrer">Provider details ↗</a>' : ''; }
    function status(text) { $('ekmStatus').textContent = text; }
    function paint() {
      const list = $('ekmList'); if (!list) return;
      const html = P.IDS.map(id => {
        const entries = P.entries(id) || []; if (!entries.length) return '';
        const logo = W.EmberProviderBadge ? W.EmberProviderBadge(id) : '';
        const cur = entries.length > 1 && P.peek ? P.peek(id, 'fast').at : -1;
        return '<section class="ekm-group"><h4>'+logo+esc(P.CFG[id].name)+'<small>'+entries.length+'</small></h4>'+entries.map((e,i) => {
          const freeKey = ['groq','gemini','cohere'].includes(id);
          const tierButton = freeKey ? '<button type="button" data-ekm-free="'+esc(id)+'" data-ekm-index="'+i+'">'+(P.freeTierConfirmed(id,e.key)?'Free ✓ · revoke':'Confirm free tier')+'</button>' : '';
          return '<div class="ekm-key"><div><b>'+esc(P.mask(e.key))+'</b>'+(i === cur ? '<small>In use now</small>' : '')+(e.lastGoodModel ? '<small>Working model: '+esc(e.lastGoodModel)+'</small>' : '')+'</div>'+tierButton+'<button type="button" data-ekm-remove="'+esc(id)+'" data-ekm-index="'+i+'" aria-label="Remove '+esc(P.CFG[id].name)+' key '+(i+1)+'">Remove</button></div>';
        }).join('')+'<p class="ekm-hint ekm-free-policy">'+esc(P.freePolicy(id))+'</p></section>';
      }).join('') || '<p class="ekm-empty">No AI keys saved. Add your first key above.</p>';
      if (list.dataset.rendered !== html) { list.innerHTML = html; list.dataset.rendered = html; }
    }
    const host = $('cockpit_engine') || $('cockpit_keys') || $('kList')?.closest('.cockpit-section');
    if (host) host.prepend(card);
    // The old per-key list (dots, check buttons, "Check all") is retired: it duplicated this list and tested keys.
    $('cockpitProviderList')?.setAttribute('hidden','');
    ['pkBox','notes'].forEach(id => { const c=$(id)?.closest('.card'); if (c) { c.classList.add('ember-legacy-key-card'); c.setAttribute('aria-hidden','true'); } });
    function open(provider) {
      if (W.EmberHub && W.EmberHub.section) W.EmberHub.section('engine');
      if (provider && P.CFG[provider]) $('ekmProvider').value = provider;
      tier(); paint();
      requestAnimationFrame(() => { try { card.scrollIntoView({ block:'start' }); $('ekmInput').focus({ preventScroll:true }); } catch (_) { /* focus is best effort */ } });
    }
    W.EmberKeyManager = { open, close: () => {}, isOpen: () => false, tiers: TIERS, version:'1.10.56' };
    W.EmberAppearance = {set:setTheme,get:()=>theme};
    $('ekmProvider').onchange = tier;
    $('ekmForm').addEventListener('submit', async e => {
      e.preventDefault(); if (adding) return;
      const id = $('ekmProvider').value, key = $('ekmInput').value;
      if (!P.clean(key)) { status('Paste an API key first.'); return; }
      adding = true; $('ekmAdd').disabled = true;
      try {
        const r = await P.addKey(id,key); $('ekmInput').value = '';
        status(!r.ok ? r.why === 'already added' ? 'This key is already saved.' : 'The key could not be added.' : ['groq','gemini','cohere'].includes(id) ? 'Key saved. Confirm its free/trial tier below before use.' : ['mistral','anthropic','stability'].includes(id) ? 'Key saved, but inference is blocked: no verified free API tier.' : 'Key saved. Ember will use eligible free models on your next message.');
        W.dispatchEvent(new Event('ember-names'));
      } catch (_) { status('The key could not be saved.'); }
      finally { adding=false; $('ekmAdd').disabled=false; paint(); }
    });
    function closeFreeConfirm() { pendingFree=null; $('ekmFreeConfirm').hidden=true; $('ekmFreeCheck').checked=false; $('ekmFreeAccept').disabled=true; }
    $('ekmFreeCheck').onchange=()=>{ $('ekmFreeAccept').disabled=!$('ekmFreeCheck').checked; };
    $('ekmFreeCancel').onclick=closeFreeConfirm;
    $('ekmFreeAccept').onclick=()=>{
      if (!pendingFree || !$('ekmFreeCheck').checked) return;
      const p=pendingFree, accepted=P.confirmFreeTier(p.id,p.key,true); closeFreeConfirm();
      status(accepted?'Free/trial account confirmed for this key. Only eligible free models will be used.':'Key no longer exists; nothing enabled.');
      paint(); W.dispatchEvent(new Event('ember-names'));
    };
    $('ekmList').addEventListener('click', e => {
      const free=e.target.closest('[data-ekm-free]');
      if (free) {
        const id=free.dataset.ekmFree, entry=P.entries(id)?.[Number(free.dataset.ekmIndex)]; if(!entry)return;
        if(P.freeTierConfirmed(id,entry.key)){P.confirmFreeTier(id,entry.key,false);closeFreeConfirm();status('Free-tier confirmation revoked. This key will not be used for inference.');paint();}
        else{closeFreeConfirm();pendingFree={id,key:entry.key};$('ekmFreeConfirm').hidden=false;$('ekmFreeConfirm').scrollIntoView({block:'center',behavior:'smooth'});}
        return;
      }
      const b = e.target.closest('[data-ekm-remove]'); if (!b) return;
      const id = b.dataset.ekmRemove, entry = P.entries(id)?.[Number(b.dataset.ekmIndex)];
      if (entry) { P.removeKey(id,entry.key); status(P.CFG[id].name+' key removed.'); paint(); W.dispatchEvent(new Event('ember-names')); }
    });
    W.addEventListener('ember-provider-stats',paint);
    D.addEventListener('click', e => {
      const entry = e.target.closest('[data-open-key-manager],[data-name="AI providers & API keys"]');
      if (entry) { e.preventDefault(); e.stopImmediatePropagation(); open(); }
    },true);
    // Appearance stays at the top of the Settings list. The separate "API keys" row is gone: its job is inside "AI providers & API keys".
    const menu=$('cockpitMenu') || $('cockpitSettingsMenu') || D.querySelector('#settings .cockpit-menu');
    const appearance=D.createElement('div');appearance.className='ekm-appearance';appearance.innerHTML='<label for="emberAppearanceSelect">Appearance</label><select id="emberAppearanceSelect" data-ember-appearance><option value="dark">Dark</option><option value="light">Light</option><option value="system">Use device setting</option></select>';
    if (menu) {
      menu.prepend(appearance);
      const routing=menu.querySelector('[data-crow="keys"]'); if(routing){routing.querySelector('b').textContent='AI providers & API keys';routing.querySelector('small').textContent='Add keys, choose which engine answers, routing and fallback, all in one place';}
    } else { const sb=$('settings')?.querySelector('.sb'); if(sb)sb.prepend(appearance); }
    $('emberAppearanceSelect')?.addEventListener('change',e=>setTheme(e.target.value)); setTheme(theme);
    if (P.CFG.groq) $('ekmProvider').value = 'groq';
    tier(); paint();
  }
  if (D.readyState==='loading') D.addEventListener('DOMContentLoaded',boot); else boot();
})();
