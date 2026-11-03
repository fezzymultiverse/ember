// Ember V1.10.5 - ember_mediaplus.js: "+" > Create image / audio / video and the Stability bridge toggle.
// Runs the real media router (EmberMedia.generate) straight from the chat. Stability = image + audio; video is composed on-device from Stability images + audio
// (Stability's hosted video API was retired 24 Jul 2025).
'use strict';
(() => {
  const W = window, KEY = 'ember_media_cfg';
  const say = text => { try { W.dispatchEvent(new CustomEvent('ember-create-log', { detail: { kind: 'media', text } })); } catch (_) { /* terminal optional */ } };
  const plus = id => !!(W.EmberPlus && W.EmberPlus.isOn && W.EmberPlus.isOn(id));
  const bridgeOn = () => plus('stab');
  function enable() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      if (c.enabled === true) return;
      c.enabled = true; localStorage.setItem(KEY, JSON.stringify(c));
      W.dispatchEvent(new CustomEvent('ember-media-update'));
    } catch (_) { /* storage blocked: generate() will say media is off */ }
  }
  const providerFor = kind => kind === 'image' ? 'stability' : 'keyless';
  // Plain-English request in chat (only used while the Stability bridge is ON).
  function detect(t) {
    const s = String(t || '');
    if (!/\b(create|generate|make|produce|render|compose|draw|paint|animate|record)\b/i.test(s)) return null;
    // Stability's optional bridge is image-only. Audio/video route through the keyless adapter.
    if (/\b(image|picture|illustration|artwork|photo|logo|poster|wallpaper)\b/i.test(s)) return 'image';
    return null;
  }
  // Which one-shot did he pick in the + menu? (consumes it)
  function take() {
    const P = W.EmberPlus; if (!P || !P.consume) return null;
    if (P.consume('audio_gen')) return { kind: 'audio', provider: 'keyless' };
    if (P.consume('video_gen')) return { kind: 'video', provider: 'keyless' };
    return null;
  }
  function takeAll() { const P = W.EmberPlus, out = []; if (!P || !P.consume) return out; if (P.consume('audio_gen')) out.push({ kind: 'audio', provider: 'keyless' }); if (P.consume('video_gen')) out.push({ kind: 'video', provider: 'keyless' }); return out; }
  async function make(kind, want, prompt) {
    const M = W.EmberMedia; if (!M) return { ok: false, error: 'The media engine did not load.' };
    const provider = providerFor(kind, want);
    if (kind === 'speech') return { ok: false, kind, error: 'Spoken audio is not a media job any more. Use Read aloud on any reply (Settings > Voice).' };
    if (!M.supported[provider] || !M.supported[provider].includes(kind)) return { ok: false, kind, error: 'Ember cannot make ' + kind + '.' };
    enable();
    const p = String(prompt || '').trim().slice(0, 10000); if (!p) return { ok: false, error: 'Describe what to make first.' };
    say('Start ' + kind + ' on ' + provider);
    const t0 = Date.now();
    try {
      const r = await M.generate({ provider, kind, prompt: p, duration: 20, aspect: '1:1', confirmed: true });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      say('Saved ' + r.name + ' in ' + secs + 's');
      return { ok: true, kind, provider, name: r.name, id: r.id, secs };
    } catch (e) {
      const msg = String((e && e.message) || e || 'Media job failed.');
      say('Failed: ' + msg);
      return { ok: false, error: msg, noKey: /No available Stability|key/i.test(msg) };
    }
  }
  const imageBlock = r => 'Done. Stability AI drew it in ' + r.secs + 's.\n<artifact type="image" title="' + String(r.name).replace(/"/g, '') + '">media:' + r.id + '</artifact>';
  const text = r => r.ok
    ? (r.kind === 'image' && r.id ? imageBlock(r) : ({ audio: '🎵 Audio', video: '🎬 Video', image: '🎨 Image'}[r.kind] || 'Media') + ' ready: **' + r.name + '** (' + r.provider + ', ' + r.secs + 's). Open **+ → Media & Music → Saved media** to play, preview or save it.')
    : 'The ' + (r.kind || 'media') + ' was not made: ' + r.error;
  W.EmberMediaPlus = { make, take, takeAll, detect, text, imageBlock, bridgeOn, enable };
})();
