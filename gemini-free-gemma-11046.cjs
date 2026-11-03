// V1.10.46 - Gemini free-key detection + Gemma. Runs providers.js in Node with a mocked network (no app, no browser, no real calls).
// usage: node tests/gemini-free-gemma-11046.cjs
const vm = require('vm'), fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'www', 'providers.js'), 'utf8');
let pass = 0, fail = 0; const bad = [];
const ok = (c, name, extra) => { if (c) pass++; else { fail++; bad.push(name + (extra ? ' :: ' + extra : '')); } };

function make(mock) {
  const store = {}, calls = [], ctxWin = { dispatchEvent() {}, addEventListener() {} };
  const U = { LS: { get: (k, d) => (k in store ? JSON.parse(store[k]) : d), set: (k, v) => { store[k] = JSON.stringify(v); }, del: k => { delete store[k]; } } };
  const fetchMock = async (url, opt) => {
    opt = opt || {}; const body = opt.body ? JSON.parse(opt.body) : null; const rec = { url, method: opt.method || 'GET', body, model: (/models\/([^:/?]+):generateContent/.exec(url) || [])[1] || null };
    calls.push(rec); const r = await mock(rec, opt);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, headers: { get: k => (r.headers || {})[String(k).toLowerCase()] || null }, text: async () => typeof r.data === 'string' ? r.data : JSON.stringify(r.data), json: async () => r.data };
  };
  const ctx = vm.createContext({ U, window: ctxWin, performance, fetch: fetchMock, AbortController, setTimeout, clearTimeout, console, Event: class {}, CustomEvent: class {}, TextDecoder, URL, Promise });
  vm.runInContext(SRC, ctx, { filename: 'providers.js' });
  return { P: ctxWin.Prov, calls, store };
}
const LIST = ['gemini-4-argon', 'gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-transcribe', 'gemini-3.8-live', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it', 'gemma-4-embedding'];
const modelsBody = list => ({ models: list.map(n => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] })) });
const e429 = (metric, id, val) => ({ status: 429, data: { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'You exceeded your current quota. Quota exceeded for metric: ' + metric + (val === '0' ? ', limit: 0' : ''), details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: metric, quotaId: id, quotaValue: val }] }] } } });
const answer = t => ({ status: 200, data: { candidates: [{ content: { parts: [{ text: t }] } }] } });
const FREE_NO = e429('generativelanguage.googleapis.com/generate_content_free_tier_requests', 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', '0');
const FREE_CAP = e429('generativelanguage.googleapis.com/generate_content_free_tier_requests', 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', '20');
const PAID_RATE = e429('generativelanguage.googleapis.com/generate_content_paid_tier_requests', 'GenerateRequestsPerMinutePerProjectPerModel-PaidTier', '1000');
const KEY = 'AIzaSyTESTKEY000000000000000000000000';
const REQ = { system: 'You are Ember.', messages: [{ role: 'user', content: 'hi' }] };
const gen = (calls) => calls.filter(c => c.model).map(c => c.model);
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // 1. ranking with Gemma
  { const { P } = make(async () => ({ status: 200, data: {} })); const R = P._rank;
    const f = R('gemini', LIST, 'fast'), d = R('gemini', LIST, 'deep');
    ok(f.slice(0, 6).join() === 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemma-4-31b-it,gemma-4-26b-a4b-it', 'fast order', f.join());
    ok(f[6] === 'gemini-4-argon' && f[7] === 'gemini-3.1-pro-preview', 'fast: paid-only after Gemma', f.join());
    ok(d[0] === 'gemini-4-argon' || /pro|argon/.test(d[0]), 'deep: Pro/Argon first on an unknown key', d.join());
    ok(d.slice(-2).join() === 'gemma-4-31b-it,gemma-4-26b-a4b-it', 'deep: Gemma last', d.join());
    ok(![...f, ...d].some(m => /transcribe|live|embedding/.test(m)), 'no speech/live/embedding models');
    const e = { tier: 'free', tierAt: Date.now(), noFree: [] };
    ok(P._gemAdjust(e, d).slice(-2).join() === 'gemini-4-argon,gemini-3.1-pro-preview' || P._gemAdjust(e, d).slice(-2).every(m => /pro|argon/.test(m)), 'free key: Pro/Argon to the back', P._gemAdjust(e, d).join());
    ok(P._gemAdjust({}, d).join() === d.join(), 'unknown key: order unchanged');
    ok(P._gemAdjust({ tier: 'paid', tierAt: Date.now() }, d).join() === d.join(), 'paid key: order unchanged');
    ok(P._gemAdjust({ tier: 'free', tierAt: Date.now() - 8 * 864e5 }, d).join() === d.join(), 'tier expires after 7 days');
  }
  // 2. key added: one probe, free key detected, nothing else spent
  { const { P, calls } = make(async r => r.url.includes('/models?') ? { status: 200, data: modelsBody(LIST) } : FREE_NO);
    P.setFree(false); const res = await P.addKey('gemini', KEY); await wait(50);
    ok(res.ok && P.tierOf('gemini', KEY) === 'free', 'free key detected on add', P.tierOf('gemini', KEY));
    const g = gen(calls); ok(g.length === 1 && /pro|argon/.test(g[0]), 'exactly one probe, to a paid-only model', g.join());
    const ent = P.keys().gemini[0]; ok(ent.noFree.length === 1, 'noFree learned', JSON.stringify(ent.noFree));
  }
  // 3. paid key: probe answers, tier = paid, nothing demoted
  { const { P, calls } = make(async r => r.url.includes('/models?') ? { status: 200, data: modelsBody(LIST) } : answer('x'));
    await P.addKey('gemini', KEY); await wait(50);
    ok(P.tierOf('gemini', KEY) === 'paid', 'paid key detected'); ok(gen(calls).length === 1, 'paid key: one probe');
  }
  // 4. a paid key's ordinary rate limit is NOT mistaken for a free key
  { const { P } = make(async r => r.url.includes('/models?') ? { status: 200, data: modelsBody(LIST) } : PAID_RATE);
    P.setFree(false); await P.addKey('gemini', KEY); await wait(50);
    ok(P.tierOf('gemini', KEY) === '', 'paid-tier 429 does not mark the key free', P.tierOf('gemini', KEY));
  }
  // 5. route on a detected free key: Pro never tried, Flash capped, Gemma answers (6-model reach)
  { const quota = { 'gemini-3.8-flash': 1, 'gemini-3.6-flash': 1, 'gemini-3.5-flash-lite': 1, 'gemini-3.1-flash-lite': 1 };
    const { P, calls } = make(async r => { if (r.url.includes('/models?')) return { status: 200, data: modelsBody(LIST) }; if (/pro|argon/.test(r.model)) return FREE_NO; if (quota[r.model]) return FREE_CAP; return answer('gemma here'); });
    P.setFree(false); await P.addKey('gemini', KEY); await wait(50); calls.length = 0;
    const out = await P.run('deep', Object.assign({}, REQ));
    const g = gen(calls);
    ok(out.provider === 'gemini' && out.model === 'gemma-4-31b-it' && out.text === 'gemma here', 'deep lane on free key reaches Gemma', JSON.stringify(out) + ' | ' + g.join());
    ok(!g.some(m => /pro|argon/.test(m)), 'free key: no paid-only model tried', g.join());
    ok(g.length === 5, 'tries Flash x2, Lite x2, Gemma', String(g.length));
  }
  // 6. route on an UNKNOWN key (added before this version): first Pro failure teaches it, route continues without more paid-only tries
  { const quota = { 'gemini-3.8-flash': 1, 'gemini-3.6-flash': 1, 'gemini-3.5-flash-lite': 1, 'gemini-3.1-flash-lite': 1 };
    const { P, calls, store } = make(async r => { if (r.url.includes('/models?')) return { status: 200, data: modelsBody(LIST) }; if (/pro|argon/.test(r.model)) return FREE_NO; if (quota[r.model]) return FREE_CAP; return answer('ok'); });
    P.setFree(false); P.keys().gemini.push({ key: KEY, st: null }); P.reload && 0; 
    const o2 = await P.run('deep', Object.assign({}, REQ)); const g = gen(calls);
    ok(o2.model === 'gemma-4-31b-it', 'unknown key learns mid-route and still reaches Gemma', JSON.stringify(o2) + ' | ' + g.join());
    ok(g.filter(m => /pro|argon/.test(m)).length === 1, 'one paid-only try, then it is skipped', g.join());
    ok(P.tierOf('gemini', KEY) === 'free', 'tier saved on the key');
    calls.length = 0; await P.run('deep', Object.assign({}, REQ)); ok(!gen(calls).some(m => /pro|argon/.test(m)), 'next route never touches paid-only models', gen(calls).join());
  }
  // 7. a paid-only model answering clears the mark (key upgraded)
  { let paid = false; const { P, calls } = make(async r => { if (r.url.includes('/models?')) return { status: 200, data: modelsBody(LIST) }; if (/pro|argon/.test(r.model)) return paid ? answer('pro answer') : FREE_NO; return answer('flash'); });
    P.setFree(false); await P.addKey('gemini', KEY); await wait(50); ok(P.tierOf('gemini', KEY) === 'free', 'starts free');
    P.keys().gemini[0].tierAt = Date.now() - 8 * 864e5; paid = true; // mark expired + key upgraded
    const out = await P.run('deep', Object.assign({}, REQ)); ok(/pro|argon/.test(out.model), 'expired mark: Pro tried again and answers', out.model);
  }
  // 8. Gemma quirks: no systemInstruction, no JSON mode, remembered
  { let n400 = 0; const { P, calls } = make(async r => { if (r.url.includes('/models?')) return { status: 200, data: modelsBody(['gemma-3-27b-it']) };
      if (r.body.systemInstruction) { n400++; return { status: 400, data: { error: { code: 400, message: 'Developer instruction is not enabled for models/gemma-3-27b-it' } } }; }
      if (r.body.generationConfig.responseMimeType) { n400++; return { status: 400, data: { error: { code: 400, message: 'JSON mode is not enabled for models/gemma-3-27b-it' } } }; }
      return answer(r.body.generationConfig.responseMimeType ? 'x' : '```json\n{"a":1}\n```'); });
    P.setFree(false); P.keys().gemini.push({ key: KEY, st: null });
    const a = await P.run('util', { system: 'SYS-TEXT', messages: [{ role: 'user', content: 'hello' }], json: true });
    ok(a.text === '{"a":1}', 'fence stripped in no-JSON-mode', a.text);
    const sent = calls.filter(c => c.model).pop().body; ok(!sent.systemInstruction && /SYS-TEXT/.test(sent.contents[0].parts[0].text) && /valid JSON/.test(sent.contents[0].parts[0].text), 'instructions folded into the first user turn + JSON instruction');
    const before = n400; await P.run('util', { system: 'SYS-TEXT', messages: [{ role: 'user', content: 'again' }], json: true });
    ok(n400 === before, 'quirks remembered: no repeat 400s', n400 + ' vs ' + before);
  }
  // 9. Gemma 4: normal request keeps systemInstruction and tools (official support)
  { const { P, calls } = make(async r => r.url.includes('/models?') ? { status: 200, data: modelsBody(['gemma-4-31b-it']) } : answer('fine'));
    P.setFree(false); P.keys().gemini.push({ key: KEY, st: null });
    await P.run('fast', Object.assign({}, REQ)); const b = calls.filter(c => c.model)[0].body;
    ok(b.systemInstruction && b.systemInstruction.parts[0].text.indexOf('You are Ember.') === 0 && !/Developer instruction/.test(JSON.stringify(b)), 'Gemma 4 gets a real systemInstruction (facts block is appended by the router)');
  }
  // 10. unchanged behaviour for the other cases
  { const { P } = make(async () => ({ status: 200, data: {} })); const R = P._rank;
    ok(R('groq', ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'canopylabs/orpheus-v1-english'], 'fast').join() === 'openai/gpt-oss-120b,openai/gpt-oss-20b', 'Groq ranking from 1.10.45 intact');
  }
  // 11. Claude HTTP error is a real error again (was a ReferenceError)
  { const { P } = make(async r => r.url.endsWith('/models?limit=100') ? { status: 200, data: { data: [{ id: 'claude-haiku-5-5' }] } } : { status: 401, data: { error: { message: 'invalid x-api-key' } } });
    P.setFree(false); P.keys().anthropic.push({ key: 'sk-ant-TEST', st: null }); P.setPinned('anthropic'); P.setStrict(true);
    let msg = ''; try { await P.run('fast', Object.assign({ onToken() {} }, REQ)); } catch (e) { msg = String(e.message); }
    ok(!/parsed is not defined|ReferenceError/.test(msg) && /invalid x-api-key|did not answer/.test(msg), 'Claude error path no longer throws ReferenceError', msg);
  }
  console.log('passed ' + pass + ', failed ' + fail); bad.forEach(b => console.log('FAIL: ' + b)); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('HARNESS ERROR', e && e.stack || e); process.exit(2); });
