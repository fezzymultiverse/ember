/* Ember output pacing. Provider chunks never write directly to the DOM. */
'use strict';
(() => {
  const W = window;
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
      return raw.replace(/<art(?:ifact)?\s*$/i, '');
    };
    const settle = ok => { const w = waiter; waiter = null; if (w) w.resolve(ok); };
    const schedule = () => { if (!handle) handle = setTimeout(tick, 16); };
    function tick() {
      handle = 0;
      if (waiter && waiter.cancelled && waiter.cancelled()) { reset(); return; }
      const now = performance.now(), dt = last ? Math.min(50, now - last) : 16; last = now;
      const remaining = target.length - shown.length;
      // Small backlog reads naturally; large provider bursts accelerate, but never dump in one frame.
      const cps = Math.min(1400, 65 + remaining * 0.42);
      credit += cps * dt / 1000;
      let count = Math.min(48, Math.floor(credit), remaining);
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
      // Tool rounds and provider retry responses may replace rather than append text.
      if (!text.startsWith(shown)) { shown = ''; credit = 0; paint(''); }
      target = text;
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
    return {push, reset, finish, state: () => ({shown, target, pending: target.length - shown.length, serial})};
  }
  W.EmberTypewriter = {create};
})();
