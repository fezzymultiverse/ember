/* Ember output pacing. Provider chunks never write directly to the DOM.
   V1.10.47 fixes:
   1. The reply no longer blanks and re-types from the first letter when the final text differs slightly from what was streamed
      (trimmed / normalised / tag-stripped text). The text is corrected in place and typing carries on from where it was.
   2. The reply no longer crawls or stalls while the app is in the background: throttled timers gave ~4 characters a second, and the
      turn (and its save) waited on that. A hidden page now shows the whole reply at once.
   3. Long replies paint less often (the whole message is re-formatted on every paint), so a 10k-character answer no longer janks.
   4. Half-typed "<a", "<ar" ... "<artifact" never flashes on screen. */
'use strict';
(() => {
  const W = window;
  const hiddenNow = () => { try { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; } catch (_) { return false; } };
  // Longest common prefix, never splitting a surrogate pair.
  function commonPrefix(a, b) {
    const n = Math.min(a.length, b.length); let i = 0;
    while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
    if (i > 0 && i < n && /[\uD800-\uDBFF]/.test(a[i - 1])) i--;
    return i;
  }
  function create(options) {
    let target = '', shown = '', handle = 0, last = 0, credit = 0, serial = 0, waiter = null;
    const paint = options.paint;
    const display = raw => {
      // Keep unfinished artifact markup out of chat; the completed card replaces this preview.
      const at = raw.search(/<artifact\b/i);
      if (at >= 0) {
        const head = raw.slice(0, at).trimEnd();
        const title = /\btitle\s*=\s*["']([^"']*)/i.exec(raw.slice(at));
        return head + (head ? '\n\n' : '') + 'Writing artifact' + (title ? ': ' + title[1] : '…');
      }
      return raw.replace(/<a(?:r(?:t(?:i(?:f(?:a(?:ct?)?)?)?)?)?)?\s*$/i, '');
    };
    const settle = ok => { const w = waiter; waiter = null; if (w) w.resolve(ok); };
    // Long text costs more per paint, so the gap between paints grows with it (16ms short, ~64ms past 10k characters).
    const gap = () => Math.min(64, 16 + Math.floor(shown.length / 210));
    const schedule = () => { if (!handle) handle = setTimeout(tick, gap()); };
    // Background / hidden page: no pacing, show everything now.
    function snap() {
      if (handle) { clearTimeout(handle); handle = 0; }
      if (shown !== target) { shown = target; paint(display(shown)); }
      last = 0; credit = 0; settle(true);
    }
    function tick() {
      handle = 0;
      if (waiter && waiter.cancelled && waiter.cancelled()) { reset(); return; }
      if (hiddenNow()) { snap(); return; }
      const now = performance.now(), dt = last ? Math.min(120, now - last) : 16; last = now;
      const remaining = target.length - shown.length;
      // Small backlog reads naturally; large provider bursts accelerate, but never dump in one frame.
      const cps = Math.min(1400, 65 + remaining * 0.42);
      credit += cps * dt / 1000;
      const count = Math.min(96, Math.floor(credit), remaining);
      if (count > 0) {
        credit -= count;
        let end = shown.length + count;
        if (end < target.length && /[\uD800-\uDBFF]/.test(target[end - 1])) end++;
        shown = target.slice(0, end); paint(display(shown));
      }
      if (shown.length < target.length) schedule();
      else { last = 0; credit = 0; settle(true); }
    }
    function push(text) {
      text = String(text || '');
      if (!text.startsWith(shown)) {
        // The new text does not continue what is on screen. Mostly-the-same text (final text trimmed, normalised, tags stripped)
        // is corrected in place and typing carries on; only a genuinely different text (tool round, retry) starts over.
        const cp = commonPrefix(text, shown);
        if (shown.length && cp >= Math.floor(shown.length * 0.5) && text.length >= cp) {
          let keep = Math.min(shown.length, text.length);
          if (keep < text.length && /[\uD800-\uDBFF]/.test(text[keep - 1])) keep++;
          shown = text.slice(0, keep); paint(display(shown));
        } else { shown = ''; credit = 0; paint(''); }
      }
      target = text;
      if (hiddenNow()) { snap(); return; }
      if (target !== shown) schedule();
    }
    function reset() {
      serial++; if (handle) clearTimeout(handle); handle = 0; target = shown = ''; last = credit = 0; settle(false);
    }
    function finish(text, cancelled) {
      settle(false); push(text);
      if (target === shown) return Promise.resolve(true);
      return new Promise(resolve => { waiter = { resolve, cancelled }; schedule(); });
    }
    // Coming back from the background mid-reply, or going away: never leave the reply waiting on a throttled timer.
    try { if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => { if (hiddenNow() && (shown !== target || waiter)) snap(); }); } catch (_) { /* no document */ }
    return {push, reset, finish, state: () => ({shown, target, pending: target.length - shown.length, serial})};
  }
  W.EmberTypewriter = {create};
})();
