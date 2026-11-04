'use strict';
// V1.10.52: the document fact step adds web-search sources next to Wikipedia and can never hang the turn.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function wikiFetch(hit) {
  let n = 0;
  return async () => { n++; return { json: async () => n % 2 === 1 ? { query: { search: hit ? [{ title: 'Juice Wrld' }] : [] } } : { query: { pages: { 1: { extract: 'Juice Wrld was an American rapper.' } } } } }; };
}
function boot(opts) {
  const store = Object.assign({}, opts.store || {}), window = {};
  window.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
  if (opts.agent) window.EmberAgentAddon = opts.agent;
  if (opts.plusOn) window.EmberPlus = { isOn: id => id === 'web' };
  const ctx = { window, document: { head: { appendChild() {} }, createElement: () => ({}) }, console, URL, Blob, AbortController, clearTimeout,
    setTimeout: (fn, ms) => setTimeout(fn, ms === 20000 ? 20 : ms), fetch: wikiFetch(opts.wiki !== false), localStorage: window.localStorage };
  vm.runInNewContext(fs.readFileSync('www/ember_deliverables.js', 'utf8'), ctx);
  return window.EmberDeliverables;
}
const PROMPT = 'Create a 5 page essay with colours, tables about juice wrld History. A pdf and a Document';
async function run(opts) {
  const D = boot(opts), steps = []; let called = 0;
  if (opts.agent) { const d = opts.agent.dispatch; opts.agent.dispatch = async (...a) => { called++; return d(...a); }; }
  const r = await D.prepare(PROMPT, { step: (ic, text, key, o) => steps.push({ text, key, links: (o && o.links) || [] }) });
  return { r, steps, called };
}
(async () => {
  const good = { dispatch: async () => ({ source: 'Tavily', answer: 'Short summary.', results: [{ title: 'A', url: 'https://a.example/x', snippet: 'alpha' }, { title: 'B', url: 'https://b.example/y', snippet: 'beta' }, { title: 'bad', url: 'javascript:alert(1)', snippet: 'no' }] }), searchChain: () => ['Tavily', 'DuckDuckGo'] };
  let o = await run({ agent: Object.assign({}, good) });
  check('web search runs and its sources reach the prompt', () => { assert.equal(o.called, 1); assert.match(o.r.context, /WEB SEARCH RESULTS \(Tavily\)/); assert.match(o.r.context, /https:\/\/a\.example\/x/); assert.match(o.r.context, /Wikipedia: Juice Wrld/); });
  check('only http(s) results are used', () => { assert.doesNotMatch(o.r.context, /javascript:/); });
  check('the thinking line lists the extra sources as links', () => { const s = o.steps.find(x => /more sources? from Tavily/.test(x.text)); assert.ok(s); assert.equal(s.links.length, 2); });
  o = await run({ agent: { dispatch: async () => ({ error: 'Tavily rejected the key (HTTP 401).' }), searchChain: () => ['Tavily'] } });
  check('a failing search leaves Wikipedia alone and says so', () => { assert.match(o.r.context, /Wikipedia: Juice Wrld/); assert.doesNotMatch(o.r.context, /WEB SEARCH RESULTS/); assert.ok(o.steps.some(x => /found nothing extra/.test(x.text))); });
  o = await run({ agent: { dispatch: () => new Promise(() => {}), searchChain: () => ['Tavily'] } });
  check('a search that never answers is cut off and the turn continues', () => { assert.match(o.r.context, /Wikipedia: Juice Wrld/); assert.ok(o.steps.some(x => /found nothing extra \(no answer after 20 seconds\)/.test(x.text))); });
  o = await run({ agent: Object.assign({}, good), store: { ember_set: JSON.stringify({ agentAddon: false }) } });
  check('Web Search off in settings: no search call is made', () => { assert.equal(o.called, 0); assert.doesNotMatch(o.r.context, /WEB SEARCH RESULTS/); });
  o = await run({ agent: Object.assign({}, good), store: { ember_set: JSON.stringify({ agentAddon: false }) }, plusOn: true });
  check('Web Search pill on overrides the settings switch', () => { assert.equal(o.called, 1); assert.match(o.r.context, /WEB SEARCH RESULTS/); });
  o = await run({ agent: Object.assign({}, good), wiki: false });
  check('no Wikipedia page but search results: sources are still used', () => { assert.doesNotMatch(o.r.context, /NO WEB EVIDENCE could be fetched/); assert.match(o.r.context, /no Wikipedia page was found/); assert.match(o.r.context, /https:\/\/b\.example\/y/); });
  o = await run({ agent: { dispatch: async () => ({ error: 'x' }), searchChain: () => [] }, wiki: false });
  check('nothing found anywhere keeps the old honest message', () => { assert.match(o.r.context, /NO WEB EVIDENCE could be fetched/); });
  o = await run({});
  check('no agent add-on loaded: behaves exactly as V1.10.51', () => { assert.match(o.r.context, /Wikipedia: Juice Wrld/); assert.doesNotMatch(o.r.context, /WEB SEARCH RESULTS/); });
  console.log('passed ' + passed);
})().catch(e => { console.log('FAIL ' + e.message); process.exitCode = 1; });
