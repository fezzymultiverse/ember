// Ember V1.6.0 test: Agent & API tools (Tavily web search, YouTube search/download via a mocked native plugin, image links).
// Run: node tests/agent-test.js   (needs Playwright; set PW=/path/to/playwright if it is not resolvable)
const { chromium } = require(process.env.PW || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.WWW || path.join(__dirname, '..', 'www');
let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (extra === undefined ? '' : JSON.stringify(extra))); };

const srv = http.createServer((q, r) => {
  const p = q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0];
  fs.readFile(path.join(ROOT, p), (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    const t = p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.svg') ? 'image/svg+xml' : p.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/html';
    r.writeHead(200, { 'content-type': t }); r.end(d);
  });
});

(async () => {
  await new Promise(r => srv.listen(0, r));
  const url = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch();
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() == 'error' && !/Failed to load resource|net::|favicon/.test(m.text())) errs.push(m.text()); });
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

  // ---------- mocked services ----------
  const SEEN = { tavily: [], poll: [], groq: [] }, MODE = { tavily: 200, poll: 200, first: '' };
  await pg.route('https://api.tavily.com/**', async route => {
    const req = route.request(); if (req.method() == 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    SEEN.tavily.push({ auth: req.headers()['authorization'], body: JSON.parse(req.postData() || '{}') });
    if (MODE.tavily != 200) return route.fulfill({ status: MODE.tavily, headers: cors, contentType: 'application/json', body: '{"detail":"no"}' });
    route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ answer: 'Mock answer.', results: [{ title: 'T1', url: 'https://a.example/1', content: 'c1' }, { title: 'T2', url: 'https://b.example/2', content: 'c2' }] }) });
  });
  await pg.route('https://text.pollinations.ai/openai', async route => {
    const req = route.request(); if (req.method() == 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    SEEN.poll.push(JSON.parse(req.postData() || '{}'));
    if (MODE.poll != 200) return route.fulfill({ status: MODE.poll, headers: cors, body: 'x' });
    route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: 'A red square on white.' } }] }) });
  });
  await pg.route('https://api.groq.com/**', async route => {
    const req = route.request(), u = req.url(); if (req.method() == 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const J = o => route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(o) });
    if (/\/models(\?|$)/.test(u)) return J({ data: [{ id: 'llama-3.3-70b-versatile' }] });
    const body = JSON.parse(req.postData() || '{}'), sys = body.messages[0].content, last = body.messages[body.messages.length - 1].content;
    if (/Reply with the single word OK/.test(sys)) return J({ choices: [{ message: { content: 'OK' } }] });
    if (/maintain a small memory|compress a chat/.test(sys)) return J({ choices: [{ message: { content: '{"title":"t","summary":"s","facts":[],"threads":[]}' } }] });
    SEEN.groq.push({ sys, last });
    J({ choices: [{ message: { content: /^\[TOOL RESULTS/.test(last) ? 'Here is what I found.' : (MODE.first || 'Plain reply.') } }] });
  });

  // fake Capacitor + native EmberYoutube plugin (what the APK provides)
  await pg.addInitScript(() => {
    window.__yt = { search: [], dl: [] };
    window.Capacitor = { Plugins: {}, isNativePlatform: () => true, isPluginAvailable: n => n == 'EmberYoutube', registerPlugin: n => n != 'EmberYoutube' ? undefined : ({
      search: async o => { window.__yt.search.push(o); return { results: [{ title: 'Song A', url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA', channel: 'Ch', durationSec: 200 }] }; },
      downloadVideo: async o => { window.__yt.dl.push(o); return { jobId: 'job-1' }; },
      status: async () => ({ state: 'done', title: 'Song A', detail: 'Music/Ember/Song A.m4a', at: 1 }) }) };
    if (!localStorage.getItem('ember_keys')) localStorage.setItem('ember_keys', JSON.stringify({ groq: [{ key: 'gsk_TESTgroqKEY1234567890abcdefGHIJ', st: null }] }));
    if (!localStorage.getItem('ember_set')) localStorage.setItem('ember_set', JSON.stringify({ freeMode: false, name: 'Fezzy' }));
  });
  await pg.goto(url); await pg.waitForFunction(() => window.__ember && window.__ember.ready); await pg.waitForTimeout(400);
  const ev = f => pg.evaluate(f), A = (n, a) => pg.evaluate(([n, a]) => window.EmberAgentAddon.dispatch(n, a), [n, a]);
  const intent = (t, p) => pg.evaluate(([t, p]) => window.EmberAgentAddon.setIntent(t, p), [t, p || '']);

  // ---------- 1. tool lists follow the switches ----------
  const names = S => pg.evaluate(S => window.EmberAgentAddon.toolsFor(S).map(t => t.name).join(','), S);
  ok('no switch on = no agent tools', await names({}) == '');
  ok('Web Search on = web_search only', await names({ agentAddon: true }) == 'web_search');
  ok('YouTube on = youtube_search + youtube_download', await names({ youtubeAddon: true }) == 'youtube_search,youtube_download,playlist_list,playlist_download');
  ok('Vision on = see_image only', await names({ visionAddon: true }) == 'see_image');

  // ---------- 2. Tavily ----------
  let r = await A('web_search', { query: 'news' });
  ok('web_search without a key says so and makes no request', /No Tavily key/.test(r.error || '') && SEEN.tavily.length == 0, r);
  await ev(() => window.EmberAgentAddon.setTavilyKey('  "Bearer tvly-TESTKEY123"  '));
  r = await A('web_search', { query: 'latest news', max_results: 2 });
  ok('web_search sends the cleaned key as Bearer and the query', SEEN.tavily.length == 1 && SEEN.tavily[0].auth == 'Bearer tvly-TESTKEY123' && SEEN.tavily[0].body.query == 'latest news' && SEEN.tavily[0].body.max_results == 2, SEEN.tavily);
  ok('web_search returns the answer plus results with url and snippet', r.answer == 'Mock answer.' && r.results.length == 2 && r.results[0].url == 'https://a.example/1' && r.results[0].snippet == 'c1', r);
  MODE.tavily = 401; r = await A('web_search', { query: 'x' });
  ok('web_search 401 -> clear key-rejected error', /rejected the key/.test(r.error || ''), r);
  MODE.tavily = 429; r = await A('web_search', { query: 'x' });
  ok('web_search 429 -> limit message', /limit/.test(r.error || ''), r); MODE.tavily = 200;
  ok('web_search empty query is refused', !!(await A('web_search', { query: '   ' })).error);
  ok('the key is not in the backup-able settings', !(await ev(() => localStorage.getItem('ember_set') || '')).includes('TESTKEY123'));

  // ---------- 3. Vision ----------
  ok('see_image refuses http and javascript: links', !!(await A('see_image', { image_url: 'http://x.example/a.png' })).error && !!(await A('see_image', { image_url: 'javascript:alert(1)' })).error && SEEN.poll.length == 0);
  r = await A('see_image', { image_url: 'https://x.example/a.png', prompt: 'what colour?' });
  const sent = SEEN.poll[0] || {}, parts = sent.messages && sent.messages[0].content || [];
  ok('see_image posts text + image_url parts', parts.length == 2 && parts[0].text == 'what colour?' && parts[1].image_url.url == 'https://x.example/a.png', sent);
  ok('see_image returns the real description', r.description == 'A red square on white.', r);
  MODE.poll = 500; r = await A('see_image', { image_url: 'https://x.example/b.png' });
  ok('see_image failure is an error, never an invented description', !!r.error && !r.description && /do not guess/i.test(r.error), r); MODE.poll = 200;

  // ---------- 4. YouTube gate ----------
  r = await A('youtube_download', { url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA' });
  ok('download refused when he did not ask', /did not ask/.test(r.error || '') && (await ev(() => window.__yt.dl.length)) == 0, r);
  await intent('download this https://youtu.be/BBBBBBBBBBB?si=zz', '');
  r = await A('youtube_download', { url: 'https://www.youtube.com/watch?v=ZZZZZZZZZZZ' });
  ok('download refused for a link that never came from him or the search', /did not come from/.test(r.error || '') && (await ev(() => window.__yt.dl.length)) == 0, r);
  r = await A('youtube_download', { url: 'https://evil.example/watch?v=BBBBBBBBBBB' });
  ok('download refused for non-YouTube hosts', /youtube\.com or youtu\.be/.test(r.error || '') && (await ev(() => window.__yt.dl.length)) == 0, r);
  r = await A('youtube_download', { url: 'https://youtu.be/BBBBBBBBBBB?si=zz&list=PLx', title: 'My: song/1' });
  const dl = await ev(() => window.__yt.dl);
  ok('download of his own link starts and sends a clean watch URL', r.ok === true && dl.length == 1 && dl[0].url == 'https://www.youtube.com/watch?v=BBBBBBBBBBB' && dl[0].title == 'My: song/1', { r, dl });
  await intent('find me Song A on youtube', '');
  r = await A('youtube_search', { query: 'Song A' });
  ok('youtube_search returns results from the native plugin', r.results && r.results[0].title == 'Song A' && (await ev(() => window.__yt.search[0].limit)) == 5, r);
  await intent('yes', 'download it');
  r = await A('youtube_download', { url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA' });
  ok('a short "yes" after he asked to download counts, for a link from the search', r.ok === true, r);
  await intent('how are you doing today', 'download it');
  r = await A('youtube_download', { url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA' });
  ok('an unrelated question after a download request does not authorise one', /did not ask/.test(r.error || ''), r);

  // ---------- 5. settings UI + prompt ----------
  await pg.click('#bSet').catch(() => {}); await pg.waitForTimeout(200);
  const hasUi = await ev(() => ['swAgent', 'swYoutube', 'swVision', 'keyTavily', 'agentStatus'].every(i => !!document.getElementById(i)));
  ok('Agent & API Tools card exists with its switches and key box', hasUi);
  await ev(() => { document.getElementById('swAgent').click(); document.getElementById('swYoutube').click(); document.getElementById('swVision').click(); });
  const st = await ev(() => JSON.parse(localStorage.getItem('ember_set')));
  ok('switches save agentAddon / youtubeAddon / visionAddon', st.agentAddon && st.youtubeAddon && st.visionAddon, st);
  ok('switch classes follow the state', await ev(() => ['swAgent', 'swYoutube', 'swVision'].every(i => document.getElementById(i).classList.contains('on'))));
  await pg.waitForTimeout(300);
  ok('status line shows the native downloader and the last download', /ready/.test(await ev(() => document.getElementById('agentStatus').textContent)) && /Song A/.test(await ev(() => document.getElementById('agentStatus').textContent)), await ev(() => document.getElementById('agentStatus').textContent));
  const sys = await ev(() => Persona.buildSystem({ S: JSON.parse(localStorage.getItem('ember_set')), mem: { facts: [], threads: [], callbacks: [], patterns: {}, moodLog: [], futureLetters: [], deck: [] }, conv: { msgs: [] }, deep: false, lane: 'fast' }));
  ok('prompt lists web_search, youtube_download and see_image with the state line', /web_search/.test(sys) && /youtube_download/.test(sys) && /see_image/.test(sys) && /AGENT TOOLS STATE/.test(sys));
  const sysOff = await ev(() => Persona.buildSystem({ S: {}, mem: { facts: [], threads: [], callbacks: [], patterns: {}, moodLog: [], futureLetters: [], deck: [] }, conv: { msgs: [] }, deep: false, lane: 'fast' }));
  ok('prompt has none of them when the switches are off', !/web_search|youtube_download|see_image/.test(sysOff));

  // ---------- 6. through the chat ----------
  await pg.evaluate(() => { const b = document.getElementById('bSetX') || document.querySelector('#settings .x, #bSx'); if (b) b.click(); });
  await ev(() => { const s = document.getElementById('settings'); if (s) s.classList.add('hidden'); });
  const send = async t => { await pg.fill('#inp', t); await pg.click('#bSend'); await pg.waitForFunction(() => !document.getElementById('typ') && !document.getElementById('bSend').disabled, null, { timeout: 20000 }); await pg.waitForTimeout(400); };
  const before = SEEN.tavily.length;
  MODE.first = '<tool_call>{"tool":"web_search","args":{"query":"mars news"}}</tool_call>';
  await send('search the web for mars news');
  ok('chat: the model asked for web_search and Tavily was called', SEEN.tavily.length == before + 1 && SEEN.tavily[before].body.query == 'mars news', SEEN.tavily.length);
  ok('chat: the model saw the tool result and its answer is shown', /Mock answer\./.test((SEEN.groq[SEEN.groq.length - 1] || {}).last || '') && /Here is what I found/.test(await pg.locator('#log').innerText()));
  const dls = (await ev(() => window.__yt.dl.length));
  MODE.first = '<tool_call>{"tool":"youtube_download","args":{"url":"https://www.youtube.com/watch?v=AAAAAAAAAAA"}}</tool_call>';
  await send('what is the weather like');
  ok('chat: an unprompted youtube_download from the model does nothing', (await ev(() => window.__yt.dl.length)) == dls);
  MODE.first = '';

  ok('no page errors during the whole run', errs.length == 0, errs);
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
