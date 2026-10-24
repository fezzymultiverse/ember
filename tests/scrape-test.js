// Ember V1.8.2 scrape test: pure Node, no network. Mocks fetch and checks which provider the scraper really calls.
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (x || '')); };
const src = fs.readFileSync(path.join(__dirname, '..', 'www', 'ai_scraper.js'), 'utf8');
const BODY = '# Page\n\n' + 'Real page text that is long enough to count as a page. '.repeat(20);
function boot(keys, handler, reader) {
  const mem = { ember_scrape: JSON.stringify({ on: true, reader: reader !== false, keys }) }, sent = [];
  const localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const ctx = { localStorage, window: {}, console, setTimeout, clearTimeout, AbortController, URL, encodeURIComponent,
    fetch: async (url, opt) => { sent.push(url); return handler(url, opt); } };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  return { S: ctx.window.EmberScraper, sent };
}
const res = (status, text) => ({ ok: status < 300, status, headers: { get: () => 'text/html' }, json: async () => JSON.parse(text), text: async () => text });
const who = url => /firecrawl/.test(url) ? 'firecrawl' : /browserless/.test(url) ? 'browserless' : /zenrows/.test(url) ? 'zenrows' : /jina/.test(url) ? 'reader' : /scrapingbee/.test(url) ? 'scraperbee' : 'other';
const okHandler = (url, opt) => /firecrawl/.test(url) ? res(200, JSON.stringify({ success: true, data: { markdown: BODY } })) : res(200, BODY);

(async () => {
  let t = boot({ firecrawl: 'k1', browserless: 'k2', zenrows: 'k3' }, okHandler);
  ok('plan lists keyed providers before the reader', JSON.stringify(t.S.plan(true)) == '["firecrawl","browserless","zenrows","reader"]', JSON.stringify(t.S.plan(true)));
  const first = [];
  for (let i = 0; i < 6; i++) { const r = await t.S.scrape_url('https://example.com/p' + i, 'x'); first.push(r.provider); }
  ok('every call is answered by a keyed provider, never the free reader', first.every(p => p != 'Free reader' && !/Free reader/.test(p)), first.join(','));
  ok('keys take turns: all three used in 6 calls', new Set(first).size == 3, first.join(','));
  ok('no free-reader route was touched while keys worked', !t.sent.some(u => /jina|allorigins/.test(u)));

  t = boot({ firecrawl: 'k1', browserless: 'k2' }, (url, opt) => /firecrawl/.test(url) ? res(401, '{}') : okHandler(url, opt));
  const outs = []; for (let i = 0; i < 4; i++) outs.push(await t.S.scrape_url('https://example.com/r' + i, 'x'));
  ok('every call still gets a page: a rejected key falls to the next keyed provider', outs.every(r => /Browserless/.test(r.provider)), outs.map(r => r.provider).join(','));
  ok('the result says which provider was skipped and why', outs.some(r => (r.tried || []).some(x => /Firecrawl: key rejected/.test(x))), JSON.stringify(outs.map(r => r.tried)));
  ok('a rejected key is not called again for 10 minutes', t.sent.filter(u => /firecrawl/.test(u)).length == 1, String(t.sent.filter(u => /firecrawl/.test(u)).length));

  t = boot({ firecrawl: 'k1' }, (url, opt) => /firecrawl/.test(url) ? res(503, '{}') : okHandler(url, opt));
  await t.S.scrape_url('https://example.com/a', 'x');
  ok('a 5xx is NOT retried on the same paid key (no double bill)', t.sent.filter(u => /firecrawl/.test(u)).length == 1, String(t.sent.length));
  ok('then the free reader is the fallback', t.sent.some(u => /jina|example\.com/.test(u) && !/firecrawl/.test(u)));

  t = boot({ zenrows: 'k3' }, okHandler);
  const z = await t.S.scrape_url('https://example.com/z', 'x');
  ok('ZenRows first pass has no JS rendering when the page is full', !/js_render/.test(t.sent[0]) && t.sent.length == 1 && /ZenRows/.test(z.provider), t.sent.join(' | '));
  t = boot({ zenrows: 'k3' }, (url) => res(200, 'tiny'));
  await t.S.scrape_url('https://example.com/z', 'x').catch(() => {});
  ok('ZenRows pays for JS rendering only after a thin first pass', t.sent.length >= 2 && !/js_render/.test(t.sent[0]) && /js_render=true/.test(t.sent[1]), t.sent.join(' | '));

  t = boot({ firecrawl: 'k1' }, okHandler);
  await t.S.scrape_url('https://example.com/same', 'x'); const again = await t.S.scrape_url('https://example.com/same', 'x');
  ok('same page within 3 minutes is served from cache (one paid call)', t.sent.length == 1 && again.cached === true, String(t.sent.length));
  await t.S.scrape_url('https://example.com/same', 'x', undefined, undefined, { fresh: true });
  ok('reload (fresh) bypasses the cache', t.sent.length == 2, String(t.sent.length));

  t = boot({}, okHandler, true);
  ok('with no keys the free reader still works', JSON.stringify(t.S.plan(true)) == '["reader"]');
  t = boot({ firecrawl: 'k1' }, okHandler, false);
  ok('with the reader switched off only keys are planned', JSON.stringify(t.S.plan(true)) == '["firecrawl"]');
  const forced = await boot({ firecrawl: 'k1', browserless: 'k2' }, okHandler).S.scrape_url('https://example.com/f', 'x', undefined, 'browserless');
  ok('naming a provider runs only that one', /Browserless/.test(forced.provider));
  const st = boot({ firecrawl: 'k1' }, okHandler).S.selfTest();
  // the html and key-cleaner checks need a browser DOM (DOMParser) and already fail in plain Node before V1.8.2; they run in app-test (Chromium)
  ok('built-in self test: the new provider-plan check passes', (st.find(x => /^plan:/.test(x.name)) || {}).ok === true, JSON.stringify(st.filter(x => !x.ok)));
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
