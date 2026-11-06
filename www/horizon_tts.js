/* HORIZON · text to speech · V1.8.0
 *
 * Free and on-device. Engines, in the order Horizon tries them:
 *   1. Piper        optional "High quality" voice (downloaded once, then local)
 *   2. Native       Android's own speech engine through @capacitor-community/text-to-speech
 *   3. Web Speech   the WebView's speechSynthesis, as a last resort
 *
 * V1.8.0: Piper audio now plays through Web Audio that is unlocked on a tap (the old <audio> element
 * could be refused by the WebView after the long synth wait), the voice list is grouped by accent with
 * readable names, and the engine reports its state for the Voice card.
 *
 * Every failure falls through to the next engine and is reported, never swallowed.
 * Exposes window.HorizonTTS. Self-contained: it does not touch the rest of the app.
 */
(function (root) {
    'use strict';

    // ------------------------------------------------------------------ config
    // Everything that depends on an outside host lives here, so a dead URL is a one-line fix.
    const PIPER = {
        lib: 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.4/+esm',
        // Hosts that must bypass Capacitor's native HTTP bridge (it cannot stream 60 MB models).
        hosts: ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'huggingface.co', 'hf.co'],
        voices: [
            { id: 'en_US-hfc_female-medium', name: 'Hfc Female · US English' },
            { id: 'en_US-lessac-medium', name: 'Lessac · US English' },
            { id: 'en_US-ryan-medium', name: 'Ryan · US English' },
            { id: 'en_GB-alan-medium', name: 'Alan · UK English' },
            { id: 'en_US-amy-medium', name: 'Amy · US English' },
            { id: 'en_GB-alba-medium', name: 'Alba · Scottish English' },
            { id: 'en_GB-jenny_dioco-medium', name: 'Jenny · UK English' },
            { id: 'en_GB-northern_english_male-medium', name: 'Northern English male · UK' }
        ],
        loadMs: 60000,
        synthMs: 90000
    };
    const MAX_CHARS = { native: 3000, web: 180, piper: 260 };
    const KEYS = {
        engine: 'horizon_tts_engine',
        voice: 'horizon_tts_voice',
        lang: 'horizon_tts_lang',
        rate: 'horizon_tts_rate',
        pitch: 'horizon_tts_pitch',
        pvoice: 'horizon_tts_piper_voice',
        pready: 'horizon_tts_piper_ready'
    };

    // ----------------------------------------------------------------- helpers
    const ls = {
        get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* storage blocked or full */ } }
    };
    const msg = e => {
        const m = (e && e.message) ? e.message : String(e == null ? 'Unknown error' : e);
        return m.length > 200 ? m.slice(0, 199) + '…' : m;
    };
    const clamp = (n, lo, hi, d) => { n = parseFloat(n); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
    function withTimeout(p, ms, label) {
        let t;
        const timer = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(label)), ms); });
        return Promise.race([Promise.resolve(p), timer]).finally(() => clearTimeout(t));
    }

    // ---------------------------------------------------------------- settings
    const piperIds = PIPER.voices.map(v => v.id);
    function settings() {
        const pv = ls.get(KEYS.pvoice);
        return {
            engine: ls.get(KEYS.engine) === 'hq' ? 'hq' : 'standard',
            voice: ls.get(KEYS.voice) || '',
            lang: ls.get(KEYS.lang) || '',
            rate: clamp(ls.get(KEYS.rate), 0.5, 2, 1),
            pitch: clamp(ls.get(KEYS.pitch), 0.5, 2, 1),
            pvoice: piperIds.indexOf(pv) >= 0 ? pv : piperIds[0]
        };
    }
    function set(key, value) {
        switch (key) {
            case 'engine': ls.set(KEYS.engine, value === 'hq' ? 'hq' : 'standard'); break;
            case 'voice': ls.set(KEYS.voice, String(value || '')); break;
            case 'lang': ls.set(KEYS.lang, String(value || '')); break;
            case 'rate': ls.set(KEYS.rate, String(clamp(value, 0.5, 2, 1))); break;
            case 'pitch': ls.set(KEYS.pitch, String(clamp(value, 0.5, 2, 1))); break;
            case 'pvoice': if (piperIds.indexOf(value) >= 0) ls.set(KEYS.pvoice, value); break;
            default: return false;
        }
        return true;
    }

    // -------------------------------------------------- text → something speakable
    // Replies are markdown. Reading symbols, code and URLs aloud is unusable, so clean first.
    function speakable(src) {
        let t = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
        t = t.replace(/```[\s\S]*?(?:```|$)/g, '\nCode block skipped.\n');
        t = t.replace(/~~~[\s\S]*?(?:~~~|$)/g, '\nCode block skipped.\n');
        t = t.replace(/<[^>\n]+>/g, ' ');
        t = t.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
        t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
        t = t.replace(/\bhttps?:\/\/\S+/gi, 'link');
        t = t.replace(/`([^`\n]+)`/g, '$1');
        t = t.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');
        t = t.replace(/^[ \t]*>+[ \t]?/gm, '');
        t = t.replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/gm, '');
        t = t.replace(/^[ \t]*\|?[ \t:|-]{3,}\|?[ \t]*$/gm, '');
        t = t.replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (m, row) => row.split('|').map(c => c.trim()).filter(Boolean).join(', '));
        t = t.replace(/\|/g, ', ');
        t = t.replace(/(\*\*|__|~~)/g, '');
        t = t.replace(/(^|[\s(])\*+([^*\n]+?)\*+(?=[\s).,!?;:]|$)/g, '$1$2');
        t = t.replace(/(^|[\s(])_+([^_\n]+?)_+(?=[\s).,!?;:]|$)/g, '$1$2');
        try { t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ''); } catch (e) { /* old engine without \p */ }
        t = t.split('\n').map(l => {
            l = l.replace(/[ \t]+/g, ' ').trim();
            return (l && !/[.!?…:;,]["')\]”’]*$/.test(l)) ? l + '.' : l;
        }).filter(Boolean).join('\n');
        return t.trim();
    }

    function hardSplit(s, max) {
        const out = [];
        while (s.length > max) {
            let cut = s.lastIndexOf(', ', max);
            if (cut < max * 0.4) cut = s.lastIndexOf(' ', max);
            if (cut <= 0) cut = max;
            out.push(s.slice(0, cut + 1).trim());
            s = s.slice(cut + 1).trim();
        }
        if (s) out.push(s);
        return out;
    }
    // Packs whole sentences into chunks no longer than max, so engines get small, natural pieces.
    function chunkText(text, max) {
        const out = [];
        let cur = '';
        const flush = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
        String(text || '').split('\n').forEach(line => {
            line = line.trim();
            if (!line) return;
            let sents;
            try { sents = line.split(/(?<=[.!?…]["')\]”’]*)\s+/); } catch (e) { sents = [line]; }
            sents.forEach(s => {
                s = s.trim();
                if (!s) return;
                if (s.length > max) { flush(); hardSplit(s, max).forEach(p => out.push(p)); return; }
                if (cur && (cur.length + 1 + s.length) > max) flush();
                cur = cur ? cur + ' ' + s : s;
            });
        });
        flush();
        return out;
    }

    // ------------------------------------------------------------ state + events
    let plugFn = null;
    let NATIVE = false;
    let nativeMissing = false;
    let cur = null;                        // { id, tok }
    let audioEnd = null;                   // stops whatever Piper is playing
    let actx = null;                       // Web Audio context, created and unlocked on a tap
    let status = { state: 'idle', id: null, engine: '', error: '', note: '' };
    const listeners = new Set();
    function emit(patch) {
        status = Object.assign({}, status, { note: '', error: '' }, patch);
        listeners.forEach(fn => { try { fn(status); } catch (e) { /* a listener must never break speech */ } });
    }
    function onState(fn) { listeners.add(fn); return () => listeners.delete(fn); }

    // ------------------------------------------------------------ engine: native
    function nativePlugin() {
        if (!NATIVE || nativeMissing || !plugFn) return null;
        try { return plugFn('TextToSpeech'); } catch (e) { return null; }
    }
    const isMissing = e => !!e && (e.code === 'UNIMPLEMENTED' || /not implemented/i.test(String(e.message || e)));
    const nativeUsable = () => !!nativePlugin();

    async function nativeVoices() {
        const p = nativePlugin();
        if (!p) return [];
        try {
            const r = await withTimeout(p.getSupportedVoices(), 8000, 'Voice list timed out');
            const arr = (r && r.voices) || [];
            return arr.map((v, i) => ({
                index: i,
                id: v.voiceURI || v.name || String(i),
                name: v.name || v.voiceURI || ('Voice ' + (i + 1)),
                lang: String(v.lang || '').replace(/_/g, '-')
            }));
        } catch (e) {
            if (isMissing(e)) nativeMissing = true;
            return [];
        }
    }

    async function runNative(chunks, tok, s, started) {
        const p = nativePlugin();
        if (!p) throw new Error('The Android voice plugin is not part of this build');
        const voices = await nativeVoices();
        if (tok.cancelled) return;
        const v = voices.find(x => x.id === s.voice) || null;
        const langs = [v && v.lang, root.navigator && root.navigator.language, 'en-US']
            .filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
        let li = 0, first = true;
        for (const text of chunks) {
            let done = false;
            while (!done) {
                if (tok.cancelled) return;
                const args = { text, lang: langs[li], rate: s.rate, pitch: s.pitch, volume: 1.0, queueStrategy: 0 };
                if (v && langs[li] === v.lang) args.voice = v.index;
                if (first) { first = false; started(); }
                try {
                    await withTimeout(p.speak(args), 20000 + (text.length / (6 * s.rate)) * 1000, 'The Android voice timed out');
                    done = true;
                } catch (e) {
                    if (tok.cancelled) return;
                    if (isMissing(e)) { nativeMissing = true; throw e; }
                    if (/timed out/i.test(msg(e))) { try { await p.stop(); } catch (x) { /* ignore */ } }
                    if (/not supported|language/i.test(msg(e)) && li < langs.length - 1) { li++; continue; }
                    throw e;
                }
            }
        }
    }

    // ---------------------------------------------------------- engine: Web Speech
    const webUsable = () => !!(root.speechSynthesis && typeof root.SpeechSynthesisUtterance === 'function');
    async function webVoices() {
        if (!webUsable()) return [];
        let list = root.speechSynthesis.getVoices() || [];
        if (!list.length) {
            await new Promise(res => {
                const done = () => { root.speechSynthesis.removeEventListener('voiceschanged', done); res(); };
                root.speechSynthesis.addEventListener('voiceschanged', done);
                setTimeout(done, 1500);
            });
            list = root.speechSynthesis.getVoices() || [];
        }
        return list.map((v, i) => ({ index: i, id: v.voiceURI || v.name, name: v.name, lang: v.lang || '' }));
    }
    function runWeb(chunks, tok, s, started) {
        return new Promise((resolve, reject) => {
            const synth = root.speechSynthesis;
            if (!synth) { reject(new Error('No browser voice is available')); return; }
            const voices = synth.getVoices() || [];
            const pick = voices.find(v => (v.voiceURI || v.name) === s.voice) || null;
            let i = 0, begun = false;
            const next = () => {
                if (tok.cancelled) { resolve(); return; }
                if (i >= chunks.length) { resolve(); return; }
                const u = new root.SpeechSynthesisUtterance(chunks[i++]);
                u.rate = s.rate; u.pitch = s.pitch;
                if (pick) { u.voice = pick; u.lang = pick.lang; }
                // The WebView can accept speak() and then stay silent forever. Do not wait for it.
                let guard = begun ? null : setTimeout(() => { synth.cancel(); reject(new Error('The browser voice did not start')); }, 4000);
                u.onstart = () => { if (guard) { clearTimeout(guard); guard = null; } if (!begun) { begun = true; started(); } };
                u.onend = () => { if (guard) clearTimeout(guard); next(); };
                u.onerror = ev => {
                    if (guard) clearTimeout(guard);
                    const er = ev && ev.error;
                    if (tok.cancelled || er === 'canceled' || er === 'interrupted') { resolve(); return; }
                    reject(new Error('Browser voice error: ' + (er || 'unknown')));
                };
                try { synth.speak(u); } catch (e) { if (guard) clearTimeout(guard); reject(e); }
            };
            try { synth.cancel(); } catch (e) { /* ignore */ }
            next();
        });
    }

    // -------------------------------------------------------------- engine: Piper
    let piperApi = null, piperLoading = null, piperQ = Promise.resolve(), shimmed = false;
    const verified = {};

    function hostWantsWebFetch(url) {
        try {
            const h = new URL(url, root.location.href).hostname;
            return PIPER.hosts.some(x => h === x || h.endsWith('.' + x));
        } catch (e) { return false; }
    }
    // CapacitorHttp patches fetch and sends it through the native bridge, which breaks streamed
    // downloads. Capacitor keeps the untouched browser fetch as CapacitorWebFetch: use it for Piper hosts only.
    function installFetchShim() {
        if (shimmed || typeof root.fetch !== 'function') return;
        shimmed = true;
        const prev = root.fetch.bind(root);
        const web = typeof root.CapacitorWebFetch === 'function' ? root.CapacitorWebFetch.bind(root) : null;
        if (!web) return;
        root.fetch = function (input, init) {
            let url = '';
            try { url = typeof input === 'string' ? input : ((input && input.url) || String(input)); } catch (e) { /* ignore */ }
            return hostWantsWebFetch(url) ? web(input, init) : prev(input, init);
        };
    }
    function piperLib() {
        if (piperApi) return Promise.resolve(piperApi);
        if (!piperLoading) {
            piperLoading = (async () => {
                installFetchShim();
                let m;
                try {
                    m = await withTimeout(import(PIPER.lib), PIPER.loadMs, 'The Piper engine took too long to load');
                } catch (e) {
                    const off = root.navigator && root.navigator.onLine === false ? ' You are offline.' : '';
                    throw new Error('Could not load the Piper engine.' + off + ' ' + msg(e));
                }
                const api = [m, m && m.default].find(x => x && typeof x.predict === 'function' && typeof x.download === 'function');
                if (!api) throw new Error('The Piper library did not have the expected functions');
                piperApi = api;
                return api;
            })().catch(e => { piperLoading = null; throw e; });
        }
        return piperLoading;
    }
    function readyList() {
        try { const a = JSON.parse(ls.get(KEYS.pready) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    }
    const isReady = vid => readyList().indexOf(vid) >= 0;
    function markReady(vid, on) {
        const a = readyList().filter(x => x !== vid);
        if (on) a.push(vid);
        ls.set(KEYS.pready, JSON.stringify(a));
    }
    function piperSynth(text, vid) {
        const run = () => withTimeout((async () => {
            const api = await piperLib();
            if (!verified[vid]) {
                // predict() would quietly start a 60 MB download if the voice were missing. Never allow that here.
                const have = await api.stored();
                if (!Array.isArray(have) || have.indexOf(vid) < 0) { markReady(vid, false); throw new Error('The high quality voice is not on this device. Download it again in Personalisation.'); }
                verified[vid] = true;
            }
            const blob = await api.predict({ text, voiceId: vid });
            if (!blob || !blob.size) throw new Error('Piper returned no audio');
            return blob;
        })(), PIPER.synthMs, 'Piper took too long to speak');
        const p = piperQ.then(run, run);
        piperQ = p.catch(() => { /* keep the queue alive */ });
        return p;
    }
    // Android can refuse to start audio that was not triggered by a tap, and Piper takes seconds to synthesise,
    // so the tap is long gone by the time the sound is ready. A Web Audio context that was created and resumed
    // during a tap stays unlocked, so it is unlocked early (on every tap) and used for playback.
    function audioCtx() {
        if (actx) return actx;
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        try { actx = new AC(); } catch (e) { actx = null; }
        return actx;
    }
    function unlockAudio() {
        try {
            const c = audioCtx();
            if (c && c.state !== 'running' && c.state !== 'closed') {
                const r = c.resume();
                if (r && typeof r.catch === 'function') r.catch(() => { /* still locked, reported at play time */ });
            }
        } catch (e) { /* nothing to unlock */ }
    }
    async function playWebAudio(blob, rate, onStart) {
        const c = audioCtx();
        if (!c) throw new Error('Web Audio is not available');
        if (c.state !== 'running') {
            try { await withTimeout(c.resume(), 2000, 'resume timed out'); } catch (e) { /* checked below */ }
        }
        if (c.state !== 'running') throw new Error('Android has the audio locked (' + c.state + ')');
        const ab = await blob.arrayBuffer();
        const buf = await new Promise((res, rej) => {
            const p = c.decodeAudioData(ab, res, rej);
            if (p && typeof p.catch === 'function') p.catch(rej);
        });
        return new Promise((resolve, reject) => {
            const srcNode = c.createBufferSource();
            srcNode.buffer = buf;
            srcNode.playbackRate.value = clamp(rate, 0.5, 2, 1);
            srcNode.connect(c.destination);
            let fin = false;
            const stopFn = () => end();
            const end = err => {
                if (fin) return;
                fin = true;
                srcNode.onended = null;
                try { srcNode.stop(); } catch (e) { /* already stopped */ }
                try { srcNode.disconnect(); } catch (e) { /* already disconnected */ }
                if (audioEnd === stopFn) audioEnd = null;
                err ? reject(err) : resolve();
            };
            audioEnd = stopFn;
            srcNode.onended = () => end();
            try { srcNode.start(0); if (onStart) onStart(); } catch (e) { end(e); }
        });
    }
    function playElement(blob, rate, onStart) {
        return new Promise((resolve, reject) => {
            const url = root.URL.createObjectURL(blob);
            const a = new root.Audio(url);
            let fin = false;
            const stopFn = () => end();
            const end = err => {
                if (fin) return;
                fin = true;
                try { a.pause(); } catch (e) { /* ignore */ }
                root.URL.revokeObjectURL(url);
                if (audioEnd === stopFn) audioEnd = null;
                err ? reject(err) : resolve();
            };
            audioEnd = stopFn;
            a.playbackRate = clamp(rate, 0.5, 2, 1);
            a.onended = () => end();
            a.onerror = () => end(new Error('Audio playback failed'));
            a.onplaying = () => { if (onStart) { const f = onStart; onStart = null; f(); } };
            const pr = a.play();
            if (pr && typeof pr.catch === 'function') pr.catch(e => end(new Error('The audio element was refused: ' + msg(e))));
        });
    }
    async function playBlob(blob, rate, onStart) {
        let began = false;
        const mark = () => { began = true; if (onStart) onStart(); };
        try {
            await playWebAudio(blob, rate, mark);
            return;
        } catch (e1) {
            if (began) throw e1;                       // it was already playing: do not restart it
            try {
                await playElement(blob, rate, mark);
                return;
            } catch (e2) {
                if (began) throw e2;
                throw new Error('Piper made the audio but Android would not play it (' + msg(e1) + '; ' + msg(e2) + ')');
            }
        }
    }
    async function runPiper(chunks, tok, s, started) {
        const vid = s.pvoice;
        let nextBlob = piperSynth(chunks[0], vid);
        let first = true;
        for (let i = 0; i < chunks.length; i++) {
            const blob = await nextBlob;
            if (tok.cancelled) return;
            nextBlob = i + 1 < chunks.length ? piperSynth(chunks[i + 1], vid) : null;
            if (nextBlob) nextBlob.catch(() => { /* surfaced when awaited */ });
            await playBlob(blob, s.rate, () => { if (first) { first = false; started(); } });
            if (tok.cancelled) return;
        }
    }
    async function piperDownload(vid, onProgress) {
        if (piperIds.indexOf(vid) < 0) throw new Error('Unknown Piper voice');
        const api = await piperLib();
        const report = (p, label) => { try { onProgress && onProgress(p, label); } catch (e) { /* ignore */ } };
        report(0, 'Starting');
        await api.download(vid, p => {
            try {
                if (p && p.total > 0 && (/\.onnx/i.test(p.url || '') || p.total > 1e6)) report(Math.min(98, Math.round((p.loaded * 100) / p.total)), 'Downloading');
            } catch (e) { /* ignore */ }
        });
        report(99, 'Testing the voice');
        verified[vid] = true;
        await piperSynth('Horizon voice ready.', vid);
        markReady(vid, true);
        report(100, 'Ready');
    }
    async function piperRemove(vid) {
        markReady(vid, false);
        delete verified[vid];
        try {
            const api = await piperLib();
            if (typeof api.remove === 'function') await api.remove(vid);
        } catch (e) {
            throw new Error('Voice switched off, but the stored files could not be deleted: ' + msg(e));
        }
    }

    // ------------------------------------------------------------- orchestration
    const RUN = { piper: runPiper, native: runNative, web: runWeb };
    const LABEL = { piper: 'High quality voice', native: 'Android voice', web: 'Browser voice' };

    function stop(silent) {
        const c = cur;
        cur = null;
        if (c) {
            c.tok.cancelled = true;
            try { const p = nativePlugin(); if (p && typeof p.stop === 'function') Promise.resolve(p.stop()).catch(() => { /* ignore */ }); } catch (e) { /* ignore */ }
            try { if (webUsable()) root.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
        }
        if (audioEnd) { try { audioEnd(); } catch (e) { /* ignore */ } }
        if (!silent && (c || status.state !== 'idle')) emit({ state: 'idle', id: null, engine: '', error: '' });
    }

    async function speak(id, rawText) {
        unlockAudio();                                 // must run synchronously inside the tap
        stop(true);
        const tok = { cancelled: false };
        cur = { id, tok };
        const s = settings();
        const text = speakable(rawText);
        if (!text) {
            emit({ state: 'error', id, error: 'There is nothing to read aloud in this reply.' });
            cur = null;
            emit({ state: 'idle', id: null, engine: '' });
            return false;
        }
        emit({ state: 'loading', id, engine: '', error: '' });
        const order = [];
        if (s.engine === 'hq') order.push('piper');
        order.push('native', 'web');
        const errors = [];
        for (const eng of order) {
            if (tok.cancelled) return false;
            if (eng === 'piper' && !isReady(s.pvoice)) { errors.push('the high quality voice is not downloaded yet'); continue; }
            if (eng === 'native' && !nativeUsable()) continue;
            if (eng === 'web' && !webUsable()) continue;
            let began = false;
            try {
                emit({ engine: eng });
                await RUN[eng](chunkText(text, MAX_CHARS[eng]), tok, s, () => {
                    began = true;
                    if (!tok.cancelled) emit({ state: 'playing', id, engine: eng });
                });
                if (tok.cancelled) return false;
                cur = null;
                emit({
                    state: 'idle', id: null, engine: '', error: '',
                    note: errors.length ? 'Used the ' + LABEL[eng].toLowerCase() + ' instead: ' + errors[0] + '.' : ''
                });
                return true;
            } catch (e) {
                if (tok.cancelled) return false;
                if (began) { errors.push(LABEL[eng] + ' stopped: ' + msg(e)); break; }   // already speaking, so do not restart from the top
                errors.push(LABEL[eng].toLowerCase() + ' failed (' + msg(e) + ')');
            }
        }
        if (tok.cancelled) return false;
        cur = null;
        const why = errors.length
            ? errors.join('. ')
            : 'No voice engine is available on this device. Install Speech Services by Google in Android settings.';
        emit({ state: 'error', id, error: why });
        emit({ state: 'idle', id: null, engine: '' });
        return false;
    }

    function toggle(id, text) {
        if (status.id === id && (status.state === 'loading' || status.state === 'playing')) { stop(); return Promise.resolve(false); }
        return speak(id, text);
    }
    const TEST_LINE = 'This is how Horizon sounds. Strategy over impulse.';
    const test = () => toggle('test', TEST_LINE);

    // ------------------------------------------------------------------ voices UI
    let dispNames = null;
    try { dispNames = new Intl.DisplayNames([(root.navigator && root.navigator.language) || 'en'], { type: 'language' }); } catch (e) { dispNames = null; }
    function langInfo(tag) {
        const raw = String(tag || '').replace(/_/g, '-');
        const parts = raw.split('-');
        const key = parts.length > 1 ? parts[0].toLowerCase() + '-' + parts.slice(1).join('-').toUpperCase() : raw.toLowerCase();
        let name = '';
        if (dispNames && key) { try { name = dispNames.of(key) || ''; } catch (e) { name = ''; } }
        return { key: key || 'und', name: (name && name !== key) ? name : (key || 'Unknown language') };
    }
    // Android engine names look like "en-us-x-tpd-network". Turn that into something a person can pick.
    function voiceLabel(v, li) {
        const nm = String(v.name || '');
        const net = /network/i.test(nm), loc = /local|embedded/i.test(nm);
        const gender = /female/i.test(nm) ? 'female' : (/(^|[^a-z])male/i.test(nm) ? 'male' : '');
        const code = /-x-([a-z0-9]+)/i.exec(nm);
        const plain = /language$/i.test(nm) || nm.toLowerCase() === String(li.key).toLowerCase() || nm.toLowerCase() === String(v.lang).toLowerCase();
        const bits = [code ? 'Voice ' + code[1].toUpperCase() : (plain ? 'Standard voice' : nm)];
        if (gender) bits.push(gender);
        if (net) bits.push('online'); else if (loc) bits.push('offline');
        return bits.join(' · ');
    }
    let voiceCache = null, voiceCacheAt = 0;
    async function listVoices(force) {
        if (!force && voiceCache && Date.now() - voiceCacheAt < 20000) return voiceCache;
        let source = 'native', list = await nativeVoices();
        if (!list.length) { source = 'web'; list = await webVoices(); }
        const mine = String((root.navigator && root.navigator.language) || 'en-US').replace(/_/g, '-').toLowerCase();
        const mineLang = mine.split('-')[0];
        const enriched = list.map(v => {
            const li = langInfo(v.lang);
            return Object.assign({}, v, { langKey: li.key, langName: li.name, label: voiceLabel(v, li) });
        });
        // the phone's own accent first, then the rest of that language, then English, then everything else
        const rank = v => {
            const k = v.langKey.toLowerCase();
            return k === mine ? 0 : (k.split('-')[0] === mineLang ? 1 : (k.split('-')[0] === 'en' ? 2 : 3));
        };
        enriched.sort((a, b) => rank(a) - rank(b) || a.langName.localeCompare(b.langName) || a.langKey.localeCompare(b.langKey) || a.label.localeCompare(b.label));
        // tell apart voices that ended up with the same label
        const seen = {};
        enriched.forEach(v => { const k = v.langKey + '|' + v.label; seen[k] = (seen[k] || 0) + 1; });
        const run = {};
        enriched.forEach(v => {
            const k = v.langKey + '|' + v.label;
            if (seen[k] > 1) { run[k] = (run[k] || 0) + 1; v.label += ' ' + run[k]; }
        });
        const langs = [];
        enriched.forEach(v => {
            let l = langs[langs.length - 1];
            if (!l || l.key !== v.langKey) { l = { key: v.langKey, name: v.langName, count: 0 }; langs.push(l); }
            l.count++;
        });
        voiceCache = { source, voices: enriched, langs };
        voiceCacheAt = Date.now();
        return voiceCache;
    }
    async function diagnose() {
        const l = await listVoices();
        const s = settings();
        let audio = 'unsupported';
        if (actx) audio = actx.state === 'running' ? 'ready' : (actx.state === 'suspended' ? 'unlocks when you tap a speaker button' : actx.state);
        else if (root.AudioContext || root.webkitAudioContext) audio = 'unlocks when you tap a speaker button';
        return {
            native: NATIVE,
            nativePlugin: !!nativePlugin(),
            source: l.voices.length ? l.source : 'none',
            count: l.voices.length,
            langCount: l.langs.length,
            piper: isReady(s.pvoice) ? (s.engine === 'hq' ? 'ready and selected' : 'downloaded, not selected') : 'not downloaded',
            audio
        };
    }
    function describe() {
        const s = settings();
        if (s.engine === 'hq' && isReady(s.pvoice)) return 'High quality voice (Piper)';
        if (nativeUsable()) return 'Standard voice (Android)';
        if (webUsable()) return 'Standard voice (browser)';
        return 'No voice engine found';
    }

    function init(opts) {
        opts = opts || {};
        plugFn = typeof opts.plug === 'function' ? opts.plug : null;
        NATIVE = !!opts.native;
        if (root.document) {
            root.document.addEventListener('visibilitychange', () => { if (root.document.hidden) stop(); });
            // any tap unlocks the Web Audio context, so Piper can play later without a fresh tap
            ['click', 'touchend', 'keydown'].forEach(ev => root.document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));
        }
        root.addEventListener('pagehide', () => stop(true));
    }

    root.HorizonTTS = {
        init, settings, set, speak, toggle, stop, test, onState, listVoices, describe, diagnose,
        status: () => status,
        speakable, chunkText,
        piper: { voices: PIPER.voices, isReady, download: piperDownload, remove: piperRemove }
    };
})(window);
