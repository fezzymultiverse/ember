// Ember 1.10.57: a key that answers is used again on the next message; the next key is touched ONLY when the current one fails. No network.
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (x || '')); };
const src = fs.readFileSync(path.join(__dirname, '..', 'www', 'providers.js'), 'utf8');
function boot(store, handler) {
  const mem = Object.assign({}, store), sent = [];
  const LS = { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v == null ? null : v)); } };
  const win = { addEventListener() {}, dispatchEvent() {}, Event: function () {}, CustomEvent: function () {} };
  const ctx = { U: { LS }, window: win, performance: { now: () => Date.now() }, AbortController, setTimeout, clearTimeout, console, Event: function () {}, CustomEvent: function () {},
    fetch: async (url, opt) => { const body = opt && opt.body ? JSON.parse(opt.body) : null; const auth = (opt && opt.headers && (opt.headers.Authorization || opt.headers.authorization)) || ''; sent.push({ url, body, auth }); return handler(url, body, auth); } };
  ctx.window = Object.assign(ctx.window, ctx); vm.createContext(ctx); vm.runInContext(src, ctx);
  return { P: ctx.window.Prov, sent, mem };
}
const res = (status, json) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => json, text: async () => JSON.stringify(json) });
const K = n => 'gsk_' + String(n).repeat(28);
const KEYS = { groq: [1, 2, 3].map(n => ({ key: K(n) })) };
const bad = new Set();
const handler = (url, body, auth) => {
  if (/\/models(\?|$)/.test(url)) return res(200, { data: [{ id: 'llama-3.3-70b-versatile' }] });
  const who = [1, 2, 3].find(n => auth.includes(K(n)));
  if (bad.has(who)) return res(429, { error: { message: 'rate limit' } });
  return res(200, { choices: [{ message: { content: 'key' + who } }] });
};
const chatKeys = sent => sent.filter(s => s.body && s.body.messages).map(s => [1, 2, 3].find(n => s.auth.includes(K(n))));
(async () => {
  const { P, sent, mem } = boot({ ember_keys: KEYS }, handler);
  const ask = async () => { sent.length = 0; const r = await P.run('fast', { system: 'S', messages: [{ role: 'user', content: 'hi' }] }); return { r, used: chatKeys(sent) }; };
  let a = await ask(); ok('first message uses key 1', a.used[0] === 1 && a.used.length === 1, JSON.stringify(a.used));
  a = await ask(); ok('second message uses key 1 again (not key 2)', a.used.length === 1 && a.used[0] === 1, JSON.stringify(a.used));
  a = await ask(); ok('third message still key 1', a.used.length === 1 && a.used[0] === 1, JSON.stringify(a.used));
  bad.add(1);
  a = await ask(); ok('key 1 fails -> key 2 answers', a.used[0] === 1 && a.used.includes(2) && /key2/.test(a.r.text), JSON.stringify(a.used));
  a = await ask(); ok('next message starts on key 2, key 1 is NOT retried first', a.used[0] === 2 && a.used.length === 1, JSON.stringify(a.used));
  a = await ask(); ok('key 2 keeps being used while it works', a.used[0] === 2 && a.used.length === 1, JSON.stringify(a.used));
  bad.add(2);
  a = await ask(); ok('key 2 fails -> key 3 answers (key 1 is resting)', a.used.includes(3) && !a.used.includes(1), JSON.stringify(a.used));
  a = await ask(); ok('key 3 becomes the sticky key', a.used[0] === 3 && a.used.length === 1, JSON.stringify(a.used));
  const st = mem.ember_key_sticky || {};
  ok('only the last 8 characters of the key are stored for stickiness', st.groq && st.groq.length === 8 && !JSON.stringify(mem.ember_key_sticky).includes(K(3)), JSON.stringify(st));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
