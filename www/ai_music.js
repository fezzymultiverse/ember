// Ember V1.6.5 - ai_music.js: what the AI is allowed to do with music, and the code that enforces it.
// Everything here runs on the real player (ember_player.js) and real Spotify (ember_spotify.js). No stubs, no "bridge", no simulated results.
// The AI gets exactly the tools below, told exactly what is true right now, and the code refuses anything he did not ask for.
'use strict';
(() => {
const P = () => window.EmberPlayer, SP = () => window.EmberSpotify;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n || 120);

// ---------- tool schemas (the AI only ever sees these) ----------
const LOCAL_TOOLS = [
  { name: 'get_current_track', description: 'What is playing right now: title, artist, album, year, genre, artworkUrl, an "about" text (artist bio and song background), source (ember or spotify), playing or paused, position. Use it whenever he asks what is playing, or wants to talk about the song or the artist. Base what you say on this data and say so when a field is empty.', parameters: {} },
  { name: 'get_library', description: 'Searches his uploaded music. query matches title or artist (optional), limit defaults to 20. Returns song ids to use with control_player or create_playlist.', parameters: { query: 'string?', limit: 'number?' } },
  { name: 'control_player', description: 'Controls playback. action: play | pause | toggle | next | prev | stop | seek | volume | shuffle | repeat. "play" with songId plays that library song, "play" alone resumes. seek needs value in seconds, volume needs value 0-100.', parameters: { action: 'string', songId: 'string?', value: 'number?' } },
  { name: 'play_playlist', description: 'Plays one of his local playlists by name.', parameters: { name: 'string' } },
  { name: 'create_playlist', description: 'Saves a local playlist from library song ids (from get_library).', parameters: { name: 'string', song_ids: 'string[]' } }
];
const SPOTIFY_TOOLS = [
  { name: 'search_spotify', description: 'Searches Spotify for tracks. Returns id, title, artist.', parameters: { query: 'string' } },
  { name: 'play_spotify', description: 'Plays a Spotify track by the id from search_spotify, on his active Spotify device.', parameters: { trackId: 'string' } },
  { name: 'get_spotify_playlists', description: 'Lists his Spotify playlists (id, name).', parameters: {} },
  { name: 'play_spotify_playlist', description: 'Plays one of his Spotify playlists by the id from get_spotify_playlists.', parameters: { playlistId: 'string' } },
  { name: 'create_spotify_playlist', description: 'Makes a private Spotify playlist from Spotify track ids (from search_spotify).', parameters: { name: 'string', track_ids: 'string[]' } }
];

// ---------- the hard gate: no music tool runs unless his latest message is about music ----------
const NOUNS = 'music|song|songs|track|tracks|tune|tunes|playlist|playlists|album|artist|spotify|play|playing|put on|listen|listening|lyrics|library|queue|what\'?s this|what is this|who sings|who is this';
const VERBS = 'skip|next (?:song|track|one|tune)|prev(?:ious)? (?:song|track|one)|last (?:song|track|one)|go back a (?:song|track)|rewind|replay|pause|resume|unpause|stop (?:the |this |that )?(?:music|song|track|playing|it)|turn (?:it |the music |this |that |the volume )?(?:up|down|off)|louder|quieter|volume|mute|unmute|shuffle|repeat|loop';
const INTENT = new RegExp('\\b(?:' + NOUNS + '|' + VERBS + ')\\b', 'i');
// Patterns that look like a question about Claude/the day — not a music follow-up even when short.
const NOT_FOLLOW = /\b(how (are|is|was|do|did|have)|how'?s (your|it going)|what do you think|tell me (a joke|something)|your day|you doing|you been)\b/i;
let intent = null, prevIntent = '';
// His latest message must be about music. A short follow-up ("the second one", "yes") also counts when his
// message before it was about music — but only if the current message doesn't look like a clearly unrelated question.
function setIntent(userText, prevText) { intent = String(userText == null ? '' : userText).slice(0, 2000); prevIntent = String(prevText == null ? '' : prevText).slice(0, 2000); }
const allowed = () => intent !== null && (INTENT.test(intent) || (intent.length <= 60 && !NOT_FOLLOW.test(intent) && INTENT.test(prevIntent)));

// ---------- visible record of everything the AI did to the player ----------
const LOG = [];
function note(text) {
  LOG.unshift({ t: Date.now(), text }); if (LOG.length > 15) LOG.pop();
  try { window.dispatchEvent(new CustomEvent('ember-music-ai', { detail: text })); } catch (e) { /* no listeners */ }
}

// ---------- helpers ----------
function summarize(np) {
  if (!np || !np.track) return { playing: false, track: null };
  return { source: np.source === 'local' ? 'ember' : np.source, playing: !!np.playing, title: np.track.title, artist: np.track.artist, album: np.track.album, positionSec: np.positionSec || 0, durationSec: np.track.durationSec || 0, volume: np.volume == null ? undefined : np.volume };
}
async function nowAfter(source) {
  await sleep(source === 'spotify' ? 700 : 80);
  try { return summarize(await P().nowPlaying()); } catch (e) { return undefined; }
}
const noPlayer = () => P() ? null : { error: 'The music player did not load. Reload the app.' };
const needSp = () => (SP() && SP().isConnected()) ? null : { error: 'Spotify is not connected. He connects it in Settings > Music or the Music panel.' };

// ---------- handlers ----------
async function get_current_track() {
  const np = await P().nowPlaying(), s = summarize(np), cap = P().capabilities();
  if (np && np.error && !s.title) return { playing: false, track: null, note: np.error };
  if (!s.title) return { playing: false, track: null, note: cap.spotify ? 'Nothing is playing in Ember or on Spotify.' : 'Nothing is playing in Ember. Spotify is not connected, so music playing in other apps cannot be seen.' };
  try {
    const m = await Promise.race([P().meta(np.track, np.source), sleep(5000).then(() => null)]);
    if (m) {
      s.album = s.album || m.album || undefined; s.artist = s.artist || m.artist || undefined;
      if (m.year) s.year = m.year; if (m.genre) s.genre = m.genre;
      const http = /^https?:/.test(m.art || '');
      s.artworkUrl = http ? m.art : undefined; if (m.art && !http) s.artwork = 'embedded in the file (shown in the player, no link)';
      const about = [m.aboutSong && 'SONG: ' + m.aboutSong, m.aboutArtist && 'ARTIST: ' + m.aboutArtist].filter(Boolean).join('\n');
      s.about = about ? str(about, 1600) : undefined;
      if (!about) s.note = 'No bio or song background was found online. Say so instead of guessing details.';
    } else s.note = 'Extra details (artwork, bio) are still loading or offline. Use only what is here.';
  } catch (e) { /* metadata is a bonus */ }
  return s;
}
async function get_library(a) {
  const lim = Math.max(1, Math.min(+a.limit || 20, 50)), q = str(a.query, 80), all = P().list(q);
  if (!P().count()) return { tracks: [], total: 0, note: 'The library is empty. He adds music with Upload in the Music panel.' };
  return { tracks: all.slice(0, lim).map(P().brief), total: all.length, note: all.length ? undefined : 'No match for "' + q + '".' };
}
async function control_player(a) {
  const VALID = ['play', 'pause', 'toggle', 'next', 'prev', 'stop', 'seek', 'volume', 'shuffle', 'repeat'];
  const action = str(a.action, 20).toLowerCase();
  if (!VALID.includes(action)) return { error: 'Unknown action: ' + action + '. Allowed: ' + VALID.join(', ') + '.' };
  if ((action === 'seek' || action === 'volume') && !isFinite(parseFloat(a.value))) return { error: action + ' needs a number in value.' };
  const o = { value: (action === 'shuffle' || action === 'repeat') ? (a.value == null ? undefined : !!a.value) : parseFloat(a.value) };
  if (action === 'play' && a.songId) o.songId = str(a.songId, 60);
  const r = await P().control(action, o);
  if (!r || !r.ok) return { ok: false, error: (r && r.error) || 'The player did not do that.' };
  note('Ember: ' + action + (o.songId ? ' (' + ((P().get(o.songId) || {}).title || o.songId) + ')' : '') + (o.value != null && action !== 'play' ? ' ' + o.value : ''));
  const out = { ok: true, action };
  if (['play', 'next', 'prev', 'toggle'].includes(action)) out.now = await nowAfter(r.source);
  return out;
}
async function play_playlist(a) {
  const r = await P().playPlaylist(str(a.name, 40));
  if (!r || !r.ok) return { ok: false, error: (r && r.error) || 'Could not play that playlist.' };
  note('Ember: playing playlist "' + str(a.name, 40) + '"'); return { ok: true, now: await nowAfter('local') };
}
async function create_playlist(a) {
  const ids = Array.isArray(a.song_ids) ? a.song_ids.slice(0, 200).map(x => str(x, 60)) : [];
  const r = P().savePlaylist(str(a.name, 40), ids);
  if (r.error) return { ok: false, error: r.error };
  note('Ember: saved playlist "' + r.name + '" (' + r.count + ' songs)'); return r;
}
async function search_spotify(a) { const e = needSp(); if (e) return e; return SP().search(str(a.query, 100), 8); }
async function play_spotify(a) {
  const e = needSp(); if (e) return e;
  const id = str(a.trackId, 80), uri = /^spotify:track:[A-Za-z0-9]{10,30}$/.test(id) ? id : /^[A-Za-z0-9]{10,30}$/.test(id) ? 'spotify:track:' + id : '';
  if (!uri) return { ok: false, error: 'trackId must be an id from search_spotify.' };
  P().pauseLocal(); const r = await SP().control('play', { uri });
  if (!r.ok) return r;
  P().setActive('spotify'); note('Ember: playing a Spotify track'); return { ok: true, now: await nowAfter('spotify') };
}
async function get_spotify_playlists() { const e = needSp(); if (e) return e; return SP().playlists(); }
async function play_spotify_playlist(a) {
  const e = needSp(); if (e) return e;
  const id = str(a.playlistId, 40); if (!/^[A-Za-z0-9]{10,30}$/.test(id)) return { ok: false, error: 'playlistId must be an id from get_spotify_playlists.' };
  P().pauseLocal(); const r = await SP().control('play', { contextUri: 'spotify:playlist:' + id });
  if (!r.ok) return r;
  P().setActive('spotify'); note('Ember: playing a Spotify playlist'); return { ok: true, now: await nowAfter('spotify') };
}
async function create_spotify_playlist(a) {
  const e = needSp(); if (e) return e;
  const ids = (Array.isArray(a.track_ids) ? a.track_ids : []).map(x => str(x, 80)).filter(x => /^spotify:track:[A-Za-z0-9]{10,30}$/.test(x) || /^[A-Za-z0-9]{10,30}$/.test(x));
  const r = await SP().createPlaylist(str(a.name, 90), ids);
  if (r.ok) note('Ember: made Spotify playlist "' + r.name + '"'); return r;
}

const HANDLERS = { get_current_track, get_library, control_player, play_playlist, create_playlist, search_spotify, play_spotify, get_spotify_playlists, play_spotify_playlist, create_spotify_playlist };
async function dispatch(name, args) {
  if (!Object.prototype.hasOwnProperty.call(HANDLERS, name)) return { error: 'Unknown music tool: ' + name };
  if (!allowed()) return { error: 'He did not ask about music in his latest message, so nothing was touched. Do not use music tools unless he asks.' };
  const e = noPlayer(); if (e) return e;
  if (SPOTIFY_TOOLS.some(t => t.name === name) && !(SP() && SP().isConnected())) return needSp();
  try { return await HANDLERS[name](args && typeof args === 'object' ? args : {}); }
  catch (err) { return { error: (err && err.message) || 'Music tool failed.' }; }
}

// ---------- what the prompt tells the AI (built from the real state, every time) ----------
function stateBlock() {
  const p = P(); if (!p) return '';
  const c = p.capabilities(), pl = c.playlists.map(x => x.name + ' (' + x.count + ')').join(', ') || 'none';
  return 'MUSIC STATE (live, this is true right now): his library has ' + c.library + ' uploaded track' + (c.library === 1 ? '' : 's') + '; local playlists: ' + pl + '; Spotify ' + (c.spotify ? 'is connected' : 'is NOT connected') + '.\n' +
    'YOU CAN: ' + c.can.join('; ') + '.\n' +
    'YOU CANNOT: ' + c.cannot.join('; ') + '.\n' +
    'MUSIC RULES: you only touch the player when his latest message asks for it. Never start, stop, skip, change the volume or make a playlist on his own, not to match a mood, not as a surprise. If he asks for something not in YOU CAN, say plainly that you cannot and what he could do instead. If a tool result says something is missing (empty library, Spotify not connected, no active device, Premium needed), tell him in one line what to do. Never mention bridges, Prodigy or other apps. When he tells you to look something up or scrape something online (lyrics, an artist, a release, a song id), do exactly that with the web tools if they are on.';
}

const addon = { dispatch, setIntent, stateBlock, log: () => LOG.slice(), INTENT_TEST: t => INTENT.test(String(t || '')) };
Object.defineProperty(addon, 'TOOLS', { enumerable: true, get: () => LOCAL_TOOLS.concat(SP() && SP().isConnected() ? SPOTIFY_TOOLS : []) });
window.EmberMusicAddon = addon;
})();
