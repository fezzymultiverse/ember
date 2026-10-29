/* Right-panel bridge. The visible panel lives in the workspace shell and drives these screens. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const embedded = window.parent && window.parent !== window;
  const log = [];

  function post(event, payload) {
    if (!embedded) return;
    try { window.parent.postMessage({ type: 'ember-nav', event, payload: payload || null }, location.origin); } catch (_) { /* shell not listening */ }
  }

  function engineLabel() {
    const sel = $('engPin');
    if (!sel || !sel.value) return 'Auto route';
    const text = (sel.selectedOptions[0] && sel.selectedOptions[0].textContent) || sel.value;
    return text.replace(/^[^A-Za-z0-9]+/, '').trim() || 'Auto route';
  }

  function metrics() {
    return { online: navigator.onLine, engine: engineLabel(), lines: log.slice(0, 4) };
  }

  function pushLog(text) {
    const line = new Date().toLocaleTimeString([], { hour12: false }) + '  ' + String(text || '').slice(0, 180);
    log.unshift(line);
    if (log.length > 8) log.pop();
    post('metrics', metrics());
  }

  function note(text) {
    const r = $('selectionResult');
    if (r) r.textContent = text;
    const t = $('toast');
    if (t) {
      t.textContent = text;
      t.classList.add('show');
      clearTimeout(note._t);
      note._t = setTimeout(() => t.classList.remove('show'), 2400);
    }
    post('result', { text });
    pushLog(text);
  }

  function openSettings(section) {
    if (window.EmberHub && window.EmberHub.section) window.EmberHub.section(section);
    else if (window.EmberCockpit && window.EmberCockpit.open) window.EmberCockpit.open(section);
    else if ($('bSet')) $('bSet').click();
  }

  function openMusic(tab) {
    if (window.EmberMusicUI && window.EmberMusicUI.open) window.EmberMusicUI.open();
    else if ($('music')) $('music').classList.add('show');
    if (tab) {
      const b = document.querySelector('.mtab[data-m="' + tab + '"]');
      if (b) b.click();
    }
  }

  function closeChatBlockers() {
    if ($('settings') && $('settings').classList.contains('show') && $('bSx')) $('bSx').click();
    ['browser', 'music', 'device', 'react', 'graph', 'chats', 'nine'].forEach(id => {
      const el = $(id);
      if (el && el.classList.contains('show')) el.classList.remove('show');
    });
    const created = $('xcreate');
    if (created) created.classList.remove('show');
    if (window.EmberCommandCenter && window.EmberCommandCenter.close) window.EmberCommandCenter.close();
  }

  function engines() {
    const P = window.Prov;
    const list = [
      { id: '', name: 'Auto route', hint: 'Fastest working key, then the rest' },
      { id: 'pollinations', name: 'Pollinations', hint: 'Free · no key' }
    ];
    if (P && P.CFG) {
      (P.ACTIVE_IDS || P.IDS || []).forEach(id => {
        if (!P.CFG[id]) return;
        const state = P.stateOf ? P.stateOf(id) : '';
        list.push({ id, name: P.CFG[id].name, hint: state || P.CFG[id].status || 'saved on this phone' });
      });
    }
    let freePoll = false;
    try { freePoll = JSON.parse(localStorage.getItem('ember_cockpit_pollinations') || 'false') === true; } catch (_) { freePoll = false; }
    const pinned = freePoll ? 'pollinations' : ((P && P.getPinned && P.getPinned()) || '');
    return { list, pinned };
  }

  function pin(id) {
    const sel = $('engPin');
    if (sel) {
      if (![...sel.options].some(o => o.value === id)) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id || 'Auto route';
        sel.append(option);
      }
      sel.value = id;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (window.Prov && window.Prov.setPinned) {
      window.Prov.setPinned(id || null);
    }
    const label = id ? engineLabel() : 'Auto route';
    note(id ? 'Engine set to ' + label + '.' : 'Engine routing is back on auto.');
    const data = engines();
    post('engines', data);
    return data;
  }

  function timers() {
    let rows = [];
    try { rows = JSON.parse(localStorage.getItem('ember_timers') || '[]'); } catch (_) { rows = []; }
    if (!Array.isArray(rows)) return [];
    return rows.filter(t => t && t.id).map(t => ({
      id: String(t.id),
      note: t.note || 'Reminder',
      fires: new Date(t.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  }

  function ask(text) {
    const inp = $('inp');
    if (!inp) { note('Message box is not ready yet.'); return; }
    const clean = String(text || '').trim().slice(0, 2000);
    if (!clean) { note('Write something first.'); return; }
    closeChatBlockers();
    inp.value = clean;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    if ($('bSend')) $('bSend').click();
    note('Sent to Ember.');
  }

  function githubTab(tab) {
    return tab === 'connect' || tab === 'build' || tab === 'repos' ? tab : 'repos';
  }

  function activate(action, payload) {
    payload = payload && typeof payload === 'object' ? payload : {};
    try {
      switch (action) {
        case 'start':
          closeChatBlockers();
          if ($('bNew')) $('bNew').click();
          if ($('inp')) $('inp').focus();
          note('New conversation ready.');
          break;
        case 'engines':
          post('engines', engines());
          note('Pick an engine. Auto tries the fastest working key.');
          break;
        case 'pin':
          pin(String(payload.id || ''));
          break;
        case 'memory':
          openSettings('general');
          note('Memory and persona are open.');
          break;
        case 'music-panel': {
          const tab = payload.tab === 'get' || payload.tab === 'lib' || payload.tab === 'ai' ? payload.tab : 'lib';
          openMusic(tab);
          note(tab === 'get' ? 'Find media is open.' : tab === 'ai' ? 'Music studio is open.' : 'Music player is open.');
          break;
        }
        case 'ask':
          ask(payload.text);
          break;
        case 'docs':
          if (window.EmberBrowser && window.EmberBrowser.open) window.EmberBrowser.open('docs');
          else if ($('bDocsQuick')) $('bDocsQuick').click();
          if (payload.fresh) setTimeout(() => { if ($('dcNew')) $('dcNew').click(); }, 140);
          note(payload.fresh ? 'A new document is open.' : 'Files and documents are open.');
          break;
        case 'browser':
          if (window.EmberBrowser && window.EmberBrowser.open) window.EmberBrowser.open('web');
          else if ($('bGlobe')) $('bGlobe').click();
          if (payload.q && window.EmberBrowser && window.EmberBrowser.go) window.EmberBrowser.go(String(payload.q).slice(0, 300));
          note(payload.q ? 'Searching for “' + String(payload.q).slice(0, 80) + '”.' : 'Browser is open.');
          break;
        case 'scrape':
          if (payload.url) {
            if (window.EmberBrowser && window.EmberBrowser.open) window.EmberBrowser.open('web');
            if (window.EmberBrowser && window.EmberBrowser.go) window.EmberBrowser.go(String(payload.url).slice(0, 500));
            note('Reading that page.');
          } else {
            openSettings('scraping');
            note('Web scraping tools are open.');
          }
          break;
        case 'downloads':
          openMusic('get');
          setTimeout(() => { if ($('gtJobs')) $('gtJobs').scrollIntoView({ block: 'center' }); }, 90);
          note('Downloads are open.');
          break;
        case 'projects':
          if ($('bHist')) $('bHist').click();
          setTimeout(() => {
            const tab = document.querySelector('.dtab[data-d="projects"]');
            if (tab) tab.click();
          }, 40);
          note('Projects are open.');
          break;
        case 'tasks':
          post('timers', { timers: timers() });
          note('Tasks and reminders. They fire while Ember is open.');
          break;
        case 'add-timer': {
          const minutes = Math.round(Number(payload.minutes));
          const label = String(payload.note || 'Reminder').slice(0, 160);
          if (!window.EmberTasks) { note('Timers are not loaded yet.'); break; }
          window.EmberTasks.setIntent('remind me in ' + minutes + ' minutes');
          Promise.resolve(window.EmberTasks.dispatch('set_timer', { minutes, note: label })).then(r => {
            note(r && r.error ? r.error : 'Reminder set' + (r && r.firesAt ? ' for ' + r.firesAt : '') + '.');
            post('timers', { timers: timers() });
          });
          break;
        }
        case 'cancel-timer':
          if (!window.EmberTasks) break;
          window.EmberTasks.setIntent('cancel the timer');
          Promise.resolve(window.EmberTasks.dispatch('cancel_timer', { id: String(payload.id || '') })).then(r => {
            note(r && r.error ? r.error : 'Reminder cancelled.');
            post('timers', { timers: timers() });
          });
          break;
        case 'device': {
          if ($('bDevice')) $('bDevice').click();
          const tab = payload.tab === 'priv' || payload.tab === 'about' ? payload.tab : '';
          if (tab) setTimeout(() => {
            const b = document.querySelector('.dvtab[data-dv="' + tab + '"]');
            if (b) b.click();
          }, 70);
          note(tab === 'priv' ? 'Privacy is open.' : 'Device controls are open.');
          break;
        }
        case 'terminal':
          if ($('eccTerminalBody') && $('eccTerminalBody').hidden && $('eccTerminalToggle')) $('eccTerminalToggle').click();
          if (window.EmberCommandCenter && window.EmberCommandCenter.write) {
            window.EmberCommandCenter.write({ source: 'Tools', stream: 'status', tag: 'TOOL', text: 'Terminal opened from the tools panel' });
          }
          note('Live terminal is open under the chat.');
          break;
        case 'termux':
          openSettings('hacking');
          note('Termux tools are open.');
          break;
        case 'github': {
          const tab = githubTab(payload.tab);
          if (window.EmberWorkspace && window.EmberWorkspace.open) window.EmberWorkspace.open(tab);
          else if (window.EmberCommandCenter && window.EmberCommandCenter.open) window.EmberCommandCenter.open();
          note(tab === 'connect' ? 'GitHub brain is open.' : tab === 'build' ? 'Run & Push is open.' : 'Repository search is open.');
          break;
        }
        case 'keys':
          openSettings('engine');
          note('AI providers and API keys are open.');
          break;
        case 'permissions':
          openSettings('permissions');
          note('Permissions and privacy controls are open.');
          break;
        case 'settings':
          openSettings('general');
          note('App settings are open.');
          break;
        case 'cc-activity':
          if (window.EmberCommandCenter && window.EmberCommandCenter.open) window.EmberCommandCenter.open();
          pushLog('Activity log opened');
          note('Command Centre activity is open.');
          break;
        case 'cc-routing':
          pin(($('engPin') && $('engPin').value) ? '' : 'pollinations');
          pushLog('Routing preference updated');
          break;
        case 'cc-status':
          note(navigator.onLine ? 'Workspace is online and ready.' : 'Workspace is offline.');
          break;
        case 'metrics':
          post('ready', metrics());
          post('engines', engines());
          post('timers', { timers: timers() });
          break;
        default:
          note('That tool is not available.');
      }
    } catch (_) {
      note('Could not open that yet.');
    }
  }

  function boot() {
    document.documentElement.classList.add('ember-ready');
    const emptyP = document.querySelector('#empty > p');
    if (emptyP && !$('selectionResult')) {
      emptyP.textContent = 'Choose a category from the right panel, or ask Ember directly.';
      const live = document.createElement('div');
      live.id = 'selectionResult';
      live.setAttribute('aria-live', 'polite');
      emptyP.after(live);
    }
    try {
      const host = location.hostname;
      if ((host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
      }
    } catch (_) { /* storage or sw blocked */ }
    const cc = window.EmberCommandCenter;
    if (cc && typeof cc.write === 'function' && !cc.write._navWrapped) {
      const orig = cc.write.bind(cc);
      const wrapped = data => {
        try { orig(data); } catch (_) { /* terminal optional */ }
        if (data && data.text) pushLog(String(data.text).split(/\n/)[0]);
      };
      wrapped._navWrapped = true;
      cc.write = wrapped;
    }
    window.EmberNav = { activate, engines, timers, metrics };
    window.addEventListener('message', event => {
      if (event.origin !== location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'ember-nav' || typeof data.action !== 'string') return;
      activate(data.action, data.payload || {});
    });
    window.addEventListener('online', () => post('metrics', metrics()));
    window.addEventListener('offline', () => post('metrics', metrics()));
    post('ready', metrics());
    post('engines', engines());
    post('timers', { timers: timers() });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
