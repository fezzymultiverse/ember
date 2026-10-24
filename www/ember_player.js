// Ember V1.6.5 - ember_player.js: the music engine. No bridge, no other app. Ember plays your music itself.
// Local library (uploaded files + phone scan) lives in IndexedDB. Spotify is handled by ember_spotify.js and merged here
// so everything else (panel, widget, the AI) talks to ONE object: window.EmberPlayer.
'use strict';
(() => {
const DB_NAME = 'ember_music', EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba|webm|mp4|3gp|amr|wma)$/i;
const PL_KEY = 'ember_playlists';
let db = null;
const mem = { tracks: new Map(), blobs: new Map() };
let lib = [];                       // track records (no audio data), sorted by title
let queue = [], qi = -1;            // queue of local track ids, index into it
let shuffle = false, repeat = false;
let active = 'local';               // which source last started playing: local | spotify
let loadToken = 0;
const devCache = [];                // small LRU of device-track blobs: [{id, blob}]
const subs = new Set();
const audio = new Audio(); audio.preload = 'auto';
let curUrl = null, cur = null;      // object URL + record currently loaded into the audio element
let lastErr = '';

// ---------- tiny IndexedDB wrapper (own database, never touches the chat store) ----------
const open = () => new Promise(res => {
  try {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('tracks')) d.createObjectStore('tracks', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null);
  } catch (e) { res(null); }
});
const rq = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const store = (n, m) => db.transaction(n, m || 'readonly').objectStore(n);
async function dbAll(n) { if (!db) return [...mem[n].values()]; try { return await rq(store(n).getAll()); } catch (e) { return [...mem[n].values()]; } }
async function dbPut(n, v) { mem[n].set(v.id, v); if (!db) return true; try { await rq(store(n, 'readwrite').put(v)); return true; } catch (e) { return false; } }
async function dbGet(n, id) { if (!db) return mem[n].get(id) || null; try { return (await rq(store(n).get(id))) || null; } catch (e) { return mem[n].get(id) || null; } }
async function dbDel(n, id) { mem[n].delete(id); if (!db) return; try { await rq(store(n, 'readwrite').delete(id)); } catch (e) { /* already gone */ } }

// ---------- playlists (ids of local tracks, in localStorage) ----------
function plLoad() { try { const a = JSON.parse(localStorage.getItem(PL_KEY) || '[]'); return Array.isArray(a) ? a.filter(p => p && p.name && Array.isArray(p.ids)) : []; } catch (e) { return []; } }
function plSave(a) { try { localStorage.setItem(PL_KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }

// ---------- helpers ----------
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
function parseName(fn) {
  const base = String(fn || '').replace(EXT, '').replace(/[_]+/g, ' ').trim();
  const m = base.match(/^(.+?)\s+-\s+(.+)$/);
  if (m) return { artist: m[1].trim(), title: m[2].trim() };
  return { artist: '', title: base || 'Untitled' };
}
const sortLib = () => lib.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
const emit = kind => { const snap = snapshot(); subs.forEach(f => { try { f(kind, snap); } catch (e) { /* a bad listener must not stop playback */ } }); };
function readDuration(blob) {
  return new Promise(res => {
    const a = new Audio(), u = URL.createObjectURL(blob); let done = false;
    const fin = v => { if (done) return; done = true; try { URL.revokeObjectURL(u); } catch (e) {} res(v); };
    a.preload = 'metadata'; a.onloadedmetadata = () => fin(isFinite(a.duration) ? Math.round(a.duration * 1000) : 0); a.onerror = () => fin(0);
    setTimeout(() => fin(0), 4000); a.src = u;
  });
}

// ---------- library ----------
async function init() {
  if (!db) db = await open();
  lib = (await dbAll('tracks')).filter(t => t && t.id); sortLib(); emit('library');
  return lib.length;
}
function list(q, limit) {
  const s = String(q || '').trim().toLowerCase();
  let a = s ? lib.filter(t => (t.title + ' ' + t.artist + ' ' + t.album).toLowerCase().includes(s)) : lib.slice();
  if (limit > 0) a = a.slice(0, limit);
  return a;
}
const get = id => lib.find(t => t.id === id) || null;
const brief = t => t ? { id: t.id, title: t.title, artist: t.artist, album: t.album, durationSec: Math.round((t.durationMs || 0) / 1000) } : null;

async function addFiles(files) {
  const out = { added: 0, skipped: 0, failed: 0 };
  for (const f of Array.from(files || [])) {
    try {
      if (!f || !((f.type && f.type.indexOf('audio/') === 0) || EXT.test(f.name || ''))) { out.failed++; continue; }
      const id = 'f_' + hash((f.name || '') + '|' + f.size + '|' + (f.lastModified || 0));
      if (get(id)) { out.skipped++; continue; }
      const n = parseName(f.name);
      const rec = { id, kind: 'file', title: n.title, artist: n.artist, album: '', durationMs: await readDuration(f), size: f.size, added: Date.now() };
      const okB = await dbPut('blobs', { id, blob: f, type: f.type || '' });
      const okT = await dbPut('tracks', rec);
      if (!okB || !okT) { out.failed++; continue; }
      lib.push(rec); out.added++;
    } catch (e) { out.failed++; }
  }
  sortLib(); emit('library'); return out;
}
async function remove(id) {
  const t = get(id); if (!t) return false;
  if (cur && cur.id === id) stop();
  lib = lib.filter(x => x.id !== id);
  await dbDel('tracks', id); await dbDel('blobs', id);
  const pl = plLoad().map(p => ({ name: p.name, ids: p.ids.filter(x => x !== id) })); plSave(pl);
  emit('library'); return true;
}
async function wipe() {
  stop(); lib = []; mem.tracks.clear(); mem.blobs.clear();
  if (db) { try { await rq(store('tracks', 'readwrite').clear()); await rq(store('blobs', 'readwrite').clear()); } catch (e) { /* nothing to clear */ } }
  try { localStorage.removeItem(PL_KEY); } catch (e) {}
  emit('library');
}
const deviceOk = () => !!(window.EmberNative && window.EmberNative.device);
async function scanDevice() {
  const D = deviceOk() ? window.EmberNative.device : null;
  if (!D) return { ok: false, error: 'Phone scan only works in the installed app.' };
  let granted = false;
  try { granted = await D.has(); if (!granted) granted = await D.request(); } catch (e) { return { ok: false, error: 'Could not ask for file access: ' + (e.message || e) }; }
  if (!granted) return { ok: false, error: 'File access was not granted. Allow Music and audio for Ember in the phone settings.' };
  let tracks; try { tracks = await D.list(); } catch (e) { return { ok: false, error: 'Scan failed: ' + (e.message || e) }; }
  let added = 0;
  tracks.forEach(t => {
    const id = 'd_' + t.id; if (get(id)) return;
    const rec = { id, kind: 'device', devId: String(t.id), title: t.title || 'Untitled', artist: t.artist && t.artist !== '<unknown>' ? t.artist : '', album: t.album && t.album !== '<unknown>' ? t.album : '', durationMs: +t.durationMs || 0, mime: t.mime || '', size: +t.size || 0, added: Date.now() };
    lib.push(rec); dbPut('tracks', rec); added++;
  });
  sortLib(); emit('library'); return { ok: true, found: tracks.length, added };
}

// ---------- playlists API ----------
const playlists = () => plLoad().map(p => ({ name: p.name, count: p.ids.filter(id => get(id)).length }));
function savePlaylist(name, ids) {
  const n = String(name || '').trim().slice(0, 40); if (!n) return { error: 'Playlist name is required.' };
  const good = (Array.isArray(ids) ? ids : []).map(String).filter(id => get(id));
  if (!good.length) return { error: 'None of those song ids are in the library.' };
  const a = plLoad().filter(p => p.name.toLowerCase() !== n.toLowerCase()); a.push({ name: n, ids: good });
  if (!plSave(a)) return { error: 'Could not save: storage is blocked.' };
  emit('playlists'); return { ok: true, name: n, count: good.length, skipped: (Array.isArray(ids) ? ids.length : 0) - good.length };
}
function deletePlaylist(name) { const a = plLoad(), b = a.filter(p => p.name.toLowerCase() !== String(name || '').toLowerCase()); plSave(b); emit('playlists'); return a.length !== b.length; }
function playlistIds(name) { const p = plLoad().find(x => x.name.toLowerCase() === String(name || '').toLowerCase()); return p ? p.ids.filter(id => get(id)) : null; }

// ---------- local playback ----------
function setSession(t) {
  try {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title || '', artist: t.artist || '', album: t.album || '' });
    const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) { /* action not supported here */ } };
    h('play', () => control('play')); h('pause', () => control('pause')); h('nexttrack', () => control('next')); h('previoustrack', () => control('prev'));
    h('seekto', d => { if (d && d.seekTime != null) seek(d.seekTime); });
  } catch (e) { /* lock-screen controls are a bonus */ }
}
async function blobFor(t) {
  if (t.kind === 'file') { const r = await dbGet('blobs', t.id); return r && r.blob ? r.blob : null; }
  const hit = devCache.find(x => x.id === t.id); if (hit) return hit.blob;
  const D = deviceOk() ? window.EmberNative.device : null; if (!D) return null;
  const blob = await D.read(t.devId, t.size, t.mime);
  devCache.unshift({ id: t.id, blob }); while (devCache.length > 3) devCache.pop();
  return blob;
}
async function loadAndPlay(t, autoplay) {
  const tok = ++loadToken; lastErr = '';
  let blob = null;
  try { blob = await blobFor(t); } catch (e) { lastErr = 'Could not read that file: ' + (e.message || e); }
  if (tok !== loadToken) return { ok: false, error: 'Superseded.' };
  if (!blob) { lastErr = lastErr || 'Audio data is missing for "' + t.title + '". Re-add the file.'; emit('error'); return { ok: false, error: lastErr }; }
  if (curUrl) { try { URL.revokeObjectURL(curUrl); } catch (e) {} }
  curUrl = URL.createObjectURL(blob); cur = t; audio.src = curUrl; setSession(t);
  if (autoplay) {
    try { await audio.play(); active = 'local'; } catch (e) { lastErr = 'The phone blocked or could not play that file (' + (e.name || 'error') + ').'; emit('error'); return { ok: false, error: lastErr }; }
  }
  emit('track'); return { ok: true };
}
async function pauseSpotify() { const S = window.EmberSpotify; if (S && S.isConnected()) { try { await S.control('pause'); } catch (e) { /* nothing was playing there */ } } }

async function playLocal(id, ids) {
  const t = get(id); if (!t) return { ok: false, error: 'No track with id ' + id + ' in the library.' };
  queue = (Array.isArray(ids) && ids.includes(id)) ? ids.filter(x => get(x)) : lib.map(x => x.id);
  qi = queue.indexOf(id);
  await pauseSpotify();
  return loadAndPlay(t, true);
}
async function step(dir, auto) {
  if (!queue.length) return { ok: false, error: 'Nothing queued.' };
  let n;
  if (shuffle && queue.length > 1) { do { n = Math.floor(Math.random() * queue.length); } while (n === qi); }
  else { n = qi + dir; if (n >= queue.length) { if (repeat || !auto) n = 0; else { stop(); return { ok: true, ended: true }; } } if (n < 0) n = queue.length - 1; }
  qi = n; const t = get(queue[qi]); if (!t) return { ok: false, error: 'Track no longer in the library.' };
  return loadAndPlay(t, true);
}
function stop() { loadToken++; try { audio.pause(); } catch (e) {} audio.removeAttribute('src'); try { audio.load(); } catch (e) {} if (curUrl) { try { URL.revokeObjectURL(curUrl); } catch (e) {} curUrl = null; } cur = null; emit('track'); }
function seek(sec) { if (!cur) return { ok: false, error: 'No local track loaded.' }; const d = isFinite(audio.duration) ? audio.duration : (cur.durationMs || 0) / 1000; audio.currentTime = Math.max(0, Math.min(+sec || 0, d || 0)); emit('tick'); return { ok: true }; }
audio.addEventListener('play', () => emit('state')); audio.addEventListener('pause', () => emit('state'));
audio.addEventListener('ended', () => { step(1, true); });
audio.addEventListener('loadedmetadata', () => { if (cur && isFinite(audio.duration) && !cur.durationMs) { cur.durationMs = Math.round(audio.duration * 1000); dbPut('tracks', cur); } emit('track'); });
audio.addEventListener('error', () => { if (!cur) return; lastErr = 'The phone could not decode "' + cur.title + '".'; emit('error'); });
let lastTick = 0; audio.addEventListener('timeupdate', () => { const n = Date.now(); if (n - lastTick > 900) { lastTick = n; emit('tick'); } });

// ---------- unified state ----------
const localPlaying = () => !!cur && !audio.paused && !audio.ended;
function snapshot() {
  return {
    source: 'local', active, playing: localPlaying(), loaded: !!cur, track: brief(cur),
    positionSec: cur ? Math.round(audio.currentTime || 0) : 0, volume: Math.round(audio.volume * 100), shuffle, repeat, error: lastErr, queueLength: queue.length
  };
}
// What is playing right now, from whichever source. This is what the widget, the panel and the AI all read.
async function nowPlaying() {
  const loc = snapshot();
  if (localPlaying()) return Object.assign({}, loc, { source: 'local' });
  const S = window.EmberSpotify;
  if (S && S.isConnected()) {
    const sp = await S.current();
    if (sp && !sp.error && sp.track && (sp.playing || !loc.loaded)) return Object.assign({ source: 'spotify' }, sp);
    if (sp && sp.error && !loc.loaded) return { source: 'spotify', playing: false, track: null, error: sp.error };
  }
  if (loc.loaded) return Object.assign({}, loc, { source: 'local' });
  return { source: 'none', playing: false, track: null };
}

// ---------- unified control ----------
// action: play | pause | toggle | next | prev | stop | seek | volume | shuffle | repeat
async function control(action, o) {
  o = o || {}; const S = window.EmberSpotify;
  const spOn = !!(S && S.isConnected());
  if (action === 'volume') {
    const v = Math.max(0, Math.min(100, Math.round(+o.value)));
    if (!isFinite(v)) return { ok: false, error: 'volume needs a number from 0 to 100.' };
    const wantSp = active === 'spotify' && spOn && !localPlaying();
    if (wantSp) return S.control('volume', { value: v });
    audio.volume = v / 100; emit('state'); return { ok: true, volume: v, source: 'local' };
  }
  if (action === 'shuffle') { shuffle = o.value == null ? !shuffle : !!o.value; emit('state'); return { ok: true, shuffle }; }
  if (action === 'repeat') { repeat = o.value == null ? !repeat : !!o.value; emit('state'); return { ok: true, repeat }; }
  if (action === 'play' && o.songId) return playLocal(String(o.songId), o.ids);
  const useSp = spOn && !localPlaying() && (active === 'spotify' || !cur);
  if (useSp) { const r = await S.control(action === 'toggle' ? 'toggle' : action, o); if (r && r.ok) active = 'spotify'; return r; }
  switch (action) {
    case 'play': {
      if (cur) { try { await pauseSpotify(); await audio.play(); active = 'local'; return { ok: true }; } catch (e) { return { ok: false, error: 'Could not resume (' + (e.name || 'error') + ').' }; } }
      if (lib.length) return playLocal(lib[0].id, lib.map(x => x.id));
      return { ok: false, error: 'The library is empty. Upload music in the Music panel first.' };
    }
    case 'pause': if (!cur) return { ok: false, error: 'Nothing is playing here.' }; audio.pause(); return { ok: true };
    case 'toggle': return localPlaying() ? control('pause') : control('play');
    case 'next': return step(1, false);
    case 'prev': if (audio.currentTime > 3) { audio.currentTime = 0; return { ok: true, restarted: true }; } return step(-1, false);
    case 'stop': stop(); return { ok: true };
    case 'seek': return seek(o.value);
    default: return { ok: false, error: 'Unknown action: ' + action };
  }
}
async function playPlaylist(name) {
  const ids = playlistIds(name); if (ids === null) return { ok: false, error: 'No playlist called "' + name + '".' };
  if (!ids.length) return { ok: false, error: 'That playlist has no tracks left in the library.' };
  return playLocal(ids[0], ids);
}

// ---------- what Ember can and cannot do, built from the real state (the AI is told exactly this) ----------
function capabilities() {
  const S = window.EmberSpotify, sp = !!(S && S.isConnected());
  const can = [
    'play, pause, resume, skip, go back, stop, seek, set volume, shuffle and repeat for his uploaded music (' + lib.length + ' track' + (lib.length === 1 ? '' : 's') + ' in the library)',
    'tell him what is playing right now',
    'search the library and play a track by id, make local playlists and play them (' + (playlists().map(p => p.name).join(', ') || 'none yet') + ')'
  ];
  if (sp) can.push('Spotify: see what is playing, play / pause / skip / seek / volume on his active Spotify device, search Spotify, play a track, list his playlists and make a Spotify playlist');
  const cannot = [
    'delete music or playlists, change settings, or connect / disconnect anything',
    'start, stop or change music by himself: only when his latest message asks for it',
    'hear audio or read lyrics from the player (lyrics need a web lookup)',
    'see music playing in other apps: only Ember\'s own player' + (sp ? ' and Spotify' : '') + ' are visible to you'
  ];
  if (!sp) cannot.push('use Spotify: it is not connected (he connects it in Settings > Music or the Music panel)');
  else cannot.push('control Spotify with no active device (the Spotify app must be open on a device) or without Premium');
  return { can, cannot, library: lib.length, playlists: playlists(), spotify: sp, phoneScan: deviceOk() };
}

// ---------- V1.6.5 metadata + artwork: embedded tags first, then iTunes (art/album/year), Wikipedia + TheAudioDB (about) ----------
const META_KEY = 'ember_meta', metaMem = new Map(), metaBusy = new Map(); let embUrl = null;
const mkey = (a, t) => (String(a || '') + '|' + String(t || '')).toLowerCase().replace(/\s+/g, ' ').trim();
const norm = s => String(s || '').toLowerCase().replace(/\(.*?\)|\[.*?\]|feat\.?.*$|ft\.?.*$/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const firstArtist = a => String(a || '').split(/,|&| feat\.? | ft\.? | x /i)[0].trim();
function metaLoad() { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}; } catch (e) { return {}; } }
function metaSave(k, v) {
  try {
    const o = metaLoad(); o[k] = Object.assign({}, v, { t: Date.now() }); const ks = Object.keys(o);
    if (ks.length > 150) ks.sort((a, b) => o[a].t - o[b].t).slice(0, ks.length - 150).forEach(x => delete o[x]);
    localStorage.setItem(META_KEY, JSON.stringify(o));
  } catch (e) { /* cache is a bonus */ }
}
async function jget(u, ms) {
  const c = new AbortController(), h = setTimeout(() => c.abort(), ms || 6000);
  try { const r = await fetch(u, { signal: c.signal }); return r.ok ? await r.json() : null; } catch (e) { return null; } finally { clearTimeout(h); }
}
// ID3v2 (mp3): title, artist, album, year and the embedded cover picture
async function readId3(blob) {
  try {
    const h = new Uint8Array(await blob.slice(0, 10).arrayBuffer());
    if (h[0] !== 0x49 || h[1] !== 0x44 || h[2] !== 0x33) return null;
    const ver = h[3], size = ((h[6] & 127) << 21) | ((h[7] & 127) << 14) | ((h[8] & 127) << 7) | (h[9] & 127);
    const buf = new Uint8Array(await blob.slice(10, 10 + Math.min(size, 8 * 1024 * 1024)).arrayBuffer());
    const dec = (b, enc) => {
      try {
        if (enc === 1) { const be = b[0] === 0xFE && b[1] === 0xFF; return new TextDecoder(be ? 'utf-16be' : 'utf-16le').decode(b).replace(/^\uFEFF/, '').replace(/\0/g, '').trim(); }
        return new TextDecoder(enc === 2 ? 'utf-16be' : enc === 3 ? 'utf-8' : 'iso-8859-1').decode(b).replace(/\0/g, '').trim();
      } catch (e) { return ''; }
    };
    const out = {}; let p = 0;
    while (p + 10 <= buf.length) {
      const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]); if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const fl = ver === 4 ? ((buf[p + 4] & 127) << 21) | ((buf[p + 5] & 127) << 14) | ((buf[p + 6] & 127) << 7) | (buf[p + 7] & 127) : ((buf[p + 4] << 24) | (buf[p + 5] << 16) | (buf[p + 6] << 8) | buf[p + 7]) >>> 0;
      const body = buf.subarray(p + 10, p + 10 + fl); p += 10 + fl; if (!fl) continue;
      if (id === 'TIT2') out.title = dec(body.subarray(1), body[0]);
      else if (id === 'TPE1') out.artist = dec(body.subarray(1), body[0]);
      else if (id === 'TALB') out.album = dec(body.subarray(1), body[0]);
      else if (id === 'TYER' || id === 'TDRC') out.year = dec(body.subarray(1), body[0]).slice(0, 4);
      else if (id === 'TCON') out.genre = dec(body.subarray(1), body[0]).replace(/^\(\d+\)/, '');
      else if (id === 'APIC' && !out.pic) {
        const enc = body[0]; let i = 1; while (i < body.length && body[i]) i++;
        const mime = String.fromCharCode.apply(null, body.subarray(1, i)); i += 2;
        if (enc === 1 || enc === 2) { while (i + 1 < body.length && !(body[i] === 0 && body[i + 1] === 0)) i += 2; i += 2; } else { while (i < body.length && body[i]) i++; i++; }
        if (body.length - i > 200) out.pic = new Blob([body.subarray(i)], { type: /^image\//.test(mime) ? mime : 'image/jpeg' });
      }
    }
    return out;
  } catch (e) { return null; }
}
async function wiki(q, must) {
  const r = await jget('https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=extracts&exintro=1&explaintext=1&exchars=1100&generator=search&gsrlimit=1&gsrsearch=' + encodeURIComponent(q));
  const pg = r && r.query && r.query.pages && Object.values(r.query.pages)[0];
  if (!pg || !pg.extract || pg.extract.length < 60) return '';
  const hay = norm(pg.title + ' ' + pg.extract); if (must && !hay.includes(norm(must))) return '';
  let t = pg.extract.replace(/\s+/g, ' ').trim();
  if (t.length > 1000) { const c = t.slice(0, 1000), i = c.lastIndexOf('. '); t = i > 400 ? c.slice(0, i + 1) : c + '…'; }
  return t;
}
async function fetchOnline(title, artist) {
  const out = {}, a1 = firstArtist(artist);
  const it = await jget('https://itunes.apple.com/search?media=music&entity=song&limit=6&term=' + encodeURIComponent([a1, title].filter(Boolean).join(' ')));
  const rs = (it && it.results) || [], nt = norm(title);
  const hit = rs.find(r => norm(r.trackName) && (norm(r.trackName).includes(nt) || nt.includes(norm(r.trackName))) && (!a1 || norm(r.artistName).includes(norm(a1)) || norm(a1).includes(norm(r.artistName))));
  if (hit) {
    if (hit.artworkUrl100) out.art = hit.artworkUrl100.replace(/\/\d+x\d+bb\./, '/600x600bb.');
    out.artist = hit.artistName; out.album = hit.collectionName; out.year = String(hit.releaseDate || '').slice(0, 4); out.genre = hit.primaryGenreName || '';
  }
  const name = out.artist ? firstArtist(out.artist) : a1;
  if (name) {
    const [bio, song] = await Promise.all([
      wiki(name + ' musician OR band OR singer OR rapper', name),
      title ? wiki('"' + title + '" ' + name + ' song', name) : ''
    ]);
    out.aboutArtist = bio; if (song && song !== bio) out.aboutSong = song;
    if (!bio || !out.art) {
      const d = await jget('https://www.theaudiodb.com/api/v1/json/2/search.php?s=' + encodeURIComponent(name)), ar = d && d.artists && d.artists[0];
      if (ar) { if (!bio && ar.strBiographyEN) out.aboutArtist = ar.strBiographyEN.replace(/\s+/g, ' ').slice(0, 1000); if (!out.art && ar.strArtistThumb) out.art = ar.strArtistThumb; if (!out.genre && ar.strGenre) out.genre = ar.strGenre; }
    }
  }
  return out;
}
async function embeddedFor(t) {
  const rec = get(t.id); if (!rec) return null; let blob = null;
  try { if (rec.kind === 'file') { const r = await dbGet('blobs', rec.id); blob = r && r.blob; } else { const h = devCache.find(x => x.id === rec.id); blob = h && h.blob; } } catch (e) { blob = null; }
  return blob ? readId3(blob) : null;
}
// meta(track, source) -> { art, title, artist, album, year, genre, aboutArtist, aboutSong }. Never throws; fields are '' when unknown.
function meta(t, source) {
  if (!t || !t.title) return Promise.resolve(null);
  const id = (source || '') + '|' + (t.id || '') + '|' + mkey(t.artist, t.title);
  if (metaMem.has(id)) return Promise.resolve(metaMem.get(id));
  if (metaBusy.has(id)) return metaBusy.get(id);
  const job = (async () => {
    const m = { title: t.title || '', artist: t.artist || '', album: t.album || '', year: '', genre: '', art: t.art || '', aboutArtist: '', aboutSong: '', sources: [] };
    let emb = null;
    if (source !== 'spotify' && t.id) {
      emb = await embeddedFor(t);
      if (emb) {
        ['title', 'artist', 'album', 'year', 'genre'].forEach(k => { if (emb[k] && (k === 'year' || k === 'genre' || !m[k])) m[k] = emb[k]; });
        if (emb.pic) { if (embUrl) { try { URL.revokeObjectURL(embUrl); } catch (e) {} } embUrl = URL.createObjectURL(emb.pic); m.art = embUrl; m.embedded = true; }
        m.sources.push('file tags');
        const rec = get(t.id); if (rec && ((!rec.artist && m.artist) || (!rec.album && m.album))) { rec.artist = rec.artist || m.artist; rec.album = rec.album || m.album; dbPut('tracks', rec); }
      }
    }
    const k = mkey(m.artist || t.artist, m.title || t.title), cached = metaLoad()[k];
    const on = cached || await fetchOnline(m.title || t.title, m.artist || t.artist);
    if (!cached && (on.art || on.aboutArtist || on.album)) metaSave(k, on);
    if (on.art || on.aboutArtist || on.album || on.year) m.sources.push('iTunes / Wikipedia');
    if (!m.art || (!m.embedded && !t.art)) m.art = m.art || on.art || '';
    ['album', 'year', 'genre'].forEach(f => { if (!m[f]) m[f] = on[f] || ''; });
    if (!m.artist) m.artist = on.artist || ''; m.aboutArtist = on.aboutArtist || ''; m.aboutSong = on.aboutSong || '';
    metaMem.set(id, m); if (metaMem.size > 40) metaMem.delete(metaMem.keys().next().value);
    try { if (cur && t.id === cur.id && 'mediaSession' in navigator && navigator.mediaSession.metadata && m.art && !/^blob:/.test(m.art)) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title || '', artist: m.artist || '', album: m.album || '', artwork: [{ src: m.art, sizes: '600x600' }] }); } catch (e) { /* lock-screen art is a bonus */ }
    emit('meta'); return m;
  })().finally(() => metaBusy.delete(id));
  metaBusy.set(id, job); return job;
}
const metaPeek = (t, source) => (t && metaMem.get((source || '') + '|' + (t.id || '') + '|' + mkey(t.artist, t.title))) || null;

window.EmberPlayer = {
  init, list, get, brief, addFiles, remove, wipe, scanDevice, playlists, savePlaylist, deletePlaylist, playlistIds, playPlaylist,
  playLocal, control, nowPlaying, snapshot, capabilities, seek, stop, meta, metaPeek,
  on: f => { subs.add(f); return () => subs.delete(f); },
  position: () => (cur ? audio.currentTime || 0 : 0), count: () => lib.length, deviceOk, setActive: s => { active = s === 'spotify' ? 'spotify' : 'local'; emit('state'); },
  pauseLocal: () => { try { audio.pause(); } catch (e) { /* not loaded */ } }
};
})();
