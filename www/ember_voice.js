// Ember V1.9.9 - ember_voice.js: Ember Voice. A real, expressive voice instead of the Android default.
// Gemini speech (uses the Gemini key already saved in Settings > Keys), with the phone voice as the fallback.
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
  ['Callirrhoe', 'easy-going'], ['Autonoe', 'bright'], ['Iapetus', 'clear'], ['Umbriel', 'easy-going'], ['Despina', 'smooth'], ['Erinome', 'clear'],
  ['Rasalgethi', 'informative'], ['Laomedeia', 'upbeat'], ['Alnilam', 'firm'], ['Schedar', 'even'], ['Pulcherrima', 'forward'], ['Sadaltager', 'knowledgeable'],
  ['Sulafat', 'warm'], ['Vindemiatrix', 'gentle'], ['Algieba', 'smooth'], ['Algenib', 'gravelly'], ['Gacrux', 'mature'], ['Enceladus', 'breathy'], ['Achernar', 'soft']
];
// tried in this order; the one that works is remembered
const MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-tts'];
const DEF = { engine: 'gemini', gem: 'Puck', gemModel: '' };
const cfg = () => { const c = Object.assign({}, DEF, lsGet(KEY, {})); if (c.engine !== 'device') c.engine = 'gemini'; return c; };
const setCfg = p => { const c = Object.assign(cfg(), p); lsSet(KEY, c); return c; };

const gemKeys = () => { try { return ((window.Prov && window.Prov.entries && window.Prov.entries('gemini')) || []).filter(e => e && e.key && !e.bad).map(e => e.key); } catch (e) { return []; } };
// is the cloud voice usable right now?
function active() {
  const c = cfg();
  if (c.engine === 'gemini') return gemKeys().length > 0;
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
  const max = 700, chunks = split(all, max), cap = 6, use = chunks.slice(0, cap), leftover = chunks.slice(cap).join(' ').trim();
  const tone = o.calm ? 'calm' : 'warm';
  const fetchN = i => { const p = gemBuffer(use[i].trim(), tone, c); p.catch(() => { }); return p; };
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

// ---------- Mic: record on the phone, Gemini turns it into text (works without the phone's own speech service) ----------
const STT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const canListen = () => gemKeys().length > 0 && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const u8b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
function wavB64(chunks, inRate) {
  let n = 0; chunks.forEach(c => { n += c.length; });
  const all = new Float32Array(n); let o = 0; chunks.forEach(c => { all.set(c, o); o += c.length; });
  const ratio = inRate / 16000, m = Math.floor(n / ratio), pcm = new Int16Array(m);
  for (let i = 0; i < m; i++) {
    const a = Math.floor(i * ratio), b = Math.min(n, Math.floor((i + 1) * ratio)); let s = 0, k = 0;
    for (let j = a; j < b; j++) { s += all[j]; k++; }
    const v = Math.max(-1, Math.min(1, k ? s / k : 0)); pcm[i] = v < 0 ? v * 32768 : v * 32767;
  }
  const buf = new ArrayBuffer(44 + m * 2), dv = new DataView(buf), w = (p, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(p + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + m * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, m * 2, true);
  for (let i = 0; i < m; i++) dv.setInt16(44 + i * 2, pcm[i], true);
  return { b64: u8b64(new Uint8Array(buf)), seconds: m / 16000 };
}
async function sttOnce(model, key, b64) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const body = JSON.stringify({ contents: [{ parts: [{ text: 'Transcribe the speech in this audio exactly as spoken, in the language spoken. Output only the words, nothing else. If there is no speech, output nothing.' }, { inlineData: { mimeType: 'audio/wav', data: b64 } }] }] });
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 45000);
  try {
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body, signal: ac.signal }); }
    catch (e) { throw err(e && e.name === 'AbortError' ? 'Transcribing took too long' : 'Could not reach Gemini (offline?)', 0); }
    if (!r.ok) { let m = ''; try { const j = await r.json(); m = (j.error && j.error.message) || ''; } catch (e) { } throw err(String(m || ('HTTP ' + r.status)).slice(0, 140), r.status); }
    const j = await r.json(), parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    return parts.map(p => (p && p.text) || '').join('').trim();
  } finally { clearTimeout(t); }
}
async function transcribe(b64) {
  const keys = gemKeys(); if (!keys.length) throw err('No Gemini key saved: add one in Settings > Keys', 0);
  let last = null;
  for (const m of STT_MODELS) for (const k of keys) {
    try { return await sttOnce(m, k, b64); }
    catch (e) { last = e; if (e.status === 404) break; if (e.status === 401 || e.status === 403 || e.status === 429 || e.status === 400) continue; throw e; }
  }
  throw last || err('Transcribing failed', 0);
}
// listen() starts recording and resolves to { stop() -> Promise<text> }
async function listen() {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { throw err('Microphone blocked. Allow it in the phone’s app settings > Permissions > Microphone', 0); }
  const C = window.AudioContext || window.webkitAudioContext, cx = new C(), src = cx.createMediaStreamSource(stream), proc = cx.createScriptProcessor(4096, 1, 1), chunks = [];
  try { await cx.resume(); } catch (e) { }
  proc.onaudioprocess = e => { chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
  src.connect(proc); proc.connect(cx.destination);
  let done = false;
  const halt = () => { if (done) return; done = true; try { proc.onaudioprocess = null; proc.disconnect(); src.disconnect(); } catch (e) { } try { stream.getTracks().forEach(t => t.stop()); } catch (e) { } try { cx.close(); } catch (e) { } };
  return {
    async stop() {
      const rate = cx.sampleRate; halt();
      const w = wavB64(chunks, rate);
      if (w.seconds < 0.4) return '';
      return transcribe(w.b64);
    },
    cancel: halt
  };
}

// ---------- Settings UI (Settings > Perms > Voice) ----------
function bindUI() {
  const $ = id => document.getElementById(id), eng = $('sEngine'); if (!eng) return;
  const c = cfg(), gv = $('sGemV');
  eng.value = c.engine;
  gv.innerHTML = GEM_VOICES.map(v => '<option value="' + v[0] + '">' + v[0] + ' · ' + v[1] + '</option>').join(''); gv.value = c.gem;
  const paint = () => {
    const e = eng.value; $('rowGem').style.display = e === 'gemini' ? '' : 'none';
    $('voiceNote').textContent = e === 'gemini' ? (gemKeys().length ? 'Ember Voice is on. It uses your Gemini key; the reply text is sent to Google when you read it aloud. If it fails, the phone voice takes over.' : 'No Gemini key saved yet, so the phone voice is used. Add a Gemini key in Settings > Keys.')
      : 'Using the phone voice only. Nothing leaves the device.';
  };
  eng.onchange = () => { setCfg({ engine: eng.value }); paint(); };
  gv.onchange = () => setCfg({ gem: gv.value });
  paint(); window.addEventListener('focus', paint);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUI); else bindUI();

window.EmberVoice = { active, speak, stop, cfg, setCfg, split, GEM_VOICES, MODELS, canListen, listen };
})();
