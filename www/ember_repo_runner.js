// Ember 1.9.92: Features > Repo Runner. Whole repo snapshots, separate brain/output.
'use strict';
(() => {
const G = window.EmberGithub; if (!G) return;
const KEY = 'ember_repo_runner', $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = G._clean.cleanRepo;
let intent = '', templatePromise, operation = false;
function config() {
  let c; try { c = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { c = {}; }
  c = c || {}; const brain = G.knowledgeRepo();
  const sources = [{ repo: brain }];
  (c.sources || []).forEach(x => { const r = clean(x.repo); if (r && !sources.some(s => s.repo.toLowerCase() === r.toLowerCase())) sources.push({ repo: r }); });
  return { schema: 1, brain, target: clean(c.target), branch: String(c.branch || ''), sources, buildWorkflow: c.buildWorkflow || 'build.yml', autoBuild: c.autoBuild !== false, autoSync: !!c.autoSync };
}
function save(patch) {
  const c = Object.assign(config(), patch || {});
  if (c.target && !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\/[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(c.target)) throw new Error('Output repo must be owner/name.');
  if (c.sources.some(s => s.repo.toLowerCase() === c.target.toLowerCase())) throw new Error('The output repo must be different from the brain and imported sources.');
  if (!/^[A-Za-z0-9_.-]+\.ya?ml$/.test(c.buildWorkflow)) throw new Error('Build workflow must be a filename such as build.yml.');
  if (c.branch && (!/^[A-Za-z0-9_-][A-Za-z0-9._/-]{0,99}$/.test(c.branch) || c.branch.includes('..'))) throw new Error('Invalid output branch.');
  localStorage.setItem(KEY, JSON.stringify(c)); return c;
}
async function request(path, options) { const r = await G.managerRequest(path, options); if (!r.ok) throw new Error(r.error || 'GitHub request failed.'); return r.json; }
async function search(a) {
  const query = String(a.query || '').trim().slice(0, 200); if (!query) return { ok: false, error: 'Search words are required.' };
  const page = Math.max(1, Math.min(34, Number(a.page) || 1));
  const r = await request('/search/repositories?per_page=30&page=' + page + '&q=' + encodeURIComponent(query));
  return { ok: true, total: r.total_count, partial: !!r.incomplete_results, page, repositories: (r.items || []).map(x => ({ repo: x.full_name, description: x.description || '', url: x.html_url, license: x.license && x.license.spdx_id || 'not specified' })) };
}
async function owned(a) {
  const page = Math.max(1, Number(a.page) || 1), rows = await request('/user/repos?per_page=100&sort=updated&page=' + page);
  return { ok: true, page, more: rows.length === 100, repositories: rows.map(x => ({ repo: x.full_name, can_push: !!(x.permissions && x.permissions.push), private: !!x.private })) };
}
function addSource(repo) {
  const r = clean(repo); if (!r) throw new Error('Use a GitHub owner/repository or repository URL.');
  const c = config(); if (!c.sources.some(s => s.repo.toLowerCase() === r.toLowerCase())) c.sources.push({ repo: r });
  if (c.sources.length > 100) throw new Error('At most 100 whole repositories per runner.');
  save({ sources: c.sources }); paintSources(); return { ok: true, action: 'added whole repository', repo: r };
}
async function template() {
  if (!templatePromise) templatePromise = fetch('repo-runner-template.cjs', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('Bundled runner template did not load.'); return r.text(); }).catch(e => { templatePromise = null; throw e; });
  return templatePromise;
}
async function feature() {
  const c = save({}); if (!c.target) throw new Error('Set your existing output/build repo first.');
  const source = await template();
  if (!source.includes('/*EMBER_CONFIG*/null')) throw new Error('Runner template failed validation.');
  return { type: 'code', language: 'javascript', title: 'ember-repo-runner.cjs', content: source.replace('/*EMBER_CONFIG*/null', '/*EMBER_CONFIG*/' + JSON.stringify(c)) };
}
async function addToOutput() {
  const a = await feature();
  if (window.EmberArtifacts) window.EmberArtifacts.view(a);
  return a;
}
async function install() {
  if (operation) throw new Error('A runner operation is already in progress.'); operation = true;
  try {
    const c = save({}); if (!c.target) throw new Error('Set the existing output repo first.');
    const base = '/repos/' + c.target, m = await request(base), branch = c.branch || m.default_branch;
    if (!m.permissions || !m.permissions.push) throw new Error('Your saved token cannot push to the output repo.');
    if (branch !== m.default_branch) throw new Error('Install on the default branch so GitHub can register the workflow.');
    for (const s of c.sources) {
      const info = await request('/repos/' + s.repo);
      if (!m.private && info.private) throw new Error('Private sources cannot be copied into a public output repo. Choose a private output.');
    }
    if (c.autoBuild) await request(base + '/actions/workflows/' + encodeURIComponent(c.buildWorkflow));
    // This sets an encrypted GitHub Actions secret. The token never enters generated code/model text.
    await loadSodium();
    const secret = await G.provisionRunnerSecret(); if (!secret.ok) throw new Error(secret.error);
    const source = await template(), workflowMatch = source.match(/const WORKFLOW = `([\s\S]*?)`;/);
    if (!workflowMatch) throw new Error('Bundled workflow template is missing.');
    const workflow = workflowMatch[1].replace(/\\\$\{/g, '${');
    const ref = await request(base + '/git/ref/heads/' + branch.split('/').map(encodeURIComponent).join('/'));
    const commit = await request(base + '/git/commits/' + ref.object.sha);
    const files = [{ path: 'scripts/ember-repo-runner.cjs', content: source }, { path: 'ember-repos.json', content: JSON.stringify(c, null, 2) + '\n' }, { path: '.github/workflows/ember-repo-sync.yml', content: workflow }];
    const tree = await request(base + '/git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })) } });
    const next = await request(base + '/git/commits', { method: 'POST', body: { message: 'Install Ember whole-repository sync runner', tree: tree.sha, parents: [ref.object.sha] } });
    await request(base + '/git/refs/heads/' + branch.split('/').map(encodeURIComponent).join('/'), { method: 'PATCH', body: { sha: next.sha, force: false } });
    let dispatchError = '';
    // GitHub may take a moment to register a newly committed workflow.
    for (let i = 0; i < 5; i++) {
      try { await request(base + '/actions/workflows/ember-repo-sync.yml/dispatches', { method: 'POST', body: { ref: branch } }); dispatchError = ''; break; }
      catch (e) { dispatchError = e.message; if (i < 4) await new Promise(r => setTimeout(r, 2000)); }
    }
    if (!dispatchError) { try { window.dispatchEvent(new CustomEvent('ember-repo-runner-dispatched', { detail: { repo: c.target, branch, workflow: 'ember-repo-sync.yml', since: Date.now() - 30000 } })); } catch (_) { /* independent terminal */ } }
    return { ok: !dispatchError, installed: true, repo: c.target, commit: next.sha, dispatched: !dispatchError, error: dispatchError || undefined, url: 'https://github.com/' + c.target + '/actions/workflows/ember-repo-sync.yml', note: 'Runner installed. Cloning/pushing/building happens on GitHub Actions; check run status before claiming success. Source files stay under external/, not mixed into app code.' };
  } finally { operation = false; }
}
async function sync() {
  const started = Date.now();
  const c = save({}); if (!c.target) throw new Error('Set the output repo.');
  const branch = c.branch || (await request('/repos/' + c.target)).default_branch;
  const manifest = await request('/repos/' + c.target + '/contents/ember-repos.json?ref=' + encodeURIComponent(branch));
  if (!manifest || !manifest.content) throw new Error('Runner manifest is missing. Install/update the runner first.');
  const binary = atob(manifest.content.replace(/\s/g, '')), bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  const remote = JSON.parse(new TextDecoder().decode(bytes));
  if (JSON.stringify(remote) !== JSON.stringify(c)) throw new Error('Source or build settings changed. Use Install / update first to publish the new whole-repo manifest.');
  await request('/repos/' + c.target + '/actions/workflows/ember-repo-sync.yml/dispatches', { method: 'POST', body: { ref: branch } });
  try { window.dispatchEvent(new CustomEvent('ember-repo-runner-dispatched', { detail: { repo: c.target, branch, workflow: 'ember-repo-sync.yml', since: started } })); } catch (_) { /* independent terminal */ }
  return { ok: true, dispatched: true, repo: c.target, url: 'https://github.com/' + c.target + '/actions/workflows/ember-repo-sync.yml', note: 'Runs using the manifest already committed in the output repo. After changing source configuration, install/update again first.' };
}
async function status() {
  const c = config(); if (!c.target) return { ok: false, error: 'Set your output repo.' };
  const r = await request('/repos/' + c.target + '/actions/workflows/ember-repo-sync.yml/runs?per_page=5');
  return { ok: true, repo: c.target, runs: (r.workflow_runs || []).map(x => ({ id: x.id, status: x.status, conclusion: x.conclusion, url: x.html_url })) };
}
function loadScript(src) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => { s.remove(); reject(new Error('Bundled encryption library could not load.')); }; document.head.appendChild(s); }); }
let sodiumPromise;
function loadSodium() { if (!sodiumPromise) sodiumPromise = (async () => { if (!window.sodium) { await loadScript('vendor/libsodium-0.7.15.js'); await loadScript('vendor/libsodium-wrappers-0.7.15.js'); } await window.sodium.ready; })().catch(e => { sodiumPromise = null; throw e; }); return sodiumPromise; }
const tools = [
  { name: 'github_search_repos', description: 'Discover repositories on GitHub. Read-only. Returns repo names and licenses; never automatically installs or executes found code.', parameters: { query: 'string', page: 'number?' } },
  { name: 'github_output_repos', description: 'List repositories accessible with the saved token for choosing an output target. Read-only.', parameters: { page: 'number?' } },
  { name: 'github_add_source', description: 'Add a whole repo to the runner manifest only when user asks. Never selects individual files. Brain is always included. Does not push yet.', parameters: { repo: 'string' } },
  { name: 'github_repo_runner_status', description: 'Read recent clone/sync/push runner status on the explicitly configured output repo.', parameters: {} },
  { name: 'github_repo_runner_sync', description: 'Dispatch the installed whole-repo sync/push runner ONLY on explicit user request. Target is fixed in Features > Repo Runner. Changing sources requires user installing/updating first.', parameters: {} }
];
const oldTools = G.toolsFor, oldDispatch = G.dispatch, oldIntent = G.setIntent, oldState = G.stateBlock;
G.toolsFor = function() { return oldTools().concat(G.on() ? tools : []); };
G.setIntent = function(a, b) { intent = String(a || ''); return oldIntent(a, b); };
G.dispatch = async function(name, args) {
  if (!tools.some(t => t.name === name)) return oldDispatch(name, args);
  try {
    const a = args || {};
    if (!G.on()) return { ok: false, error: 'Save your GitHub token first.' };
    if (name === 'github_search_repos') return await search(a);
    if (name === 'github_output_repos') return await owned(a);
    if (name === 'github_repo_runner_status') return await status();
    if (/\b(?:do not|don't|never)\b/i.test(intent) || !/\b(?:add|import|sync|push|clone|install|update|refresh)\b/i.test(intent)) return { ok: false, error: 'Explicit user request to add/sync repos is required.' };
    if (name === 'github_add_source') return addSource(a.repo);
    if (name === 'github_repo_runner_sync') return await sync();
  } catch (e) { return { ok: false, error: e.message }; }
};
G.stateBlock = function(o) { const c = config(); return oldState(o) + '\nREPO RUNNER: Features > Repo Runner can discover/import whole repos. The brain remains ' + c.brain + '; it is NOT the build output repo. Output target: ' + (c.target || 'not configured') + '. Never change the brain to redirect a build. Whole sources: ' + c.sources.map(s => s.repo).join(', ') + '. Search is read-only. Pushes/dispatches require user request. Never claim a dispatched workflow has completed.'; };
function paintSources() {
  if (!$('rrSources')) return;
  const c = config(); $('rrSources').innerHTML = c.sources.map(s => '<div class="gh-li"><div><b>' + esc(s.repo) + '</b><small>Entire repository · ' + (s.repo === c.brain ? 'Super Brain · always included' : 'source snapshot') + '</small></div>' + (s.repo !== c.brain ? '<button class="btn g" data-rr-remove="' + esc(s.repo) + '">Remove</button>' : '') + '</div>').join('');
}
function message(text) { if ($('rrStatus')) $('rrStatus').textContent = text; }
function fromUI() { const target = $('rrTarget').value.trim(); if (target && !clean(target)) throw new Error('Use owner/name for output repo.'); return save({ target: clean(target), branch: $('rrBranch').value.trim(), buildWorkflow: $('rrWorkflow').value.trim() || 'build.yml', autoBuild: $('rrBuild').checked, autoSync: $('rrAuto').checked }); }
function paint() {
  if (!$('repoRunnerFeature')) return;
  const c = config();
  $('repoRunnerFeature').innerHTML = '<div class="ct">Repo Runner · whole brain</div><p class="hint">No file-selection screen. Ember can search the whole Super Brain with github_grep, then read exact matches. This runner clones complete current snapshots into your existing output repo, commits them and starts its build. It does not automatically import code into your application entry points.</p>' +
    '<label class="lb" for="rrSearch">Search GitHub repositories</label><input id="rrSearch" placeholder="FEZZY super brain or owner/repo"><button class="btn g" data-rr="search">Search repos</button><button class="btn g" data-rr="owned">My repos</button><div id="rrResults"></div>' +
    '<label class="lb" for="rrSource">Add a whole repo directly</label><input id="rrSource" placeholder="owner/repo"><button class="btn g" data-rr="add">Add entire repo</button><div id="rrSources"></div>' +
    '<label class="lb" for="rrTarget">Your existing output / build repo</label><input id="rrTarget" value="' + esc(c.target) + '" placeholder="your-account/your-app"><label class="lb" for="rrBranch">Output branch · blank uses default</label><input id="rrBranch" value="' + esc(c.branch) + '"><label class="lb" for="rrWorkflow">Existing build workflow</label><input id="rrWorkflow" value="' + esc(c.buildWorkflow) + '">' +
    '<label><input id="rrBuild" type="checkbox"' + (c.autoBuild ? ' checked' : '') + '> Dispatch build after source updates</label><br><label><input id="rrAuto" type="checkbox"' + (c.autoSync ? ' checked' : '') + '> Check upstream repos about every 15 minutes in GitHub Actions</label>' +
    '<p class="hint">Sources are isolated under external/fezzy-super-brain and external/repos/owner/repo. No force-push. New and changed upstream files are included; deleted upstream files disappear only inside runner-owned snapshots. Check source licenses before redistributing. Binary files are copied, not read as text. Symlinks/submodules fail closed with instructions.</p>' +
    '<div class="btnrow"><button class="btn g" data-rr="save">Save settings</button><button class="btn g" data-rr="output">Add runner to output</button><button class="btn" data-rr="install">Install / update + sync + build</button><button class="btn g" data-rr="sync">Sync & push now</button><button class="btn g" data-rr="status">Run status</button></div>' +
    '<p class="hint">Install writes 3 managed files on your output repo default branch, stores your token as encrypted Actions secret EMBER_REPO_TOKEN, and starts the sync job. Token permissions: source Contents read; output Contents, Workflows, Actions and Secrets write. Your existing build must support workflow_dispatch. Branch protection may require a permitted token. Public repos expose cloned content/logs; private-to-public source copying is blocked. Exported runners contain config only, never your token.</p><pre id="rrStatus" class="gh-pre" role="status"></pre>';
  paintSources();
}
if ($('repoRunnerFeature')) {
  $('repoRunnerFeature').addEventListener('click', async e => {
    const b = e.target.closest('[data-rr], [data-rr-add], [data-rr-target], [data-rr-remove]'); if (!b || b.disabled) return;
    b.disabled = true;
    try {
      if (b.dataset.rrAdd) { addSource(b.dataset.rrAdd); message('Added entire repo. Install/update to publish new manifest.'); return; }
      if (b.dataset.rrTarget) { $('rrTarget').value = b.dataset.rrTarget; message('Output repo selected. Save settings next.'); return; }
      if (b.dataset.rrRemove) { save({ sources: config().sources.filter(s => s.repo !== b.dataset.rrRemove) }); paintSources(); return; }
      const action = b.dataset.rr;
      if (action === 'search' || action === 'owned') {
        message('Searching GitHub…'); const r = action === 'search' ? await search({ query: $('rrSearch').value }) : await owned({});
        $('rrResults').innerHTML = r.repositories.map(x => '<div class="gh-li"><div><b>' + esc(x.repo) + '</b><small>' + esc(x.description || (x.can_push ? 'Push access' : 'Read access')) + (x.license ? ' · license: ' + esc(x.license) : '') + '</small></div><button class="btn g" data-rr-add="' + esc(x.repo) + '">Add whole repo</button>' + (x.can_push ? '<button class="btn g" data-rr-target="' + esc(x.repo) + '">Use as output</button>' : '') + '</div>').join('');
        message(r.repositories.length + ' repos shown' + (r.total ? ' of ' + r.total : '') + (r.more ? ' · more available via github_output_repos page tool' : '') + '.');
      } else if (action === 'add') { addSource($('rrSource').value); message('Entire repo added. Install/update to publish the manifest.'); }
      else {
        fromUI();
        if (action === 'save') message('Saved. Every source is whole-repo; no file selection.');
        else if (action === 'output') { await addToOutput(); message('Runner added as an output artifact. Download it, set GH_TOKEN locally, then run: node ember-repo-runner.cjs install. Requires Node 20, git and GitHub CLI (gh).'); }
        else if (action === 'install') { message('Encrypting secret, installing runner and dispatching sync…'); const r = await install(); message(JSON.stringify(r, null, 2)); }
        else if (action === 'sync') { message('Dispatching whole-repo sync…'); message(JSON.stringify(await sync(), null, 2)); }
        else if (action === 'status') message(JSON.stringify(await status(), null, 2));
      }
    } catch (e) { message(e.message); } finally { b.disabled = false; }
  }); paint();
}
window.EmberRepoRunner = { config, save, search, owned, addSource, feature, addToOutput, install, sync, status, paint };
})();
