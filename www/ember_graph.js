// Ember V1.9.54 — local Knowledge Graph: documents, notes, memory and chats stay on this phone.
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const STOP = new Set(('about after again all also because before between could does each from have into just more most other over should some such than that their them then there these they this those through using very what when where which while with would your you ember chat message reply answer document documents note notes file files the and for are was were has had his her him our out not but can get how why who its into from'.split(/\s+/)));
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const words = text => {
    const a = clean(text).toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) || [], c = new Map();
    a.forEach(w => { if (!STOP.has(w) && !/^\d+$/.test(w)) c.set(w, (c.get(w) || 0) + 1); });
    return [...c.entries()].sort((x, y) => y[1] - x[1]).slice(0, 7).map(x => x[0]);
  };
  async function collect() {
    const nodes = [], edges = [], byTopic = new Map();
    const add = (id, label, kind, text) => { nodes.push({ id, label: clean(label).slice(0, 42) || 'Untitled', kind }); const ts = words(text); ts.forEach(t => { const tid = 'topic:' + t; if (!byTopic.has(t)) { byTopic.set(t, tid); nodes.push({ id: tid, label: t, kind: 'topic' }); } edges.push({ a: id, b: tid }); }); };
    try {
      const docs = window.EmberDocs ? await window.EmberDocs.all() : [];
      (docs || []).slice(-80).forEach(d => add('doc:' + d.id, d.name, d.src === 'note' ? 'note' : 'document', d.name + '\n' + d.text));
    } catch (e) {}
    try {
      const mem = window.EmberBridge && window.EmberBridge.getMem ? window.EmberBridge.getMem() : null;
      (mem && (mem.facts || []).slice(-30) || []).forEach((m, i) => add('memory:' + i, 'Memory: ' + String(m.t || '').slice(0, 35), 'memory', m.t));
      (mem && (mem.threads || []).slice(-20) || []).forEach((m, i) => add('thread:' + i, 'Thread: ' + String(m.t || '').slice(0, 35), 'memory', m.t));
    } catch (e) {}
    try {
      const cs = window.Store ? await window.Store.all() : [];
      (cs || []).slice(-30).forEach(c => { const text = (c.msgs || []).slice(-12).map(m => m.t || '').join('\n'); if (text) add('chat:' + c.id, c.title || 'Chat', 'chat', text); });
    } catch (e) {}
    return { nodes, edges, topics: nodes.filter(n => n.kind === 'topic').length, sources: nodes.filter(n => n.kind !== 'topic').length };
  }
  function layout(g) {
    const topics = g.nodes.filter(n => n.kind === 'topic'), src = g.nodes.filter(n => n.kind !== 'topic');
    const W = 760, H = Math.max(360, Math.min(720, 170 + topics.length * 28));
    topics.forEach((n, i) => { const a = (i / Math.max(1, topics.length)) * Math.PI * 2 - Math.PI / 2; n.x = W / 2 + Math.cos(a) * Math.min(245, 115 + topics.length * 4); n.y = H / 2 + Math.sin(a) * Math.min(135, 75 + topics.length * 3); });
    src.forEach((n, i) => { const col = i % 3, row = Math.floor(i / 3); n.x = 78 + col * 300; n.y = 55 + (row % 5) * 62; });
    return { W, H };
  }
  function paint(g) {
    const out = $('graphView'); if (!out) return;
    if (!g.sources) { out.innerHTML = '<div class="graph-empty"><b>No local connections yet.</b><span>Add documents, notes, memory or chats and Ember will map their shared topics here.</span></div>'; $('graphStats').textContent = '0 sources · 0 topics'; return; }
    const d = layout(g), map = new Map(g.nodes.map(n => [n.id, n]));
    const lines = g.edges.map(e => { const a = map.get(e.a), b = map.get(e.b); return a && b ? '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" />' : ''; }).join('');
    const circles = g.nodes.map(n => '<g class="gn ' + n.kind + '" transform="translate(' + n.x + ' ' + n.y + ')"><circle r="' + (n.kind === 'topic' ? 15 : 11) + '"></circle><text y="' + (n.kind === 'topic' ? 29 : 24) + '" text-anchor="middle">' + esc(n.label) + '</text></g>').join('');
    out.innerHTML = '<svg viewBox="0 0 ' + d.W + ' ' + d.H + '" role="img" aria-label="Local knowledge graph"><g class="gedges">' + lines + '</g><g class="gnodes">' + circles + '</g></svg>';
    $('graphStats').textContent = g.sources + ' sources · ' + g.topics + ' shared topics';
  }
  async function build() { const g = await collect(); paint(g); return { ok: true, sources: g.sources, topics: g.topics, edges: g.edges.length }; }
  function open() { const s = $('graph'); if (!s) return; s.classList.add('show'); build(); }
  function close() { const s = $('graph'); if (s) s.classList.remove('show'); }
  $('bGraph') && ($('bGraph').onclick = open);
  $('graphX') && ($('graphX').onclick = close);
  $('graphRefresh') && ($('graphRefresh').onclick = build);
  window.addEventListener('ember-docs-changed', () => { if ($('graph') && $('graph').classList.contains('show')) build(); });
  window.EmberGraph = {
    TOOLS: [{ name: 'map_knowledge', description: 'Builds a local knowledge graph from saved documents, notes, memory and chats. It returns only counts and shared topics; content stays on the phone.', parameters: { query: 'string?' } }],
    dispatch: async name => name === 'map_knowledge' ? build() : { error: 'Unknown graph tool.' },
    open, build, collect
  };
})();
