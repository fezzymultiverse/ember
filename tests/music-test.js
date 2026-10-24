// Ember V1.5.7 test: music player, widget, Spotify (mocked Spotify servers), and the AI music rules.
// Run: node tests/music-test.js   (needs Playwright; set PW=/path/to/playwright if it is not resolvable)
const { chromium } = require(process.env.PW || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = process.env.WWW || path.join(__dirname, '..', 'www');
let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (extra === undefined ? '' : JSON.stringify(extra))); };

const srv = http.createServer((q, r) => {
  const p = q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0];
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    const t = p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : p.endsWith('.svg') ? 'image/svg+xml' : p.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/html';
    r.writeHead(200, { 'content-type': t }); r.end(d);
  });
});

function wav(sec, hz) {
  const rate = 8000, n = rate * sec, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(6000 * Math.sin(2 * Math.PI * hz * i / rate)), 44 + i * 2);
  return b;
}

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port, url = 'http://127.0.0.1:' + port + '/';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ember-music-'));
  const files = [['Artist One - First Song.wav', 440], ['Artist Two - Second Song.wav', 523], ['Third Song.wav', 659]].map(([n, hz]) => { const f = path.join(dir, n); fs.writeFileSync(f, wav(8, hz)); return f; });

  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() == 'error' && !/Failed to load resource|net::|favicon/.test(m.text())) errs.push(m.text()); });

  // ---------- mocked Groq (scripted replies) ----------
  const LLM = { sys: [], first: '', calls: 0, last: '' };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  await pg.route('https://api.groq.com/**', async route => {
    const req = route.request(), u = req.url();
    if (req.method() == 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const J = (st, o) => route.fulfill({ status: st, headers: cors, contentType: 'application/json', body: JSON.stringify(o) });
    if (/\/models(\?|$)/.test(u)) return J(200, { data: [{ id: 'llama-3.3-70b-versatile' }, { id: 'llama-3.1-8b-instant' }] });
    const body = JSON.parse(req.postData() || '{}'), sys = body.messages[0].content, last = body.messages[body.messages.length - 1].content;
    if (/Reply with the single word OK/.test(sys)) return J(200, { choices: [{ message: { content: 'OK' } }] });
    if (/maintain a small memory|compress a chat/.test(sys)) return J(200, { choices: [{ message: { content: '{"title":"t","summary":"s","facts":[],"threads":[]}' } }] });
    LLM.calls++; LLM.sys.push(sys); LLM.last = last;
    const text = /^\[TOOL RESULTS/.test(last) ? 'Done, that is handled.' : (LLM.first || 'Plain reply.');
    return J(200, { choices: [{ message: { content: text } }] });
  });

  // ---------- mocked Spotify ----------
  const SPY = { tokenBodies: [], authUrls: [], calls: [], noDevice: false, devicePlays: 0, playing: true, vol: 55 };
  const TRACK = { id: 'TRACKID123456789012', uri: 'spotify:track:TRACKID123456789012', name: 'Mock Song', artists: [{ name: 'Mock Artist' }], album: { name: 'Mock Album', images: [{ url: 'https://i.scdn.co/big.jpg' }, { url: 'https://i.scdn.co/small.jpg' }] }, duration_ms: 200000 };
  await pg.route('https://accounts.spotify.com/**', async route => {
    const req = route.request(), u = new URL(req.url());
    if (u.pathname === '/authorize') {
      SPY.authUrls.push(u.searchParams);
      const back = new URL(u.searchParams.get('redirect_uri')); back.searchParams.set('code', 'CODE123'); back.searchParams.set('state', u.searchParams.get('state'));
      return route.fulfill({ status: 302, headers: { location: back.toString() } });
    }
    if (u.pathname === '/api/token') {
      const p = new URLSearchParams(req.postData() || ''); SPY.tokenBodies.push(Object.fromEntries(p));
      if (p.get('grant_type') === 'authorization_code' && (!p.get('code_verifier') || p.get('code') !== 'CODE123' || p.get('client_id') !== 'CLIENT123')) return route.fulfill({ status: 400, headers: cors, contentType: 'application/json', body: '{"error":"invalid_grant"}' });
      return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ access_token: 'ACCESS' + SPY.tokenBodies.length, refresh_token: 'REFRESH1', expires_in: 3600 }) });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  await pg.route('https://api.spotify.com/v1/**', async route => {
    const req = route.request(), u = new URL(req.url()), m = req.method(), p = u.pathname.replace('/v1', '');
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    SPY.calls.push({ m, p, q: Object.fromEntries(u.searchParams), body, auth: req.headers()['authorization'] });
    const J = (st, o) => route.fulfill({ status: st, headers: cors, contentType: 'application/json', body: JSON.stringify(o) });
    const N = () => route.fulfill({ status: 204, headers: cors, body: '' });
    if (p === '/me') return J(200, { id: 'u1', display_name: 'Fezzy' });
    if (p === '/me/player' && m === 'GET') return SPY.playing ? J(200, { is_playing: true, progress_ms: 61000, shuffle_state: false, device: { name: 'Honor X5b', volume_percent: SPY.vol }, item: TRACK }) : N();
    if (p === '/me/player/devices') return J(200, { devices: [{ id: 'DEV1', type: 'Computer', is_restricted: false }, { id: 'DEV2', type: 'Smartphone', is_restricted: false }] });
    if (p === '/me/player/play' && m === 'PUT') {
      if (SPY.noDevice && !u.searchParams.get('device_id')) return J(404, { error: { status: 404, message: 'Player command failed: No active device found', reason: 'NO_ACTIVE_DEVICE' } });
      if (u.searchParams.get('device_id')) SPY.devicePlays++;
      return N();
    }
    if (p === '/me/player/pause' || p === '/me/player/next' || p === '/me/player/previous' || p === '/me/player/seek' || p === '/me/player/volume') return N();
    if (p === '/search') return J(200, { tracks: { items: [TRACK] } });
    if (p === '/me/playlists' && m === 'GET') return J(200, { items: [{ id: 'PLID123456789012345', uri: 'spotify:playlist:PLID123456789012345', name: 'Gym', items: { total: 12 } }] });
    if (p === '/me/playlists' && m === 'POST') return J(201, { id: 'NEWPL123456789012345' });
    if (p === '/playlists/NEWPL123456789012345/items') return J(201, { snapshot_id: 'x' });
    return J(404, { error: { status: 404, message: 'unmocked ' + p } });
  });

  await pg.addInitScript(() => {
    if (!localStorage.getItem('ember_keys')) localStorage.setItem('ember_keys', JSON.stringify({ groq: [{ key: 'gsk_TESTgroqKEY1234567890abcdefGHIJ', st: null }] }));
    if (!localStorage.getItem('ember_set')) localStorage.setItem('ember_set', JSON.stringify({ musicAddon: true, freeMode: false, name: 'Fezzy' }));
  });
  await pg.goto(url); await pg.waitForFunction(() => window.__ember && window.__ember.ready); await pg.waitForTimeout(400);
  const ev = f => pg.evaluate(f);
  const tool = (n, a) => pg.evaluate(([n, a]) => window.EmberMusicAddon.dispatch(n, a), [n, a]);
  const intent = (t, p) => pg.evaluate(([t, p]) => window.EmberMusicAddon.setIntent(t, p), [t, p || '']);

  // ---------- 1. load ----------
  ok('page loads without errors', errs.length === 0, errs);
  ok('EmberPlayer, EmberSpotify, EmberMusicAddon exist', await ev(() => !!(window.EmberPlayer && window.EmberSpotify && window.EmberMusicAddon)));
  ok('Music pill is in the composer row', await pg.locator('.tools #bMusic').count() === 1);
  ok('widget is hidden when nothing is loaded', await pg.locator('#mw.hidden').count() === 1);
  ok('no leftover "bridge" wording in the music settings', !/bridge/i.test(await pg.locator('.card[data-tab="music"]').first().innerText() + await pg.locator('#settings').innerHTML().then(h => (h.match(/EmberMedia bridge|Prodigy/g) || []).join(''))));

  // ---------- 2. upload ----------
  await pg.click('#bMusic');
  ok('Music panel opens', await pg.locator('#music.show').count() === 1);
  await pg.setInputFiles('#mFile', files);
  await pg.waitForFunction(() => document.querySelectorAll('#mList .trk').length === 3, null, { timeout: 8000 });
  ok('3 uploaded songs are listed', await pg.locator('#mList .trk').count() === 3);
  const lib = await ev(() => window.EmberPlayer.list().map(t => [t.title, t.artist, t.durationMs > 7000]));
  ok('titles and artists come from the file names', JSON.stringify(lib) === JSON.stringify([['First Song', 'Artist One', true], ['Second Song', 'Artist Two', true], ['Third Song', '', true]]), lib);
  ok('upload message says added 3', /Added 3/.test(await pg.locator('#mMsg').innerText()));
  await pg.setInputFiles('#mFile', [files[0]]);
  await pg.waitForTimeout(300);
  ok('uploading the same file again does not duplicate it', await pg.locator('#mList .trk').count() === 3 && /already there/.test(await pg.locator('#mMsg').innerText()));
  await pg.fill('#mQ', 'second');
  ok('library search filters', await pg.locator('#mList .trk').count() === 1);
  await pg.fill('#mQ', '');

  // ---------- 3. play, widget, transport ----------
  await pg.locator('#mList .go').first().click();
  await pg.waitForFunction(() => window.EmberPlayer.snapshot().playing, null, { timeout: 8000 });
  await pg.waitForTimeout(700);
  ok('tapping a song plays it', await ev(() => window.EmberPlayer.snapshot().track.title) === 'First Song');
  ok('widget shows above the composer with the title', await pg.locator('#mw:not(.hidden)').count() === 1 && /First Song/.test(await pg.locator('#mwTitle').innerText()));
  ok('panel now-playing card shows title and artist', (await pg.locator('#npTitle').innerText()) === 'First Song' && /Artist One/.test(await pg.locator('#npSub').innerText()));
  await pg.click('#bMx'); await pg.click('#mwPlay'); await pg.waitForTimeout(600);
  ok('widget pause button pauses', await ev(() => !window.EmberPlayer.snapshot().playing));
  await pg.click('#mwOpen'); ok('tapping the widget title opens the panel', await pg.locator('#music.show').count() === 1);
  await pg.click('#npPlay'); await pg.waitForTimeout(600);
  ok('panel play button resumes', await ev(() => window.EmberPlayer.snapshot().playing));
  await pg.click('#npNext'); await pg.waitForTimeout(900);
  ok('next goes to the next song', await ev(() => window.EmberPlayer.snapshot().track.title) === 'Second Song');
  await ev(() => window.EmberPlayer.control('seek', { value: 4 })); await pg.waitForTimeout(300);
  ok('seek moves the position', await ev(() => window.EmberPlayer.position()) >= 3.9);
  await pg.click('#npPrev'); await pg.waitForTimeout(900);
  ok('prev after 3s restarts the song', await ev(() => window.EmberPlayer.snapshot().track.title) === 'Second Song' && await ev(() => window.EmberPlayer.position()) < 2);
  await pg.click('#npPrev'); await pg.waitForTimeout(900);
  ok('prev again goes to the previous song', await ev(() => window.EmberPlayer.snapshot().track.title) === 'First Song');
  await ev(() => window.EmberPlayer.control('volume', { value: 40 }));
  ok('volume sets the audio volume', await ev(() => window.EmberPlayer.snapshot().volume) === 40);
  ok('volume is clamped', await ev(async () => { await window.EmberPlayer.control('volume', { value: 900 }); return window.EmberPlayer.snapshot().volume; }) === 100);

  // ---------- 4. playlists ----------
  await pg.fill('#mPlName', '999'); await pg.click('#mPlSave');
  ok('saving the listed songs makes a playlist', await ev(() => window.EmberPlayer.playlists().map(p => p.name + ':' + p.count).join()) === '999:3');
  await ev(() => window.EmberPlayer.control('stop'));
  const nn = await ev(() => window.NineNine.playPlaylist());
  ok('999 "Play playlist" plays the playlist named 999', nn && nn.ok === true, nn);
  await pg.waitForFunction(() => window.EmberPlayer.snapshot().playing, null, { timeout: 8000 });
  ok('missing playlist gives a readable error', (await ev(() => window.EmberPlayer.playPlaylist('nope'))).error === 'No playlist called "nope".');

  // ---------- 5. AI rules (the hard gate) ----------
  await intent('tell me a joke');
  const g1 = await tool('control_player', { action: 'pause' });
  ok('a rogue music tool call on a non-music message is refused', !!g1.error && /did not ask/.test(g1.error) && await ev(() => window.EmberPlayer.snapshot().playing), g1);
  await intent('pause the music please');
  const g2 = await tool('control_player', { action: 'pause' });
  ok('same call is allowed when he asked', g2.ok === true && await ev(() => !window.EmberPlayer.snapshot().playing), g2);
  await intent('ok');
  ok('no intent at all is refused', !!(await tool('control_player', { action: 'play' })).error);
  await intent('the second one', 'play something chill');
  ok('a short follow-up to a music message is allowed', !(await tool('get_current_track', {})).error);
  await intent('the second one and then tell me a really long story about my whole day at the studio and what we recorded', 'play something chill');
  ok('a long unrelated message is not allowed just because the one before was about music', !!(await tool('get_current_track', {})).error);
  await intent('play the music');
  ok('unknown action is rejected', /Unknown action/.test((await tool('control_player', { action: 'delete_everything' })).error));
  ok('seek without a number is rejected', /needs a number/.test((await tool('control_player', { action: 'seek' })).error));
  ok('unknown tool is rejected', /Unknown music tool/.test((await tool('format_phone', {})).error));
  ok('prototype names are not tools', /Unknown music tool/.test((await tool('constructor', {})).error));
  const cur = await tool('get_current_track', {});
  ok('get_current_track reports the real song', cur.title === 'First Song' && cur.source === 'ember' && cur.artist === 'Artist One', cur);
  const gl = await tool('get_library', { query: 'second' });
  ok('get_library searches and returns ids', gl.total === 1 && gl.tracks[0].title === 'Second Song' && !!gl.tracks[0].id, gl);
  const cp = await tool('create_playlist', { name: 'Late', song_ids: [gl.tracks[0].id, 'does-not-exist'] });
  ok('create_playlist saves known ids and reports the skipped one', cp.ok && cp.count === 1 && cp.skipped === 1, cp);
  const cl = await tool('control_player', { action: 'play', songId: gl.tracks[0].id });
  ok('control_player play with songId plays that song and returns what is on', cl.ok && cl.now && cl.now.title === 'Second Song', cl);
  ok('every AI action is in the visible log', await ev(() => window.EmberMusicAddon.log().length) >= 3);
  ok('Spotify tools are not offered while Spotify is disconnected', await ev(() => !window.EmberMusicAddon.TOOLS.some(t => /spotify/.test(t.name))));
  ok('a Spotify tool call while disconnected says so', /not connected/.test((await tool('search_spotify', { query: 'x' })).error));
  const sb = await ev(() => window.EmberMusicAddon.stateBlock());
  ok('the prompt block states real facts and limits', /3 uploaded tracks/.test(sb) && /Spotify is NOT connected/.test(sb) && /YOU CANNOT/.test(sb) && /on his own/.test(sb) && !/bridge|Prodigy/i.test(sb.replace(/Never mention bridges, Prodigy or other apps\./, '')), sb);

  // ---------- 6. end to end through the chat (scripted model) ----------
  await pg.click('#bMx');
  const send = async t => { await pg.fill('#inp', t); await pg.click('#bSend'); await pg.waitForFunction(() => !document.getElementById('typ') && !document.getElementById('bSend').disabled, null, { timeout: 20000 }); await pg.waitForTimeout(400); };
  await ev(() => window.EmberPlayer.control('play', { songId: window.EmberPlayer.list()[0].id }));
  await pg.waitForFunction(() => window.EmberPlayer.snapshot().playing);
  LLM.first = '<tool_call>{"tool":"control_player","args":{"action":"pause"}}</tool_call>';
  await send('pause the music');
  ok('chat: "pause the music" pauses through the AI tool loop', await ev(() => !window.EmberPlayer.snapshot().playing));
  ok('chat: the model saw the live music state and tool list', LLM.sys.some(s => /MUSIC STATE/.test(s) && /control_player/.test(s) && /YOU CANNOT/.test(s)));
  ok('chat: the reply shown is the tool-aware answer', /Done, that is handled/.test(await pg.locator('#log').innerText()));
  await ev(() => window.EmberPlayer.control('play'));
  await pg.waitForFunction(() => window.EmberPlayer.snapshot().playing);
  LLM.first = '<tool_call>{"tool":"control_player","args":{"action":"pause"}}</tool_call>';
  await send('how is your day going?');
  ok('chat: a rogue pause on an unrelated message does NOT touch the player', await ev(() => window.EmberPlayer.snapshot().playing));

  // ---------- 7. Spotify: connect (web redirect, PKCE) ----------
  LLM.first = '';
  await ev(() => window.EmberPlayer.control('stop'));
  await pg.click('#bSet'); await pg.click('.stab[data-st="music"]');
  ok('Spotify redirect defaults to the loopback address', (await pg.inputValue('#spRedir')) === url, await pg.inputValue('#spRedir'));
  await pg.fill('#spClient', 'CLIENT123');
  await Promise.all([pg.waitForURL(u => u.toString().startsWith(url) && /code=CODE123/.test(u.toString()), { timeout: 8000 }).catch(() => {}), pg.click('#spConnect')]);
  await pg.waitForFunction(() => window.EmberSpotify && window.EmberSpotify.isConnected(), null, { timeout: 8000 });
  const au = SPY.authUrls[0];
  ok('authorize request is PKCE S256 with the right scopes and client', !!au && au.get('code_challenge_method') === 'S256' && au.get('client_id') === 'CLIENT123' && /user-modify-playback-state/.test(au.get('scope')) && au.get('response_type') === 'code' && au.get('code_challenge').length === 43);
  const tb = SPY.tokenBodies[0];
  ok('token exchange sends the verifier, no client secret', tb.grant_type === 'authorization_code' && tb.code_verifier.length === 64 && !('client_secret' in tb) && tb.redirect_uri === url, tb);
  ok('after sign-in the app is connected and shows the name', await ev(() => window.EmberSpotify.status().name) === 'Fezzy');
  ok('the code is removed from the address bar', !/code=/.test(pg.url()), pg.url());
  ok('Spotify tools are offered once connected', await ev(() => window.EmberMusicAddon.TOOLS.some(t => t.name === 'play_spotify')));
  ok('settings card says connected', /Connected as Fezzy/.test(await pg.locator('#spStat').innerText()));

  // ---------- 8. Spotify: now playing + control ----------
  await pg.waitForTimeout(300);
  const np = await ev(() => window.EmberPlayer.nowPlaying());
  ok('what is playing on Spotify is visible', np.source === 'spotify' && np.track.title === 'Mock Song' && np.positionSec === 61 && np.playing === true, np);
  await pg.waitForTimeout(700); await ev(() => document.getElementById('bMx').click());
  await pg.waitForFunction(() => !document.getElementById('mw').classList.contains('hidden'), null, { timeout: 8000 });
  ok('widget shows the Spotify song', /Mock Song/.test(await pg.locator('#mwTitle').innerText()) && /Spotify/.test(await pg.locator('#mwSub').innerText()));
  await intent('skip this song');
  SPY.calls.length = 0;
  const sk = await tool('control_player', { action: 'next' });
  ok('"next" goes to Spotify when Spotify is what is playing', sk.ok && SPY.calls.some(c => c.m === 'POST' && c.p === '/me/player/next'), SPY.calls);
  ok('Spotify calls carry the bearer token', SPY.calls.every(c => /^Bearer ACCESS/.test(c.auth || '')));
  await intent('pause'); SPY.calls.length = 0;
  await tool('control_player', { action: 'pause' });
  ok('"pause" pauses Spotify', SPY.calls.some(c => c.m === 'PUT' && c.p === '/me/player/pause'));
  await intent('set the volume to 30'); SPY.calls.length = 0;
  await tool('control_player', { action: 'volume', value: 30 });
  ok('volume goes to Spotify as a percent', SPY.calls.some(c => c.p === '/me/player/volume' && c.q.volume_percent === '30'), SPY.calls);
  await intent('search spotify for a song');
  const ss = await tool('search_spotify', { query: 'mock' });
  ok('search_spotify returns tracks (limit capped at 10)', ss.results && ss.results[0].id === TRACK.id && SPY.calls.some(c => c.p === '/search' && +c.q.limit <= 10), ss);
  await intent('play that song on spotify'); SPY.calls.length = 0;
  const bad = await tool('play_spotify', { trackId: 'x" ; drop' });
  ok('play_spotify rejects an id that is not a Spotify id', bad.ok === false && !SPY.calls.some(c => c.p === '/me/player/play'), bad);
  const pl = await tool('play_spotify', { trackId: TRACK.id });
  ok('play_spotify plays the track by uri', pl.ok && SPY.calls.some(c => c.p === '/me/player/play' && c.body && c.body.uris[0] === TRACK.uri), SPY.calls);
  SPY.noDevice = true; SPY.devicePlays = 0;
  const nd = await tool('play_spotify', { trackId: TRACK.id });
  ok('no active device: Ember picks the phone and retries', nd.ok && SPY.devicePlays === 1 && SPY.calls.filter(c => c.p === '/me/player/play').pop().q.device_id === 'DEV2', SPY.calls.slice(-4));
  SPY.noDevice = false;
  const spl = await tool('get_spotify_playlists', {});
  ok('Spotify playlists load (new "items" field)', spl.playlists && spl.playlists[0].name === 'Gym' && spl.playlists[0].tracks === 12, spl);
  SPY.calls.length = 0;
  const cpl = await tool('create_spotify_playlist', { name: 'From Ember', track_ids: [TRACK.id, 'bad id'] });
  ok('create_spotify_playlist uses POST /me/playlists then /items', cpl.ok && cpl.count === 1 && SPY.calls[0].p === '/me/playlists' && SPY.calls[1].p === '/playlists/NEWPL123456789012345/items' && SPY.calls[1].body.uris[0] === TRACK.uri, SPY.calls);
  await intent('what is playing');
  const wp = await tool('get_current_track', {});
  ok('get_current_track reports the Spotify song', wp.source === 'spotify' && wp.title === 'Mock Song', wp);

  // ---------- 9. panel Spotify tab ----------
  await pg.click('#bMusic'); await pg.click('.mtab[data-m="sp"]');
  await pg.waitForFunction(() => document.querySelectorAll('#spPls .trk').length === 1, null, { timeout: 8000 });
  ok('Spotify tab lists playlists', /Gym/.test(await pg.locator('#spPls').innerText()));
  await pg.fill('#spQ', 'mock'); await pg.click('#spGo');
  await pg.waitForFunction(() => document.querySelectorAll('#spRes .trk').length === 1, null, { timeout: 8000 });
  SPY.calls.length = 0; await pg.click('#spRes .spgo'); await pg.waitForTimeout(500);
  ok('tapping a Spotify result plays it', SPY.calls.some(c => c.p === '/me/player/play' && c.body.uris[0] === TRACK.uri));
  await pg.click('.mtab[data-m="ai"]');
  ok('Ember tab lists what Ember can do and what it did', /Spotify: see what is playing/.test(await pg.locator('#mCan').innerText()) && (await pg.locator('#mLog .lg').count()) >= 3);

  // ---------- 10. app-link sign-in (APK path) + disconnect + wipe ----------
  await pg.click('#bMx');
  await ev(() => window.EmberSpotify.disconnect());
  ok('disconnect clears the sign-in', await ev(() => !window.EmberSpotify.isConnected() && !localStorage.getItem('ember_spotify').includes('REFRESH')));
  ok('Spotify tools disappear again', await ev(() => !window.EmberMusicAddon.TOOLS.some(t => /spotify/.test(t.name))));
  SPY.tokenBodies.length = 0;
  await ev(() => { localStorage.setItem('ember_spotify_pending', JSON.stringify({ verifier: 'v'.repeat(64), state: 'S1', redirect: 'com.fezzy.ember://spotify', t: Date.now() })); window.dispatchEvent(new CustomEvent('ember-deeplink', { detail: 'com.fezzy.ember://spotify?code=CODE123&state=WRONG' })); });
  await pg.waitForTimeout(500);
  ok('app link with the wrong state is rejected', await ev(() => !window.EmberSpotify.isConnected()) && SPY.tokenBodies.length === 0);
  await ev(() => { localStorage.setItem('ember_spotify_pending', JSON.stringify({ verifier: 'v'.repeat(64), state: 'S1', redirect: 'com.fezzy.ember://spotify', t: Date.now() })); window.dispatchEvent(new CustomEvent('ember-deeplink', { detail: 'com.fezzy.ember://spotify?code=CODE123&state=S1' })); });
  await pg.waitForFunction(() => window.EmberSpotify.isConnected(), null, { timeout: 8000 });
  ok('app link with the right state signs in, using the app redirect URI', SPY.tokenBodies[0] && SPY.tokenBodies[0].redirect_uri === 'com.fezzy.ember://spotify');
  await ev(() => window.dispatchEvent(new CustomEvent('ember-deeplink', { detail: 'com.fezzy.ember://spotify?code=CODE123&state=S1' }))); await pg.waitForTimeout(300);
  ok('the repeated app link (cold start double send) is ignored', SPY.tokenBodies.length === 1);
  await ev(() => window.EmberSpotify.disconnect());
  await ev(() => window.EmberPlayer.wipe());
  ok('wipe empties the library and playlists', await ev(() => window.EmberPlayer.count() === 0 && window.EmberPlayer.playlists().length === 0));
  await pg.click('#bMusic');
  ok('empty library message shows', /Nothing here yet/.test(await pg.locator('#mList').innerText()));

  ok('no page errors during the whole run', errs.length === 0, errs);
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); srv.close(); fs.rmSync(dir, { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
