// Ember V1.10.18-p12 - ember_musicbrain.js: the Music Brain.
// One switch (+ > Music Brain, or Plugins > Media & Music). ON by default. While it is ON Ember gets real music tools that need NO key:
//   music_lyrics  full lyrics from LRCLIB, then lyrics.ovh, then ChartLyrics (the first one that has them wins)
//   music_facts   artist / song / album facts from MusicBrainz, Wikipedia and iTunes Search (what each source says, nothing invented)
//   music_search  find the right artist + title before looking things up
// The full text a tool fetches is handed to the app (_verbatim) and the APP prints it, exactly as fetched. The model never retypes it,
// so it cannot shorten it or make lines up. If nothing is found the tool says so and the model is told not to write lyrics from memory.
// What leaves the phone: the artist/title/query you asked about, sent to lrclib.net, lyrics.ovh, api.chartlyrics.com, musicbrainz.org,
// wikipedia.org and itunes.apple.com. No key, no account, no cookies.
'use strict';
(() => {
const W = window;
const MS = 12000;
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, n || 200);
const qs = o => Object.keys(o).filter(k => o[k] !== '' && o[k] != null).map(k => k + '=' + encodeURIComponent(o[k])).join('&');
const isOn = () => { try { return W.EmberPlus && W.EmberPlus.isOn ? !!W.EmberPlus.isOn('musicbrain') : true; } catch (e) { return true; } };

// ---------- http: fetch first, the native HTTP plugin if the webview blocks it ----------
async function http(url, kind) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), MS);
  try {
    try {
      const r = await fetch(url, { signal: ac.signal, credentials: 'omit', headers: kind === 'text' ? {} : { Accept: 'application/json' } });
      if (r.status === 404) return null;
      if (!r.ok) { const er = new Error('HTTP ' + r.status); er.status = r.status; throw er; }
      return kind === 'text' ? await r.text() : await r.json();
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('timed out');
      const H = W.Capacitor && W.Capacitor.Plugins && W.Capacitor.Plugins.CapacitorHttp; if (!H || !H.request) throw e;
      const r = await H.request({ url, method: 'GET', connectTimeout: MS, readTimeout: MS, headers: { Accept: 'application/json' } });
      if (r.status === 404) return null;
      if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status);
      if (kind === 'text') return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    }
  } finally { clearTimeout(tm); }
}

// ---------- lyrics ----------
const tidy = s => String(s || '').replace(/\s*[\(\[][^\)\]]*(official|video|audio|lyrics?|visualizer|remaster|hd|hq|4k|live|explicit)[^\)\]]*[\)\]]/gi, '').replace(/\s+/g, ' ').trim();
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9\u00c0-\uffff ]+/g, ' ').replace(/\s+/g, ' ').trim();
const sim = (a, b) => { a = norm(a); b = norm(b); if (!a || !b) return 0; if (a === b) return 3; if (a.includes(b) || b.includes(a)) return 2; const A = new Set(a.split(' ')), B = b.split(' '); return B.filter(x => A.has(x)).length / Math.max(B.length, 1); };
const plainOf = r => String(r.plainLyrics || '').trim() || String(r.syncedLyrics || '').split(/\r?\n/).map(l => l.replace(/^\s*\[[^\]]*\]\s*/, '')).join('\n').trim();
function best(list, artist, title) {
  const a = (Array.isArray(list) ? list : []).filter(x => x && (x.plainLyrics || x.syncedLyrics));
  if (!a.length) return null;
  const score = x => sim(x.trackName, title) * 2 + (artist ? sim(x.artistName, artist) * 2 : 0) + (x.plainLyrics ? 0.3 : 0) + (x.syncedLyrics ? 0.2 : 0);
  return a.slice().sort((x, y) => score(y) - score(x))[0];
}
async function fromLrclib(artist, title, query) {
  let r = null;
  if (artist && title) r = await http('https://lrclib.net/api/get?' + qs({ artist_name: artist, track_name: title }));
  if (!r || !(r.plainLyrics || r.syncedLyrics)) {
    const list = await http('https://lrclib.net/api/search?' + (artist && title ? qs({ track_name: title, artist_name: artist }) : qs({ q: query || [artist, title].filter(Boolean).join(' ') })));
    r = best(list, artist, title || query);
    if (!r && artist && title) r = best(await http('https://lrclib.net/api/search?' + qs({ q: artist + ' ' + title })), artist, title);
  }
  if (!r) return null;
  const text = plainOf(r); if (!text) return null;
  return { source: 'LRCLIB (lrclib.net)', artist: r.artistName, title: r.trackName, album: r.albumName || '', text, synced: !!r.syncedLyrics, instrumental: !!r.instrumental };
}
async function fromOvh(artist, title) {
  if (!artist || !title) return null;
  const j = await http('https://api.lyrics.ovh/v1/' + encodeURIComponent(artist) + '/' + encodeURIComponent(title));
  const text = j && String(j.lyrics || '').replace(/\r/g, '').trim(); if (!text) return null;
  return { source: 'lyrics.ovh', artist, title, album: '', text, synced: false };
}
async function fromChart(artist, title) {
  if (!artist || !title || !W.EmberApis || !W.EmberApis.lyrics) return null;
  const j = await W.EmberApis.lyrics(artist, title); const text = j && String(j.lyrics || '').trim(); if (!text) return null;
  return { source: 'ChartLyrics (chartlyrics.com)', artist: j.artist || artist, title: j.song || title, album: '', text, synced: false };
}
async function lyrics(a) {
  a = a || {};
  let artist = tidy(str(a.artist, 120)), title = tidy(str(a.title || a.song || a.track, 160)), query = str(a.query, 200);
  if (!title && !query) return { ok: false, error: 'music_lyrics needs the song title (and the artist if he gave one).' };
  const tried = [];
  for (const [name, fn] of [['LRCLIB', fromLrclib], ['lyrics.ovh', fromOvh], ['ChartLyrics', fromChart]]) {
    try {
      const r = await fn(artist, title, query);
      if (r && r.instrumental && !r.text) { tried.push(name + ': marked instrumental'); continue; }
      if (r && r.text) {
        const head = r.text.length > 2500 ? r.text.slice(0, 2500) + '\n[...rest delivered by the app]' : r.text;
        const file = 'Lyrics - ' + str((r.artist || artist) + ' - ' + (r.title || title), 90).replace(/[\\/:*?"<>|]/g, '') + '.md';
        const doc = '# ' + (r.title || title) + '\n**' + (r.artist || artist || 'Unknown artist') + '**' + (r.album ? ' · ' + r.album : '') + '\n\n*Source: ' + r.source + (r.synced ? ' (timed version exists)' : '') + ' · fetched ' + new Date().toISOString().slice(0, 10) + '*\n\n---\n\n' + r.text.replace(/\n/g, '  \n');
        return {
          ok: true, artist: r.artist || artist, title: r.title || title, album: r.album, source: r.source, characters: r.text.length, lines: r.text.split('\n').filter(Boolean).length, tried,
          lyrics_for_reference: head,
          delivered_in_full_by_app: true,
          _verbatim: { title: file, type: 'markdown', text: doc, when: 'always', short: true }
        };
      }
      tried.push(name + ': no lyrics for that');
    } catch (e) { tried.push(name + ': ' + str(e && e.message, 60)); }
  }
  return { ok: false, error: 'No source had lyrics for "' + (title || query) + '"' + (artist ? ' by ' + artist : '') + ' (' + tried.join('; ') + '). Tell him exactly that. Do NOT write, recall or guess the lyrics from memory. Offer music_search to find the exact title and artist.' };
}

// ---------- search + facts ----------
async function itunes(term, entity, limit) {
  const j = await http('https://itunes.apple.com/search?' + qs({ term, media: 'music', entity: entity || 'song', limit: limit || 5 }));
  return ((j && j.results) || []).map(x => ({ title: x.trackName || x.collectionName || x.artistName, artist: x.artistName, album: x.collectionName, released: str(x.releaseDate, 10), genre: x.primaryGenreName, lengthSec: x.trackTimeMillis ? Math.round(x.trackTimeMillis / 1000) : undefined, track_no: x.trackNumber, tracks_on_album: x.trackCount, explicit: x.trackExplicitness === 'explicit' ? true : undefined, link: x.trackViewUrl || x.collectionViewUrl || x.artistLinkUrl }));
}
async function mbRecordings(artist, title) {
  const q = title ? 'recording:"' + title.replace(/"/g, '') + '"' + (artist ? ' AND artist:"' + artist.replace(/"/g, '') + '"' : '') : '';
  if (!q) return [];
  const j = await http('https://musicbrainz.org/ws/2/recording/?' + qs({ query: q, fmt: 'json', limit: 4 }));
  return ((j && j.recordings) || []).map(x => ({ title: x.title, artist: (x['artist-credit'] || []).map(c => (c.name || '') + (c.joinphrase || '')).join(''), first_release: x['first-release-date'] || undefined, lengthSec: x.length ? Math.round(x.length / 1000) : undefined, releases: (x.releases || []).slice(0, 4).map(r => r.title + (r.date ? ' (' + r.date + ')' : '')), score: x.score }));
}
async function mbArtist(artist) {
  if (!artist) return null;
  const j = await http('https://musicbrainz.org/ws/2/artist/?' + qs({ query: 'artist:"' + artist.replace(/"/g, '') + '"', fmt: 'json', limit: 1 }));
  const x = j && j.artists && j.artists[0]; if (!x || (x.score != null && x.score < 80)) return null;
  return { name: x.name, type: x.type, country: x.country || (x.area && x.area.name), from: x['life-span'] && x['life-span'].begin, ended: x['life-span'] && x['life-span'].ended ? x['life-span'].end : undefined, note: x.disambiguation, tags: (x.tags || []).sort((p, q) => q.count - p.count).slice(0, 6).map(t => t.name) };
}
async function wiki(name) {
  if (!name) return null;
  const s = await http('https://en.wikipedia.org/w/api.php?' + qs({ action: 'opensearch', search: name + ' musician OR band OR song OR album', limit: 1, namespace: 0, format: 'json', origin: '*' }));
  const t = s && s[1] && s[1][0]; if (!t) return null;
  const j = await http('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t.replace(/ /g, '_')));
  if (!j || !j.extract || /may refer to/i.test(j.extract)) return null;
  return { page: j.title, summary: str(j.extract, 1400), url: j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page };
}
async function search(a) {
  const q = str((a && (a.query || [a.artist, a.title].filter(Boolean).join(' '))) || '', 160); if (!q) return { ok: false, error: 'music_search needs a query.' };
  const out = { ok: true, query: q, matches: [], failed: [] };
  try { out.matches = await itunes(q, 'song', 8); } catch (e) { out.failed.push('iTunes: ' + str(e && e.message, 60)); }
  if (!out.matches.length) { try { out.matches = (await mbRecordings('', q)).map(x => ({ title: x.title, artist: x.artist, released: x.first_release })); } catch (e) { out.failed.push('MusicBrainz: ' + str(e && e.message, 60)); } }
  if (!out.matches.length && !out.failed.length) out.note = 'No matches. Say so; do not invent one.';
  if (!out.matches.length && out.failed.length) { out.ok = false; out.error = 'Search failed (' + out.failed.join('; ') + '). Tell him exactly that.'; }
  return out;
}
async function facts(a) {
  a = a || {};
  const artist = tidy(str(a.artist, 120)), title = tidy(str(a.title || a.song, 160)), album = str(a.album, 160);
  if (!artist && !title && !album) return { ok: false, error: 'music_facts needs an artist, a song title or an album.' };
  const out = { ok: true, about: [artist, title, album].filter(Boolean).join(' · '), sources_used: [], failed: [], rule: 'State ONLY what is in this result. Anything not here is "not in what I found". Never guess release dates, features, producers, track lists or chart positions.' };
  const jobs = [
    ['MusicBrainz artist', () => mbArtist(artist), v => { out.artist = v; }],
    ['MusicBrainz recording', () => mbRecordings(artist, title), v => { out.recordings = v; }],
    ['iTunes', () => itunes([artist, title || album].filter(Boolean).join(' '), title ? 'song' : album ? 'album' : 'song', 5), v => { out.store = v; }],
    ['Wikipedia', () => wiki(artist && !title ? artist : [title, artist].filter(Boolean).join(' ') || album), v => { out.wikipedia = v; }]
  ];
  await Promise.all(jobs.map(async ([name, run, put]) => {
    try {
      const v = await run();
      if (v && (!Array.isArray(v) || v.length)) { put(v); out.sources_used.push(name); } else out.failed.push(name + ': nothing found');
    } catch (e) { out.failed.push(name + ': ' + str(e && e.message, 60)); }
  }));
  if (!out.sources_used.length) return { ok: false, error: 'No source had facts for that (' + out.failed.join('; ') + '). Tell him exactly that; do not answer from memory as if you had looked it up.' };
  return out;
}

// ---------- reading a lyrics request (the app uses this so a lyrics ask can never skip the tool) ----------
const ASK = /\b(lyrics?|lyrical|words to (?:the |this )?song|full song text|sing me the words|what (?:are|is) the (?:words|lyrics))\b/i;
const looksLikeAsk = t => ASK.test(String(t || '')) && !/\b(write|compose|make up|create|draft|original)\b[^.?!]{0,40}\b(lyrics?|song)\b/i.test(String(t || ''));
function parseAsk(text) {
  const t = String(text || '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
  const clean = s => str(String(s || '').replace(/^["']+|["']+$/g, '').replace(/[.?!]+$/, ''), 160);
  let m;
  if ((m = /\blyrics?\s+(?:to|for|of|from)\s+(?:the song\s+)?(.+?)\s+by\s+(.+?)(?:\s+please)?[.?!]*$/i.exec(t))) return { title: clean(m[1]), artist: clean(m[2]) };
  if ((m = /(?:^|\b)(?:get|find|show|give|print|fetch|send|pull up|i want|i need|need|want)?\s*(?:me\s+)?(?:the\s+)?(?:full\s+|whole\s+|complete\s+)?(.+?)\s+by\s+(.+?)\s+(?:full\s+)?lyrics?\b/i.exec(t)) && m[1].length < 80) return { title: clean(m[1].replace(/^(get|find|show|give|print|fetch|send|me|the|full|whole|complete)\s+/ig, '')), artist: clean(m[2]) };
  if ((m = /\blyrics?\s*[:\-–—]\s*(.+?)\s+[-–—]\s+(.+?)[.?!]*$/i.exec(t))) return { artist: clean(m[1]), title: clean(m[2]) };
  if (/\b(this|current|playing|now playing|that)\s+(song|track|one)\b|\bwhat'?s playing\b|\bplaying (now|right now)\b/i.test(t)) {
    try { const P = W.EmberPlayer; const s = P && P.snapshot && P.snapshot(); const tr = s && s.track; if (tr && tr.title) return { title: tr.title, artist: tr.artist || '' }; } catch (e) { /* player not ready */ }
  }
  return { query: clean(t.replace(/\b(please|can you|could you|give me|get me|show me|print|the|full|whole|complete|entire|lyrics?|of|for|to|song)\b/ig, ' ').replace(/\s+/g, ' ')) };
}

// ---------- tools + rules ----------
const TOOLS = [
  { name: 'music_lyrics', description: 'Fetches the REAL, FULL lyrics of a song from open sources (LRCLIB, lyrics.ovh, ChartLyrics; no key). Use it whenever he asks for lyrics, a verse, a line or what a song says. The app prints the complete text itself, so you never retype it. If it fails, say so; never write lyrics from memory. artist and title, or query for a free-text guess.', parameters: { title: 'string', artist: 'string?', query: 'string?' } },
  { name: 'music_facts', description: 'Looks up facts about an artist, song or album in MusicBrainz, Wikipedia and iTunes (no key): origin, years, release dates, genres, length, bio. Use it before stating any music fact. Only repeat what it returns.', parameters: { artist: 'string?', title: 'string?', album: 'string?' } },
  { name: 'music_search', description: 'Finds the right artist and title (iTunes, then MusicBrainz, no key). Use it when he gives a half name, a misspelling or a lyric fragment, then call music_lyrics or music_facts with the exact match.', parameters: { query: 'string' } }
];
async function dispatch(name, args) {
  args = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
  try { W.dispatchEvent(new CustomEvent('ember-terminal', { detail: '[MUSIC BRAIN] ' + name + ' ' + str(args.artist || args.title || args.query || args.album || '', 60) })); } catch (e) { /* terminal optional */ }
  if (name === 'music_lyrics') return lyrics(args);
  if (name === 'music_facts') return facts(args);
  if (name === 'music_search') return search(args);
  return { error: 'Unknown Music Brain tool: ' + name };
}
const RULES = 'MUSIC BRAIN is ON. Lyrics: for ANY request for lyrics, a verse, a line or the words of a song, call music_lyrics (if he says "this song", read get_current_track first). NEVER write, recall, complete or guess lyrics from memory, and never claim lyrics a tool did not hand you. The app prints the full text that the tool fetched, exactly as fetched, right after your message, so write only one or two sentences (what it is, where it came from) and never retype or shorten the lyrics. If music_lyrics fails, tell him exactly that and offer music_search. Facts: before stating an artist, album, year, credit, genre or chart fact, call music_facts and repeat only what it returned; anything it did not return is "not in what I found". A half-remembered name or lyric fragment goes through music_search first. Writing NEW original lyrics for him is fine; that is not looking one up.';

W.EmberMusicBrain = { TOOLS, dispatch, isOn, rules: () => isOn() ? RULES : '', lyrics, facts, search, looksLikeAsk, parseAsk, _norm: norm, _sim: sim };
})();
