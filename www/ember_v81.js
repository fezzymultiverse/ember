// Ember V1.9.81 - ember_v81.js: the "More add-ons" sheet (Manus-style) opened from the "+" menu.
// V1.9.84: 39 tiles (Paste and Device tools left; Imagine is now Create image).
// V1.9.83: 41 tiles. Every tile is one of three honest kinds:
//   Opens   - opens a screen Ember already has (Imagine, Notes, Browser, Documents, Learn, Graph, GitHub, Termux, Projects, Saved/Share/Usage)
//   Mode    - a switch that stays on for the chat (Web Search, Reasoning, Code Mode, Device Access) through EmberPlus
//   Runs    - does one thing straight away (Spark, Go deeper)
//   Starter - drops a ready-made request into the message box (and flips the modes it needs); nothing is sent until he taps send
// Nothing here calls the network. Recent tiles are remembered in localStorage 'ember_addons_recent'.
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const menu = $('plusMenu'), plusBtn = $('bPlus'), app = $('app');
  if (!menu || !plusBtn || !app) return;
  const RKEY = 'ember_addons_recent';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = m => { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); };
  const EP = () => window.EmberPlus || null;
  const click = id => { const e = $(id); if (e) { e.click(); return true; } return false; };
  const later = (fn, ms) => setTimeout(() => { try { fn(); } catch (e) { /* screen not ready */ } }, ms);

  // ---------- put a starter request into the message box ----------
  function starter(text, modes) {
    const p = EP(); (modes || []).forEach(m => { if (p && p._set) p._set(m, true); });
    const i = $('inp'); if (!i) return toast('The message box is not on this screen.');
    i.value = (i.value ? i.value.replace(/\s+$/, '') + '\n\n' : '') + text;
    i.dispatchEvent(new Event('input', { bubbles: true })); i.style.height = 'auto'; i.style.height = Math.min(140, i.scrollHeight) + 'px';
    i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { /* not supported */ }
    toast('Finish the sentence, then send');
  }
  const open = (ok, msg) => { if (!ok) toast(msg || 'That screen is not available here.'); };

  // ---------- the tiles ----------
  // kind: open | mode | starter.  mode tiles read their state live from EmberPlus.
  const TILES = [
    { id: 'imagine', cat: 'create', icon: '🎨', tint: 'rgba(255,106,0,.18)', title: 'Create image', sub: 'Next message becomes a picture (Pollinations)', kind: 'act', run: () => { const p = EP(); if (!p || !p._set) return toast('Image mode is not available on this screen.'); p._set('image', true); const i = $('inp'); if (i) { try { i.focus(); } catch (e) { /* no focus */ } } toast('🎨 Describe the picture and send it'); } },
    { id: 'notes', cat: 'create', icon: '📝', tint: 'rgba(255,180,32,.16)', title: 'Notes', sub: 'Quick notes Ember can read', kind: 'open', run: () => open(window.EmberCreate && (window.EmberCreate.open('notes'), true)) },
    { id: 'pdf', cat: 'create', icon: '📄', tint: 'rgba(255,59,48,.16)', title: 'Make a PDF', sub: 'Report or guide as a real PDF file', kind: 'starter', run: () => starter('Write this as a PDF document (use headings and short paragraphs): ') },
    { id: 'page', cat: 'create', icon: '🌐', tint: 'rgba(59,158,255,.16)', title: 'Build a page', sub: 'Single-file HTML page you can preview', kind: 'starter', run: () => starter('Build a single-file HTML page, mobile first, for: ') },
    { id: 'slides', cat: 'create', icon: '🖼', tint: 'rgba(157,0,255,.16)', title: 'Slide deck', sub: 'One slide per idea, as an HTML artifact', kind: 'starter', run: () => starter('Make a slide deck as an HTML artifact, one slide per idea, with big text, about: ') },

    { id: 'web', cat: 'research', icon: '🔎', tint: 'rgba(59,158,255,.16)', title: 'Web Search', sub: 'Search live before answering', kind: 'mode', mode: 'web' },
    { id: 'wide', cat: 'research', icon: '🧭', tint: 'rgba(46,232,107,.15)', title: 'Wide Research', sub: 'Several sources, compared, named', kind: 'starter', run: () => starter('Wide research: search at least five different sources, compare what they say, name each source, and finish with a short verdict on: ', ['web', 'reason']) },
    { id: 'learn', cat: 'research', icon: '📚', tint: 'rgba(255,180,32,.16)', title: 'Learn', sub: 'Teach Ember from links and documents', kind: 'open', run: () => open(click('bLearn')) },
    { id: 'graph', cat: 'research', icon: '🕸', tint: 'rgba(157,0,255,.16)', title: 'Knowledge Graph', sub: 'Map documents, memory and chats', kind: 'open', run: () => open(click('bGraph')) },
    { id: 'browser', cat: 'research', icon: '🧷', tint: 'rgba(59,158,255,.16)', title: 'Browser', sub: 'Clean reader view you can browse', kind: 'open', run: () => open(window.EmberBrowser && (window.EmberBrowser.open(), true)) },

    { id: 'docs', cat: 'connect', icon: '📎', tint: 'rgba(255,106,0,.18)', title: 'Documents', sub: 'Attach a file or note', kind: 'open', run: () => open(click('bDocsQuick')) },
    { id: 'github', cat: 'connect', icon: '🐙', tint: 'rgba(255,255,255,.10)', title: 'GitHub Hub', sub: 'Repo slots, sync, files, activity', kind: 'open', run: () => { open(click('bSet')); later(() => { const t = document.querySelector('#stabs [data-st="github"]'); if (t) t.click(); }, 160); } },
    { id: 'termux', cat: 'connect', icon: '⌨️', tint: 'rgba(46,232,107,.15)', title: 'Termux', sub: 'Run commands from the chat', kind: 'open', run: () => open(click('bTermux')) },

    { id: 'timer', cat: 'automate', icon: '⏰', tint: 'rgba(255,180,32,.16)', title: 'Timer / Reminder', sub: 'Ember sets it while the app runs', kind: 'starter', run: () => starter('Remind me in 20 minutes to ') },
    { id: 'projects', cat: 'automate', icon: '📁', tint: 'rgba(255,106,0,.18)', title: 'Projects', sub: 'Keep a goal and repo in every message', kind: 'open', run: () => { open(click('bHist')); later(() => { const t = document.querySelector('.dtab[data-d="projects"]'); if (t) t.click(); }, 160); } },
    { id: 'song', cat: 'automate', icon: '🎵', tint: 'rgba(157,0,255,.16)', title: 'Identify a song', sub: 'Listen for 10 seconds', kind: 'open', run: () => open(EP() && EP()._fire && (EP()._fire('audio'), true)) },
    { id: 'saved', cat: 'automate', icon: '⭐', tint: 'rgba(255,180,32,.16)', title: 'Saved, Share, Usage', sub: 'Saved replies, share chat, stats', kind: 'open', run: () => open(window.EmberExtras && (window.EmberExtras.open('saved'), true)) },

    // ---- V1.9.83: more add-ons ----
    { id: 'translate', cat: 'create', icon: '🌍', tint: 'rgba(59,158,255,.16)', title: 'Translate', sub: 'Into any language, tone kept', kind: 'starter', run: () => starter('Translate this into English (keep the tone and slang, no explanations): ') },
    { id: 'polish', cat: 'create', icon: '✍️', tint: 'rgba(255,180,32,.16)', title: 'Rewrite / Polish', sub: 'Tighten text, keep your voice', kind: 'starter', run: () => starter('Rewrite this tighter and cleaner, keep my voice, change nothing about the meaning: ') },
    { id: 'script', cat: 'create', icon: '🐚', tint: 'rgba(46,232,107,.15)', title: 'Termux script', sub: 'Pure Bash, complete and runnable', kind: 'starter', run: () => starter('Write a complete pure Bash script for Termux (no truncation) that does this: ', ['code']) },
    { id: 'summary', cat: 'create', icon: '🗒', tint: 'rgba(157,0,255,.16)', title: 'Summarise', sub: 'Short version of pasted text', kind: 'starter', run: () => starter('Summarise this in 5 bullets, then one line on what to do next: ') },
    { id: 'email', cat: 'create', icon: '✉️', tint: 'rgba(255,106,0,.18)', title: 'Draft a message', sub: 'Email, DM or text, ready to send', kind: 'starter', run: () => starter('Draft a message (short, direct, no filler) to: ') },

    { id: 'factcheck', cat: 'research', icon: '✅', tint: 'rgba(46,232,107,.15)', title: 'Fact-check', sub: 'Search first, then say what holds', kind: 'starter', run: () => starter('Fact-check this: search first, name the sources, and say what holds up and what does not: ', ['web']) },
    { id: 'compare', cat: 'research', icon: '⚖️', tint: 'rgba(255,180,32,.16)', title: 'Compare', sub: 'Side by side, then a pick', kind: 'starter', run: () => starter('Compare these side by side in a table, then tell me which one you would pick and why: ', ['reason']) },
    { id: 'explain', cat: 'research', icon: '💡', tint: 'rgba(59,158,255,.16)', title: 'Explain simply', sub: 'Plain words, one example', kind: 'starter', run: () => starter('Explain this in plain words with one real example, as if I am smart but new to it: ') },
    { id: 'readlink', cat: 'research', icon: '🔗', tint: 'rgba(157,0,255,.16)', title: 'Read a link', sub: 'Scrape a page and summarise it', kind: 'starter', run: () => starter('Read this page and give me the key points: ') },
    { id: 'deeper', cat: 'research', icon: '🧬', tint: 'rgba(255,106,0,.18)', title: 'Go deeper', sub: 'Expand on the last reply now', kind: 'act', run: () => open(click('bDeep')) },

    { id: 'music', cat: 'connect', icon: '🎧', tint: 'rgba(157,0,255,.16)', title: 'Music Console', sub: 'Player, library, downloads, lyrics', kind: 'open', run: () => open(window.EmberMusicUI && (window.EmberMusicUI.open(), true)) },
    { id: 'sites', cat: 'connect', icon: '🔖', tint: 'rgba(255,180,32,.16)', title: 'Saved Sites', sub: 'Shortcuts the AI can read', kind: 'open', run: () => { open(click('bHist')); later(() => click('bSitesOpen'), 160); } },
    { id: 'keys', cat: 'connect', icon: '🔑', tint: 'rgba(255,180,32,.16)', title: 'Keys', sub: 'Engine keys and which one answers', kind: 'open', run: () => { open(click('bSet')); later(() => { const t = document.querySelector('#stabs [data-st="keys"]'); if (t) t.click(); }, 160); } },
    { id: 'scrape', cat: 'connect', icon: '🕷', tint: 'rgba(59,158,255,.16)', title: 'Scraping', sub: 'Scraper keys and health', kind: 'open', run: () => { open(click('bSet')); later(() => { const t = document.querySelector('#stabs [data-st="scraping"]'); if (t) t.click(); }, 160); } },
    { id: 'perms', cat: 'connect', icon: '🛡', tint: 'rgba(46,232,107,.15)', title: 'Permissions', sub: 'Notifications, mic, battery, files', kind: 'open', run: () => { open(click('bSet')); later(() => { const t = document.querySelector('#stabs [data-st="permissions"]'); if (t) t.click(); }, 160); } },
    { id: 'upload', cat: 'connect', icon: '📤', tint: 'rgba(255,106,0,.18)', title: 'Upload a file', sub: 'Image, text or audio into the box', kind: 'open', run: () => open(EP() && EP()._fire && (EP()._fire('upload'), true)) },
    { id: 'camera', cat: 'connect', icon: '📸', tint: 'rgba(255,59,48,.16)', title: 'Camera / Vision', sub: 'Snap a photo, read the text', kind: 'open', run: () => open(EP() && EP()._fire && (EP()._fire('camera'), true)) },

    { id: 'plan', cat: 'automate', icon: '🗓', tint: 'rgba(46,232,107,.15)', title: 'Plan my day', sub: 'Time-boxed plan from your list', kind: 'starter', run: () => starter('Turn this into a time-boxed plan for today, most important first, with one thing to skip if I run out of time: ') },
    { id: 'checklist', cat: 'automate', icon: '☑️', tint: 'rgba(59,158,255,.16)', title: 'Checklist', sub: 'Break a goal into steps', kind: 'starter', run: () => starter('Break this goal into a short checklist of concrete steps, in order: ') },
    { id: 'recentchats', cat: 'automate', icon: '🕘', tint: 'rgba(255,180,32,.16)', title: 'Recent chats', sub: 'Search, rename, delete', kind: 'open', run: () => { open(click('bHist')); later(() => click('hHead'), 160); } },
    { id: 'share', cat: 'automate', icon: '📤', tint: 'rgba(157,0,255,.16)', title: 'Share this chat', sub: 'Clean Markdown, copy or share', kind: 'open', run: () => open(window.EmberExtras && (window.EmberExtras.open('share'), true)) },
    { id: 'usage', cat: 'automate', icon: '📊', tint: 'rgba(59,158,255,.16)', title: 'Usage', sub: 'Replies per engine, speed', kind: 'open', run: () => open(window.EmberExtras && (window.EmberExtras.open('usage'), true)) },

    { id: 'spark', cat: 'create', icon: '✨', tint: 'rgba(255,180,32,.16)', title: 'Spark', sub: 'Ember starts something, no topic', kind: 'act', run: () => open(click('bSpark')) },
    { id: 'priv', cat: 'modes', icon: '🔒', tint: 'rgba(255,59,48,.16)', title: 'Private chat', sub: 'This chat is not saved', kind: 'mode', btn: 'bPriv' },

    { id: 'reason', cat: 'modes', icon: '🧠', tint: 'rgba(157,0,255,.16)', title: 'Reasoning', sub: 'Step by step, checked once', kind: 'mode', mode: 'reason' },
    { id: 'code', cat: 'modes', icon: '💻', tint: 'rgba(46,232,107,.15)', title: 'Code Mode', sub: 'Working code first', kind: 'mode', mode: 'code' },
    { id: 'dev', cat: 'modes', icon: '📱', tint: 'rgba(255,106,0,.18)', title: 'Device Access', sub: 'Documents tools and Termux panel', kind: 'mode', mode: 'device' }
  ];
  const CATS = [['all', 'All'], ['create', 'Create'], ['research', 'Research'], ['connect', 'Connect'], ['automate', 'Automate'], ['modes', 'Modes']];
  const NAMES = { create: 'Create', research: 'Research', connect: 'Connect', automate: 'Automate', modes: 'Modes' };
  const byId = id => TILES.find(t => t.id === id);
  const isOn = t => t.btn ? !!($(t.btn) && $(t.btn).classList.contains('on')) : !!(EP() && EP().isOn(t.mode));

  // ---------- recent ----------
  const recent = () => { try { const r = JSON.parse(localStorage.getItem(RKEY) || '[]'); return Array.isArray(r) ? r.filter(id => byId(id)) : []; } catch (e) { return []; } };
  const remember = id => { try { localStorage.setItem(RKEY, JSON.stringify([id].concat(recent().filter(x => x !== id)).slice(0, 4))); } catch (e) { /* storage blocked */ } };

  // ---------- sheet ----------
  const sheet = document.createElement('section'); sheet.id = 'xaddons'; sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'More add-ons');
  sheet.innerHTML = '<div class="sh"><b>Add-ons</b><button class="hb" id="xaX" aria-label="Close">✕</button></div>'
    + '<div class="xa-body"><input type="search" class="xa-search" id="xaQ" placeholder="Search add-ons…" autocomplete="off" spellcheck="false" aria-label="Search add-ons">'
    + '<div class="xa-cats" id="xaCats" role="tablist"></div><div id="xaList"></div>'
    + '<p class="xa-foot">Opens = a screen Ember already has. Runs = does one thing now. Mode = a switch that stays on for this chat. Starter = a ready request dropped into the message box; nothing is sent until you tap send.</p></div>';
  app.parentNode.appendChild(sheet);
  let cat = 'all', q = '';

  function tileHtml(t) {
    const on = t.kind === 'mode' && isOn(t);
    const badge = t.kind === 'mode' ? '<span class="xa-k' + (on ? ' on' : '') + '">' + (on ? 'On' : 'Off') + '</span>' : '<span class="xa-k">' + (t.kind === 'open' ? 'Opens' : t.kind === 'act' ? 'Runs' : 'Starter') + '</span>';
    return '<button class="xa-tile' + (on ? ' on' : '') + '" data-id="' + t.id + '" style="--t1:' + t.tint + '"' + (t.kind === 'mode' ? ' role="switch" aria-checked="' + (on ? 'true' : 'false') + '"' : '') + '>'
      + badge + '<span class="xa-ic" aria-hidden="true">' + t.icon + '</span><span class="xa-t">' + esc(t.title) + '</span><span class="xa-s">' + esc(t.sub) + '</span></button>';
  }
  function paint() {
    const s = q.trim().toLowerCase();
    $('xaCats').innerHTML = CATS.map(c => '<button class="xa-cat' + (cat === c[0] ? ' on' : '') + '" data-c="' + c[0] + '" role="tab" aria-selected="' + (cat === c[0]) + '">' + c[1] + '</button>').join('');
    let list = TILES.filter(t => (cat === 'all' || t.cat === cat) && (!s || (t.title + ' ' + t.sub + ' ' + NAMES[t.cat] + ' ' + t.kind).toLowerCase().includes(s)));
    let h = '';
    const rec = !s && cat === 'all' ? recent().map(byId) : [];
    if (rec.length) h += '<div class="xa-h">Recent</div><div class="xa-grid">' + rec.map(tileHtml).join('') + '</div>';
    if (!list.length) h += '<div class="xa-empty">No add-on matches that.</div>';
    else if (cat === 'all' && !s) Object.keys(NAMES).forEach(k => { const g = list.filter(t => t.cat === k); if (g.length) h += '<div class="xa-h">' + NAMES[k] + '</div><div class="xa-grid">' + g.map(tileHtml).join('') + '</div>'; });
    else h += '<div class="xa-grid" style="margin-top:12px">' + list.map(tileHtml).join('') + '</div>';
    $('xaList').innerHTML = h;
  }
  function show(v) {
    sheet.classList.toggle('show', !!v);
    if (v) { q = ''; cat = 'all'; $('xaQ').value = ''; paint(); const b = sheet.querySelector('.xa-body'); if (b) b.scrollTop = 0; }
  }
  $('xaX').onclick = () => show(false);
  $('xaQ').addEventListener('input', e => { q = e.target.value || ''; paint(); });
  $('xaCats').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; paint(); });
  $('xaList').addEventListener('click', e => {
    const b = e.target.closest('[data-id]'); if (!b) return; const t = byId(b.dataset.id); if (!t) return;
    if (t.kind === 'mode' && t.btn) { if (!click(t.btn)) return toast('That switch is not on this screen.'); later(() => { paint(); toast((isOn(t) ? '✔ ' : '✖ ') + t.title + (isOn(t) ? ' on' : ' off')); }, 120); return; }
    if (t.kind === 'mode') { const p = EP(); if (!p || !p._set) return toast('Modes are not available on this screen.'); const v = !p.isOn(t.mode); p._set(t.mode, v); paint(); toast((v ? '✔ ' : '✖ ') + t.title + (v ? ' on' : ' off')); return; }
    remember(t.id); show(false); later(() => t.run(), 60);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('show')) show(false); });

  // ---------- the row at the top of the "+" menu ----------
  function ensureRow() {
    if (menu.querySelector('[data-more]')) return;
    const b = document.createElement('button'); b.className = 'pm-i pm-more'; b.setAttribute('data-more', '1'); b.setAttribute('role', 'menuitem');
    b.innerHTML = '<span class="pm-ic">+</span><span class="pm-tx"><b>More add-ons</b><small>Create, research, connect, automate</small></span><span class="pm-chev">›</span>';
    menu.insertBefore(b, menu.firstChild);
  }
  ensureRow();
  plusBtn.addEventListener('click', ensureRow);
  menu.addEventListener('click', e => {
    if (!e.target.closest('[data-more]')) return;
    e.stopPropagation(); menu.classList.add('hidden'); plusBtn.classList.remove('open'); plusBtn.setAttribute('aria-expanded', 'false'); show(true);
  });
  window.addEventListener('ember-plus-changed', () => { if (sheet.classList.contains('show')) paint(); });
  window.EmberAddons = { open: () => show(true), close: () => show(false), tiles: () => TILES.map(t => ({ id: t.id, cat: t.cat, kind: t.kind, title: t.title })) };
})();
