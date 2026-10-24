// Ember V1.9.2 - ember_eleven.js: ElevenLabs text-to-speech for the 🔊 button and "Read replies aloud".
// Online voice. Used first when it is switched on and has a key; if it fails for any reason Ember falls back to the phone's own voice.
// Key order: localStorage ELEVENLABS_API_KEY (Settings > Perms > ElevenLabs voice) -> window.EMBER_ELEVEN_DEFAULT_KEY (ember_eleven_key.js).
// No key value is ever logged, shown or put in a prompt.
'use strict';
(() => {
const LS_KEY = 'ELEVENLABS_API_KEY', LS_VOICE = 'ELEVENLABS_VOICE_ID', LS_MODEL = 'ELEVENLABS_MODEL_ID', LS_ON = 'ember_eleven_on';
const DEF_VOICE = '21m00Tcm4TlvDq8ikWAM', DEF_MODEL = 'eleven_turbo_v2_5', MAXCH = 800;
const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const lsSet = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { } };
const clean = s => String(s || '').trim().replace(/^["']+|["']+$/g, '').trim();
const key = () => clean(lsGet(LS_KEY)) || clean(window.EMBER_ELEVEN_DEFAULT_KEY);
const voice = () => clean(lsGet(LS_VOICE)) || DEF_VOICE;
const model = () => clean(lsGet(LS_MODEL)) || DEF_MODEL;
const enabled = () => lsGet(LS_ON) !== '0';
let restUntil = 0, lastNote = '', cur = null, tok = 0;
const rested = () => Date.now() < restUntil;
const ready = () => enabled() && !!key() && !rested();

// split plain text into pieces of at most MAXCH characters, at sentence ends where possible (fewer requests = fewer credits)
function chunk(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim(); if (!s) return [];
  const parts = s.match(/[^.!?]+[.!?]*\s*/g) || [s], out = []; let acc = '';
  const flush = () => { if (acc.trim()) out.push(acc.trim()); acc = ''; };
  parts.forEach(p => {
    while (p.length > MAXCH) { flush(); let cut = p.lastIndexOf(' ', MAXCH); if (cut < MAXCH / 2) cut = MAXCH; out.push(p.slice(0, cut).trim()); p = p.slice(cut); }
    if ((acc + p).length > MAXCH) flush(); acc += p;
  });
  flush(); return out.filter(Boolean);
}
const reason = (status, body) => {
  let m = ''; try { const j = typeof body === 'string' ? JSON.parse(body) : body; m = (j && j.detail && (j.detail.message || j.detail.status || (typeof j.detail == 'string' ? j.detail : ''))) || (j && j.message) || ''; } catch (e) { }
  if (status === 401) return 'ElevenLabs rejected the key (HTTP 401)' + (m ? ': ' + String(m).slice(0, 90) : '');
  if (status === 402 || status === 403) return 'ElevenLabs plan or credits do not allow this (HTTP ' + status + ')' + (m ? ': ' + String(m).slice(0, 90) : '');
  if (status === 429) return 'ElevenLabs is rate limiting (HTTP 429)';
  if (status === 422) return 'ElevenLabs refused the voice or model id (HTTP 422)' + (m ? ': ' + String(m).slice(0, 90) : '');
  return 'ElevenLabs error (HTTP ' + status + ')' + (m ? ': ' + String(m).slice(0, 90) : '');
};
const fail = (status, body) => { const e = new Error(reason(status, body)); e.status = status; return e; };
const b64decode = s => { try { return atob(s); } catch (e) { return ''; } };

// one text piece -> an audio URL (data: or blob:). Native HTTP first inside the APK (no CORS, binary-safe), plain fetch otherwise.
async function synth(text) {
  const url = 'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice()) + '?output_format=mp3_44100_128';
  const body = { text, model_id: model(), voice_settings: { stability: 0.5, similarity_boost: 0.75 } };
  const headers = { 'xi-api-key': key(), 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' };
  const cap = window.Capacitor, H = cap && cap.Plugins && cap.Plugins.CapacitorHttp;
  let native = false; try { native = !!(cap && cap.isNativePlatform && cap.isNativePlatform()); } catch (e) { }
  if (native && H && H.request) {
    const r = await H.request({ url, method: 'POST', headers, data: body, responseType: 'blob', connectTimeout: 20000, readTimeout: 45000 });
    if (r.status < 200 || r.status >= 300) throw fail(r.status, typeof r.data === 'string' ? (b64decode(r.data) || r.data) : r.data);
    if (typeof r.data !== 'string' || !r.data) throw Object.assign(new Error('ElevenLabs sent no audio'), { status: 0 });
    return 'data:audio/mpeg;base64,' + r.data;
  }
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 45000);
  try {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ac.signal });
    if (!r.ok) { let b = ''; try { b = await r.text(); } catch (e) { } throw fail(r.status, b); }
    const blob = await r.blob(); if (!blob || !blob.size) throw Object.assign(new Error('ElevenLabs sent no audio'), { status: 0 });
    return URL.createObjectURL(blob);
  } catch (e) {
    if (e && e.name === 'AbortError') throw Object.assign(new Error('ElevenLabs timed out'), { status: 0 });
    if (e && e.status != null) throw e;
    throw Object.assign(new Error('Could not reach ElevenLabs (network or blocked)'), { status: 0 });
  } finally { clearTimeout(t); }
}
const playUrl = (url, rate, alive) => new Promise(res => {
  if (!alive()) { res(); return; }
  const a = new Audio(url); cur = a;
  try { a.playbackRate = Math.min(2, Math.max(0.5, rate || 1)); } catch (e) { }
  const done = () => { if (cur === a) cur = null; try { if (url.slice(0, 5) === 'blob:') URL.revokeObjectURL(url); } catch (e) { } res(); };
  a.onended = done; a.onerror = done;
  const p = a.play(); if (p && p.catch) p.catch(done);
});
function stop() { tok++; const a = cur; cur = null; if (a) { try { a.pause(); } catch (e) { } try { if (a.onended) a.onended(); } catch (e) { } } }

// speak(text, {rate, alive}) -> { ok, note }. alive() lets the caller cancel. Pieces are fetched one ahead of the one playing.
async function speak(text, opt) {
  opt = opt || {}; const mine = ++tok, alive = () => mine === tok && (!opt.alive || opt.alive());
  const pieces = chunk(text); if (!pieces.length) return { ok: true, note: '' };
  if (!key()) return { ok: false, note: 'No ElevenLabs key saved' };
  try {
    let next = synth(pieces[0]); next.catch(() => { });
    for (let i = 0; i < pieces.length; i++) {
      const url = await next; if (!alive()) return { ok: true, note: 'stopped' };
      if (i + 1 < pieces.length) { next = synth(pieces[i + 1]); next.catch(() => { }); }
      await playUrl(url, opt.rate, alive); if (!alive()) return { ok: true, note: 'stopped' };
    }
    lastNote = ''; return { ok: true, note: '' };
  } catch (e) {
    const st = e && e.status;
    if (st === 401 || st === 402 || st === 403) restUntil = Date.now() + 10 * 60000; else if (st === 429) restUntil = Date.now() + 60000;
    lastNote = (e && e.message) || 'ElevenLabs failed';
    return { ok: false, note: lastNote + '. Using the phone voice.', status: st };
  }
}
// Costs 2 characters of credit. Returns { ok, note } without playing anything.
async function check() {
  if (!key()) return { ok: false, note: 'No ElevenLabs key saved' };
  restUntil = 0;
  try { await synth('Hi'); lastNote = ''; return { ok: true, note: 'Key accepted. Voice ' + voice() + ', model ' + model() + '.' }; }
  catch (e) { const st = e && e.status; if (st === 401 || st === 402 || st === 403) restUntil = Date.now() + 10 * 60000; lastNote = (e && e.message) || 'failed'; return { ok: false, note: lastNote, status: st }; }
}

// Settings wiring (card added in index.html). Safe to run when the card is missing.
function wire() {
  const $ = id => document.getElementById(id); if (!$('swEleven')) return;
  const paint = () => { $('swEleven').classList.toggle('on', enabled()); if ($('elVoice')) $('elVoice').value = lsGet(LS_VOICE); if ($('elModel')) $('elModel').value = lsGet(LS_MODEL); if ($('elKey')) $('elKey').placeholder = lsGet(LS_KEY) ? 'Saved key in use (type to replace)' : 'Using the built-in default key'; };
  const note = t => { if ($('elNote')) $('elNote').textContent = t || ''; };
  $('swEleven').onclick = () => { lsSet(LS_ON, enabled() ? '0' : '1'); restUntil = 0; paint(); };
  if ($('elSave')) $('elSave').onclick = () => {
    const k = clean($('elKey') && $('elKey').value); if (k) lsSet(LS_KEY, k);
    lsSet(LS_VOICE, clean($('elVoice') && $('elVoice').value)); lsSet(LS_MODEL, clean($('elModel') && $('elModel').value));
    if ($('elKey')) $('elKey').value = ''; restUntil = 0; paint(); note('Saved.');
  };
  if ($('elClear')) $('elClear').onclick = () => { lsSet(LS_KEY, ''); restUntil = 0; paint(); note('Saved key removed. The built-in default key is used.'); };
  if ($('elCheck')) $('elCheck').onclick = async () => { note('Checking…'); const r = await check(); note((r.ok ? '✅ ' : '❌ ') + r.note); };
  paint();
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire(); }
window.EmberEleven = { ready, enabled, speak, stop, check, chunk, synth, key: () => !!key(), voice, model, lastNote: () => lastNote, rested };
})();
