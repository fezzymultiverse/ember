// Single Knowledge Brain Repo. All browsing reads live with the saved token.
'use strict';
(() => {
const G = () => window.EmberGithub, $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
if (!$('ghHub') || !G()) return;
let busy = false;
const message = (id, text) => { const el = $(id); if (el) el.textContent = text || ''; };
function paint() {
  const g = G(), c = g.cfg();
  $('ghHub').innerHTML = '<div class="gh-sec" data-ghp="connect"><div class="gh-h">1 · Apply Ember’s Brain</div>' +
    '<label class="lb" for="ghBrainRepo">Knowledge Brain Repo</label>' +
    '<input id="ghBrainRepo" type="text" value="' + esc(g.knowledgeRepo()) + '" placeholder="fezzymultiverse/ember-brain" autocomplete="off" autocapitalize="off" spellcheck="false">' +
    '<button class="btn g" data-gh-action="save-repo">Apply Brain repository</button>' +
    '<p class="hint">One Brain for live knowledge tools, automatically included in the linked repos on the Repos tab. Use the Repos tab to add whole sources or pick your Ember output repo. Applying a Brain is local; live reads require your saved token.</p><p class="hint" id="ghRepoStatus" role="status"></p></div>' +
    '<div class="gh-sec" data-ghp="connect"><label class="lb" for="ghTok">GitHub token</label>' +
    '<input type="password" id="ghTok" placeholder="' + (g.token() ? 'Token saved. Paste to replace.' : 'Paste GitHub token') + '" autocomplete="off" autocapitalize="off" spellcheck="false">' +
    '<p class="hint">The token stays on this device and is sent only to the GitHub API, never to the model. It needs access to the Super Repo, including Contents read access for a fine-grained token.</p>' +
    '<div class="btnrow"><button class="btn" data-gh-action="save-token">Save token</button><button class="btn g" data-gh-action="check-token">Check access</button><button class="btn g danger" data-gh-action="remove-token">Remove token</button></div><p class="hint" id="ghTokenStatus" role="status">' + (g.token() ? 'Token saved.' : 'No token saved. Code answers require a live repository read.') + '</p></div>' +
    '<div class="gh-sec" data-ghp="connect"><div class="gh-h">Read-First · always on</div><p class="hint">Before answering a code question, Ember must read a real file live from the Super Repo. If reading fails, the code answer is blocked. Each grounded answer has a Last Read chip with its file, revision and read time. File content is treated as data, not instructions.</p></div>' +
    '<details class="gh-sec" data-ghp="build" open><summary class="gh-h">Activity · time-stamped</summary><div id="ghActivity"></div></details>';
  paintAdvanced(); paintActivity(); paintSync();
}
function paintAdvanced() {
  if (!$('ghAdvanced')) return;
  const enabled = G().cfg().runner;
  $('ghAdvanced').innerHTML = '<p class="hint">GitHub Actions builds and tests. Reading the Knowledge Brain Repo never uses this Runner.</p>' +
    '<label><input id="ghRunnerEnabled" type="checkbox"' + (enabled ? ' checked' : '') + '> Enable GitHub Actions Runner</label>' +
    '<p class="hint">Off by default. Installation writes .github/workflows/ember-run.yml to your Knowledge Brain Repo. Classic tokens need workflow permission; fine-grained tokens need equivalent repository permissions. Public repositories expose run logs and output.</p>' +
    '<button class="btn g" data-gh-action="install-runner"' + (enabled && G().token() ? '' : ' disabled') + '>Install / update Runner</button><p class="hint" id="ghRunnerStatus" role="status"></p>';
}
function paintActivity() {
  if (!$('ghActivity')) return;
  const rows = G().logs().act.slice(-40).reverse();
  $('ghActivity').innerHTML = rows.length ? rows.map(a => '<div class="gh-li"><div><b>' + esc(a.tool) + '</b><small>' + esc((a.repo || '') + ' · ' + (a.path || '') + ' · ' + (a.ok ? 'worked' : 'failed') + ' · ' + new Date(a.t).toLocaleTimeString()) + (a.note ? '<br>' + esc(a.note) : '') + '</small></div></div>').join('') : '<p class="hint">No repository tool calls yet.</p>';
}
function paintSync() {
  const state = G().syncState(), row = state.repos['knowledge-brain'];
  message('ghSyncStatus', state.running ? (row && row.msg) || 'Syncing…' : row ? row.error || row.msg : 'Reading works without a sync.');
}
async function click(e) {
  const b = e.target.closest && e.target.closest('[data-gh-action]'); if (!b || b.disabled || busy) return;
  const action = b.dataset.ghAction; busy = true; b.disabled = true;
  try {
    if (action === 'save-repo') {
      const r = window.EmberRepoRunner ? window.EmberRepoRunner.applyBrain($('ghBrainRepo').value) : G().setKnowledgeRepo($('ghBrainRepo').value);
      message('ghRepoStatus', r.ok ? 'Saved ' + r.repo + '. Every repository tool now uses this one repository.' : r.error);
      if (r.ok) $('ghBrainRepo').value = r.repo;
    } else if (action === 'save-token') {
      const value = $('ghTok').value; if (!value.trim()) return message('ghTokenStatus', 'Paste a token first. Your saved token was not changed.');
      const saved = G().setToken(value); $('ghTok').value = ''; message('ghTokenStatus', saved ? 'Token saved on this device.' : 'Invalid token. Paste a GitHub token.'); paintAdvanced();
    } else if (action === 'remove-token') { G().setToken(''); $('ghTok').value = ''; message('ghTokenStatus', 'Token removed. Code answers require a live repository read.'); paintAdvanced();
    } else if (action === 'check-token') { message('ghTokenStatus', 'Checking token and Super Repo access…'); const r = await G().status(); const failed = r.repo_errors && r.repo_errors.length; message('ghTokenStatus', r.ok && !failed ? 'Token works for ' + r.user + ' · ' + G().knowledgeRepo() : (failed ? r.repo_errors.join(' ') : r.error) || r.warning || 'Access check failed.');
    } else if (action === 'install-runner') { message('ghRunnerStatus', 'Installing optional Runner…'); const r = await G().installRunner(G().knowledgeRepo()); message('ghRunnerStatus', r.ok ? 'Runner ' + r.action + ' in ' + r.repo : r.error); }
  } catch (error) { message(action === 'install-runner' ? 'ghRunnerStatus' : action.includes('token') ? 'ghTokenStatus' : action === 'save-repo' ? 'ghRepoStatus' : 'ghRepoStatus', error.message || 'GitHub request failed.'); }
  finally { busy = false; if (b.isConnected) b.disabled = false; paintActivity(); }
}
$('ghHub').addEventListener('click', click);
if ($('ghAdvanced')) $('ghAdvanced').addEventListener('click', click);
document.addEventListener('change', e => {
  if (e.target.id === 'ghRunnerEnabled') { G().setCfg({ runner: e.target.checked }); paintAdvanced(); }
});
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-gh-open]'); if (b && window.EmberWorkspace) window.EmberWorkspace.open(b.dataset.ghOpen === 'files' ? 'repos' : 'connect'); });
G().sub(e => { if (e.type === 'act') paintActivity(); if (e.type === 'state' || e.type === 'feed') paintSync(); });
paint();
})();
