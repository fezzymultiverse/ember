/* Ember 1.10.17 — additive event adapters. No network, credentials, storage or UI markup. */
'use strict';
(() => {
  const W = window, D = document;
  // This public diagnostic records event COUNTS only, never payloads or user content.
  const counts = Object.create(null), health = Object.create(null);
  function count(name) { counts[name] = (counts[name] || 0) + 1; }
  function note(text) { if (W.EmberTimeline?._live?.()) W.EmberTimeline.note(text, 'wiring-' + text); }
  function terminal(tag, text, stream) {
    W.EmberCommandCenter?.write({ tag, source: 'Wiring', text, stream: stream || 'status' });
  }
  W.addEventListener('ember-apis-change', () => {
    count('ember-apis-change'); W.EmberPlugins?.paintMenu();
  });
  W.addEventListener('ember-keyless-health', e => {
    count('ember-keyless-health');
    // Only known tool ids and boolean health are accepted. Never retain endpoint/error text.
    const id = e.detail?.id;
    if (typeof id === 'string' && W.EmberKeyless?.tools().some(t => t.id === id)) health[id] = e.detail.ok === true;
  });
  W.addEventListener('ember-brain-pushed', () => {
    count('ember-brain-pushed');
    W.dispatchEvent(new CustomEvent('ember-git-state'));
    note('Knowledge Brain push completed.');
  });
  W.addEventListener('ember-download-status', () => {
    count('ember-download-status');
    const text = 'Download bridge status could not be read. Check the configured local bridge.';
    terminal('DL', text, 'stderr'); note(text);
  });
  D.addEventListener('ember-project-changed', () => {
    count('ember-project-changed');
    // Context is read anew on the next turn. Expose a non-content-bearing revision to diagnostics.
  });
  W.EmberWiring = Object.freeze({
    version: '1.10.17',
    snapshot: () => ({ counts: { ...counts }, health: { ...health }, projectRevision: counts['ember-project-changed'] || 0 })
  });
})();
