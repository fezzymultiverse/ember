// Ember V1.10.47 - tappable search sources in the thinking timeline. Headless Chromium, offline (icon host is intercepted).
// Usage: node tests/sources-11047-browser-test.cjs [screenshot-dir]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');
const www = path.resolve(__dirname, '..', 'www');
const shotDir = process.argv[2] ? path.resolve(process.argv[2]) : '';
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); } };

(async () => {
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'ember-src-'));
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<link rel="stylesheet" href="file://' + www + '/style.css"></head><body style="background:#0b0b0c;margin:0">'
    + '<div id="empty"></div><div id="log" style="padding:14px;height:100vh;overflow:auto"></div>'
    + '<script src="file://' + www + '/ember_timeline.js"></script></body></html>';
  fs.writeFileSync(path.join(tmp, 'h.html'), html);

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [], ext = [];
  p.on('pageerror', e => errs.push(String(e)));
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await p.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('file://')) return route.continue();
    ext.push(u);
    if (/icons\.duckduckgo\.com\/ip3\/docs\.broken-site\.example/.test(u)) return route.abort();
    if (/icons\.duckduckgo\.com\//.test(u)) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    return route.abort();
  });
  await p.goto('file://' + path.join(tmp, 'h.html'));
  await p.evaluate(() => { window.__opened = []; window.open = (u, t, f) => { window.__opened.push([u, t, f]); return {}; }; });

  console.log('1. live card');
  const info = await p.evaluate(() => {
    const TL = window.EmberTimeline; TL.begin();
    const h = TL.tool('web_search', { query: 'ember app news' });
    h.end({ results: [
      { title: 'Ember launches new engine', url: 'https://www.example.com/news/ember?utm=1#top', snippet: 'a' },
      { title: 'Same page, other fragment', url: 'https://example.com/news/ember#other', snippet: 'dup' },
      { title: 'A very long title that should be clipped to two lines on a phone because nobody wants a wall of text in a thinking card row', url: 'https://docs.broken-site.example/path/page', snippet: 'b' },
      { title: 'Evil', url: 'javascript:alert(1)', snippet: 'x' },
      { title: 'Data', url: 'data:text/html,<script>1</script>', snippet: 'x' },
      { title: 'Intranet', url: 'http://localhost/admin', snippet: 'x' },
      { title: 'Quote "break" <b>out</b>', url: 'https://wikipedia.org/wiki/Fire?x="onmouseover="alert(1)', snippet: 'q' }
    ] });
    const h2 = TL.tool('web_search', { query: 'fails' }); h2.end({ error: 'Tavily rejected the key' });
    const h3 = TL.tool('search_and_read', { query: 'deep' });
    h3.end({ pages: [{ url: 'https://news.site.org/a', title: 'Page A' }, { url: 'https://news.site.org/b', title: 'Page B', error: 'x' }], also_found: [{ title: 'Extra', url: 'https://extra.net/z' }] });
    const h4 = TL.tool('get_library', {}); h4.end({ tracks: [{ url: 'https://not-a-search.com/x', title: 'no' }] });
    TL.flush();
    return { rows: document.querySelectorAll('.ek-row').length, srcs: document.querySelectorAll('.ek-src').length, links: Array.from(document.querySelectorAll('.ek-src')).map(d => d.querySelectorAll('a.ek-link').length), labels: Array.from(document.querySelectorAll('.ek-src summary')).map(s => s.textContent.trim()) };
  });
  ok('four tool rows drawn', info.rows >= 4, JSON.stringify(info));
  ok('only the two successful search rows get a sources list (failed and non-search rows get none)', info.srcs === 2, JSON.stringify(info));
  ok('web_search: javascript:, data:, localhost dropped; duplicate page merged; 3 kept', info.links[0] === 3, JSON.stringify(info.links));
  ok('search_and_read: pages + also_found give 3', info.links[1] === 3, JSON.stringify(info.links));
  ok('summary reads "3 sources" / "3 sources"', info.labels[0] === '3 sources' && info.labels[1] === '3 sources', JSON.stringify(info.labels));

  console.log('2. tapping');
  const closed = await p.evaluate(() => document.querySelector('.ek-src').open);
  ok('sources start collapsed', closed === false);
  await p.tap('.ek-src > summary');
  await p.waitForTimeout(150);
  ok('tap on the summary expands the list', await p.evaluate(() => document.querySelector('.ek-src').open === true));
  ok('the thinking card itself stays open', await p.evaluate(() => !!document.querySelector('.et-inner.et-open')));
  await p.waitForTimeout(400);
  const hrefs = await p.evaluate(() => Array.from(document.querySelectorAll('.ek-src')[0].querySelectorAll('a.ek-link')).map(a => a.getAttribute('href')));
  ok('every href is plain https', hrefs.every(h => /^https:\/\//.test(h)), JSON.stringify(hrefs));
  ok('the quote-breaking URL stayed one attribute (no injected handler)', await p.evaluate(() => !document.querySelector('[onmouseover]')));
  await p.tap('.ek-src a.ek-link');
  await p.waitForTimeout(100);
  const opened = await p.evaluate(() => window.__opened);
  ok('tapping a source opens it once through window.open, new tab, noopener', opened.length === 1 && opened[0][0] === hrefs[0] && opened[0][1] === '_blank' && /noopener/.test(opened[0][2]), JSON.stringify(opened));
  ok('page did not navigate away', await p.evaluate(() => location.href.startsWith('file://')));

  console.log('3. icons');
  await p.waitForTimeout(600);
  const icons = await p.evaluate(() => Array.from(document.querySelectorAll('.ek-src')[0].querySelectorAll('.ek-fav')).map(f => ({ letter: f.classList.contains('ek-fav-l'), txt: f.textContent.trim(), img: !!f.querySelector('img') })));
  ok('site icons come from the icon service, one per link', ext.some(u => /icons\.duckduckgo\.com\/ip3\/example\.com\.ico/.test(u)), JSON.stringify(ext.slice(0, 5)));
  ok('a host whose icon fails becomes a letter chip ("B")', icons.some(i => i.letter && i.txt === 'B' && !i.img), JSON.stringify(icons));
  ok('other hosts keep their image', icons.filter(i => i.img).length >= 2, JSON.stringify(icons));
  ok('only the icon host was contacted (nothing else leaves the page)', ext.every(u => /^https:\/\/icons\.duckduckgo\.com\//.test(u)), JSON.stringify(ext.filter(u => !/icons\.duckduckgo\.com/.test(u))));
  if (shotDir) { fs.mkdirSync(shotDir, { recursive: true }); await p.screenshot({ path: path.join(shotDir, 'sources-live-open.png') }); }

  console.log('4. saved with the reply');
  const saved = await p.evaluate(() => {
    const TL = window.EmberTimeline, snap = JSON.parse(JSON.stringify(TL.snapshot())); // survives storage
    const withLinks = snap.lines.filter(l => Array.isArray(l[8])).length;
    TL.drop(); document.getElementById('log').innerHTML = TL.savedHtml(snap);
    return { withLinks, srcs: document.querySelectorAll('.ek-saved .ek-src').length, anchors: document.querySelectorAll('.ek-saved a.ek-link').length, size: JSON.stringify(snap).length };
  });
  ok('snapshot keeps links on exactly the two search rows', saved.withLinks === 2, JSON.stringify(saved));
  ok('"Thought for Xs" shows the same two lists with 6 links', saved.srcs === 2 && saved.anchors === 6, JSON.stringify(saved));
  console.log('       saved timeline size: ' + saved.size + ' bytes');
  await p.evaluate(() => { document.querySelector('.ek-saved').open = true; });
  await p.tap('.ek-saved .ek-src > summary'); await p.waitForTimeout(150);
  ok('saved list expands on tap without closing the saved card', await p.evaluate(() => document.querySelector('.ek-saved .ek-src').open === true && document.querySelector('.ek-saved').open === true));
  await p.evaluate(() => { window.__opened.length = 0; });
  await p.tap('.ek-saved a.ek-link'); await p.waitForTimeout(100);
  ok('saved link opens too', await p.evaluate(() => window.__opened.length === 1));
  if (shotDir) await p.screenshot({ path: path.join(shotDir, 'sources-saved-open.png') });

  console.log('5. old saved turns still render');
  const old = await p.evaluate(() => { const TL = window.EmberTimeline; const h = TL.savedHtml({ ms: 1200, lines: [['Searching the web: “x”', 0, 'a', '', '', 'web_search', '', ''], ['plain thought', 0, 't']] }); document.getElementById('log').innerHTML = h; return { rows: document.querySelectorAll('.ek-row').length, srcs: document.querySelectorAll('.ek-src').length }; });
  ok('a turn saved by 1.10.46 (no links field) renders with no sources and no errors', old.rows === 2 && old.srcs === 0, JSON.stringify(old));

  console.log('6. helpers');
  const h = await p.evaluate(() => { const TL = window.EmberTimeline; return { n: TL._linksOf({ results: new Array(20).fill(0).map((_, i) => ({ title: 't' + i, url: 'https://s' + i + '.com/p' })) }).length, bad: TL._linksOf(null).length + TL._linksOf({ error: 'x', results: [{ url: 'https://a.com' }] }).length + TL._linksOf({ results: 'nope' }).length, s: [TL._safeUrl('ftp://a.com/x'), TL._safeUrl('//a.com'), TL._safeUrl('https://a'), TL._safeUrl('  https://a.com/x  ')] }; });
  ok('capped at 8 links', h.n === 8, String(h.n));
  ok('null, error and malformed results give none', h.bad === 0, String(h.bad));
  ok('safeUrl: ftp, protocol-relative, dotless host rejected; padded https accepted', !h.s[0] && !h.s[1] && !h.s[2] && h.s[3] === 'https://a.com/x', JSON.stringify(h.s));

  ok('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
