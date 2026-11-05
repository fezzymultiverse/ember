'use strict';
// V1.10.54: a file request is written directly, "a pdf and a Document" gives one document with both buttons,
// and the last-resort document is built from the evidence (never "the add-on came back empty").
const fs = require('fs'), vm = require('vm'), assert = require('assert');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS ' + name); }
const WIKI = 'Juice Wrld was an American rapper.\n\nEarly life\n\nHe was born in Chicago and began recording as a teenager. He released his first mixtapes online.\n\nCareer\n\nHe signed a record deal and released an album that reached a wide audience. His music blended emo and hip hop.\n\nLegacy\n\nHis catalogue continues to be released and discussed by fans and critics.';
let n = 0;
const wikiFetch = async () => { n++; return { json: async () => n % 2 === 1 ? { query: { search: [{ title: 'Juice Wrld' }] } } : { query: { pages: { 1: { extract: WIKI } } } } }; };
const window = {};
window.localStorage = { getItem: () => null, setItem() {} };
window.EmberAgentAddon = { searchChain: () => ['Tavily'], dispatch: async () => ({ source: 'Tavily', results: [{ title: 'A', url: 'https://a.example/x', snippet: 'alpha' }] }) };
const ctx = { window, document: { head: { appendChild() {} }, createElement: () => ({}) }, console, URL, Blob, AbortController, clearTimeout, setTimeout, fetch: wikiFetch, localStorage: window.localStorage };
vm.runInNewContext(fs.readFileSync('www/ember_deliverables.js', 'utf8'), ctx);
const D = window.EmberDeliverables;
const PROMPT = 'Create a 5 page essay with colours ,tables,Layouts, images about juice wrld History.... A pdf and a Document';
check('"a pdf and a Document" is ONE document artifact (Save PDF + Word)', () => { assert.equal(D.intent(PROMPT).type, 'document'); });
check('"make a pdf of my notes" stays a pdf', () => { assert.equal(D.intent('make a pdf of my notes').type, 'pdf'); });
check('"pdf and word" and "word and pdf" are documents', () => { assert.equal(D.intent('create a report as pdf and word').type, 'document'); assert.equal(D.intent('write a cv, word and pdf please').type, 'document'); });
check('a plain essay stays a document', () => { assert.equal(D.intent('write an essay about rivers').type, 'document'); });
check('page target still reads 5', () => { assert.equal(D.pageTarget(PROMPT, []), 5); });
(async () => {
  const web = await D.prepare(PROMPT, {});
  const src = fs.readFileSync('www/app.js', 'utf8');
  const a = src.indexOf('  function localDoc() {'), b = src.indexOf('  // V1.10.18-p12 Music Brain');
  assert.ok(a > 0 && b > a, 'localDoc found in app.js');
  const t = '(' + (() => 0).toString() + ')';
  const code = src.slice(a, b);
  const env = { isFile: true, verbatim: [], Safety: { lastLevel: () => 0 }, route: { webEvidence: web.context }, lastAsk: PROMPT, conv: { msgs: [] }, window, clip: null };
  const out = vm.runInNewContext('(function(){' + code + '; return localDoc(); })()', env);
  check('fallback builds a document artifact from the evidence', () => { assert.match(out, /<artifact type="document" title="Juice Wrld\.md">/); assert.match(out, /<\/artifact>/); });
  check('fallback has headings, sources table and the web source', () => { assert.match(out, /## Early life/); assert.match(out, /## Career/); assert.match(out, /\| 1 \| Wikipedia: Juice Wrld \|/); assert.match(out, /https:\/\/a\.example\/x/); });
  check('fallback says honestly how it was made', () => { assert.match(out, /built it straight from the sources/); });
  const none = vm.runInNewContext('(function(){' + code + '; return localDoc(); })()', Object.assign({}, env, { route: { webEvidence: '' } }));
  check('no evidence: no fake document', () => { assert.equal(none, ''); });
  const off = vm.runInNewContext('(function(){' + code + '; return localDoc(); })()', Object.assign({}, env, { isFile: false }));
  check('not a file request: no document', () => { assert.equal(off, ''); });
  const ps = fs.readFileSync('www/persona.js', 'utf8');
  check('persona: file request turns the tool catalog and tool block off', () => { assert.match(ps, /noTools: crisis \|\| !!fileAsk/); assert.match(ps, /!directive && !fileAsk && lastUser && window\.EmberToolCatalog/); });
  check('app: tool-call answer to a file request goes straight to writing the file', () => { assert.match(src, /if \(isFile && calls\.length && !hasArt\(cur\)/); });
  console.log('\n' + passed + ' checks passed');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
