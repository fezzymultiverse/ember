const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:' + process.argv[2] + '/index.html'); await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    const R = window.Prov._rank, out = {};
    const groq = ['canopylabs/orpheus-v1-english', 'canopylabs/orpheus-arabic-saudi', 'meta-llama/llama-prompt-guard-2-86m', 'openai/gpt-oss-safeguard-20b', 'whisper-large-v3', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'meta-models/muse-spark-open'];
    out.groq = R('groq', groq, 'fast');
    out.groq_with_llama = R('groq', groq.concat(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']), 'fast').slice(0, 3);
    const gem = ['gemini-4-argon', 'gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-transcribe', 'gemini-3.8-live', 'gemini-3.5-live-translate-preview', 'gemini-3.1-flash-image', 'gemini-nano-banana-2.1'];
    out.gemini_fast = R('gemini', gem, 'fast'); out.gemini_deep = R('gemini', gem, 'deep');
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log('page errors:', errs.length);
  await b.close();
})();
