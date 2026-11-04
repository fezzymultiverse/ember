const { chromium } = require('playwright');
const PORT = process.argv[2] || 8766;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:' + PORT + '/index.html'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const D = window.EmberDeliverables, A = window.EmberArtifacts, out = {}, urls = [];
    const P4 = 'I need a 4 page PDF about Lil Uzi Vert with images i nees Visuals and Various Colours..';
    // 1 page fit
    const tag = '<artifact type="pdf" title="Uzi.pdf" cover="true" toc="true" theme="violet">\n# T\n\n## A\ntext\n</artifact>';
    const n1 = D.normalize(tag, P4); out.fit_tag = (n1.match(/<artifact[^>]*>/) || [''])[0];
    out.fit_kept_when_asked = /cover="true"/.test(D.normalize(tag, 'make a 4 page pdf with a cover page'));
    out.fit_ignores_no_pages = /cover="true"/.test(D.normalize(tag, 'make a pdf about uzi'));
    out.note = /exactly 4 pages/.test(D.pageNote(4)) && /cover="false" toc="false"/.test(D.pageNote(4)) && /1920 words/.test(D.pageNote(4));
    // 2 visual gap
    const words = n => Array.from({ length: n }, (_, i) => 'word' + i).join(' ');
    const mk = body => '<artifact type="pdf" title="x.pdf">\n# T\n\n## A\n' + body + '\n</artifact>';
    out.gap_short_noblocks = D.visualGap(mk(words(300)), P4, []);
    out.gap_ok = D.visualGap(mk(words(1700) + '\n\n```stats\nA: 1\nB: 2\nC: 3\n```'), P4, []);
    out.gap_blocks_but_short = !!D.visualGap(mk(words(300) + '\n\n```chart\ntype: bar\nA: 1\n```'), P4, []);
    out.gap_non_visual_prompt = D.visualGap(mk(words(300)), 'I need a 4 page PDF about solar panels', '');
    // 3 facts
    const realFetch = window.fetch;
    window.fetch = async (u) => { urls.push(String(u)); const j = /list=search/.test(u) ? { query: { search: [{ title: 'Lil Uzi Vert' }] } } : { query: { pages: { 1: { extract: 'Symere Bysil Woods (born July 31, 1994) is an American rapper from Philadelphia.' } } } }; return { json: async () => j }; };
    const f = await D.prepare(P4, {}); out.facts_ctx = { rule: /FACT RULES/.test(f.context), evidence: /Symere Bysil Woods/.test(f.context), query: urls[0] && decodeURIComponent(urls[0].split('srsearch=')[1]) };
    urls.length = 0; const f2 = await D.prepare('write a report about my day please', {}); out.facts_none_for_my = f2.context === '' && !urls.length;
    urls.length = 0; const f3 = await D.prepare('how do I make a pdf', {}); out.facts_none_for_question = f3.context === '' && !urls.length;
    window.fetch = async () => { throw new Error('offline'); }; const f4 = await D.prepare(P4, {}); out.facts_offline = /NO WEB EVIDENCE/.test(f4.context) && /FACT RULES/.test(f4.context);
    window.fetch = realFetch;
    // 4 engine: toc/cover false really removes front matter
    const md = '# Title\n\n' + ['A','B','C','D','E'].map(h => '## ' + h + '\n\n' + 'lorem ipsum dolor sit amet '.repeat(60)).join('\n\n');
    const def = (o) => D.pdfDefinition(md, 'Uzi.pdf', Object.assign({ structured: true }, o));
    const has = d => JSON.stringify(d.content).includes('"toc"') ;
    out.engine_default_has_toc = has(def({})); out.engine_false_has_toc = has(def({ toc: false, cover: false }));
    out.engine_false_content_first = Object.keys(def({ toc: false, cover: false }).content[0] || {}).join(',').slice(0, 60);
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log('page errors:', errs.length, errs.slice(0, 3));
  await b.close();
})();
