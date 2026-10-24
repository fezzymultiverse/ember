// Ember V1.6.8 - Groq + Mistral + Gemini (+ OpenRouter, Cohere, HuggingFace as prototypes) behind one door.
// Pulls keys out of pasted notes, health-checks every key, picks models from each provider's live model list (no hard-coded names that go stale),
// and fails over key to key and engine to engine so the chat keeps going when one is rate-limited.
'use strict';
(() => {
const { LS } = U;
const CFG = {
  groq: { name: 'Groq', base: 'https://api.groq.com/openai/v1', kind: 'oai', color: '#ff6a00' },
  mistral: { name: 'Mistral', base: 'https://api.mistral.ai/v1', kind: 'oai', color: '#ffb020' },
  gemini: { name: 'Gemini', base: 'https://generativelanguage.googleapis.com/v1beta', kind: 'gem', color: '#ffffff' },
  // prototypes: written from the providers' public docs, never run against a live account yet. Always last in every lane.
  openrouter: { name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', kind: 'oai', status: 'prototype', color: '#ff8c1a' },
  cohere: { name: 'Cohere', base: 'https://api.cohere.com', kind: 'cohere', status: 'prototype', color: '#d9d9d9' },
  huggingface: { name: 'HuggingFace', base: 'https://router.huggingface.co/v1', kind: 'oai', status: 'prototype', color: '#ffb800' }
};
const IDS = Object.keys(CFG);
// fast = quick everyday replies. deep = slow, careful turns. util = background jobs (memory, titles).
const ORDER = { fast: ['groq', 'mistral', 'gemini', 'openrouter', 'cohere', 'huggingface'], deep: ['gemini', 'mistral', 'groq', 'openrouter', 'cohere', 'huggingface'], util: ['groq', 'mistral', 'gemini', 'openrouter', 'cohere', 'huggingface'] };

// V1.5.6: pasted keys often carry invisible junk (zero-width chars, quotes, "Bearer ", "key=", a trailing comma). Any of it makes
// the provider answer 401/403 even though the key itself is fine, so every key is cleaned before it is stored or sent.
function clean(k) {
  let t = String(k == null ? '' : k);
  t = t.replace(/[\u200B-\u200D\u2060\uFEFF\u00A0]/g, '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(authorization\s*:\s*)?bearer\s+/i, '').replace(/^(x-goog-api-key|api[_-]?key|key)\s*[:=]\s*/i, '');
  t = t.replace(/^[\s"'`<([]+|[\s"'`>)\],;]+$/g, '').trim();
  return t.replace(/\s+/g, '');
}
function load() {
  const k = LS.get('ember_keys', {}), o = {};
  IDS.forEach(id => { o[id] = (Array.isArray(k[id]) ? k[id] : []).filter(e => e && typeof e.key === 'string' && e.key).map(e => { e.key = clean(e.key); return e; }).filter(e => e.key); });
  return o;
}
let keys = load();
let freePref = null; // null = auto (Free Mode on only while the user has no keys); true/false = the user's own choice
// V1.6.1: engine pin. null/'auto' = router decides (Groq first in fast/util since it's near-instant). Any CFG id = try that engine's keys first, every lane.
let pinnedEngine = LS.get('ember_pin', null);
function setPinned(id) { pinnedEngine = (id && CFG[id]) ? id : null; LS.set('ember_pin', pinnedEngine); }
// V1.6.8: model pin. {id, model} or null. Strict: when set, that engine only ever uses that exact model (no silent swap to another one).
let pinnedModel = LS.get('ember_pin_model', null);
if (pinnedModel && !(pinnedModel.id && pinnedModel.model && CFG[pinnedModel.id])) pinnedModel = null;
function setPinnedModel(id, model) { pinnedModel = (id && CFG[id] && model) ? { id, model: String(model) } : null; LS.set('ember_pin_model', pinnedModel); }
function orderFor(lane) { const base = ORDER[lane] || ORDER.fast; if (!pinnedEngine) return base; return [pinnedEngine].concat(base.filter(id => id != pinnedEngine)); }
const save = () => LS.set('ember_keys', keys);
const cool = new Map(); // key -> timestamp until which it is resting after a 429
const isCool = k => (cool.get(k) || 0) > Date.now();
const mask = k => k.length > 12 ? k.slice(0, 6) + '…' + k.slice(-4) : k.slice(0, 3) + '…';
const has = k => IDS.some(id => keys[id].some(e => e.key === k));

// ---------- network: normal fetch, native HTTP as the fallback inside the APK ----------
async function net(url, opt, timeout) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeout || 30000);
  try {
    try { return await fetch(url, Object.assign({}, opt, { signal: ac.signal })); }
    catch (e) {
      if (e && e.name === 'AbortError') throw Object.assign(new Error('timed out'), { status: 0 });
      const H = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CapacitorHttp;
      if (!H || !H.request) throw Object.assign(new Error('network error or blocked by the browser'), { status: 0 });
      const r = await H.request({ url, method: (opt && opt.method) || 'GET', headers: (opt && opt.headers) || {}, data: opt && opt.body ? JSON.parse(opt.body) : undefined, connectTimeout: timeout || 30000, readTimeout: timeout || 30000 });
      const hd = r.headers || {};
      return { ok: r.status >= 200 && r.status < 300, status: r.status, headers: { get: k => hd[k] || hd[k.toLowerCase()] || null }, text: async () => typeof r.data === 'string' ? r.data : JSON.stringify(r.data), json: async () => typeof r.data === 'string' ? JSON.parse(r.data) : r.data };
    }
  } finally { clearTimeout(t); }
}
async function jfetch(url, opt, timeout) {
  const r = await net(url, opt, timeout);
  if (!r.ok) {
    let body = ''; try { body = await r.text(); } catch (e) {}
    let msg = ''; try { const j = JSON.parse(body); msg = (j.error && (j.error.message || j.error)) || j.message || ''; } catch (e) {}
    throw Object.assign(new Error(String(msg || body || ('HTTP ' + r.status)).slice(0, 200)), { status: r.status, retryAfter: +(r.headers && r.headers.get && r.headers.get('retry-after')) || 0 });
  }
  return r.json();
}

// ---------- Gemini auth ----------
// Google now issues keys that start with AQ. (AI Studio no longer makes AIza keys). Normal accounts send them in the
// x-goog-api-key header like before. A few accounts get 401/403 on that route, so a rejected call is retried once with the
// key as a ?key= query parameter before the key is declared bad. The real reason Google gave is kept and a plain-English hint added.
const isAQ = k => /^AQ\./.test(String(k || ''));
function gemHint(er, key) {
  const m = String(er && er.message || '');
  if (er.status == 401 && /ACCESS_TOKEN_TYPE_UNSUPPORTED|OAuth 2 access token/i.test(m)) return ' Google rejected this ' + (isAQ(key) ? 'AQ. ' : '') + 'key type for the REST API. Make an AIza key in Google Cloud Console (APIs & Services > Credentials) with the Generative Language API enabled and add that one.';
  if (er.status == 403 && /not been used|disabled|enable/i.test(m)) return ' Turn on the Generative Language API for this key\'s project in Google Cloud Console.';
  if (er.status == 403) return ' The key may be restricted (app / API restriction) or the Generative Language API is off for its project.';
  if (er.status == 400 && /API key not valid/i.test(m)) return ' Google says the key text is not valid: re-copy it without spaces or quotes.';
  if (er.status == 401) return ' Google did not accept the key: re-copy it, or make a fresh one in AI Studio.';
  return '';
}
async function gemFetch(url, key, opt, timeout) {
  opt = Object.assign({}, opt); opt.headers = Object.assign({}, opt.headers, { 'x-goog-api-key': key });
  try { return await jfetch(url, opt, timeout); }
  catch (er) {
    if (er.status != 401 && er.status != 403) throw er;
    let er2 = er;
    try {
      const o2 = Object.assign({}, opt); o2.headers = Object.assign({}, opt.headers); delete o2.headers['x-goog-api-key'];
      return await jfetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'key=' + encodeURIComponent(key), o2, timeout);
    } catch (e2) { er2 = e2; if (e2.status != 401 && e2.status != 403) throw e2; }
    const h = gemHint(er2, key);
    throw Object.assign(new Error(String(er2.message || 'rejected').slice(0, 160) + h), { status: er2.status, retryAfter: er2.retryAfter });
  }
}

// ---------- models ----------
async function listModels(id, key) {
  const c = CFG[id];
  if (c.kind == 'oai') {
    const j = await jfetch(c.base + '/models', { headers: { Authorization: 'Bearer ' + key } }, 15000);
    return (j.data || []).map(m => m.id).filter(Boolean);
  }
  if (c.kind == 'cohere') {
    const j = await jfetch(c.base + '/v1/models?endpoint=chat&page_size=100', { headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' } }, 15000);
    return (j.models || []).map(m => m.name).filter(Boolean);
  }
  const j = await gemFetch(c.base + '/models?pageSize=200', key, {}, 15000);
  return (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => String(m.name).replace(/^models\//, ''));
}
const ver = m => { const x = /(\d+(?:\.\d+)?)/.exec(m); return x ? parseFloat(x[1]) : 0; };
function rank(id, list, lane) {
  const deep = lane == 'deep';
  if (id == 'groq') {
    const ok = list.filter(m => !/whisper|guard|tts|embed|playai|distil/i.test(m));
    const pref = [/llama-3\.3-70b/, /llama.*70b/, /llama-4/, /llama/, /gpt-oss/, /qwen/];
    const out = []; pref.forEach(p => ok.filter(m => p.test(m)).forEach(m => { if (!out.includes(m)) out.push(m); }));
    ok.forEach(m => { if (!out.includes(m)) out.push(m); });
    return out;
  }
  if (id == 'mistral') {
    const ok = list.filter(m => !/embed|moderation|ocr|codestral|voxtral|pixtral|devstral|ministral/i.test(m));
    const pref = deep ? [/large-latest/, /medium-latest/, /small-latest/, /large/, /medium/, /small/] : [/small-latest/, /medium-latest/, /large-latest/, /small/, /medium/, /large/];
    const out = []; pref.forEach(p => ok.filter(m => p.test(m)).forEach(m => { if (!out.includes(m)) out.push(m); }));
    ok.forEach(m => { if (!out.includes(m)) out.push(m); });
    return out;
  }
  if (id == 'openrouter') {
    // free models only: a paid model would spend the user's credits without them noticing
    const ok = list.filter(m => /:free$/.test(m) && !/embed|moderation|image|vision|audio|tts|whisper|guard|-vl|flux|stable|veo|sora/i.test(m));
    const pref = [/llama-3\.3-70b/, /llama.*70b/, /gemma/, /mistral/, /qwen/, /deepseek/, /llama/];
    const out = []; pref.forEach(p => ok.filter(m => p.test(m)).forEach(m => { if (!out.includes(m)) out.push(m); }));
    ok.forEach(m => { if (!out.includes(m)) out.push(m); });
    return out;
  }
  if (id == 'cohere') {
    const ok = list.filter(m => !/embed|rerank|vision|audio|translate|nightly/i.test(m));
    const pref = deep ? [/command-a-0/, /command-r-plus/, /command-a/, /command-r/] : [/command-r7b/, /command-r-08/, /command-a-0/, /command-r/, /command/];
    const out = []; pref.forEach(p => ok.filter(m => p.test(m)).forEach(m => { if (!out.includes(m)) out.push(m); }));
    ok.forEach(m => { if (!out.includes(m)) out.push(m); });
    return out;
  }
  if (id == 'huggingface') {
    const ok = list.filter(m => !/embed|whisper|flux|stable-diffusion|vision|-vl|ocr|guard|rerank|tts/i.test(m));
    const pref = [/llama-3\.3-70b-instruct/i, /llama.*instruct/i, /qwen.*instruct/i, /mistral.*instruct/i, /gpt-oss/i];
    const out = []; pref.forEach(p => ok.filter(m => p.test(m)).forEach(m => { if (!out.includes(m)) out.push(m); }));
    ok.forEach(m => { if (!out.includes(m)) out.push(m); });
    return out;
  }
  const bad = /lite|image|tts|embed|live|audio|native|robotics|computer|imagen|veo|gemma|aqa|learnlm|vision|nano/i;
  let c = list.filter(m => /^gemini-/.test(m) && !bad.test(m));
  const want = deep ? 'pro' : 'flash';
  const w = c.filter(m => m.includes(want));
  const rest = c.filter(m => !m.includes(want));
  const srt = a => a.sort((x, y) => ver(y) - ver(x) || (/preview|exp/.test(x) ? 1 : 0) - (/preview|exp/.test(y) ? 1 : 0) || x.length - y.length);
  return srt(w).concat(srt(rest));
}
const MC = 12 * 3600 * 1000;
async function modelsFor(id, key, lane) {
  const cache = LS.get('ember_models', {});
  if (cache[id] && Date.now() - cache[id].at < MC && cache[id].list.length) return rank(id, cache[id].list, lane);
  const list = await listModels(id, key);
  cache[id] = { at: Date.now(), list }; LS.set('ember_models', cache);
  return rank(id, list, lane);
}

// ---------- one call ----------
async function call(id, key, model, o) {
  const c = CFG[id], t0 = performance.now();
  let text = '';
  if (c.kind == 'oai') {
    const body = { model, messages: [{ role: 'system', content: o.system }].concat(o.messages), temperature: o.temp == null ? 0.8 : o.temp, max_tokens: o.max || 400 };
    if (o.json) body.response_format = { type: 'json_object' };
    const j = await jfetch(c.base + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) }, 40000);
    text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '';
  } else if (c.kind == 'cohere') {
    const body = { model, messages: [{ role: 'system', content: o.system }].concat(o.messages), temperature: o.temp == null ? 0.8 : o.temp, max_tokens: o.max || 400 };
    if (o.json) body.response_format = { type: 'json_object' };
    const j = await jfetch(c.base + '/v2/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) }, 40000);
    text = j.message && Array.isArray(j.message.content) ? j.message.content.map(p => p.text || '').join('') : '';
  } else {
    const contents = [];
    o.messages.forEach(m => {
      const role = m.role == 'assistant' ? 'model' : 'user', last = contents[contents.length - 1];
      if (last && last.role == role) last.parts[0].text += '\n\n' + m.content; else contents.push({ role, parts: [{ text: m.content }] });
    });
    const gc = { temperature: o.temp == null ? 0.8 : o.temp, maxOutputTokens: (o.max || 400) * 4 }; // headroom: some Gemini models spend output tokens on thinking
    if (o.json) gc.responseMimeType = 'application/json';
    const j = await gemFetch(c.base + '/models/' + model + ':generateContent', key, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: o.system }] }, contents, generationConfig: gc }) }, 60000);
    const cand = j.candidates && j.candidates[0];
    text = cand && cand.content && cand.content.parts ? cand.content.parts.map(p => p.text || '').join('') : '';
  }
  text = String(text || '').trim();
  if (!text) throw Object.assign(new Error('empty reply (blocked or cut off)'), { status: 0 });
  return { text, ms: Math.round(performance.now() - t0) };
}

// ---------- key bookkeeping ----------
const entries = id => keys[id];
const hasKeys = () => IDS.some(id => keys[id].length > 0);
async function health(id, e) {
  const t0 = performance.now(), st = { at: Date.now(), ok: false, limited: false, ms: 0, model: '', code: 0, msg: '' };
  try {
    const list = await listModels(id, e.key);
    const cache = LS.get('ember_models', {}); cache[id] = { at: Date.now(), list }; LS.set('ember_models', cache);
    const cands = rank(id, list, 'fast');
    if (!cands.length) throw Object.assign(new Error('key works but no chat model is available on it'), { status: 0 });
    st.model = cands[0];
    try { await call(id, e.key, cands[0], { system: 'Reply with the single word OK.', messages: [{ role: 'user', content: 'ping' }], temp: 0, max: 64 }); st.ok = true; }
    catch (er) { if (er.status == 429) { st.ok = true; st.limited = true; st.msg = 'rate limited right now (key is valid)'; } else throw er; }
  } catch (er) {
    st.code = er.status || 0;
    if (er.status == 429) { st.ok = true; st.limited = true; st.msg = 'rate limited right now (key is valid)'; }
    else if (er.status == 401 || er.status == 403) st.msg = 'key rejected (' + er.status + '): ' + String(er.message || '').slice(0, 170);
    else st.msg = String(er.message || 'failed').slice(0, 120);
  }
  st.ms = Math.round(performance.now() - t0); e.st = st; e.bad = !st.ok && (st.code == 401 || st.code == 403);
  if (st.ok && !st.limited) cool.delete(e.key);
  save(); return st;
}
async function healthAll() { for (const id of IDS) for (const e of keys[id]) await health(id, e); }
async function addKey(id, key) {
  key = clean(key);
  if (!key || !keys[id]) return { ok: false, why: 'empty' };
  if (has(key)) return { ok: false, why: 'already added' };
  const e = { key, st: null }; keys[id].push(e); save(); await health(id, e); return { ok: true, e };
}
function removeKey(id, key) { keys[id] = keys[id].filter(e => e.key !== key); cool.delete(key); save(); }

// ---------- pull keys out of messy notes ----------
function extract(text) {
  const out = { groq: [], gemini: [], mistral: [], openrouter: [], huggingface: [], cohere: [], unknown: [] };
  const put = (k, v) => { if (!out[k].includes(v)) out[k].push(v); };
  let t = String(text || '');
  // V1.6.8: shell/env style lines (GROQ_API_KEY="...", export MISTRAL_KEYS=("a" "b")): the variable name says whose key it is.
  const NAMED = [['groq', /groq/i], ['mistral', /mistral/i], ['gemini', /gemini|google|genai/i], ['openrouter', /openrouter/i], ['huggingface', /hugging|(^|_)hf(_|$)/i], ['cohere', /cohere/i]];
  t = t.split(/\r?\n/).map(line => {
    const m = /^\s*(?:export\s+|set\s+|\$env:)?([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)$/.exec(line);
    if (!m) return line;
    const hit = NAMED.find(n => n[1].test(m[1])); if (!hit) return line;
    m[2].split(/[\s,"'()\[\];]+/).filter(v => v.length >= 20 && !/:\/\//.test(v) && !/^[A-Z][A-Z0-9]*_[A-Z0-9_]+$/.test(v)).forEach(v => put(hit[0], v.replace(/[.]+$/, '')));
    return ' ';
  }).join('\n');
  t = t.replace(/gsk_[A-Za-z0-9]{20,}/g, m => { put('groq', m); return ' '; });
  t = t.replace(/sk-or-v1-[A-Za-z0-9]{20,}/g, m => { put('openrouter', m); return ' '; });
  t = t.replace(/hf_[A-Za-z0-9]{20,}/g, m => { put('huggingface', m); return ' '; });
  t = t.replace(/AQ\.[0-9A-Za-z_\-.]{20,}/g, m => { put('gemini', m.replace(/[.]+$/, '')); return ' '; }); // new Gemini key format (AQ.Ab8…, any AQ. key)
  t = t.replace(/AIza[0-9A-Za-z_\-]{30,}/g, m => { put('gemini', m); return ' '; });
  // Cohere keys have no prefix: a 40-character token on a line that says "cohere"
  t = t.split(/\r?\n/).map(line => /cohere/i.test(line) ? line.replace(/(?<![A-Za-z0-9_\-])[A-Za-z0-9]{40}(?![A-Za-z0-9_\-])/g, m => { put('cohere', m); return ' '; }) : line).join('\n');
  // Mistral keys have no prefix: take 32-char tokens near the word "mistral"; other 32-char tokens are tested against Mistral later
  let cur = '', ttl = 0;
  for (const line of t.split(/\r?\n/)) {
    const ms = /mistral/i.test(line), ot = /groq|gemini|google|openrouter|openai|deepseek|anthropic|claude|cohere|huggingface/i.test(line);
    if (ms) { cur = 'mistral'; ttl = 2; } else if (ot) { cur = 'other'; ttl = 2; }
    for (const m of line.matchAll(/(?<![A-Za-z0-9_\-])[A-Za-z0-9]{32}(?![A-Za-z0-9_\-])/g)) {
      const v = m[0];
      if (!/[A-Za-z]/.test(v) || !/\d/.test(v) || /^[0-9a-f]{32}$/i.test(v)) continue;
      if (cur == 'mistral' && ttl > 0) put('mistral', v); else if (cur == 'other' && ttl > 0) continue; else put('unknown', v);
    }
    if (!ms && !ot && ttl > 0) ttl--;
  }
  return out;
}
async function ingest(text) {
  const f = extract(text);
  const rep = { found: { groq: f.groq.length, gemini: f.gemini.length, mistral: f.mistral.length, openrouter: f.openrouter.length, huggingface: f.huggingface.length, cohere: f.cohere.length, unknown: f.unknown.length }, added: [], dupes: 0, rejected: 0 };
  for (const id of ['groq', 'gemini', 'mistral', 'openrouter', 'huggingface', 'cohere']) for (const k of f[id]) {
    const r = await addKey(id, k);
    if (!r.ok) { rep.dupes++; continue; }
    rep.added.push({ id, key: k, ok: !!(r.e.st && r.e.st.ok), guess: false });
  }
  for (const k of f.unknown) {
    if (has(k)) { rep.dupes++; continue; }
    try { await listModels('mistral', k); } catch (er) { rep.rejected++; continue; }
    const r = await addKey('mistral', k);
    if (r.ok) rep.added.push({ id: 'mistral', key: k, ok: !!(r.e.st && r.e.st.ok), guess: true });
  }
  return rep;
}

// ---------- Free Mode: Pollinations.ai, no key ----------
// Anonymous Pollinations is rate-limited (about one request per 15 s) and third-party: chat text leaves the phone.
// Background jobs (titles, memory, summaries) never use it.
const PL = { get: 'https://text.pollinations.ai/', openai: 'https://text.pollinations.ai/openai', timeout: 15000 };
const FREE_BUSY = 'Free Mode is busy right now. Try again in a moment.';
// callPollinations(prompt): plain GET to text.pollinations.ai/<encoded prompt>.
// When o.messages is given (a chat with its system prompt), it POSTs the OpenAI-style body instead, because the
// system prompt plus history is far too long for a URL.
async function callPollinations(prompt, o) {
  const t0 = performance.now(), used = () => performance.now() - t0;
  const bad = r => Object.assign(new Error('Pollinations HTTP ' + r.status), { status: r.status });
  const viaPost = async () => {
    const body = { model: 'openai', messages: [{ role: 'system', content: o.system || '' }].concat(o.messages) };
    const r = await net(PL.openai, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, PL.timeout);
    if (!r.ok) throw bad(r);
    const j = await r.json();
    return j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '';
  };
  // GET fallback: a short URL with the last few messages and a fixed safety line, so it still works if the POST route changes
  const viaGet = async text => {
    const left = Math.max(2000, PL.timeout - used());
    const r = await net(PL.get + encodeURIComponent(text), { method: 'GET' }, left);
    if (!r.ok) throw bad(r);
    return r.text();
  };
  const compact = o => {
    const safety = 'You are Ember, a warm, calm, non-judgmental companion. Never lecture or sound clinical. If the person may be in danger, be steady, say you care, and urge them to contact a local emergency line now.';
    const tail = (o.messages || []).slice(-4).map(m => (m.role == 'assistant' ? 'Ember' : 'Him') + ': ' + String(m.content).slice(0, 400)).join('\n');
    return (safety + '\n\n' + tail + '\n\nEmber:').slice(0, 1500);
  };
  let text = '';
  if (o && o.messages) {
    try { text = await viaPost(); }
    catch (er) {
      // a timeout has used the whole budget: do not start a second request
      if (used() >= PL.timeout - 2000 || er.status == 429) throw er; // timed out, or rate-limited: a retry would only hit the same wall
      text = await viaGet(compact(o));
    }
  } else {
    text = await viaGet(String(prompt || ''));
  }
  text = String(text || '').trim();
  if (!text) throw Object.assign(new Error('empty reply from Pollinations'), { status: 0 });
  return { text, provider: 'pollinations', model: 'openai', ms: Math.round(used()) };
}
const flat = o => String(o.system || '') + '\n\n' + o.messages.map(m => (m.role == 'assistant' ? 'Ember' : 'Him') + ': ' + m.content).join('\n') + '\n\nEmber:';
const freeOn = () => freePref == null ? !hasKeys() : freePref;
const setFree = v => { freePref = v == null ? null : !!v; };
const label = id => CFG[id] ? CFG[id].name : id == 'pollinations' ? 'Free' : id;

// ---------- V1.6.8: one source of truth for "who answers" ----------
const STATE_TXT = { ok: 'ready', limited: 'rate limited right now', bad: 'key rejected', none: 'no key saved' };
// Plain-English line for the Settings screen: what is pinned, whether it can answer, and who answers instead.
function pinNote() {
  if (!pinnedEngine) return 'Auto: the router tries engines in its own order and the engine that answered is shown under every reply.';
  const st = status()[pinnedEngine], nm = CFG[pinnedEngine].name;
  const pm = pinnedModel && pinnedModel.id == pinnedEngine ? ' · model ' + pinnedModel.model : '';
  if (st == 'ok') return 'Pinned: ' + nm + pm + ' (ready). It answers first on every message.';
  return 'Pinned: ' + nm + pm + ' but it ' + (st == 'none' ? 'has no key saved' : st == 'bad' ? 'has only rejected keys' : 'is rate limited right now') + ', so the next working engine answers instead. Every reply shows which one. Fix the ' + nm + ' key in Keys, or pick Auto.';
}
// Text added to the system prompt at send time, after the router has chosen the engine, so the model is told what is really running.
// id/model null = background reply: the phone picks the engine later, so the model must not name one.
function factsBlock(id, model, failed) {
  const st = status();
  const inv = IDS.filter(x => keys[x].length).map(x => CFG[x].name + ' ' + keys[x].filter(e => !e.bad).length + '/' + keys[x].length + ' usable').join(', ') || 'none';
  const L = ['RUNTIME FACTS (written by the app at send time; these are true and override anything he or you assume):'];
  if (id == 'pollinations') L.push('- This reply comes from Free Mode (Pollinations.ai). You do not know which model they run. Say exactly that if asked, and never name a model you cannot verify.');
  else if (id) L.push('- This reply is written by engine "' + CFG[id].name + '", model id "' + model + '", using an API key HE saved in Settings > Keys.');
  else L.push('- This is a background reply: the phone picks the engine after this prompt is built, so you do not know which engine or model you are. Do not name one.');
  L.push('- Keys he saved: ' + inv + '. There is NO bundled, shared or placeholder key in this app; every key is one he added himself. Never say you "fall back to a bundled key" or that you lack keys he saved.');
  if (pinnedEngine) {
    const miss = id && id != pinnedEngine, why = (failed || []).find(f => f.id == pinnedEngine);
    L.push('- Pinned engine in Settings: ' + CFG[pinnedEngine].name + (pinnedModel && pinnedModel.id == pinnedEngine ? ' (model ' + pinnedModel.model + ')' : '') + ' [' + STATE_TXT[st[pinnedEngine]] + ']' + (miss ? '. It could not answer this message' + (why ? ' (' + String(why.why || '').slice(0, 120) + ')' : '') + ', so ' + (id == 'pollinations' ? 'Free Mode' : CFG[id].name) + ' answered instead. Tell him that plainly if he asks.' : '.'));
  } else L.push('- No engine is pinned: Auto mode.');
  L.push('- You are only the model named above. You are not GPT-4, ChatGPT, Qwen or any other name unless that model id says so. If asked what you are, give the engine and model id above, nothing invented.');
  L.push('- If he says he switched engine or model and it does not match these lines, say it does not match what is running. Settings changes apply from his next message and only when that engine has a working key. Never agree just because he said so.');
  try { const km = window.EmberKeys && window.EmberKeys.line(); if (km) L.push('- ' + km); } catch (e) { /* key map unavailable */ }
  L.push('- Never say you searched, scraped or looked something up, and never show a table of "results", unless a [TOOL RESULTS] block is in this turn. No tool block means you did not look. Call the tool or say you have not looked yet.');
  return L.join('\n');
}
const withFacts = (o, lane, id, model, failed) => (lane == 'util' || o.json) ? o : Object.assign({}, o, { system: String(o.system || '') + '\n\n' + factsBlock(id, model, failed) });
// Every model the engine's keys can see (cached 12h unless fresh). OpenRouter free models first. Chat models only.
async function modelsOf(id, fresh) {
  const cache = LS.get('ember_models', {});
  let list = !fresh && cache[id] && cache[id].list && cache[id].list.length ? cache[id].list : null;
  if (!list) {
    const e = keys[id].find(x => !x.bad) || keys[id][0];
    if (!e) throw Object.assign(new Error('No ' + CFG[id].name + ' key saved.'), { status: 0 });
    list = await listModels(id, e.key); cache[id] = { at: Date.now(), list }; LS.set('ember_models', cache);
  }
  const ok = list.filter(m => !/embed|whisper|guard|tts|moderation|rerank|flux|stable-diffusion|imagen|veo|sora|playai|ocr/i.test(m));
  const isFree = m => /:free$/.test(m);
  return ok.slice().sort((a, b) => (isFree(b) - isFree(a)) || a.localeCompare(b));
}
const cachedModels = id => { const c = LS.get('ember_models', {}); return c[id] && c[id].list ? c[id].list.filter(m => !/embed|whisper|guard|tts|moderation|rerank|flux|stable-diffusion|imagen|veo|sora|playai|ocr/i.test(m)).sort() : []; };

// ---------- the router ----------
// Free Mode ON: Pollinations goes first, then the keys. OFF: keys first. Either way Pollinations is the last resort,
// so a chat is never blocked just because keys are missing or rested. Util jobs skip it entirely.
const HANDOFF = () => Object.assign(new Error('The background task has this reply.'), { code: 'handoff' });
async function runInner(lane, o, tok) {
  const pl = lane != 'util', errs = [], failed = [];
  const halted = () => { if (tok && tok.stop) throw HANDOFF(); }; // V1.8.3: once the native worker took the request, the page makes no further paid calls
  // when an engine failed and a different one answered, tell the UI (ai.js shows a toast). Background jobs stay silent.
  const done = r => { if (pinnedEngine && r.provider != pinnedEngine) { const p0 = failed.find(x => x.id == pinnedEngine); r.pinMiss = { want: pinnedEngine, why: p0 ? (p0.why || '') : 'no usable key' }; } const f = failed.find(x => x.id != r.provider); if (f && pl) { try { window.dispatchEvent(new CustomEvent('ember-switch', { detail: { from: f.id, to: r.provider, status: f.status || 0, why: f.why || '' } })); } catch (e) { /* no UI listening */ } } return r; };
  let tried = false;
  halted();
  if (pl && freeOn()) {
    tried = true;
    try { const o2 = withFacts(o, lane, 'pollinations', 'openai', failed); const r = await callPollinations(flat(o2), o2); return done({ text: r.text, provider: 'pollinations', model: r.model, ms: r.ms }); }
    catch (er) { errs.push('Free Mode: ' + er.message); failed.push({ id: 'pollinations', status: er.status, why: er.message }); }
  }
  for (const id of orderFor(lane)) {
    for (const e of keys[id]) {
      if (e.bad || isCool(e.key)) continue;
      halted();
      let models;
      try { models = await modelsFor(id, e.key, lane); }
      catch (er) {
        if (er.status == 401 || er.status == 403) { e.bad = true; save(); } else if (er.status == 429) cool.set(e.key, Date.now() + (er.retryAfter || 60) * 1000);
        errs.push(CFG[id].name + (er.status ? ' (' + er.status + ')' : '') + ': ' + er.message); failed.push({ id, status: er.status, why: er.message }); continue;
      }
      const pm = pinnedModel && pinnedModel.id == id ? pinnedModel.model : null;
      for (const m of (pm ? [pm] : models.slice(0, 3))) {
        halted();
        try { const r = await call(id, e.key, m, withFacts(o, lane, id, m, failed)); return done({ text: r.text, provider: id, model: m, ms: r.ms }); }
        catch (er) {
          errs.push(CFG[id].name + (er.status ? ' (' + er.status + ')' : '') + ': ' + er.message); failed.push({ id, status: er.status, why: er.message });
          if (er.status == 429) { cool.set(e.key, Date.now() + (er.retryAfter || 60) * 1000); break; }
          if (er.status == 401 || er.status == 403) { e.bad = true; save(); break; }
          if (er.status == 404 || (er.status == 400 && /model/i.test(er.message))) continue;
          break;
        }
      }
    }
  }
  if (pl && !tried) {
    halted();
    try { const o2 = withFacts(o, lane, 'pollinations', 'openai', failed); const r = await callPollinations(flat(o2), o2); return done({ text: r.text, provider: 'pollinations', model: r.model, ms: r.ms }); }
    catch (er) { errs.push('Free Mode: ' + er.message); failed.push({ id: 'pollinations', status: er.status, why: er.message }); }
  }
  if (!hasKeys() && pl) throw Object.assign(new Error(FREE_BUSY), { code: 'fail' });
  if (!hasKeys()) throw Object.assign(new Error('Add an API key in Settings first.'), { code: 'nokeys' });
  throw Object.assign(new Error('No engine answered. ' + (errs.slice(-2).join(' | ') || 'All keys are resting or rejected. Open Settings > Keys and tap Check all.')), { code: 'fail' });
}
// V1.5.9: remember the chat request that is in flight so app.js can hand it to the native background task if the app is backgrounded.
let inflight = null;
async function run(lane, o) {
  const tok = { lane, o };
  if (lane != 'util') { inflight = tok; try { window.dispatchEvent(new Event('ember-run-start')); } catch (e) { /* no listener */ } }
  try {
    if (tok.hold) { try { await tok.hold; } catch (e) { /* handoff failed: carry on here */ } } // V1.8.3: app.js may hold the first call until the native worker answers
    return await runInner(lane, o, tok);
  }
  finally { if (inflight === tok) inflight = null; }
}
function holdInflight(p) { if (inflight) inflight.hold = p; }
function stopInflight() { if (inflight) inflight.stop = true; }
const pending = () => inflight ? { lane: inflight.lane, o: Object.assign({}, inflight.o, { system: inflight.lane == 'util' || inflight.o.json ? inflight.o.system : String(inflight.o.system || '') + '\n\n' + factsBlock(null, null, []) }) } : null;
// The engines the router would try for this lane, from the cached model lists only (no network), OpenAI-style providers only.
function nativePlan(lane) {
  const out = [], cache = LS.get('ember_models', {});
  for (const id of orderFor(lane)) {
    if (CFG[id].kind != 'oai') continue;
    for (const e of keys[id]) {
      if (e.bad || isCool(e.key)) continue;
      const c = cache[id]; if (!c || !c.list || !c.list.length) continue;
      const m = (pinnedModel && pinnedModel.id == id) ? pinnedModel.model : rank(id, c.list, lane)[0]; if (m) out.push({ id, base: CFG[id].base, key: e.key, model: m });
    }
  }
  return out.slice(0, 4);
}
function status() {
  const o = {};
  IDS.forEach(id => {
    const l = keys[id];
    if (!l.length) { o[id] = 'none'; return; }
    const live = l.filter(e => !e.bad);
    if (!live.length) o[id] = 'bad';
    else if (live.every(e => isCool(e.key) || (e.st && e.st.limited))) o[id] = 'limited';
    else o[id] = 'ok';
  });
  return o;
}
window.Prov = { holdInflight, stopInflight, pending, nativePlan, CFG, IDS, keys: () => keys, hasKeys, entries, addKey, removeKey, extract, ingest, clean, health, healthAll, run, status, mask, reload: () => { keys = load(); }, setFree, freeOn, label, callPollinations, setPinned, getPinned: () => pinnedEngine, setPinnedModel, getPinnedModel: () => pinnedModel, pinNote, factsBlock, modelsOf, cachedModels };
})();
