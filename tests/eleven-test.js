// Ember V1.9.2 test: ElevenLabs module. fetch, Audio and localStorage are MOCKED: no network, no credits, nothing is heard.
// Run: node tests/eleven-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = f => fs.readFileSync(path.join(__dirname, '..', 'www', f), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, extra) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (extra || '')); };

function env(opts) {
  opts = opts || {};
  const store = Object.assign({}, opts.ls || {}), calls = [], played = [];
  const win = { };
  const ctx = {
    window: win, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    document: { readyState: 'complete', getElementById: () => null, addEventListener() { } },
    AbortController, setTimeout, clearTimeout, atob: s => Buffer.from(s, 'base64').toString('binary'),
    URL: { createObjectURL: () => 'blob:mock' + calls.length, revokeObjectURL() { } },
    Audio: function (u) { this.url = u; played.push(this); this.pause = () => { this.paused = true; }; this.play = () => { setTimeout(() => this.onended && this.onended(), opts.delay || 5); return Promise.resolve(); }; },
    fetch: async (url, o) => { calls.push({ url, o }); const r = (opts.respond || (() => ({ status: 200 })))(calls.length); return { ok: r.status === 200, status: r.status, text: async () => r.body || '', blob: async () => ({ size: 10 }) }; }
  };
  win.window = win; ctx.window = Object.assign(win, ctx); if (opts.cap) win.Capacitor = opts.cap;
  vm.createContext(ctx);
  vm.runInContext(SRC('ember_eleven_key.js'), ctx); vm.runInContext(SRC('ember_eleven.js'), ctx);
  return { E: ctx.window.EmberEleven, store, calls, played, win: ctx.window };
}
(async () => {
  // key order + switches
  let t = env(); ok('default key present -> ready', t.E.ready() && t.E.key());
  t = env({ ls: { ember_eleven_on: '0' } }); ok('switch off -> not ready', !t.E.ready());
  t = env({ ls: { ELEVENLABS_API_KEY: ' "mine123" ' } });
  await t.E.speak('Hello there.', {});
  ok('saved key beats default and quotes/space are cleaned', t.calls.length === 1 && t.calls[0].o.headers['xi-api-key'] === 'mine123');
  ok('request goes to the right endpoint with mp3 output', /^https:\/\/api\.elevenlabs\.io\/v1\/text-to-speech\/21m00Tcm4TlvDq8ikWAM\?output_format=mp3_44100_128$/.test(t.calls[0].url), t.calls[0].url);
  const body = JSON.parse(t.calls[0].o.body);
  ok('body has text, model and voice settings', body.text === 'Hello there.' && body.model_id === 'eleven_turbo_v2_5' && body.voice_settings.stability === 0.5);
  ok('audio was played', t.played.length === 1);
  t = env({ ls: { ELEVENLABS_VOICE_ID: 'VOICEX', ELEVENLABS_MODEL_ID: 'eleven_flash_v2_5' } });
  await t.E.speak('Hi.', {}); ok('voice and model overrides used', /text-to-speech\/VOICEX\?/.test(t.calls[0].url) && JSON.parse(t.calls[0].o.body).model_id === 'eleven_flash_v2_5');

  // chunking
  const long = ('This is a sentence. ').repeat(120);
  const ch = env().E.chunk(long); ok('long text is cut into pieces of 800 chars or less', ch.length >= 3 && ch.every(c => c.length <= 800), JSON.stringify(ch.map(c => c.length)));
  ok('short text stays one piece', env().E.chunk('One. Two. Three.').length === 1);
  ok('one huge unbroken word is hard-split', env().E.chunk('a'.repeat(2000)).every(c => c.length <= 800));
  t = env(); const r = await t.E.speak(long, {}); ok('long text: several requests, all played in order', r.ok && t.calls.length === ch.length && t.played.length === ch.length);

  // failures
  t = env({ respond: () => ({ status: 401, body: JSON.stringify({ detail: { status: 'invalid_api_key', message: 'Invalid API key' } }) }) });
  let f = await t.E.speak('Hello.', {});
  ok('401 -> ok:false with a clear note', !f.ok && /rejected the key \(HTTP 401\)/.test(f.note) && /phone voice/.test(f.note), f.note);
  ok('401 -> rests, so ready() is false afterwards', !t.E.ready() && t.E.rested());
  ok('check() clears the rest and re-tests', (await t.E.check()).ok === false && t.calls.length === 2);
  t = env({ respond: () => ({ status: 429 }) }); f = await t.E.speak('Hello.', {});
  ok('429 -> rate limit note', !f.ok && /rate limiting/.test(f.note));
  t = env({ respond: () => ({ status: 500, body: 'boom' }) }); f = await t.E.speak('Hello.', {});
  ok('500 -> fails but does not rest', !f.ok && t.E.ready());
  t = env({ respond: () => { throw new Error('offline'); } }); f = await t.E.speak('Hello.', {});
  ok('network failure -> clear note', !f.ok && /Could not reach ElevenLabs/.test(f.note), f.note);

  // stop / cancel
  t = env({ delay: 40 }); const p = t.E.speak(long, {}); setTimeout(() => t.E.stop(), 60); const sr = await p;
  ok('stop() ends reading early', sr.ok && t.played.length < ch.length, t.played.length + ' of ' + ch.length);
  t = env({ delay: 40 }); let alive = true; const p2 = t.E.speak(long, { alive: () => alive }); setTimeout(() => { alive = false; }, 60); await p2;
  ok('alive()=false cancels', t.played.length < ch.length);

  // native path: base64 audio through CapacitorHttp
  const native = { isNativePlatform: () => true, Plugins: { CapacitorHttp: { request: async o => { native.last = o; return { status: 200, data: Buffer.from('mp3bytes').toString('base64') }; } } } };
  t = env({ cap: native }); f = await t.E.speak('Hello.', {});
  ok('native: used CapacitorHttp with blob response, played a data: URI', f.ok && native.last && native.last.responseType === 'blob' && native.last.headers['xi-api-key'] && t.played[0].url.indexOf('data:audio/mpeg;base64,') === 0 && t.calls.length === 0);
  const nativeBad = { isNativePlatform: () => true, Plugins: { CapacitorHttp: { request: async () => ({ status: 401, data: Buffer.from(JSON.stringify({ detail: { message: 'Invalid API key' } })).toString('base64') }) } } };
  t = env({ cap: nativeBad }); f = await t.E.speak('Hello.', {});
  ok('native 401 body (base64 JSON) is decoded into the note', !f.ok && /Invalid API key/.test(f.note), f.note);

  // app.js hook and wiring are present
  const app = SRC('app.js'), html = SRC('index.html'), sw = SRC('sw.js');
  ok('app.js hook: tries ElevenLabs then falls back once', /EmberEleven\.ready\(\)/.test(app) && /__emberElevenSkip = true/.test(app) && /EmberEleven\.stop\(\)/.test(app));
  ok('index.html has the card and both scripts', ['swEleven', 'elKey', 'elCheck', 'ember_eleven_key.js', 'ember_eleven.js'].every(x => html.indexOf(x) >= 0));
  ok('sw.js caches both files and is V1.9.2', /ember_eleven\.js/.test(sw) && /ember_eleven_key\.js/.test(sw) && /ember-v1\.9\.2/.test(sw));
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
