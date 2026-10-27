// V1.9.48: routing advances after transient model errors and preserves bounded Retry-After metadata.
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (x || '')); };
const src = fs.readFileSync(path.join(__dirname, '..', 'www', 'providers.js'), 'utf8');
function boot(handler) {
  const mem = { ember_keys: { groq: [{ key: 'gsk_' + 'a'.repeat(28) }], mistral: [{ key: 'm'.repeat(32) }] } }, sent = [];
  const LS = { get: (k, d) => k in mem ? JSON.parse(JSON.stringify(mem[k])) : d, set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)); } };
  const win = { addEventListener() {}, dispatchEvent() {}, Event: function(){}, CustomEvent: function(){} };
  const ctx = { U: { LS }, window: win, performance: { now: () => Date.now() }, AbortController, setTimeout, clearTimeout, console, Event: function(){}, CustomEvent: function(){}, fetch: async (url, opt) => { sent.push({url,opt}); return handler(url,opt); } };
  ctx.window = Object.assign(ctx.window, ctx); vm.createContext(ctx); vm.runInContext(src, ctx); return { P: ctx.window.Prov, sent };
}
const res = (status, data, headers={}) => ({ ok: status >= 200 && status < 300, status, headers: { get: k => headers[k.toLowerCase()] || null }, json: async () => data, text: async () => JSON.stringify(data) });
(async () => {
  const { P, sent } = boot((url, opt) => {
    if (url.endsWith('/models')) return res(200, { data: [{id: url.includes('groq') ? 'llama-3.3-70b-versatile' : 'mistral-small-latest'}] });
    if (url.includes('groq')) return res(503, { error: { message: 'temporarily unavailable' } });
    return res(200, { choices: [{ message: { content: 'Mistral recovered the turn' } }] });
  });
  const r = await P.run('fast', { system: 'test', messages: [{role:'user',content:'hello'}] });
  ok('503 advances to next configured provider', r.provider === 'mistral', r.provider);
  ok('fallback returns the successful response', /recovered/.test(r.text), r.text);
  ok('both providers were attempted', sent.some(x => x.url.includes('groq')) && sent.some(x => x.url.includes('mistral')));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
