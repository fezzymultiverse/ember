/* Ember 1.10.27 — non-overlapping chat controls and Command Centre layout. GitHub now lives in the Settings bottom widget (ember_gitbrain.js). */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  function init() {
    const comp = document.querySelector('footer.comp');
    if (!comp) return;
    // Move existing nodes: all original click handlers, provider checks and IDs survive.
    const bar = document.createElement('div'); bar.id = 'chatProviderBar';
    bar.setAttribute('aria-label', 'Chat provider connection and routing');
    const providers = $('bProv');
    if (providers) { const label = document.createElement('span'); label.textContent = 'Providers'; providers.append(label); bar.append(providers); }
    // Keep the engine status accessible in the centred header, but do not show an AI/status chip in the chat footer.
    if ($('bAiFeatures')) { $('bAiFeatures').classList.add('action-item'); $('bAiFeatures').innerHTML = '<span class="action-emoji">🧠</span><span class="action-txt"><b>AI Features</b><small>AI routing, media artifacts and downloads</small></span>'; $('headerActionsMenu')?.append($('bAiFeatures')); }
    if ($('provDrop')) bar.append($('provDrop'));
    comp.append(bar);
    // The real cancellation endpoint remains callable but never floats above the input.
    const stop = $('bStop');
    if (stop) { stop.tabIndex = 0; stop.removeAttribute('aria-hidden'); }
    // GitHub is ONE widget at the bottom of Settings. These names stay for older callers (right panel, status lines).
    const GB = () => window.EmberGitBrain;
    const idle = { ready: false, token: false, brain: '', files: 0, synced: 0, running: false, queued: 0 };
    window.EmberGit = { open: tab => { if (GB()) GB().open(tab === 'repos' || tab === 'files' ? 'search' : tab === 'build' || tab === 'activity' ? 'term' : 'brain'); }, close: () => { if (GB()) GB().close(); }, isOpen: () => !!(GB() && GB().isOpen()), summary: () => (GB() ? GB().summary() : idle), line: () => { const s = GB() ? GB().summary() : idle; return s.ready ? 'Brain: ' + s.brain + ' · ' + s.files + ' files · Token: ' + (s.token ? 'saved' : 'missing') : 'GitHub widget not loaded.'; } };
    // Update modal/docked semantics when rotating or resizing an already open panel.
    const media = matchMedia('(min-width: 1100px)');
    function resizePanel() {
      const panel = $('emberCommandCenter'), open = panel.classList.contains('ecc-open'), docked = open && (window.EmberPanelLayout ? window.EmberPanelLayout.canDock() : media.matches);
      document.body.classList.toggle('ecc-docked', docked); $('eccBackdrop').hidden = !open || docked;
      $('app').inert = open && !docked; panel.setAttribute('role', docked ? 'complementary' : 'dialog');
      if (open && !docked) { panel.setAttribute('aria-modal', 'true'); if (!panel.contains(document.activeElement)) $('eccClose').focus(); }
      else panel.removeAttribute('aria-modal');
    }
    media.addEventListener('change', resizePanel);
    window.addEventListener('resize', resizePanel); resizePanel();
    // A cancelled thinking row reflects the actual shared stop state, including redraws.
    let raf = 0;
    function stopState() {
      raf = 0; const stopping = !!stop?.disabled;
      document.querySelectorAll('#typ [data-et="stop"]').forEach(b => { b.disabled = stopping; const label = stopping ? 'Stopping…' : 'STOP'; if (b.textContent !== label) b.textContent = label; });
    }
    new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(stopState); }).observe($('log'), { childList: true, subtree: true });
    if (stop) new MutationObserver(stopState).observe(stop, { attributes: true, attributeFilter: ['disabled'] });
    window.EmberWorkspace = { open: tab => window.EmberGit.open(tab), setTab: tab => window.EmberGit.open(tab), refresh: () => { try { window.dispatchEvent(new CustomEvent('ember-git-state')); } catch (_) { /* listeners optional */ } } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
