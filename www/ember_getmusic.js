// Ember V1.9.22 - ember_getmusic.js: Music > Get tab. Search YouTube / SoundCloud, paste a link or playlist, save the audio to Music/Ember
// through the native EmberYoutube plugin (NewPipe extractor). Works without the AI add-on switch: these are buttons you press yourself.
'use strict';
(() => {
const $ = id => document.getElementById(id);
if (!$('mp_get')) return;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = m => { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3200); };
const fmt = s => { s = Math.max(0, Math.round(+s || 0)); return s ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : ''; };
function yt() {
  const cap = window.Capacitor; if (!cap) return undefined;
  const P = cap.Plugins || {}; if (P.EmberYoutube) return P.EmberYoutube;
  try { if (cap.isNativePlatform && cap.isNativePlatform() && cap.isPluginAvailable && cap.isPluginAvailable('EmberYoutube') && cap.registerPlugin) return cap.registerPlugin('EmberYoutube'); } catch (e) { /* not in this build */ }
  return undefined;
}
const NEED = 'The native downloader is only inside the Ember APK. In a browser, search and download do not work.';
const LINK = /^https:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be|soundcloud\.com)\/\S+$/i;
let list = []; // what the results area shows right now: [{ title, url, sub }]
const jobs = new Map(); // jobId -> latest detail from the 'ember-dl' event

const msg = (h) => { $('gtRes').innerHTML = h ? '<p class="hint">' + h + '</p>' : ''; };
let head = '';
function paintList() {
  $('gtRes').innerHTML = (list.length && head ? '<p class="hint">' + esc(head) + '</p>' : '') + (list.length ? list.map((x, i) => '<div class="trk"><button tabindex="-1">' + esc(x.title) + '<small>' + esc(x.sub) + '</small></button><button class="gtd" data-i="' + i + '" aria-label="Download ' + esc(x.title) + '">⬇</button></div>').join('') : '');
}
function paintJobs() {
  const a = [...jobs.values()].slice(-8).reverse();
  $('gtJobs').innerHTML = a.length ? a.map(j => {
    const pct = j.state === 'done' ? 100 : Math.max(0, Math.min(100, +j.pct || 0));
    const lab = j.state === 'done' ? 'Saved to Music/Ember' : j.state === 'failed' ? 'Failed' + (j.detail ? ': ' + j.detail : '') : (pct ? 'Downloading ' + pct + '%' : 'Looking it up…');
    return '<div class="gtj ' + esc(j.state) + '"><b>' + esc(j.title || 'Fetching track info') + '</b><small>' + esc(lab) + '</small><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
  }).join('') : '<p class="hint">Nothing downloading.</p>';
}
async function perm() { try { if (window.EmberNative && window.EmberNative.ensureNotifyPermission) await window.EmberNative.ensureNotifyPermission(); } catch (e) { /* notifications are optional */ } }
function track(id, title) {
  if (!id) return;
  jobs.set(id, { id, title: title || '', state: 'running', pct: 0, detail: '' }); paintJobs();
  if (window.EmberAgentAddon && window.EmberAgentAddon.trackJob) window.EmberAgentAddon.trackJob(id, title || '', true);
}
async function one(url, title) {
  const P = yt(); if (!P) { toast(NEED); return false; }
  if (!LINK.test(url)) { toast('That is not a YouTube or SoundCloud link'); return false; }
  await perm();
  try { const r = await P.downloadVideo({ url, title: title || '' }); if (r && r.jobId) { track(r.jobId, title); toast('Download started'); return true; } toast('The downloader did not start a job'); }
  catch (e) { toast('Could not start: ' + String((e && e.message) || e).slice(0, 120)); }
  return false;
}
async function search(sc) {
  const q = $('gtQ').value.trim(); if (!q) { toast('Type a song or artist first'); return; }
  const P = yt(); if (!P) { list = []; paintList(); msg(NEED); return; }
  head = ''; list = []; paintList(); msg('Searching…');
  try {
    const r = await P.search({ query: q, limit: 10, service: sc ? 'soundcloud' : 'youtube' });
    list = ((r && r.results) || []).map(x => ({ title: x.title || '(no title)', url: x.url, sub: [x.channel, fmt(x.durationSec)].filter(Boolean).join(' · ') }));
    if (list.length) paintList(); else msg('Nothing found.');
  } catch (e) { msg('Search failed: ' + esc(String((e && e.message) || e).slice(0, 140))); }
}
$('gtYt').onclick = () => search(false);
$('gtSc').onclick = () => search(true);
$('gtQ').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(false); } });
$('gtRes').addEventListener('click', async e => {
  const b = e.target.closest('.gtd'); if (!b) return;
  const x = list[+b.dataset.i]; if (!x) return;
  b.disabled = true; const ok = await one(x.url, x.title); b.textContent = ok ? '✓' : '⬇'; b.disabled = ok;
});
$('gtOne').onclick = async () => { const u = $('gtUrl').value.trim(); if (!u) { toast('Paste a link first'); return; } if (await one(u, '')) $('gtUrl').value = ''; };
$('gtList').onclick = async () => {
  const u = $('gtUrl').value.trim(), P = yt(); if (!u) { toast('Paste a playlist link first'); return; }
  if (!P) { msg(NEED); return; } if (!LINK.test(u)) { toast('That is not a YouTube or SoundCloud link'); return; }
  list = []; paintList(); msg('Reading the playlist…');
  try {
    const r = await P.playlist({ url: u, limit: 30 });
    list = ((r && r.tracks) || []).map(x => ({ title: x.title || '(no title)', url: x.url, sub: [x.artist, fmt(x.durationSec)].filter(Boolean).join(' · ') }));
    head = (r.title || 'Playlist') + ' · first ' + list.length; if (list.length) paintList(); else msg('That playlist is empty.');
  } catch (e) { msg('Could not read it: ' + esc(String((e && e.message) || e).slice(0, 140))); }
};
$('gtAll').onclick = async () => {
  const u = $('gtUrl').value.trim(), P = yt(); if (!u) { toast('Paste a playlist link first'); return; }
  if (!P) { toast(NEED); return; } if (!LINK.test(u)) { toast('That is not a YouTube or SoundCloud link'); return; }
  if (!window.confirm('Download up to 30 tracks from this playlist?')) return;
  await perm();
  try { const r = await P.downloadPlaylist({ url: u, limit: 30 }); ((r && r.jobs) || []).forEach(j => track(j.jobId, j.title)); toast(((r && r.jobs) || []).length + ' downloads queued'); $('gtUrl').value = ''; }
  catch (e) { toast('Could not queue: ' + String((e && e.message) || e).slice(0, 120)); }
};
let scanT = null;
window.addEventListener('ember-dl', e => {
  const j = e.detail || {}; if (!j.id) return;
  jobs.set(j.id, { id: j.id, title: j.title, state: j.state, pct: j.pct, detail: j.detail }); paintJobs();
});
window.addEventListener('ember-dl-final', e => {
  const d = e.detail || {}; if (d.state !== 'done') { if (d.state === 'failed') toast('A download failed'); return; }
  toast('Saved: ' + (d.title || 'track'));
  clearTimeout(scanT);
  scanT = setTimeout(() => { const P = window.EmberPlayer; if (P && P.deviceOk && P.deviceOk() && P.scanDevice) P.scanDevice().catch(() => { /* the library button still works */ }); }, 2500);
});
if (!yt()) $('gtNote').textContent = NEED;
})();
