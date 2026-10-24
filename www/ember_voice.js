// Ember V1.9.9 - ember_voice.js: Ember Voice. A real, expressive voice instead of the Android default.
// Two engines: Gemini speech (uses the Gemini key already saved in Settings > Keys) and ElevenLabs (its own key).
// If the cloud voice cannot answer (no key, rate limit, offline, audio blocked) Ember reads the same text with the phone voice.
// Reply text is sent to the chosen voice provider only when a reply is read aloud. Nothing else is sent.
'use strict';
(() => {
const KEY = 'ember_voice', GM = 'ember_voice_gm';
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

// Gemini prebuilt voices: [name, feel]
const GEM_VOICES = [
  ['Puck', 'upbeat, playful'], ['Charon', 'calm, informative'], ['Kore', 'firm, clear'], ['Fenrir', 'excitable'], ['Aoede', 'breezy'],
  ['Leda', 'youthful'], ['Orus', 'firm'], ['Zephyr', 'bright'], ['Sadachbia', 'lively'], ['Zubenelgenubi', 'casual'], ['Achird', 'friendly'],
  ['Sulafat', 'warm'], ['Vindemiatrix', 'gentle'], ['Algieba', 'smooth'], ['Algenib', 'gravelly'], ['Gacrux', 'mature'], ['Enceladus', 'breathy'], ['Achernar', 'soft']
];
// ElevenLabs premade voices (work on the free plan through the API)
const EL_VOICES = [
  ['JBFqnCBsd6RMkjVDRZzb', 'George (warm, storyteller)'], ['CwhRBWXzGAHq8TQ4Fs17', 'Roger (laid-back)'], ['IKne3meq5aSn9XLyUdCD', 'Charlie (casual)'],
  ['pNInz6obpgDQGcFmaJgB', 'Adam (deep)'], ['EXAVITQu4vr4xnSDxMaL', 'Sarah (soft)'], ['21m00Tcm4TlvDq8ikWAM', 'Rachel (calm)'], ['XB0fDUnXU5powFXDhCwa', 'Charlotte (smooth)']
];
// tried in this order; the one that works is remembered
const MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-tts'];
const DEF = { engine: 'gemini', gem: 'Puck', gemModel: '', elKey: '', elVoice: 'JBFqnCBsd6RMkjVDRZzb', elModel: 'eleven_flash_v2_5' };
const cfg = () => Object.assign({}, DEF, lsGet(KEY, {}));
const setCfg = p => { const c = Object.assign(cfg(), p); lsSet(KEY, c); return c; };

const gemKeys = () => { try { return ((window.Prov && window.Prov.entries && window.Prov.entries('gemini')) || []).filter(e => e && e.key && !e.bad).map(e => e.key); } catch (e) { return []; } };
// is the cloud voice usable right now?
function active() {
  const c = cfg();
  if (c.engine === 'gemini') return gemKeys().length > 0;
  if (c.engine === 'eleven') return !!String(c.elKey || '').trim();
  return false;
}

// ---------- audio ----------
let ctx = null, cur = null, curDone = null, runTok = 0;
function audioCtx() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
  try { ctx = new C(); } catch (e) { ctx = null; }
  return ctx;
}
const unlock = () => { try { const c = audioCtx(); if (c && c.state === 'suspended') c.resume(); } catch (e) { } };
['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, unlock, { passive: true, capture: true }));

const b64bytes = b64 => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
function pcmBuffer(c, bytes, rate) {
  const n = bytes.length >> 1, buf = c.createBuffer(1, n, rate), ch = new Float32Array(n), dv = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
  for (let i = 0; i < n; i++) ch[i] = dv.getInt16(i * 2, true) / 32768;
  buf.copyToChannel(ch, 0); return buf;
}
const err = (m, status, extra) => Object.assign(new Error(m), { status: status || 0 }, extra || {});

// ---------- Gemini ----------
const GEM_STYLE = { warm: 'Say this in a warm, natural, quick-witted tone, like a close friend talking, with a touch of dry humour where it fits: ', calm: 'Say this slowly, softly and calmly, with care and no jokes: ' };
async function gemOnce(model, key, text, voice, tone) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const body = JSON.stringify({ contents: [{ parts: [{ text: (GEM_STYLE[tone] || GEM_STYLE.warm) + text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } });
  const go = async (u, headers) => {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 45000);
    try {
      let r;
      try { r = await fetch(u, { method: 'POST', headers, body, signal: ac.signal }); }
      catch (e) { throw err(e && e.name === 'AbortError' ? 'The voice took too long' : 'Could not reach the voice service', 0); }
      if (!r.ok) { let m = ''; try { const j = await r.json(); m = (j.error && j.error.message) || ''; } catch (e) { } throw err(String(m || ('HTTP ' + r.status)).slice(0, 160), r.status); }
      return await r.json();
    } finally { clearTimeout(t); }
  };
  let j;
  try { j = await go(url, { 'content-type': 'application/json', 'x-goog-api-key': key }); }
  catch (e) { if (e.status !== 401 && e.status !== 403) throw e; j = await go(url + '?key=' + encodeURIComponent(key), { 'content-type': 'application/json' }); }
  const parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
  const a = parts.find(p => p && p.inlineData && p.inlineData.data);
  if (!a) throw err('That voice model returned no audio', 0, { noAudio: true });
  return a.inlineData;
}
async function gemAudio(text, tone, c) {
  const keys = gemKeys(); if (!keys.length) throw err('No Gemini key saved: add one in Settings > Keys', 0);
  const models = Array.from(new Set([c.gemModel, lsGet(GM, ''), ...MODELS].filter(Boolean)));
  let last = null;
  for (const m of models) {
    for (const k of keys) {
      try { const d = await gemOnce(m, k, text, c.gem || DEF.gem, tone); lsSet(GM, m); return d; }
      catch (e) {
        last = e;
        if (e.status === 404 || e.noAudio || (e.status === 400 && /model|not found|not support|modalit|response/i.test(e.message) && !/api key/i.test(e.message))) break; // this model is not usable here: next model
        if (e.status === 401 || e.status === 403 || e.status === 429) continue; // this key: next key
        throw e;
      }
    }
  }
  if (last && last.status === 429) throw err('Gemini voice is rate limited right now', 429);
  throw last || err('Gemini voice is unavailable', 0);
}
async function gemBuffer(text, tone, c) {
  const d = await gemAudio(text, tone, c), cx = audioCtx(); if (!cx) throw err('No audio engine in this view', 0);
  const mime = String(d.mimeType || ''), bytes = b64bytes(d.data);
  if (!mime || /l16|pcm|raw/i.test(mime) || !/^audio\//i.test(mime)) { const m = /rate=(\d+)/i.exec(mime); return pcmBuffer(cx, bytes, m ? +m[1] : 24000); }
  return cx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

// ---------- ElevenLabs ----------
const elHint = (s, m) => s === 401 ? 'ElevenLabs rejected the key' : s === 402 ? 'ElevenLabs: this voice needs a paid plan' : s === 403 ? 'ElevenLabs: key or voice not allowed' : s === 429 ? 'ElevenLabs is out of credits or rate limited' : (String(m || ('HTTP ' + s)).slice(0, 120));
async function elBuffer(text, c) {
  const key = String(c.elKey || '').trim(); if (!key) throw err('No ElevenLabs key saved', 0);
  const cx = audioCtx(); if (!cx) throw err('No audio engine in this view', 0);
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 45000);
  try {
    let r;
    try {
      r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(String(c.elVoice || DEF.elVoice).trim()) + '?output_format=mp3_44100_64', {
        method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' }, signal: ac.signal,
        body: JSON.stringify({ text, model_id: c.elModel || DEF.elModel, voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true } })
      });
    } catch (e) { throw err(e && e.name === 'AbortError' ? 'The voice took too long' : 'Could not reach ElevenLabs', 0); }
    if (!r.ok) { let m = ''; try { const j = await r.json(); m = j && j.detail && (j.detail.message || j.detail); } catch (e) { } throw err(elHint(r.status, m), r.status); }
    const ab = await r.arrayBuffer();
    return await cx.decodeAudioData(ab);
  } finally { clearTimeout(t); }
}

// ---------- speaking ----------
// whole sentences, never longer than max characters
function split(text, max) {
  const parts = String(text).match(/[^.!?\n]+[.!?]*\s*/g) || [String(text)], out = []; let cur = '';
  parts.forEach(p => {
    while (p.length > max) { if (cur.trim()) { out.push(cur); cur = ''; } out.push(p.slice(0, max)); p = p.slice(max); }
    if ((cur + p).length > max) { if (cur.trim()) out.push(cur); cur = p; } else cur += p;
  });
  if (cur.trim()) out.push(cur);
  return out;
}
const clean = t => String(t || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function play(buf, rate) {
  return new Promise(res => {
    const cx = audioCtx(), src = cx.createBufferSource(); src.buffer = buf;
    try { src.playbackRate.value = Math.min(1.4, Math.max(0.8, +rate || 1)); } catch (e) { }
    src.connect(cx.destination); cur = src;
    curDone = () => { curDone = null; res(); };
    src.onended = () => { if (cur === src) cur = null; if (curDone) curDone(); };
    try { src.start(); } catch (e) { cur = null; if (curDone) curDone(); }
  });
}
function stop() {
  runTok++;
  const s = cur, d = curDone; cur = null; curDone = null;
  if (s) { try { s.onended = null; s.stop(); } catch (e) { } }
  if (d) d();
}
// speak(text, { isLive, rate, calm }) -> { ok, note, rest }. rest = text still unread when the cloud voice stopped early (the caller reads it with the phone voice).
async function speak(text, o) {
  o = o || {}; stop(); const my = runTok;
  const live = () => my === runTok && (!o.isLive || o.isLive());
  const c = cfg(), cx = audioCtx(), all = clean(text);
  if (!all) return { ok: true };
  if (!cx) return { ok: false, note: 'No audio engine in this view, using the phone voice', rest: all };
  try { if (cx.state !== 'running') await Promise.race([cx.resume(), sleep(900)]); } catch (e) { }
  if (cx.state !== 'running') return { ok: false, note: 'Tap the screen once to allow Ember Voice, using the phone voice for now', rest: all };
  const max = c.engine === 'eleven' ? 900 : 700, chunks = split(all, max), cap = 6, use = chunks.slice(0, cap), leftover = chunks.slice(cap).join(' ').trim();
  const tone = o.calm ? 'calm' : 'warm';
  const fetchN = i => { const p = c.engine === 'eleven' ? elBuffer(use[i].trim(), c) : gemBuffer(use[i].trim(), tone, c); p.catch(() => { }); return p; };
  let next = fetchN(0);
  for (let i = 0; i < use.length; i++) {
    let buf;
    try { buf = await next; }
    catch (e) { if (!live()) return { ok: true, stopped: true }; return { ok: false, note: String((e && e.message) || 'Voice failed') + ', using the phone voice', rest: use.slice(i).concat(leftover ? [leftover] : []).join(' ').trim() }; }
    if (!live()) return { ok: true, stopped: true };
    next = i + 1 < use.length ? fetchN(i + 1) : null;
    await play(buf, o.rate);
    if (!live()) return { ok: true, stopped: true };
  }
  return leftover ? { ok: true, rest: leftover } : { ok: true };
}

// ---------- Settings UI (Settings > Perms > Voice) ----------
function bindUI() {
  const $ = id => document.getElementById(id), eng = $('sEngine'); if (!eng) return;
  const c = cfg(), gv = $('sGemV'), ev = $('sElVoice');
  eng.value = c.engine;
  gv.innerHTML = GEM_VOICES.map(v => '<option value="' + v[0] + '">' + v[0] + ' · ' + v[1] + '</option>').join(''); gv.value = c.gem;
  ev.innerHTML = EL_VOICES.map(v => '<option value="' + v[0] + '">' + v[1] + '</option>').join('') + '<option value="__custom">My own voice ID…</option>';
  const known = EL_VOICES.some(v => v[0] === c.elVoice); ev.value = known ? c.elVoice : '__custom';
  $('sElCustom').value = known ? '' : c.elVoice; $('sElKey').value = c.elKey || '';
  const paint = () => {
    const e = eng.value; $('rowGem').style.display = e === 'gemini' ? '' : 'none'; $('rowEl').style.display = e === 'eleven' ? '' : 'none';
    $('sElCustom').style.display = ev.value === '__custom' ? '' : 'none';
    const n = $('voiceNote'), c2 = cfg();
    n.textContent = e === 'gemini' ? (gemKeys().length ? 'Ember Voice is on. It uses your Gemini key; the reply text is sent to Google when you read it aloud. If it fails, the phone voice takes over.' : 'No Gemini key saved yet, so the phone voice is used. Add a Gemini key in Settings > Keys.')
      : e === 'eleven' ? (c2.elKey ? 'Ember Voice is on through ElevenLabs. The reply text is sent to ElevenLabs when you read it aloud. If it fails, the phone voice takes over.' : 'Paste your ElevenLabs key below. Until then the phone voice is used.')
      : 'Using the phone voice only. Nothing leaves the device.';
  };
  eng.onchange = () => { setCfg({ engine: eng.value }); paint(); };
  gv.onchange = () => setCfg({ gem: gv.value });
  ev.onchange = () => { setCfg({ elVoice: ev.value === '__custom' ? ($('sElCustom').value.trim() || DEF.elVoice) : ev.value }); paint(); };
  $('sElCustom').oninput = () => setCfg({ elVoice: $('sElCustom').value.trim() || DEF.elVoice });
  $('sElKey').oninput = () => { setCfg({ elKey: $('sElKey').value.trim() }); paint(); };
  paint(); window.addEventListener('focus', paint);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUI); else bindUI();

window.EmberVoice = { active, speak, stop, cfg, setCfg, split, GEM_VOICES, EL_VOICES, MODELS };
})();
