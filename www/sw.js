// Ember V1.8.3 service worker: app files only. Network first so updates arrive, cache as the offline fallback. API calls are never touched.
const V = 'ember-v1.9.21', FILES = ['./', 'index.html', 'style.css', 'store.js', 'ember_keyscan.js', 'providers.js', 'safety.js', 'ember_player.js', 'ember_audd.js', 'ai_music.js', 'nine_nine.js', 'persona.js', 'ember_schema.js', 'ember_context.js', 'ai_docs.js', 'ai_scraper.js', 'ai_sites.js', 'ai_agent.js','ember_engine.js','ember_react.js','ember_react_ui.js','ember_docs_lib.js','ember_find.js', 'ember_tasks.js', 'ember_keys.js', 'ember_ui.js', 'app.js', 'ember_native.js', 'ai.js', 'ember_music_ui.js','ember_device.js','ember_browser.js','ember_term.js','ember_voice.js', 'ember_prov_ui.js', 'ember_lyrics.js', 'manifest.webmanifest', 'ember-icon.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k != V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method != 'GET' || u.origin != location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)).catch(() => {}); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
