// Ember V1.5.7 - ember_spotify.js: connect Ember to YOUR Spotify (Web API, PKCE sign-in, no server, no client secret).
// You make a free app at developer.spotify.com, paste its Client ID in Settings > Music, tap Connect.
// Read-only things (what is playing, your playlists, search) work for any account. Controlling playback needs Spotify Premium
// and the Spotify app open on a device. Spotify's Development-mode rules (app owner has Premium, 5 users) are Spotify's, not Ember's.
'use strict';
(() => {
const KEY = 'ember_spotify', PEND = 'ember_spotify_pending', API = 'https://api.spotify.com/v1';
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-modify-private playlist-modify-public';
const ls = {
  get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del: k => { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
};
const cfg = () => ls.get(KEY) || {};
const save = o => ls.set(KEY, o);
const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const emit = d => { try { window.dispatchEvent(new CustomEvent('ember-spotify', { detail: d })); } catch (e) { /* no listeners */ } };

// ---------- redirect URI ----------
// Spotify only accepts https, or http on 127.0.0.1 / [::1]. "localhost" is refused. Inside the APK the page itself lives on
// https://localhost, so the APK uses its own app link instead (MainActivity catches it and hands it back here).
function defaultRedirect() {
  if (native()) return 'com.fezzy.ember://spotify';
  const l = window.location;
  if (l.protocol === 'https:') return l.origin + l.pathname;
  if (l.hostname === '127.0.0.1' || l.hostname === '[::1]') return l.origin + l.pathname;
  return 'http://127.0.0.1:' + (l.port || '8080') + l.pathname;
}
const redirectUri = () => (cfg().redirect || '').trim() || defaultRedirect();

// ---------- PKCE ----------
const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const rand = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => CH[b % CH.length]).join(''); };
const b64u = buf => btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function challenge(v) { return b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))); }
const form = o => { const p = new URLSearchParams(); Object.keys(o).forEach(k => p.set(k, o[k])); return p.toString(); };

async function connect() {
  const o = cfg();
  if (!o.clientId) return { ok: false, error: 'Paste your Spotify Client ID first.' };
  if (!(window.crypto && crypto.subtle)) return { ok: false, error: 'This page cannot do the secure sign-in (needs https or 127.0.0.1).' };
  const verifier = rand(64), state = rand(16), redirect = redirectUri();
  ls.set(PEND, { verifier, state, redirect, t: Date.now() });
  const q = new URLSearchParams({ client_id: o.clientId, response_type: 'code', redirect_uri: redirect, scope: SCOPES, code_challenge_method: 'S256', code_challenge: await challenge(verifier), state });
  window.location.href = 'https://accounts.spotify.com/authorize?' + q.toString();
  return { ok: true, opening: true };
}

async function tokenCall(body) {
  let r; try { r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) }); }
  catch (e) { return { error: 'Could not reach Spotify (offline?).' }; }
  let d = null; try { d = await r.json(); } catch (e) { /* empty body */ }
  if (!r.ok || !d || !d.access_token) return { error: (d && (d.error_description || d.error)) || ('Spotify refused the sign-in (' + r.status + ').'), status: r.status };
  return { data: d };
}

// Called with the full URL Spotify sent the user back to (the web page URL, or the app link inside the APK).
async function finish(urlStr) {
  let u; try { u = new URL(urlStr); } catch (e) { return { ok: false, ignored: true }; }
  const pend = ls.get(PEND); if (!pend) return { ok: false, ignored: true };
  const code = u.searchParams.get('code'), st = u.searchParams.get('state'), err = u.searchParams.get('error');
  ls.del(PEND);
  if (err) return { ok: false, error: err === 'access_denied' ? 'You cancelled the Spotify sign-in.' : 'Spotify said: ' + err };
  if (!code || st !== pend.state) return { ok: false, error: 'The sign-in answer did not match this request. Tap Connect again.' };
  const o = cfg();
  const t = await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: pend.redirect, client_id: o.clientId, code_verifier: pend.verifier });
  if (t.error) return { ok: false, error: t.error };
  o.access = t.data.access_token; o.refresh = t.data.refresh_token || o.refresh; o.exp = Date.now() + (t.data.expires_in || 3600) * 1000;
  // Fetch /me with the new token before saving so that isConnected() is only true once the name is also in storage.
  try {
    const mr = await fetch(API + '/me', { headers: { Authorization: 'Bearer ' + o.access } });
    if (mr.ok) { const md = await mr.json(); if (md) o.name = md.display_name || md.id || ''; }
  } catch (e) { /* name stays blank — not fatal */ }
  save(o);
  return { ok: true, name: o.name || '' };
}

async function refresh() {
  const o = cfg(); if (!o.refresh || !o.clientId) return null;
  const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: o.refresh, client_id: o.clientId });
  if (t.error) { if (t.status === 400 || t.status === 401) { delete o.access; delete o.refresh; delete o.exp; save(o); emit({ type: 'expired' }); } return null; }
  o.access = t.data.access_token; if (t.data.refresh_token) o.refresh = t.data.refresh_token; o.exp = Date.now() + (t.data.expires_in || 3600) * 1000; save(o);
  return o.access;
}
async function token() { const o = cfg(); if (!o.access && !o.refresh) return null; if (o.access && o.exp && o.exp - 30000 > Date.now()) return o.access; return refresh(); }

function explain(status, d, path) {
  const e = (d && d.error) || {}, reason = e.reason || '', msg = e.message || (typeof e === 'string' ? e : '');
  if (status === 404 && path.indexOf('/me/player') === 0) return 'No active Spotify device. Open the Spotify app on this phone and play anything once, then try again.';
  if (status === 403 && reason === 'PREMIUM_REQUIRED') return 'Spotify only lets apps control playback on Premium accounts.';
  if (status === 403) return 'Spotify refused this (403' + (msg ? ': ' + msg : '') + '). In a Development-mode app your account must be added under User Management on developer.spotify.com, and the app owner needs Premium.';
  if (status === 429) return 'Spotify rate limit hit. Wait a moment and try again.';
  if (status === 401) return 'Spotify sign-in expired. Reconnect in Settings > Music.';
  return 'Spotify error ' + status + (msg ? ': ' + msg : '') + '.';
}
async function api(method, path, o) {
  o = o || {}; let tok = await token();
  if (!tok) return { error: 'Spotify is not connected.' };
  const url = API + path + (o.query ? '?' + new URLSearchParams(o.query).toString() : '');
  for (let attempt = 0; attempt < 2; attempt++) {
    let r;
    try { r = await fetch(url, { method, headers: Object.assign({ Authorization: 'Bearer ' + tok }, o.body ? { 'Content-Type': 'application/json' } : {}), body: o.body ? JSON.stringify(o.body) : undefined }); }
    catch (e) { return { error: 'Could not reach Spotify (offline?).' }; }
    if (r.status === 401 && attempt === 0) { tok = await refresh(); if (!tok) return { error: 'Spotify sign-in expired. Reconnect in Settings > Music.' }; continue; }
    if (r.status === 204) return { status: 204, data: null };
    let d = null; try { d = await r.json(); } catch (e) { /* empty body */ }
    if (r.ok) return { status: r.status, data: d };
    return { error: explain(r.status, d, path), status: r.status };
  }
  return { error: 'Spotify did not answer.' };
}

// ---------- mapping ----------
function mapItem(it) {
  if (!it) return null;
  const imgs = (it.album && it.album.images) || it.images || [];
  return { id: it.id, uri: it.uri, title: it.name || '', artist: (it.artists || []).map(a => a.name).join(', ') || (it.show && it.show.name) || '', album: (it.album && it.album.name) || '', durationSec: Math.round((it.duration_ms || 0) / 1000), art: imgs.length ? imgs[imgs.length - 1].url : '' };
}
let cache = { t: 0, v: null }, inflight = null;
async function current(force) {
  if (!isConnected()) return { error: 'Spotify is not connected.' };
  if (!force && Date.now() - cache.t < 2500 && cache.v) return cache.v;
  if (inflight) return inflight;
  inflight = (async () => {
    const r = await api('GET', '/me/player', { query: { additional_types: 'track,episode' } });
    let v;
    if (r.error) v = { error: r.error };
    else if (!r.data) v = { playing: false, track: null, idle: true };
    else v = { playing: !!r.data.is_playing, track: mapItem(r.data.item), positionSec: Math.round((r.data.progress_ms || 0) / 1000), volume: r.data.device ? r.data.device.volume_percent : null, device: r.data.device ? r.data.device.name : '', shuffle: !!r.data.shuffle_state };
    cache = { t: Date.now(), v }; inflight = null; return v;
  })();
  return inflight;
}

// ---------- control ----------
async function pickDevice() {
  const r = await api('GET', '/me/player/devices'); if (r.error || !r.data) return null;
  const d = (r.data.devices || []).filter(x => !x.is_restricted);
  return (d.find(x => x.type === 'Smartphone') || d[0] || {}).id || null;
}
async function control(action, o) {
  o = o || {}; cache = { t: 0, v: null };
  if (action === 'toggle') { const c = await current(true); if (c.error) return { ok: false, error: c.error }; return control(c.playing ? 'pause' : 'play'); }
  let m, path, query, body;
  switch (action) {
    case 'play': m = 'PUT'; path = '/me/player/play'; if (o.uri) body = { uris: [o.uri] }; else if (o.contextUri) body = { context_uri: o.contextUri }; break;
    case 'pause': case 'stop': m = 'PUT'; path = '/me/player/pause'; break;
    case 'next': m = 'POST'; path = '/me/player/next'; break;
    case 'prev': m = 'POST'; path = '/me/player/previous'; break;
    case 'seek': m = 'PUT'; path = '/me/player/seek'; query = { position_ms: String(Math.max(0, Math.round((+o.value || 0) * 1000))) }; break;
    case 'volume': m = 'PUT'; path = '/me/player/volume'; query = { volume_percent: String(Math.max(0, Math.min(100, Math.round(+o.value)))) }; break;
    default: return { ok: false, error: 'Spotify cannot do: ' + action };
  }
  let r = await api(m, path, { query, body });
  if (r.error && r.status === 404 && action === 'play') {
    const dev = await pickDevice();
    if (dev) r = await api(m, path, { query: Object.assign({}, query || {}, { device_id: dev }), body });
  }
  if (r.error) return { ok: false, error: r.error };
  return { ok: true, source: 'spotify' };
}
async function search(q, limit) {
  q = String(q || '').trim(); if (!q) return { results: [] };
  const r = await api('GET', '/search', { query: { q, type: 'track', limit: String(Math.max(1, Math.min(+limit || 8, 10))) } });
  if (r.error) return { error: r.error };
  return { results: ((r.data && r.data.tracks && r.data.tracks.items) || []).map(mapItem).filter(Boolean) };
}
async function playlists() {
  const r = await api('GET', '/me/playlists', { query: { limit: '30' } });
  if (r.error) return { error: r.error };
  return { playlists: ((r.data && r.data.items) || []).filter(Boolean).map(p => ({ id: p.id, uri: p.uri, name: p.name, tracks: (p.items && p.items.total != null) ? p.items.total : (p.tracks ? p.tracks.total : null) })) };
}
async function createPlaylist(name, uris) {
  name = String(name || '').trim().slice(0, 90); if (!name) return { error: 'Playlist name is required.' };
  const list = (Array.isArray(uris) ? uris : []).map(u => /^spotify:/.test(u) ? u : 'spotify:track:' + u).slice(0, 100);
  if (!list.length) return { error: 'No tracks to add.' };
  const c = await api('POST', '/me/playlists', { body: { name, public: false, description: 'Made by Ember' } });
  if (c.error) return { error: c.error };
  const a = await api('POST', '/playlists/' + c.data.id + '/items', { body: { uris: list } });
  if (a.error) return { error: 'Playlist "' + name + '" was created but adding tracks failed: ' + a.error };
  return { ok: true, name, count: list.length };
}

// ---------- state ----------
const isConnected = () => { const o = cfg(); return !!(o.access || o.refresh); };
const status = () => { const o = cfg(); return { clientId: !!o.clientId, connected: isConnected(), name: o.name || '', redirect: redirectUri(), native: native() }; };
function setClientId(v) { const o = cfg(); o.clientId = String(v || '').replace(/[\s"'​-‍﻿]/g, ''); save(o); }
function setRedirect(v) { const o = cfg(); o.redirect = String(v || '').replace(/[\s​-‍﻿]/g, ''); save(o); }
function disconnect() { const o = cfg(); delete o.access; delete o.refresh; delete o.exp; delete o.name; save(o); ls.del(PEND); cache = { t: 0, v: null }; emit({ type: 'disconnected' }); }
function wipe() { ls.del(KEY); ls.del(PEND); cache = { t: 0, v: null }; }

async function handleBack(url) {
  const r = await finish(url); if (r.ignored) return;
  emit({ type: r.ok ? 'connected' : 'failed', error: r.error, name: r.name });
}
function boot() {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get('state') && (u.searchParams.get('code') || u.searchParams.get('error'))) {
      const full = window.location.href;
      try { window.history.replaceState(null, '', u.origin + u.pathname); } catch (e) { /* keep url */ }
      handleBack(full);
    }
  } catch (e) { /* not a normal url */ }
  window.addEventListener('ember-deeplink', e => { if (e && typeof e.detail === 'string' && /^com\.fezzy\.ember:/i.test(e.detail)) handleBack(e.detail); });
  if (typeof window.__emberDeepLink === 'string') handleBack(window.__emberDeepLink);
}

window.EmberSpotify = { connect, disconnect, wipe, isConnected, status, setClientId, setRedirect, defaultRedirect, current, control, search, playlists, createPlaylist, boot, getClientId: () => cfg().clientId || '', getRedirect: () => cfg().redirect || '' };
})();
