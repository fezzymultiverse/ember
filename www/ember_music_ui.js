// Ember V1.5.7 - ember_music_ui.js: the Music panel, the now-playing widget above the message box, and the Spotify settings card.
// Loaded last. Talks only to EmberPlayer / EmberSpotify / EmberMusicAddon. The chat code (app.js) is not involved.
'use strict';
(() => {
const $ = id => document.getElementById(id);
const P = window.EmberPlayer, SP = window.EmberSpotify;
if (!P || !SP || !$('music')) return;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = m => { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3000); };
const fmt = s => { s = Math.max(0, Math.round(+s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const aiOn = () => { try { return !!JSON.parse(localStorage.getItem('ember_set') || '{}').musicAddon; } catch (e) { return false; } };
const panelOpen = () => $('music').classList.contains('show');

let np = { source: 'none', playing: false, track: null }, npAt = Date.now(), dragging = false, busy = false, spPlLoaded = 0;

// ---------- now playing: panel card + widget ----------
function posNow() {
  const t = np.track; if (!t) return 0;
  let p = (np.positionSec || 0) + (np.playing ? (Date.now() - npAt) / 1000 : 0);
  if (t.durationSec) p = Math.min(p, t.durationSec); return Math.max(0, p);
}
function paintPos() {
  const t = np.track, dur = t ? (t.durationSec || 0) : 0, p = posNow();
  $('npPos').textContent = fmt(p); $('npDur').textContent = dur ? fmt(dur) : '';
  if (!dragging) { $('npSeek').max = String(dur || 1); $('npSeek').value = String(p); }
  $('npSeek').disabled = !t || !dur;
}
function paint() {
  const t = np.track, playing = !!np.playing;
  $('npTitle').textContent = t ? t.title : 'Nothing playing';
  $('npSub').textContent = t ? [t.artist, t.album].filter(Boolean).join(' · ') : (P.count() ? 'Pick a song from your library.' : 'Upload music or connect Spotify.');
  $('npSrc').textContent = !t ? '' : np.source === 'spotify' ? 'Spotify' + (np.device ? ' · ' + np.device : '') : 'Ember player';
  $('npPlay').textContent = playing ? '⏸' : '▶';
  $('npErr').textContent = np.error || '';
  if (np.volume != null && document.activeElement !== $('npVol')) $('npVol').value = String(np.volume);
  $('npShuf').classList.toggle('on', !!np.shuffle); $('npRep').classList.toggle('on', !!np.repeat);
  paintPos();
  $('mw').classList.toggle('hidden', !t);
  $('mwTitle').innerHTML = (playing ? '<span class="live"></span>' : '') + esc(t ? t.title : '');
  $('mwSub').textContent = t ? [t.artist, np.source === 'spotify' ? 'Spotify' : ''].filter(Boolean).join(' · ') : '';
  $('mwPlay').textContent = playing ? '⏸' : '▶';
  document.querySelectorAll('#mList .trk').forEach(r => r.classList.toggle('on', !!(t && np.source === 'local' && r.dataset.id === t.id)));
}
async function refresh() {
  if (busy) return; busy = true;
  try { np = await P.nowPlaying(); npAt = Date.now(); } catch (e) { /* keep the last known state */ }
  busy = false; paint();
}
let deb = null; const soon = ms => { clearTimeout(deb); deb = setTimeout(refresh, ms || 80); };
async function act(a, o) {
  const r = await P.control(a, o);
  if (!r || !r.ok) toast((r && r.error) || 'That did not work.');
  soon(a === 'toggle' || a === 'next' || a === 'prev' || a === 'play' ? 500 : 150);
}

// ---------- open / close ----------
function openMusic() { renderLib(); renderPls(); renderAi(); refresh(); $('music').classList.add('show'); }
function closeMusic() { $('music').classList.remove('show'); }
$('bMusic').onclick = openMusic; $('bMx').onclick = closeMusic; $('mwOpen').onclick = openMusic;
if ($('bOpenMusic')) $('bOpenMusic').onclick = () => { $('bSx').click(); openMusic(); };

// ---------- transport ----------
$('npPlay').onclick = () => act('toggle'); $('mwPlay').onclick = () => act('toggle');
$('npNext').onclick = () => act('next'); $('mwNext').onclick = () => act('next'); $('npPrev').onclick = () => act('prev');
$('npShuf').onclick = () => act('shuffle'); $('npRep').onclick = () => act('repeat');
$('npVol').oninput = () => P.control('volume', { value: +$('npVol').value });
['pointerdown', 'touchstart', 'mousedown'].forEach(ev => $('npSeek').addEventListener(ev, () => { dragging = true; }, { passive: true }));
$('npSeek').addEventListener('input', () => { $('npPos').textContent = fmt($('npSeek').value); });
$('npSeek').addEventListener('change', () => { dragging = false; act('seek', { value: +$('npSeek').value }); });

// ---------- tabs ----------
document.querySelectorAll('.mtab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.mtab').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.mpane').forEach(x => x.classList.toggle('hidden', x.id !== 'mp_' + b.dataset.m));
  if (b.dataset.m === 'sp') renderSp(); if (b.dataset.m === 'ai') renderAi(); if (b.dataset.m === 'lib') { renderLib(); renderPls(); }
}));

// ---------- library ----------
function renderLib() {
  const a = P.list($('mQ').value), cur = np.track && np.source === 'local' ? np.track.id : '';
  $('mList').innerHTML = !P.count() ? '<p class="hint">Nothing here yet. Tap Upload music.</p>' : !a.length ? '<p class="hint">No match.</p>' :
    a.slice(0, 200).map(t => '<div class="trk' + (t.id === cur ? ' on' : '') + '" data-id="' + esc(t.id) + '"><button class="go" data-id="' + esc(t.id) + '">' + esc(t.title) + '<small>' + esc([t.artist, t.durationMs ? fmt(t.durationMs / 1000) : '', t.kind === 'device' ? 'on phone' : ''].filter(Boolean).join(' · ')) + '</small></button><button class="x" data-id="' + esc(t.id) + '" aria-label="Remove ' + esc(t.title) + '">✕</button></div>').join('') +
    (a.length > 200 ? '<p class="hint">Showing the first 200. Use search to narrow it down.</p>' : '');
}
$('mQ').addEventListener('input', renderLib);
$('mList').addEventListener('click', async e => {
  const go = e.target.closest('.go'), x = e.target.closest('.x');
  if (go) { act('play', { songId: go.dataset.id, ids: P.list($('mQ').value).map(t => t.id) }); return; }
  if (x) {
    const t = P.get(x.dataset.id); if (!t) return;
    if (!window.confirm(t.kind === 'device' ? 'Remove "' + t.title + '" from Ember? The file stays on your phone.' : 'Remove "' + t.title + '" from Ember? Its copy inside Ember is deleted.')) return;
    await P.remove(t.id); renderLib(); renderPls(); soon();
  }
});
$('mUp').onclick = () => $('mFile').click();
$('mFile').onchange = async e => {
  const files = Array.from(e.target.files || []); e.target.value = ''; if (!files.length) return;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (er) { /* the browser decides */ }
  $('mMsg').textContent = 'Adding ' + files.length + '…';
  const r = await P.addFiles(files);
  $('mMsg').textContent = 'Added ' + r.added + (r.skipped ? ', ' + r.skipped + ' already there' : '') + (r.failed ? ', ' + r.failed + ' could not be read' : '') + '.';
  renderLib(); soon();
};
if (!P.deviceOk()) { $('mScan').style.display = 'none'; } else {
  $('mScan').onclick = async () => {
    const b = $('mScan'); b.disabled = true; $('mMsg').textContent = 'Scanning the phone…';
    const r = await P.scanDevice(); b.disabled = false;
    $('mMsg').textContent = r.ok ? 'Found ' + r.found + ' song' + (r.found === 1 ? '' : 's') + ' on the phone, ' + r.added + ' new.' : r.error;
    renderLib();
  };
}

// ---------- local playlists ----------
function renderPls() {
  const a = P.playlists();
  $('mPls').innerHTML = a.length ? a.map(p => '<div class="trk"><button class="plgo" data-n="' + esc(p.name) + '">' + esc(p.name) + '<small>' + p.count + ' song' + (p.count === 1 ? '' : 's') + '</small></button><button class="x pldel" data-n="' + esc(p.name) + '" aria-label="Delete playlist ' + esc(p.name) + '">✕</button></div>').join('') : '<p class="hint">No playlists yet. Search or filter the library, type a name below and save, or ask Ember in chat.</p>';
}
$('mPls').addEventListener('click', async e => {
  const g = e.target.closest('.plgo'), d = e.target.closest('.pldel');
  if (g) { const r = await P.playPlaylist(g.dataset.n); if (!r.ok) toast(r.error); soon(500); }
  if (d && window.confirm('Delete the playlist "' + d.dataset.n + '"? The songs stay.')) { P.deletePlaylist(d.dataset.n); renderPls(); }
});
$('mPlSave').onclick = () => {
  const ids = P.list($('mQ').value).map(t => t.id), r = P.savePlaylist($('mPlName').value, ids);
  if (r.error) { toast(r.error); return; }
  $('mPlName').value = ''; renderPls(); toast('Saved "' + r.name + '" (' + r.count + ' songs)');
};

// ---------- Spotify tab ----------
function renderSp() {
  const s = SP.status();
  $('spOff').classList.toggle('hidden', s.connected); $('spOn').classList.toggle('hidden', !s.connected);
  $('spOffTxt').textContent = s.clientId ? 'Spotify is not connected yet. Open Settings, Music and tap Connect Spotify.' : 'Spotify is not set up yet. It takes a Client ID from developer.spotify.com (steps are in Settings, Music).';
  $('spWho').textContent = 'Connected' + (s.name ? ' as ' + s.name : '') + '. Playback control needs Premium and the Spotify app open on a device.';
  if (s.connected && Date.now() - spPlLoaded > 60000) loadSpPls();
}
async function loadSpPls() {
  spPlLoaded = Date.now(); $('spPls').innerHTML = '<p class="hint">Loading…</p>';
  const r = await SP.playlists();
  $('spPls').innerHTML = r.error ? '<p class="hint">' + esc(r.error) + '</p>' : r.playlists.length ? r.playlists.map(p => '<div class="trk"><button class="sppl" data-id="' + esc(p.id) + '">' + esc(p.name) + '<small>' + (p.tracks != null ? p.tracks + ' tracks' : 'playlist') + '</small></button></div>').join('') : '<p class="hint">No playlists found.</p>';
}
async function spPlay(body) {
  P.pauseLocal(); const r = await SP.control('play', body);
  if (!r.ok) { toast(r.error); return; } P.setActive('spotify'); soon(700);
}
$('spToSet').onclick = () => { closeMusic(); $('bSet').click(); setTimeout(() => { const t = document.querySelector('.stab[data-st="music"]'); if (t) t.click(); }, 80); };
$('spGo').onclick = async () => {
  const q = $('spQ').value.trim(); if (!q) return;
  $('spRes').innerHTML = '<p class="hint">Searching…</p>';
  const r = await SP.search(q, 10);
  $('spRes').innerHTML = r.error ? '<p class="hint">' + esc(r.error) + '</p>' : r.results.length ? r.results.map(t => '<div class="trk"><button class="spgo" data-id="' + esc(t.id) + '">' + esc(t.title) + '<small>' + esc(t.artist) + '</small></button></div>').join('') : '<p class="hint">Nothing found.</p>';
};
$('spQ').addEventListener('keydown', e => { if (e.key === 'Enter') $('spGo').click(); });
$('spRes').addEventListener('click', e => { const b = e.target.closest('.spgo'); if (b) spPlay({ uri: 'spotify:track:' + b.dataset.id }); });
$('spPls').addEventListener('click', e => { const b = e.target.closest('.sppl'); if (b) spPlay({ contextUri: 'spotify:playlist:' + b.dataset.id }); });

// ---------- Ember tab: what the AI may do, and what it did ----------
function renderAi() {
  const on = aiOn(), c = P.capabilities(), li = a => a.map(x => '<li>' + esc(x) + '</li>').join('');
  $('mAiSw').classList.toggle('on', on);
  $('mCan').innerHTML = on ? li(c.can) : '<li>Nothing. Music control is switched off, so Ember cannot touch the player.</li>';
  $('mCant').innerHTML = li(c.cannot);
  const lg = window.EmberMusicAddon ? window.EmberMusicAddon.log() : [];
  $('mLog').innerHTML = lg.length ? lg.map(l => '<div class="lg">' + esc(new Date(l.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) + ' · ' + esc(l.text) + '</div>').join('') : '<p class="hint">Nothing yet. Everything Ember does to the player shows up here.</p>';
}
$('mAiSw').onclick = () => { const s = $('swMusic'); if (s) s.click(); setTimeout(renderAi, 80); };
if ($('swMusic')) $('swMusic').addEventListener('click', () => setTimeout(renderAi, 80));
window.addEventListener('ember-music-ai', e => { toast(String(e.detail || '')); if (panelOpen()) renderAi(); soon(600); });

// ---------- Spotify settings card ----------
function renderSpSet() {
  const s = SP.status();
  $('spStat').textContent = s.connected ? 'Connected' + (s.name ? ' as ' + s.name : '') + '.' : s.clientId ? 'Not connected. Tap Connect Spotify.' : 'Not connected. Paste your Client ID first.';
  if (document.activeElement !== $('spClient')) $('spClient').value = SP.getClientId();
  if (document.activeElement !== $('spRedir')) $('spRedir').value = s.redirect;
  $('spDisc').disabled = !s.connected; $('spConnect').textContent = s.connected ? 'Reconnect' : 'Connect Spotify';
}
$('spClient').addEventListener('input', () => { SP.setClientId($('spClient').value); renderSpSet(); });
$('spRedir').addEventListener('input', () => { const v = $('spRedir').value.trim(); SP.setRedirect(v === SP.defaultRedirect() ? '' : v); });
$('spConnect').onclick = async () => { const r = await SP.connect(); if (!r.ok) toast(r.error); };
$('spDisc').onclick = () => { SP.disconnect(); renderSpSet(); renderSp(); soon(); toast('Spotify disconnected on this phone'); };
$('spCopy').onclick = async () => {
  const v = $('spRedir').value;
  try { await navigator.clipboard.writeText(v); toast('Copied'); } catch (e) { $('spRedir').focus(); $('spRedir').select(); toast('Select and copy the text'); }
};
window.addEventListener('ember-spotify', e => {
  const d = e.detail || {};
  if (d.type === 'connected') toast('Spotify connected' + (d.name ? ' as ' + d.name : ''));
  else if (d.type === 'failed') toast(d.error || 'Spotify sign-in failed');
  else if (d.type === 'expired') toast('Spotify sign-in expired. Reconnect in Settings, Music.');
  renderSpSet(); renderSp(); soon();
});
new MutationObserver(renderSpSet).observe($('settings'), { attributes: true, attributeFilter: ['class'] });

// ---------- live updates ----------
P.on(kind => { if (kind === 'library') { renderLib(); renderPls(); } if (kind === 'playlists') renderPls(); soon(kind === 'tick' ? 0 : 80); });
setInterval(() => { if (!document.hidden && !P.snapshot().playing) refresh(); }, 5000);
setInterval(() => { if (np.playing && !dragging && (panelOpen() || !$('mw').classList.contains('hidden'))) paintPos(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

renderSpSet();
P.init().then(() => { renderLib(); renderPls(); refresh(); });
SP.boot();
})();
