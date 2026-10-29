// Ember V1.10.5 - ember_mediaplus.js: "+" > Create image / audio / video and the Stability bridge toggle.
// Runs the real media router (EmberMedia.generate) straight from the chat. Stability = image + audio. Puter = video + speech.
// Stability hosted video is retired, so video always goes to Puter. No silent cross-provider fallback inside a media job.
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
  const providerFor = (kind, want) => {
    if (kind === 'video' || kind === 'speech') return 'puter';
    if (want === 'puter' && W.EmberMedia && W.EmberMedia.supported.puter.includes(kind)) return 'puter';
    return 'stability';
  };
  // Plain-English request in chat (only used while the Stability bridge is ON).
  function detect(t) {
    const s = String(t || '');
    if (!/\b(create|generate|make|produce|render|compose|draw|paint|animate|record)\b/i.test(s)) return null;
    if (/\b(video|animation|animate|clip)\b/i.test(s)) return 'video';
    if (/\b(speech|spoken|voice ?over|text to speech|say it out loud)\b/i.test(s)) return 'speech';
    if (/\b(audio|music|sound|song|beat|jingle|soundscape|instrumental)\b/i.test(s)) return 'audio';
    if (/\b(image|picture|illustration|artwork|photo|logo|poster|wallpaper)\b/i.test(s)) return 'image';
    return null;
  }
  // Which one-shot did he pick in the + menu? (consumes it)
  function take() {
    const P = W.EmberPlus; if (!P || !P.consume) return null;
    if (P.consume('audio_gen')) return { kind: 'audio', provider: 'stability' };
    if (P.consume('video_gen')) return { kind: 'video', provider: 'puter' };
    return null;
  }
  async function make(kind, want, prompt) {
    const M = W.EmberMedia; if (!M) return { ok: false, error: 'The media engine did not load.' };
    const provider = providerFor(kind, want);
    if (!M.supported[provider] || !M.supported[provider].includes(kind)) return { ok: false, error: provider + ' cannot make ' + kind + '.' };
    enable();
    const p = String(prompt || '').trim().slice(0, 10000); if (!p) return { ok: false, error: 'Describe what to make first.' };
    const label = provider === 'stability' ? 'Stability AI' : 'Puter';
    say('Start ' + kind + ' on ' + label + (provider === 'stability' ? (kind === 'image' ? ' / Stable Image Core' : ' / Stable Audio 2.5') : ''));
    const t0 = Date.now();
    try {
      if (provider === 'puter') { say('Checking Puter media sign-in'); await M.connectPuter(); }
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
  const text = r => r.ok
    ? ({ audio: '🎵 Audio', video: '🎬 Video', image: '🎨 Image', speech: '🗣 Speech' }[r.kind] || 'Media') + ' ready: **' + r.name + '** (' + (r.provider === 'stability' ? 'Stability AI' : 'Puter') + ', ' + r.secs + 's). Open **Settings > Command Centre > Media** to play, preview or download it.'
    : 'The ' + (r.kind || 'media') + ' was not made: ' + r.error;
  W.EmberMediaPlus = { make, take, detect, text, bridgeOn, enable };
})();
