/* Ember 1.9.95 — one repository workspace and non-overlapping chat controls. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  function init() {
    const comp = document.querySelector('footer.comp');
    if (!comp || !window.EmberRepoRunner) return;
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
    if (stop) { stop.tabIndex = -1; stop.setAttribute('aria-hidden', 'true'); }
    // Shared nodes, not duplicate forms: either settings entry opens the same workspace.
    const workspace = document.createElement('div'); workspace.id = 'repoWorkspace';
    $('acc_b_github').prepend(workspace);
    workspace.append($('ghCard'), $('repoRunnerFeature'));
    for (const id of ['ghCard', 'repoRunnerFeature']) { $(id).removeAttribute('data-tab'); $(id).classList.remove('stab-show'); }
    let adopted = '';
    function adopt() {
      const active = document.querySelector('#stabs .stab.on')?.dataset.st;
      if (!['github', 'features'].includes(active)) return;
      const host = $('acc_b_' + active); if (!host) return;
      if (workspace.parentElement !== host) host.prepend(workspace);
      if (active !== adopted) { adopted = active; window.EmberRepoRunner.paintSources(); }
    }
    $('acc_b_github').prepend(workspace);
    new MutationObserver(adopt).observe($('stabs'), { subtree: true, attributes: true, attributeFilter: ['class'] });
    adopt();
    for (const [id, title, subtitle] of [
      ['acc_h_github', 'GitHub · Brain & Repo Runner', 'One token · live Brain · repo search · Ember output · run status'],
      ['acc_h_features', 'Features · Repositories & AI', 'Shared repository workspace, routing, media and downloads']
    ]) { const b = $(id); if (b) { b.querySelector('b').textContent = title; b.querySelector('small').textContent = subtitle; } }
    function openRepos() {
      window.EmberCommandCenter?.close();
      if (!$('settings').classList.contains('show')) $('bSet').click();
      document.querySelector('#stabs [data-st="github"]').click();
      setTimeout(() => { workspace.scrollIntoView({ block: 'start' }); $('ghBrainRepo')?.focus({ preventScroll: true }); }, 70);
    }
    $('eccRepos').addEventListener('click', openRepos);
    let checking = false;
    $('eccRunnerStatus').addEventListener('click', async () => {
      if (checking) return; checking = true; $('eccRunnerStatus').disabled = true;
      try {
        const r = await window.EmberRepoRunner.status();
        if (!r.ok) throw new Error(r.error);
        const text = r.runs.length ? r.runs.map(x => 'Run ' + x.id + ': ' + x.status + (x.conclusion ? ' / ' + x.conclusion : '') + '\n' + x.url).join('\n\n') : 'No runs found. Install/update the configured runner first.';
        $('eccActionStatus').textContent = text;
        window.EmberCommandCenter.write({ source: 'Repo Runner', stream: 'status', text });
      } catch (e) { $('eccActionStatus').textContent = e.message; }
      finally { checking = false; $('eccRunnerStatus').disabled = false; }
    });
    function summary() {
      const c = window.EmberRepoRunner.config();
      $('eccRepoSummary').textContent = 'Brain: ' + c.brain + '\nEmber output: ' + (c.target || 'not configured') + '\nWhole sources: ' + c.sources.length + ' · Token: ' + (window.EmberGithub.on() ? 'saved (check access in workspace)' : 'not saved');
    }
    window.addEventListener('ember-repo-config', summary);
    window.EmberGithub.sub(e => { if (e.type === 'state') summary(); }); summary();
    // Update modal/docked semantics when rotating or resizing an already open panel.
    const media = matchMedia('(min-width: 1100px)');
    function resizePanel() {
      const panel = $('emberCommandCenter'), open = panel.classList.contains('ecc-open'), docked = open && media.matches;
      document.body.classList.toggle('ecc-docked', docked); $('eccBackdrop').hidden = !open || docked;
      $('app').inert = open && !docked; panel.setAttribute('role', docked ? 'complementary' : 'dialog');
      if (open && !docked) { panel.setAttribute('aria-modal', 'true'); if (!panel.contains(document.activeElement)) $('eccClose').focus(); }
      else panel.removeAttribute('aria-modal');
    }
    media.addEventListener('change', resizePanel); resizePanel();
    // A cancelled thinking row reflects the actual shared stop state, including redraws.
    let raf = 0;
    function stopState() {
      raf = 0; const stopping = !!stop?.disabled;
      document.querySelectorAll('#typ [data-et="stop"]').forEach(b => { b.disabled = stopping; const label = stopping ? 'Stopping…' : 'STOP'; if (b.textContent !== label) b.textContent = label; });
    }
    new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(stopState); }).observe($('log'), { childList: true, subtree: true });
    if (stop) new MutationObserver(stopState).observe(stop, { attributes: true, attributeFilter: ['disabled'] });
    window.EmberWorkspace = { open: openRepos, refresh: () => { window.EmberRepoRunner.paintSources(); summary(); } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
