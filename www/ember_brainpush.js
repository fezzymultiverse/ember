// Ember V1.10.5 - ember_brainpush.js: look up repos, write what you searched into the Brain repo, push it. One commit, no force-push.
// Per repo it writes ember-brain/repos/<owner>__<repo>.md (facts, README excerpt, file map, key manifests), keeps ember-brain/INDEX.md
// and saves the search itself under ember-brain/searches/. Runs from this phone with the saved GitHub token; nothing is executed.
'use strict';
(() => {
  const W = window, G = W.EmberGithub; if (!G || !G.brainRequest || !G.managerRequest) return;
  const clean = G._clean.cleanRepo, redact = G._t.redact, MAX_REPOS = 15, README_CAP = 14000, KEY_CAP = 6000, TREE_CAP = 300;
  const say = (text, stream) => { try { if (W.EmberCommandCenter) W.EmberCommandCenter.write({ tag: 'GIT', source: 'Brain', stream: stream || 'status', text: String(text) }); } catch (_) { /* terminal optional */ } };
  const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(String(s || '').replace(/\s/g, '')), c => c.charCodeAt(0)));
  const enc = p => String(p).split('/').map(encodeURIComponent).join('/');
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'search';
  const fileOf = full => 'ember-brain/repos/' + full.replace('/', '__') + '.md';
  let busy = false;

  async function call(path, opt) { const r = await G.brainRequest(path, opt); if (!r.ok) throw new Error(r.error || 'GitHub request failed.'); return r.json; }
  async function pool(list, n, fn) { let i = 0; const run = async () => { while (i < list.length) { const k = i++; await fn(list[k], k); } }; await Promise.all(Array.from({ length: Math.min(n, list.length) }, run)); }

  async function dossier(full) {
    const meta = await call('/repos/' + full), branch = meta.default_branch || 'main', base = '/repos/' + full;
    let readme = '', items = [], truncated = false, langs = {};
    try { const r = await G.brainRequest(base + '/readme'); if (r.ok && r.json && r.json.content) readme = b64d(r.json.content); } catch (_) { /* no README */ }
    try { const r = await G.brainRequest(base + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1'); if (r.ok && r.json) { items = (r.json.tree || []).filter(x => x.type === 'blob'); truncated = !!r.json.truncated; } } catch (_) { /* no tree */ }
    try { const r = await G.brainRequest(base + '/languages'); if (r.ok && r.json) langs = r.json; } catch (_) { /* no languages */ }
    const keyRe = /^(package\.json|pyproject\.toml|requirements\.txt|Cargo\.toml|go\.mod|setup\.py|Makefile|Dockerfile|build\.gradle|pom\.xml|composer\.json)$/;
    const keys = [];
    for (const it of items.filter(x => !x.path.includes('/') && keyRe.test(x.path) && (x.size || 0) < 60000).slice(0, 5)) {
      try { const r = await G.brainRequest(base + '/contents/' + enc(it.path) + '?ref=' + encodeURIComponent(branch)); if (r.ok && r.json && r.json.content) keys.push({ path: it.path, text: b64d(r.json.content).slice(0, KEY_CAP) }); } catch (_) { /* skip file */ }
    }
    const total = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    const langLine = Object.keys(langs).slice(0, 6).map(k => k + ' ' + Math.round(langs[k] * 100 / total) + '%').join(', ');
    return { full: meta.full_name || full, desc: meta.description || '', url: meta.html_url, private: !!meta.private, branch, stars: meta.stargazers_count || 0, lang: meta.language || '', langLine, license: meta.license && meta.license.spdx_id || '', topics: meta.topics || [], updated: meta.pushed_at || '', size: meta.size || 0, readme, items, truncated, keys };
  }
  function renderDossier(d, query, stamp) {
    const L = [];
    L.push('# ' + d.full, '', '> Added to the Ember brain on ' + stamp + (query ? ' from the search "' + query.replace(/"/g, "'") + '"' : '') + '. Snapshot of what GitHub showed at that moment.', '');
    L.push('- URL: ' + d.url, '- Description: ' + (d.desc || 'none'), '- Default branch: ' + d.branch, '- Main language: ' + (d.lang || 'unknown') + (d.langLine ? ' (' + d.langLine + ')' : ''), '- Stars: ' + d.stars, '- License: ' + (d.license || 'none declared'), '- Topics: ' + (d.topics.join(', ') || 'none'), '- Last push: ' + (d.updated || 'unknown'), '- Size: ' + d.size + ' KB', '- Visibility: ' + (d.private ? 'private' : 'public'), '');
    if (d.readme) L.push('## README (excerpt)', '', d.readme.slice(0, README_CAP) + (d.readme.length > README_CAP ? '\n\n[README cut at ' + README_CAP + ' characters]' : ''), '');
    if (d.items.length) { L.push('## File map (' + d.items.length + ' files' + (d.truncated ? ', GitHub truncated the list' : '') + ')', '', '```'); d.items.slice(0, TREE_CAP).forEach(x => L.push(x.path)); if (d.items.length > TREE_CAP) L.push('... and ' + (d.items.length - TREE_CAP) + ' more'); L.push('```', ''); }
    d.keys.forEach(k => { L.push('## ' + k.path, '', '```', k.text, '```', ''); });
    return redact(L.join('\n'));
  }

  // rows: [{repo, description?}] shown by the search; repos: owner/name list to write
  async function write(repos, o) {
    o = o || {};
    if (busy) throw new Error('A brain write is already running.');
    if (!G.on()) throw new Error('Save your GitHub token first.');
    busy = true;
    try {
      const brain = G.knowledgeRepo(), list = [];
      (repos || []).forEach(x => { const r = clean(x); if (r && r.toLowerCase() !== brain.toLowerCase() && !list.some(y => y.toLowerCase() === r.toLowerCase())) list.push(r); });
      if (!list.length) throw new Error('Pick at least one repo (the brain itself cannot be added to itself).');
      if (list.length > MAX_REPOS) throw new Error('At most ' + MAX_REPOS + ' repos per push. Write the rest in a second push.');
      const bm = await call('/repos/' + brain);
      if (!bm.permissions || !bm.permissions.push) throw new Error('Your token cannot push to ' + brain + '. It needs the repo scope and write access.');
      const branch = bm.default_branch || 'main', stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
      say('Brain write: ' + list.length + ' repo(s) -> ' + brain + ' (' + branch + ')');
      const docs = [], failed = [];
      await pool(list, 3, async full => {
        const t0 = performance.now();
        try { const d = await dossier(full); if (d.private && !bm.private) { failed.push(full + ' (private repo, brain is public)'); say('Skipped ' + full + ': private into a public brain', 'stderr'); return; } docs.push(d); say('Read ' + d.full + ' (' + d.items.length + ' files)'); }
        catch (e) { failed.push(full + ' (' + e.message + ')'); say('Failed ' + full + ': ' + e.message, 'stderr'); }
        say(full + ' done in ' + Math.round(performance.now() - t0) + 'ms');
      });
      if (!docs.length) throw new Error('Nothing could be read. ' + failed.slice(0, 3).join('; '));
      docs.sort((a, b) => a.full.localeCompare(b.full));
      // INDEX.md: keep what is there, add new lines
      let index = '# Ember brain index\n\nRepos added by Ember. Newest first within each push. Each links to its dossier.\n\n';
      try { const cur = await G.brainRequest('/repos/' + brain + '/contents/ember-brain/INDEX.md?ref=' + encodeURIComponent(branch)); if (cur.ok && cur.json && cur.json.content) index = b64d(cur.json.content).replace(/\s*$/, '\n'); } catch (_) { /* first push creates it */ }
      docs.forEach(d => { const link = '](repos/' + d.full.replace('/', '__') + '.md)'; if (!index.includes(link)) index += '- [' + d.full + '](repos/' + d.full.replace('/', '__') + '.md) - ' + (d.desc || 'no description').replace(/\s+/g, ' ').slice(0, 140) + ' (added ' + stamp + ')\n'; });
      const files = docs.map(d => ({ path: fileOf(d.full), content: renderDossier(d, o.query, stamp) }));
      files.push({ path: 'ember-brain/INDEX.md', content: index });
      if (o.query || (o.shown && o.shown.length)) {
        const rows = (o.shown && o.shown.length ? o.shown : docs.map(d => ({ repo: d.full, description: d.desc }))).slice(0, 60);
        files.push({ path: 'ember-brain/searches/' + stamp.slice(0, 10) + '-' + stamp.slice(11, 13) + stamp.slice(14, 16) + '-' + slug(o.query) + '.md', content: redact('# Search: ' + (o.query || 'repos picked by hand') + '\n\nRun ' + stamp + '. Written to the brain: ' + docs.map(d => d.full).join(', ') + '.\n\n## Results shown\n\n' + rows.map(r => '- ' + r.repo + (r.description ? ' - ' + String(r.description).replace(/\s+/g, ' ').slice(0, 160) : '')).join('\n') + '\n') });
      }
      let sha = '', commit;
      for (let attempt = 0; attempt < 2; attempt++) {
        const ref = await call('/repos/' + brain + '/git/ref/heads/' + enc(branch)); sha = ref.object.sha;
        const parent = await call('/repos/' + brain + '/git/commits/' + sha);
        const tree = await call('/repos/' + brain + '/git/trees', { method: 'POST', body: { base_tree: parent.tree.sha, tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })) } });
        commit = await call('/repos/' + brain + '/git/commits', { method: 'POST', body: { message: 'Ember brain: add ' + docs.length + ' repo' + (docs.length === 1 ? '' : 's') + (o.query ? ' for "' + o.query.replace(/"/g, "'").slice(0, 60) + '"' : ''), tree: tree.sha, parents: [sha] } });
        const up = await G.brainRequest('/repos/' + brain + '/git/refs/heads/' + enc(branch), { method: 'PATCH', body: { sha: commit.sha, force: false } });
        if (up.ok) break;
        if (attempt === 1 || up.status !== 422) throw new Error(up.error || 'Push was refused.');
        say('Brain moved while writing, retrying once', 'stderr');
      }
      const url = 'https://github.com/' + brain + '/commit/' + commit.sha;
      say('Pushed ' + docs.length + ' repo(s) to ' + brain + ' - ' + commit.sha.slice(0, 7));
      try { W.dispatchEvent(new CustomEvent('ember-brain-pushed', { detail: { brain, commit: commit.sha, repos: docs.map(d => d.full) } })); } catch (_) { /* listeners optional */ }
      try { G.syncAll({ force: true }); } catch (_) { /* Ember re-reads the brain on its next sync */ }
      return { ok: true, brain, branch, commit: commit.sha, url, written: docs.map(d => d.full), failed, files: files.length };
    } finally { busy = false; }
  }
  // Read-only repository search (GitHub /search/repositories). Never installs or runs what it finds.
  // 1.10.56: plain-language searches work. GitHub ANDs every word, so "termux script that downloads google results" matched nothing.
  // The words are cleaned (filler dropped), then a short cascade runs: all words -> any of the words -> the strongest two -> the owner name.
  // Results from every step are merged (best first, no duplicates). Pasting owner/repo or a GitHub qualifier (topic:, user:, language:) is passed through as typed.
  const FILLER = new Set('a an the and or of for to in on at by with without from into onto about around over under is are was were be been being am do does did doing done i me my mine we us our you your it its this that these those there here can could would should will shall may might must please pls kindly just really very also still some any all every each more most much many lot lots want wants wanted need needs needed like likes looking look looks find finds finding search searches searching show shows give gives get gets got have has had having make makes made use uses using used help helps tell tells know knows think thinks something anything everything someone anyone best good great nice cool new old top repo repos repository repositories github gh project projects stuff thing things one ones way ways how what which who whom whose why when where then than so if but not no yes ok okay hey hi hello ember google'.split(' '));
  const QUAL = /(?:^|\s)(?:user|org|owner|repo|topic|language|lang|stars|forks|size|pushed|created|license|is|in|fork|archived|mirror|template|followers|good-first-issues|help-wanted-issues):\S/i;
  const words = q => (String(q).toLowerCase().match(/[a-z0-9][a-z0-9+#._-]*/g) || []).map(w => w.replace(/^[._-]+|[._-]+$/g, '')).filter(w => w.length > 1 && !FILLER.has(w));
  function plan(raw) {
    const q = String(raw || '').trim().slice(0, 200), out = [];
    const add = (query, sort, label) => { if (query && !out.some(x => x.query === query)) out.push({ query, sort: sort || '', label }); };
    if (/^[\w.-]+\/[\w.-]+$/.test(q)) { add('repo:' + q, '', 'exact repo'); add(q.replace('/', ' '), '', 'owner and name words'); return out; }
    if (QUAL.test(q) || /["]/.test(q)) { add(q, '', 'as typed'); return out; }
    let w = []; words(q).forEach(x => { if (!w.includes(x)) w.push(x); }); w = w.slice(0, 6);
    if (!w.length) { add(q, '', 'as typed'); return out; }
    add(w.join(' '), '', 'all words');
    if (w.length > 1) add(w.slice(0, 5).join(' OR '), 'stars', 'any of the words');
    if (w.length > 2) add(w.slice(0, 2).join(' '), '', 'first two words');
    if (w.length === 1) add('user:' + w[0], '', 'owner name');
    return out;
  }
  const mapRows = j => (j.items || []).map(x => ({ repo: x.full_name, description: x.description || '', url: x.html_url, stars: x.stargazers_count || 0, lang: x.language || '', private: !!x.private, license: x.license && x.license.spdx_id || '' }));
  async function one(step, pg) {
    const r = await G.managerRequest('/search/repositories?per_page=30&page=' + pg + (step.sort ? '&sort=' + step.sort + '&order=desc' : '') + '&q=' + encodeURIComponent(step.query));
    if (!r.ok) throw new Error(r.error || 'Search failed.');
    const j = r.json || {}; return { total: j.total_count || 0, rows: mapRows(j) };
  }
  let lastPlan = { raw: '', steps: [] };
  async function search(query, page) {
    const raw = String(query || '').trim().slice(0, 200); if (!raw) throw new Error('Search words are required.');
    const pg = Math.max(1, Math.min(34, Number(page) || 1));
    let steps;
    if (pg > 1 && lastPlan.raw === raw && lastPlan.steps.length) steps = lastPlan.steps; else steps = plan(raw);
    const seen = new Set(), rows = []; let total = 0, more = false, firstErr = null, used = [], tried = 0;
    for (const st of steps) {
      if (pg === 1 && rows.length >= 15) break;
      let r; try { r = await one(st, pg); tried++; } catch (e) { if (!firstErr) firstErr = e; continue; }
      used.push(st); total = Math.max(total, r.total); if (pg * 30 < Math.min(1000, r.total)) more = true;
      r.rows.forEach(x => { const k = x.repo.toLowerCase(); if (!seen.has(k)) { seen.add(k); rows.push(x); } });
    }
    if (!tried && firstErr) throw firstErr;
    lastPlan = { raw, steps: used.length ? used : steps };
    return { total: Math.max(total, rows.length), page: pg, more, repositories: rows, queries: used.map(x => x.query) };
  }
  async function find(query, n) { const r = await search(query, 1); return r.repositories.slice(0, Math.max(1, Math.min(MAX_REPOS, n || 5))); }

  // chat tool: only on an explicit ask, same rule as the repo runner tools
  const tool = { name: 'github_brain_write', description: 'Looks up repos on GitHub and WRITES what was found into the Brain repo (dossier per repo + INDEX + the search itself) in one commit, then pushes. Use only when he asks you to add / write / save / push repos to the brain. Give either repos (owner/name list) or query (top results are used, default 5, max 15).', parameters: { query: 'string?', repos: 'array of owner/name?', limit: 'number?' } };
  let intent = '';
  const oldTools = G.toolsFor, oldDispatch = G.dispatch, oldIntent = G.setIntent, oldState = G.stateBlock;
  G.toolsFor = function () { return oldTools.apply(this, arguments).concat(G.on() ? [tool] : []); };
  G.setIntent = function (a, b) { intent = String(a || ''); return oldIntent.apply(this, arguments); };
  G.dispatch = async function (name, args) {
    if (name !== tool.name) return oldDispatch.apply(this, arguments);
    try {
      if (!G.on()) return { ok: false, error: 'Save your GitHub token first.' };
      if (/\b(?:do not|don't|never)\b/i.test(intent) || !/\b(?:add|write|save|push|feed|put|store)\b/i.test(intent)) return { ok: false, error: 'He has to ask you to add / write / push repos to the brain first.' };
      const a = args || {}; let repos = Array.isArray(a.repos) ? a.repos : [], rows = [];
      const query = String(a.query || '').slice(0, 200);
      if (!repos.length && query) { rows = await find(query, Number(a.limit) || 5); repos = rows.map(x => x.repo); }
      if (!repos.length) return { ok: false, error: 'Give repos or a query.' };
      const r = await write(repos, { query, shown: rows });
      return { ok: true, pushed_to: r.brain, commit: r.commit.slice(0, 7), url: r.url, written: r.written, failed: r.failed };
    } catch (e) { return { ok: false, error: e.message }; }
  };
  G.stateBlock = function (o) { return oldState.apply(this, arguments) + '\nBRAIN WRITE: github_brain_write looks up repos and writes what it found into ' + G.knowledgeRepo() + ' (ember-brain/), then pushes. Only when he asks.'; };
  W.EmberBrainPush = { write, find, search, dossier, MAX_REPOS, busy: () => busy };
})();
