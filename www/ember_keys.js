// Ember V1.9.0 - ember_keys.js: tells the AI what API keys exist, WHERE each one is used and WHERE the user adds it.
// Names, counts and status only. A key value is never read into the prompt or a tool result.
'use strict';
(() => {
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };

// provider -> what it powers, which tool or screen uses it, where he pastes it
const CHAT = 'Chat engine. Used automatically for every reply (the router picks one, or the one he pinned). No tool call needed.';
const SCRAPE = id => 'Web page fetcher. Used by scrape_url (it takes turns with his other scraper keys; pass via:"' + id + '" to force this one). Only runs when Settings > Scraping is switched on.';
const USE = {
  groq: CHAT, mistral: CHAT, gemini: CHAT, openrouter: CHAT + ' Prototype.', cohere: CHAT + ' Prototype.', huggingface: CHAT + ' Prototype.',
  firecrawl: SCRAPE('firecrawl') + ' Also backs up web_search after Tavily.', browserless: SCRAPE('browserless'), scraperapi: SCRAPE('scraperapi'), scraperbee: SCRAPE('scraperbee'), sting: SCRAPE('sting'), zenrows: SCRAPE('zenrows'),
  serpapi: 'Google search results. Backs up web_search after Tavily, and is the last resort inside scrape_url (snippets only, never the page itself).',
  octoparse: 'Reads the exported rows of an Octoparse task he built (task id in Settings > Scraping). Used only by scrape_url with via:"octoparse"; it cannot read a url, so it never joins the normal rotation. Needs a Standard plan or higher for API access.',
  tavily: 'Live web search with full results (web_search, needs Settings > Music > Agent & API Tools > Web search ON) and page reading (scrape_url, Extract, takes turns with his other scraper keys when Settings > Scraping is on). Optional: without it web_search still works through DuckDuckGo, but only for encyclopedia-style answers, not news.',
  audd: 'Song identification. Used by the identify_song tool and the Identify button in the Music panel.'
};
const WHERE = id => (window.Prov && window.Prov.CFG && window.Prov.CFG[id]) ? 'Settings > Keys' : (id == 'tavily' ? 'Settings > Music > Agent & API Tools (or Settings > Scraping: same key)' : id == 'audd' ? 'Settings > Music' : 'Settings > Scraping');

function inventory() {
  const P = window.Prov, SC = window.EmberScraper, out = [];
  if (P && P.IDS) P.IDS.forEach(id => {
    const a = (P.entries && P.entries(id)) || [];
    out.push({ id, name: P.CFG[id].name, kind: 'chat engine', saved: a.length, usable: a.filter(e => e && !(e.st && e.st.ok === false) && !e.bad).length, use: USE[id] || CHAT, where: WHERE(id) });
  });
  if (SC && SC.KEY_IDS) { const k = (SC.get() || {}).keys || {}; SC.KEY_IDS.filter(id => id != 'tavily').forEach(id => out.push({ id, name: (SC.LABEL && SC.LABEL[id]) || id, kind: 'scraper', saved: k[id] ? 1 : 0, usable: k[id] ? 1 : 0, use: USE[id], where: WHERE(id) })); }
  const A = window.EmberAgentAddon; out.push({ id: 'tavily', name: 'Tavily', kind: 'web search', saved: A && A.hasTavilyKey && A.hasTavilyKey() ? 1 : 0, usable: A && A.hasTavilyKey && A.hasTavilyKey() ? 1 : 0, use: USE.tavily, where: WHERE('tavily') });
  const D = window.EmberAudd; const hasAudd = !!(D && D.hasKey && D.hasKey()); out.push({ id: 'audd', name: 'Audd.io', kind: 'song id', saved: hasAudd ? 1 : 0, usable: hasAudd ? 1 : 0, use: USE.audd, where: WHERE('audd') });
  return out;
}
// one compact paragraph for the system prompt
function line() {
  try {
    const inv = inventory(), have = inv.filter(x => x.saved), miss = inv.filter(x => !x.saved && x.id != 'octoparse');
    const s = lsGet('ember_set', {}) || {};
    return 'KEY MAP (true now, names only, values are never shown to you): ' +
      (have.length ? have.map(x => x.name + ' [' + x.kind + (x.kind == 'chat engine' ? ', ' + x.usable + '/' + x.saved + ' usable' : '') + ']').join('; ') : 'no keys saved') +
      '. Every saved key is already wired: chat engine keys answer your replies by themselves; scraper keys run inside scrape_url (SerpApi, Firecrawl, ScraperAPI and ScraperBee keys also back up web_search); the Tavily key runs inside web_search and takes turns as a page reader (DuckDuckGo is the keyless fallback); an Octoparse key reads one saved task and only when named; the Audd token runs inside identify_song. You never receive or type a key. ' +
      'If he asks whether a key works or where it goes, call key_map and answer from its result. Missing: ' + (miss.map(x => x.name).join(', ') || 'none') + '. If a feature needs a missing key, say which one and which Settings tab takes it. ' +
      (s.agentAddon ? '' : 'Web search is switched off. ');
  } catch (e) { return ''; }
}
const TOOLS = [
  { name: 'key_map', description: 'Returns every API key type Ember knows (chat engines, scrapers, Tavily, Audd): whether he saved one, how many are usable, what uses it and which Settings tab takes it. Never returns key values. Call it when unsure which key to use or why a feature says a key is missing. Pass provider to look at one.', parameters: { provider: 'string (optional)' } }
];
async function dispatch(name, args) {
  if (name != 'key_map') return { error: 'Unknown tool' };
  const p = String((args && args.provider) || '').toLowerCase().trim();
  let inv = inventory(); if (p) inv = inv.filter(x => x.id == p || x.name.toLowerCase() == p);
  if (!inv.length) return { error: 'No provider named "' + p + '". Call key_map with no provider to list them all.' };
  return { keys: inv.map(x => ({ provider: x.name, id: x.id, kind: x.kind, saved: x.saved, usable: x.usable, used_by: x.use, add_it_in: x.where })), note: 'Values are never shown. A saved key is already used by the matching tool; you do not pass keys anywhere.' };
}
window.EmberKeys = { TOOLS, dispatch, line, inventory };
})();
