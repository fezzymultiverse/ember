/* Full, redacted terminal history. Bounded live DOM; IndexedDB retains complete output. */
'use strict';
(() => {
  const W = window;
  let session;
  try { session = sessionStorage.getItem('ember_output_session'); if (!session) { session = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(); sessionStorage.setItem('ember_output_session', session); } } catch (_) { session = String(Date.now()) + Math.random(); }
  let pending = [], fallback = [], timer = 0, total = 0, failed = false, chain = Promise.resolve();
  const ready = new Promise(resolve => {
    try {
      const req = indexedDB.open('ember-output-history', 1);
      req.onupgradeneeded = () => { const s = req.result.createObjectStore('lines', { keyPath: 'id', autoIncrement: true }); s.createIndex('session', 'session'); };
      req.onerror = () => { failed = true; resolve(null); };
      req.onblocked = () => { failed = true; resolve(null); };
      req.onsuccess = () => { if (failed) { req.result.close(); return; } resolve(req.result); };
    } catch (_) { failed = true; resolve(null); }
  });
  function notify() { W.dispatchEvent(new CustomEvent('ember-output-history', { detail: { total, persistent: !failed } })); }
  const initialized = ready.then(db => new Promise(resolve => {
    if (!db) { notify(); resolve(); return; }
    const r = db.transaction('lines').objectStore('lines').index('session').count(IDBKeyRange.only(session));
    r.onsuccess = () => { total += r.result; notify(); resolve(); }; r.onerror = () => resolve();
  }));
  function flush() {
    clearTimeout(timer); timer = 0;
    chain = chain.then(async () => {
      const db = await ready, batch = pending; pending = [];
      if (!batch.length) return;
      if (!db || failed) { fallback.push(...batch); notify(); return; }
      await new Promise(resolve => {
        const tx = db.transaction('lines', 'readwrite'), s = tx.objectStore('lines');
        for (const row of batch) s.add({ session, row });
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => { failed = true; fallback.push(...batch); notify(); resolve(); };
      });
    });
    return chain;
  }
  function append(row) { pending.push(row); total++; if (!timer) timer = setTimeout(flush, 40); }
  async function visit(fn, backwards = false, offset = 0, limit = Infinity) {
    await initialized; await flush(); const db = await ready;
    let skipped = 0, count = 0;
    const extra = backwards ? [...fallback].reverse() : fallback;
    const readDB = async () => {
      if (!db) return;
      await new Promise((resolve, reject) => {
        const tx = db.transaction('lines'), req = tx.objectStore('lines').index('session').openCursor(IDBKeyRange.only(session), backwards ? 'prev' : 'next');
        req.onerror = () => reject(new Error('Cannot read archived output. Export has not been completed.'));
        req.onsuccess = () => { const c = req.result; if (!c || count >= limit) return resolve(); if (skipped++ >= offset) { fn(c.value.row); count++; } c.continue(); };
      });
    };
    function readFallback() { for (const row of extra) { if (count >= limit) break; if (skipped++ >= offset) { fn(row); count++; } } }
    if (backwards) { readFallback(); await readDB(); } else { await readDB(); readFallback(); }
  }
  function format(l) { return l.time + ' ' + (l.tag ? '[' + l.tag + '] ' : '') + '[' + l.source + '/' + l.stream + '] ' + l.text + (l.ms != null ? ' (' + Math.round(l.ms) + 'ms)' : ''); }
  async function page(offset, limit = 1000) { const rows = []; await visit(row => rows.push(row), true, offset, limit); return rows.reverse(); }
  async function text() { const parts = []; await visit(row => parts.push(format(row))); return parts.join('\n'); }
  async function blob() { const parts = []; let block = []; await visit(row => { block.push(format(row) + '\n'); if (block.length === 250) { parts.push(new Blob(block, { type: 'text/plain' })); block = []; } }); if (block.length) parts.push(new Blob(block, { type: 'text/plain' })); return new Blob(parts, { type: 'text/plain;charset=utf-8' }); }
  async function clear(all = false) {
    await flush(); const db = await ready;
    if (db) await new Promise((resolve, reject) => {
      const tx = db.transaction('lines', 'readwrite'), store = tx.objectStore('lines');
      if (all) store.clear();
      else { const req = store.index('session').openCursor(IDBKeyRange.only(session)); req.onsuccess = () => { const c = req.result; if (c) { c.delete(); c.continue(); } }; }
      tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(new Error('Output history could not be cleared.'));
    });
    total -= fallback.length; fallback = []; total = pending.length; notify();
  }
  W.addEventListener('pagehide', () => { flush(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  W.EmberOutputArchive = Object.freeze({ append, flush, page, text, blob, clear, purge: () => clear(true), ready: initialized, snapshot: () => ({ total, persistent: !failed, session }) });
})();
