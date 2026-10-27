// Ember V1.9.29 - ember_think_inline.js
// Live "Summary" timeline in the chat log while a run_react loop is active:
//   grey dot      = a thought
//   square icon   = a tool call, with a SUCCESS / FAILED pill when it ends
//   orange radar  = the active "Thinking..." step
// Updates on every ember-react event, collapses when the run ends (tap the header to open),
// the x dismisses it. renderLog() in app.js wipes it when the final reply renders.
'use strict';
(() => {
  const E = window.EmberEngine;
  if (!E || !E.react) return;
  const RX = E.react;
  const $ = id => document.getElementById(id);

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
  const fmt = ms => ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
  const human = t => { t = String(t || '').replace(/[_-]+/g, ' ').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Tool'; };

  const LABEL = {
    web_search: 'Searching the web', search_and_read: 'Searching and reading pages', youtube_search: 'Searching YouTube',
    youtube_download: 'Downloading audio', playlist_list: 'Listing the playlist', playlist_download: 'Downloading the playlist',
    see_image: 'Looking at the image', scrape_url: 'Reading the page', read_document: 'Reading your document',
    search_documents: 'Searching your documents', search_in_document: 'Searching your document', summarize_document: 'Summarising your document',
    get_document_outline: 'Reading the document outline', read_document_chunk: 'Reading your document', list_documents: 'Listing your documents',
    control_player: 'Controlling the player', create_playlist: 'Creating a playlist', play_playlist: 'Playing a playlist',
    get_current_track: 'Checking what is playing', get_library: 'Looking in your library', identify_song: 'Identifying the song'
  };
  const label = en => {
    const a = en.args && typeof en.args === 'object' ? en.args : {};
    const k = ['query', 'q', 'url', 'title', 'name', 'goal'].find(x => typeof a[x] === 'string' && a[x].trim());
    return (LABEL[en.tool] || human(en.tool)) + (k ? ': “' + clip(a[k], 60) + '”' : '');
  };
  const TERM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l6-6-6-6M12 19h8"/></svg>';
  const PILL = {
    done: ['SUCCESS', 'ok'], failed: ['FAILED', 'bad'], skipped: ['SKIPPED', 'warn'],
    repeat: ['REPEAT', 'warn'], blocked: ['BLOCKED', 'bad'], awaiting: ['WAITING', 'warn'], running: ['RUNNING', 'run']
  };

  let open = true, dismissedId = '', tick = 0, closeT = 0;

  const getCard = () => $('amber-think');
  const scrollDown = () => { const log = $('log'); if (log) requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); };
  const elapsed = s => fmt((s.endedAt || Date.now()) - s.startedAt);

  function metaText(s) {
    const n = s.entries.filter(e => e.type === 'step').length;
    return (n ? n + ' step' + (n !== 1 ? 's' : '') : 'Starting') + ' · ' + elapsed(s);
  }

  function dot(txt, cls) {
    return '<div class="tl-item' + (cls ? ' ' + cls : '') + '"><div class="tl-ico"><div class="tl-dot"></div></div>'
      + '<div class="tl-txt">' + esc(txt) + '</div></div>';
  }

  function action(en) {
    const p = PILL[en.status];
    const bad = en.observation && ['failed', 'repeat', 'blocked'].includes(en.status);
    return '<div class="tl-item tl-act"><div class="tl-ico"><div class="tl-tool">' + TERM_SVG + '</div></div>'
      + '<div class="tl-txt"><span class="tl-name">' + esc(label(en)) + '</span>'
      + (p ? '<span class="tl-pill tl-pill-' + p[1] + '">' + p[0] + '</span>' : '')
      + (bad ? '<div class="tl-err">' + esc(clip(en.observation, 140)) + '</div>' : '')
      + '</div></div>';
  }

  function active(label) {
    return '<div class="tl-item tl-now"><div class="tl-ico"><div class="tl-live"></div></div>'
      + '<div class="tl-txt">' + esc(label) + '<span class="tl-ell"></span></div></div>';
  }

  function buildHtml(s) {
    const running = s.status === 'running', waiting = !!s.waiting;
    let h = '<div class="tl-hdr"><h2>Summary</h2><span class="tl-meta">' + esc(metaText(s)) + '</span>'
      + (running ? '' : '<span class="tl-chev">' + (open ? '▴' : '▾') + '</span>')
      + '<button class="tl-x" aria-label="Close">&times;</button></div>';
    h += '<div class="tl-body"><div class="tl">';
    let last = null;
    s.entries.forEach(en => {
      if (en.type === 'note') { h += dot('Your note: ' + clip(en.text, 120)); return; }
      if (en.type !== 'step') return;
      last = en;
      if (en.thought) h += dot(clip(en.thought, 160));
      if (en.tool) h += action(en);
      if (en.final) h += dot(en.status === 'final' ? 'Writing the answer.' : clip(en.final, 120));
    });
    if (running) {
      if (waiting) h += '<div class="tl-item tl-now"><div class="tl-ico"><div class="tl-dot tl-dot-am"></div></div>'
        + '<div class="tl-txt tl-wait">Waiting for your approval</div></div>';
      else h += active(last && last.status === 'running' ? (LABEL[last.tool] || human(last.tool)) : last && last.final ? 'Synthesizing final answer' : s.entries.length ? 'Thinking' : 'Starting');
    } else if (s.status !== 'done') {
      h += dot(s.status === 'stopped' ? 'Stopped.' : 'Ended without an answer.', 'tl-end-bad');
    }
    return h + '</div></div>';
  }

  function render() {
    const log = $('log'); if (!log) return;
    const s = RX.state(), ex = getCard();
    if (!s || !['running', 'done', 'stopped', 'failed'].includes(s.status) || s.id === dismissedId) { if (ex) ex.remove(); return; }
    if (!ex || ex.dataset.run !== s.id) { open = true; if (ex) ex.remove(); }
    const html = buildHtml(s);
    let card = getCard();
    if (!card) {
      card = document.createElement('div');
      card.id = 'amber-think'; card.dataset.run = s.id;
      card.className = 'msg a tl-card';
      const typ = $('typ');
      if (typ) typ.insertAdjacentElement('beforebegin', card); else log.appendChild(card);
    }
    card.innerHTML = html;
    card.classList.toggle('tl-open', open || s.status === 'running');
    card.classList.toggle('tl-run', s.status === 'running');
    scrollDown();
  }

  // header tap = expand/collapse (after the run ends), x = dismiss this run's card
  document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    const card = t.closest('#amber-think'); if (!card) return;
    const s = RX.state();
    if (t.closest('.tl-x')) { if (s) dismissedId = s.id; card.remove(); return; }
    if (t.closest('.tl-hdr') && s && s.status !== 'running') {
      open = !open; card.classList.toggle('tl-open', open);
      const c = card.querySelector('.tl-chev'); if (c) c.textContent = open ? '▴' : '▾';
    }
  });

  // keep the elapsed time moving while a run is active (touches only the meta text)
  function ticker() {
    const s = RX.state();
    if (s && s.status === 'running') {
      if (!tick) tick = setInterval(() => {
        const st = RX.state(), m = getCard() && getCard().querySelector('.tl-meta');
        if (!st || st.status !== 'running') { clearInterval(tick); tick = 0; return; }
        if (m) m.textContent = metaText(st);
      }, 1000);
    } else if (tick) { clearInterval(tick); tick = 0; }
  }

  window.addEventListener('ember-react', e => {
    const t = (e.detail || {}).type;
    if (!['start', 'thought', 'acting', 'obs', 'final', 'end', 'wait', 'resume', 'stopping', 'note'].includes(t)) return;
    if (t === 'start') { clearTimeout(closeT); open = true; }
    render(); ticker();
    if (t === 'end') { clearTimeout(closeT); closeT = setTimeout(() => { open = false; const c = getCard(); if (c) { c.classList.remove('tl-open'); const ch = c.querySelector('.tl-chev'); if (ch) ch.textContent = '▾'; } }, 1800); }
  });

  window.EmberThinkInline = { _build: buildHtml, _render: render };
})();
