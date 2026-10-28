// Ember V1.9.78: Puter as an engine, and "stay on the engine that last answered". Pure Node, no network.
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (x || '')); };
const src = fs.readFileSync(path.join(__dirname, '..', 'www', 'providers.js'), 'utf8');
function boot(store, handler, puter) {
  const mem = Object.assign({}, store), sent = [];
  const LS = { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v == null ? null : v)); } };
  const win = { addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  if (puter) win.puter = puter;
  const ctx = { U: { LS }, window: win, performance: { now: () => Date.now() }, AbortController, setTimeout, clearTimeout, console, CustomEvent: function () {},
    fetch: async (url, opt) => { const body = opt && opt.body ? JSON.parse(opt.body) : null; sent.push({ url, body }); return handler(url, body); } };
  ctx.window = Object.assign(ctx.window, ctx); vm.createContext(ctx); vm.runInContext(src, ctx);
  return { P: ctx.window.Prov, sent, mem };
}
const res = (status, json) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => json, text: async () => JSON.stringify(json) });
const handler = (url, body) => {
  if (/\/models(\?|$)/.test(url)) return res(200, { data: [{ id: url.includes('groq') ? 'llama-3.3-70b-versatile' : 'mistral-small-latest' }] });
  if (url.includes('groq')) return res(503, { error: { message: 'overloaded' } });
  return res(200, { choices: [{ message: { content: 'hi from mistral' } }] });
};
const KEYS = { groq: [{ key: 'gsk_AAAAAAAAAAAAAAAAAAAAAAAAAAAA' }], mistral: [{ key: 'm'.repeat(32) }] };
const q = { system: 'BASE', messages: [{ role: 'user', content: 'hi' }] };
(async () => {
  // sticky: groq is down, mistral answers; the next message starts at mistral, not groq
  let { P, sent, mem } = boot({ ember_keys: KEYS }, handler);
  let r = await P.run('fast', q);
  ok('failover answered by mistral', r.provider == 'mistral', r.provider);
  ok('last good engine remembered', mem.ember_last_good == 'mistral');
  sent.length = 0; r = await P.run('fast', q);
  const firstChat = sent.find(s => s.body && s.body.messages);
  ok('next message starts at mistral', firstChat && firstChat.url.includes('mistral'), firstChat && firstChat.url);
  ok('groq was not retried first', !sent.some(s => s.url.includes('groq') && s.body && s.body.messages));
  // util lane never changes or follows the sticky choice
  ({ P, sent, mem } = boot({ ember_keys: KEYS }, handler)); await P.run('util', q);
  ok('util lane does not record a last-good engine', !mem.ember_last_good);
  // Puter: connected + signed in answers when the engines before it fail
  const puter = { auth: { isSignedIn: async () => true }, ai: { chat: async () => ({ message: { content: 'hi from puter' } }) } };
  ({ P, sent, mem } = boot({ ember_keys: { groq: KEYS.groq }, ember_puter_on: true }, handler, puter));
  ok('Puter shows as connected', P.puterOn() === true && P.keys().puter.length == 1);
  r = await P.run('fast', q);
  ok('Puter answers after groq fails', r.provider == 'puter' && /hi from puter/.test(r.text), JSON.stringify(r).slice(0, 120));
  // Puter streaming sends chunks to the UI
  const chunks = []; const puterS = { auth: { isSignedIn: async () => true }, ai: { chat: async (m, o) => (o.stream ? (async function* () { yield { text: 'a' }; yield { text: 'b' }; })() : null) } };
  ({ P } = boot({ ember_keys: { groq: KEYS.groq }, ember_puter_on: true }, handler, puterS));
  r = await P.run('fast', Object.assign({ onToken: (d, t) => chunks.push(t) }, q));
  ok('Puter stream reaches the UI', r.text == 'ab' && chunks.join('|') == 'a|ab', chunks.join('|'));
  // Puter signed out never blocks: the router moves on and reports the real reason
  const puterOut = { auth: { isSignedIn: async () => false }, ai: { chat: async () => { throw new Error('should not be called'); } } };
  ({ P, sent } = boot({ ember_keys: { groq: KEYS.groq }, ember_puter_on: true }, handler, puterOut));
  let err = null, rr = null; try { rr = await P.run('fast', q); } catch (e) { err = e; }
  ok('signed-out Puter is skipped, not called', !(rr && rr.provider == 'puter') && !(err && /should not be called/.test(err.message)), JSON.stringify(rr || (err && err.message)).slice(0, 160)); console.log('  (answered by: ' + (rr ? rr.provider : 'error: ' + err.message.slice(0, 100)) + ')');
  // Puter off: it is not in the route at all
  ({ P } = boot({ ember_keys: KEYS }, handler, puter));
  ok('Puter is absent until connected', P.keys().puter.length == 0);
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
