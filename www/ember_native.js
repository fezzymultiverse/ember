// Ember Add-On: native bridge (www/ember_native.js)
// Talks to android_patch/.../EmberMediaPlugin.kt and EmberNotifyPlugin.kt (registered
// manually in MainActivity -- these are local plugins, not npm packages, so `cap sync`
// alone will NOT pull them in; they must be copied into android/app/src/main/java/...).
// Needs @capacitor-community/wakelock synced for holdDuringReply to do anything.
// No-ops gracefully in a plain browser (no Capacitor) so dev/testing still works.
'use strict';
(() => {
  const cap = window.Capacitor;
  const P = (cap && cap.Plugins) || {};
  const Media = P.EmberMedia;   // local plugin
  const Notify = P.EmberNotify; // local plugin
  const WL = P.Wakelock;        // @capacitor-community/wakelock

  // Bridge EmberMedia/EmberNotify onto window so ai_music.js's existing
  // window.EmberMedia.* checks pick them up without rewriting that file.
  if (Media) {
    window.EmberMedia = {
      getLibrary: () => Media.getLibrary(),
      hasPermission: () => Media.hasPermission(),
      requestPermission: () => Media.requestMusicPermission(),
      // Not implemented: needs Prodigy's actual API, not guessed here.
      getCurrentTrack: async () => ({ track: null, playing: false, note: 'Needs a Prodigy bridge -- not built.' }),
      controlPlayer: async () => ({ error: 'Needs a Prodigy bridge -- not built.' })
    };
  }

  // ---------- wakelock: hold while a reply is streaming in ----------
  async function holdDuringReply(promise) {
    try { if (WL) await WL.acquire(); } catch (e) { /* no-op outside Capacitor */ }
    try { return await promise; }
    finally { try { if (WL) await WL.release(); } catch (e) {} }
  }

  // ---------- real notification + real reply box ----------
  async function ensureNotifyPermission() {
    if (!Notify) return false;
    try {
      const p = await Notify.hasPermission();
      if (p.granted) return true;
      const r = await Notify.requestNotifyPermission();
      return !!r.granted;
    } catch (e) { return false; }
  }

  async function notifyReply(previewText) {
    if (!document.hidden) return; // app is foreground, chat already shows it
    const ok = await ensureNotifyPermission();
    if (!ok || !Notify) return;
    try {
      await Notify.notify({ title: 'Ember', body: String(previewText || '').slice(0, 120) || 'New reply.' });
    } catch (e) { /* notification failed, chat still has the reply */ }
  }

  // ---------- native speech recognition (Android WebView has NO webkitSpeechRecognition) ----------
  const SRP = P.SpeechRecognition; // @capacitor-community/speech-recognition
  const speech = SRP ? (() => {
    let guard = null;
    const clearGuard = () => { if (guard) { clearTimeout(guard); guard = null; } };
    return {
      isNative: true,
      async available() { try { const r = await SRP.available(); return !!(r && r.available); } catch (e) { return false; } },
      async ensurePermission() {
        try {
          let p = await SRP.checkPermissions();
          if (p && p.speechRecognition === 'granted') return true;
          p = await SRP.requestPermissions();
          return !!(p && p.speechRecognition === 'granted');
        } catch (e) { return false; }
      },
      // opts: { lang, onText(text), onState(bool), onError(msg) }
      async start(opts) {
        try { await SRP.removeAllListeners(); } catch (e) {}
        const pick = d => { const m = (d && (d.matches || d.value)) || []; return String(m[0] || ''); };
        await SRP.addListener('partialResults', d => { const t = pick(d); if (t) opts.onText(t); });
        await SRP.addListener('listeningState', d => {
          const on = !!(d && d.status === 'started');
          opts.onState(on);
          if (!on) { clearGuard(); try { SRP.removeAllListeners(); } catch (e) {} }
        });
        try {
          const r = await SRP.start({ language: opts.lang || 'en-US', maxResults: 1, partialResults: true, popup: false });
          const t = pick(r); if (t) opts.onText(t);
          guard = setTimeout(() => { try { SRP.stop(); } catch (e) {} }, 60000);
        } catch (e) {
          clearGuard(); opts.onState(false);
          opts.onError(String((e && (e.message || e.errorMessage)) || 'Could not start the microphone'));
        }
      },
      async stop() { clearGuard(); try { await SRP.stop(); } catch (e) {} }
    };
  })() : null;

  // ---------- mic permission ----------
  async function ensureMicPermission() {
    if (speech) return speech.ensurePermission();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) { return false; }
  }

  async function musicPermissionStatus() {
    if (!Media) return { granted: false, note: 'EmberMediaPlugin not registered in MainActivity.' };
    try { return await Media.hasPermission(); } catch (e) { return { granted: false, note: e.message }; }
  }

  window.EmberNative = { speech, holdDuringReply, ensureNotifyPermission, notifyReply, ensureMicPermission, musicPermissionStatus };
})();
