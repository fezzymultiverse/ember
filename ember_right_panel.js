/* Wire the supplied right-panel concept to existing Ember controllers. No mock tool actions. */
'use strict';
(() => {
  const W = window, D = document, $ = id => D.getElementById(id);
  function init() {
    const panel = $('emberRightPanel'); if (!panel || !W.EmberCockpit) return;
    const backdrop = $('erpBackdrop'), trigger = $('bActionMenu'), search = $('erpToolSearch');
    let lastFocus = null;
    function close(restore = true) {
      panel.hidden = true; panel.inert = true; backdrop.hidden = true;
      D.body.classList.remove('erp-open'); trigger.setAttribute('aria-expanded', 'false');
      $('app').inert = $('settings').classList.contains('show') || $('emberCommandCenter').classList.contains('ecc-open');
      if (restore && lastFocus?.isConnected && !lastFocus.closest('[hidden]')) lastFocus.focus({ preventScroll: true });
    }
    function refresh() {
      const summary = W.EmberCommandCenter.snapshot();
      $('erpActiveEngine').textContent = $('engs')?.textContent.trim() || 'Auto route';
      const live = panel.querySelector('.erp-live'); live.textContent = navigator.onLine ? 'CONNECTED' : 'OFFLINE';
      panel.querySelector('.erp-metric strong').textContent = navigator.onLine ? 'Network available' : 'Offline';
      $('erpActivityLog').textContent = W.EmberTasks.count() + ' active timers · ' + summary.lineCount + ' recent log lines\n' + ($('eccTerminalStatus')?.textContent || 'Idle') + '\nNetwork connectivity is not a provider health check.';
    }
    function open() {
      if (!panel.hidden) return close();
      lastFocus = D.activeElement;
      if ($('settings').classList.contains('show')) W.EmberCockpit.close();
      if ($('emberCommandCenter').classList.contains('ecc-open')) W.EmberCommandCenter.close();
      $('headerActionsMenu').classList.add('hidden');
      panel.hidden = false; panel.inert = false; backdrop.hidden = false;
      D.body.classList.add('erp-open'); $('app').inert = true; trigger.setAttribute('aria-expanded', 'true');
      refresh(); $('erpClose').focus({ preventScroll: true });
    }
    function invoke(object, method, ...args) {
      if (!object || typeof object[method] !== 'function') throw new Error('This module has not loaded. Reload Ember and try again.');
      return object[method](...args);
    }
    function click(id) { const b = $(id); if (!b) throw new Error('This control is not available: ' + id); b.click(); }
    function settings(section, id) { W.EmberCockpit.open(section); if (id) requestAnimationFrame(() => $(id)?.scrollIntoView({ block: 'center' })); }
    function draft(text) { const input = $('inp'); input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
    const actions = {
      'Start a conversation': () => { $('inp').focus(); },
      'Choose an AI engine': () => click('bProv'),
      'Memory & persona': () => settings('general'),
      'Create music': () => { W.EmberPlus.flip('audio_gen', true); $('inp').focus(); },
      'Write lyrics': () => { W.EmberPlus.flip('audio_gen', false); draft('Write original lyrics about '); },
      'Draft a document': () => invoke(W.EmberCreate, 'open', 'notes'),
      'Web search': () => { W.EmberPlus.flip('web', true); $('inp').focus(); },
      'Open browser': () => invoke(W.EmberBrowser, 'open'),
      'Scrape a page': () => settings('scraping', 'tUrl'),
      'Music player': () => invoke(W.EmberMusicUI, 'open'),
      'Find media': () => { invoke(W.EmberMusicUI, 'open'); $('dzQ')?.focus(); },
      'Downloads': () => settings('hacking', 'cockpitYouTube'),
      'Projects': () => { click('bHist'); D.querySelector('.dtab[data-d="projects"]')?.click(); W.EmberProjects.render(); },
      'Tasks': () => showTasks(),
      'Files & deliverables': () => invoke(W.EmberBrowser, 'open', 'docs'),
      'Device controls': () => settings('device'),
      'Terminal': () => settings('hacking', 'cockpitTermuxPanel'),
      'GitHub & integrations': () => invoke(W.EmberWorkspace, 'open', 'connect'),
      'AI providers & API keys': () => settings('engine'),
      'Permissions & privacy': () => settings('permissions'),
      'App settings': () => settings('general')
    };
    async function showTasks() {
      const box = $('erpTasks'); box.hidden = false; box.inert = false; $('app').inert = true;
      const result = await W.EmberTasks.dispatch('list_timers', {}), list = $('erpTasksList'); list.replaceChildren();
      for (const t of result.timers || []) {
        const row = D.createElement('div'), label = D.createElement('p'), button = D.createElement('button');
        label.textContent = (t.note || 'Timer') + ' · ' + t.firesAt; button.type = 'button'; button.textContent = 'Cancel timer';
        button.onclick = async () => { W.EmberTasks.setIntent('cancel timer'); const r = await W.EmberTasks.dispatch('cancel_timer', { id: t.id }); if (r.error) label.textContent = r.error; else showTasks(); };
        row.append(label, button); list.append(row);
      }
      if (!list.children.length) list.textContent = result.error || 'No active timers. Ask Ember in chat to set a timer or reminder.';
      $('erpTasksClose').focus();
    }
    function closeTasks() { $('erpTasks').hidden = true; $('erpTasks').inert = true; $('app').inert = false; trigger.focus(); }
    $('erpTasksClose').onclick = closeTasks;
    trigger.setAttribute('aria-controls', 'emberRightPanel'); trigger.setAttribute('aria-label', 'Open tools and settings panel');
    trigger.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); open(); }, true);
    backdrop.addEventListener('click', () => close()); $('erpClose').onclick = () => close();
    panel.addEventListener('click', async e => {
      e.stopPropagation(); // An outer document click must not immediately close a tool opened here.
      const h = e.target.closest('.erp-group-head');
      if (h) { const g = h.closest('.erp-group'), value = !g.classList.contains('open'); g.classList.toggle('open', value); h.setAttribute('aria-expanded', String(value)); return; }
      if (e.target.closest('#erpCcToggle')) { const value = !$('erpCc').classList.contains('expanded'); $('erpCc').classList.toggle('expanded', value); $('erpCcToggle').setAttribute('aria-expanded', String(value)); refresh(); return; }
      const cc = e.target.closest('[data-cc]');
      if (cc) { close(false); if (cc.dataset.cc === 'routing') settings('providers'); else { W.EmberWorkspace.open('build'); if (cc.dataset.cc === 'activity') { if ($('eccTerminalBody').hidden) click('eccTerminalToggle'); W.EmberCommandCenter.close(); } } return; }
      const item = e.target.closest('[data-name]'); if (!item) return;
      const fn = actions[item.dataset.name]; close(false);
      try { if (!fn) throw new Error('This tool is not wired.'); if (item.dataset.name === 'Tasks') W.EmberTasks.setIntent('list timers'); await fn(); }
      catch (error) { W.EmberCommandCenter.write({ source: 'Right panel', stream: 'stderr', text: error.message }); const t = $('toast'); t.textContent = error.message; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 4000); }
    });
    const groups = [...panel.querySelectorAll('.erp-group')];
    search.addEventListener('input', () => {
      const term = search.value.toLowerCase().trim(); let matches = 0;
      groups.forEach(g => {
        const title = g.querySelector('.erp-label').textContent.toLowerCase(), titleMatch = title.includes(term); let visible = 0;
        if (term && !g.dataset.beforeSearch) g.dataset.beforeSearch = g.classList.contains('open') ? 'open' : 'closed';
        g.querySelectorAll('[data-name]').forEach(b => { b.hidden = !!term && !titleMatch && !b.textContent.toLowerCase().includes(term); if (!b.hidden) visible++; });
        g.hidden = visible === 0; matches += visible;
        if (term) g.classList.toggle('open', visible > 0);
        else if (g.dataset.beforeSearch) { g.classList.toggle('open', g.dataset.beforeSearch === 'open'); delete g.dataset.beforeSearch; }
        g.querySelector('.erp-group-head').setAttribute('aria-expanded', String(g.classList.contains('open')));
      });
      $('erpNoResults').hidden = matches > 0;
    });
    D.addEventListener('keydown', e => {
      const taskOpen = !$('erpTasks').hidden;
      if (panel.hidden && !taskOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (taskOpen) closeTasks(); else close(); return; }
      if (e.key === 'Tab') {
        const host = taskOpen ? $('erpTasks') : panel;
        const nodes = [...host.querySelectorAll('button,input,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }, true);
    for (const event of ['ember-provider-stats', 'ember-route', 'online', 'offline']) W.addEventListener(event, () => { if (!panel.hidden) refresh(); });
    W.EmberRightPanel = Object.freeze({ open, close, isOpen: () => !panel.hidden, actions: () => Object.keys(actions) });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
