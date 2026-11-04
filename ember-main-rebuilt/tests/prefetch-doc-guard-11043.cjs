const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const G = window.EmberGithub, out = {};
    const t = async (k, m, pv) => { const x = await G.prefetch(m, pv || ''); out[k] = { required: x.required, error: x.error, terms: x.terms.length }; };
    await t('uzi_pdf', 'I need a 4 page PDF about Lil Uzi Vert with images i nees Visuals and Various Colours..');
    await t('go_ahead', 'Create', 'make me a 3 page PDF report on solar panels');
    await t('plain_chat', 'tell me a joke about cats');
    await t('code_q', 'fix the bug in my python script');
    out.block_empty = !G.stateBlock().includes('READ-FIRST completed');
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log('page errors:', errs.length, errs.slice(0, 3));
  await b.close();
})();
