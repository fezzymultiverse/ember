/* Ember V1.10.50 - ember_taskgate.js: tells a NORMAL message from an ORDER.
   A normal question or chat line gets answered straight away: no GitHub read, no tool list, no web search.
   An order (search / find / download / build / fix / "please ..." / a link / a file / news, weather, prices) switches the full toolset on.
   Edit the word lists below to change what counts as an order. Pure function, no storage, no network. */
'use strict';
(() => {
  const VERBS = 'search|look ?up|lookup|google|find|research|download|save|grab|rip|fetch|pull|scrape|read|open|check|summari[sz]e|play|queue|add|create|make|build|write|generate|draw|design|fix|debug|refactor|implement|convert|translate|remind|set|track|send|run|install|list|compare|analy[sz]e|review|edit|update|delete|remove|rename|upload|post|push|export|import|compile|launch|start|stop|enable|disable|connect|sync|plan|schedule|book|calculate|solve|get me|give me|show me|bring up|pull up|put on|throw on|turn on|turn off|use';
  const LEAD = '(?:(?:hey|hi|ok|okay|so|and|now|then|also|alright|right|well|ember|yo)[,!.\\s]+)*';
  const START = new RegExp('^' + LEAD + '(?:please\\s+|pls\\s+)?(?:' + VERBS + ')\\b', 'i');
  const POLITE = new RegExp('\\b(?:can|could|would|will)\\s+you\\s+(?:please\\s+)?(?:go\\s+|just\\s+)?(?:' + VERBS + ')\\b|\\b(?:please|pls)\\s+(?:' + VERBS + ')\\b|\\bi\\s+(?:need|want|\'d like|would like)\\s+you\\s+to\\b|\\bgo\\s+ahead\\s+and\\b|\\b(?:i need|i want|i\'d like|give me|make me|get me)\\s+(?:a|an|the|some)\\s+\\d*\\s*(?:page|pdf|doc|document|report|essay|summary|list|plan|script|app|website|picture|image|logo|song|playlist)', 'i');
  const LIVE = /\b(?:latest news|breaking news|news (?:about|on|for)|headlines|weather|forecast|score of|scores for|stock price|share price|price of|exchange rate|trending on)\b/i;
  const URL = /https?:\/\/|\bwww\.[a-z0-9-]+\.[a-z]{2,}|```|\b[\w-]+\.(?:js|ts|tsx|jsx|py|kt|java|json|html|css|sh|go|rs|cpp|cs|yml|yaml|md|pdf|docx|zip|mp3)\b/i;
  const AFFIRM = /^(?:yes|yeah|yep|yup|sure|ok(?:ay)?|do it|go ahead|go for it|proceed|continue|please do|yes please|sounds good|let'?s do it|run it|start|go)[\s!.]*$/i;
  const OFFER = /\?\s*$|\b(?:want me to|shall i|should i|i can|i could|i'll|i will|let me know if)\b/i;
  const AGAIN = /^(?:try again|again|retry|redo|more|another one|next|keep going|continue)\b/i;

  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  function isTask(msg, ctx) {
    const t = clean(msg); if (!t) return false; ctx = ctx || {};
    if (URL.test(t) || START.test(t) || POLITE.test(t) || LIVE.test(t)) return true;
    try { const D = window.EmberDeliverables; if (D && D.intent && D.intent(t)) return true; } catch (_) { /* no document engine */ }
    if (t.length <= 40 && AFFIRM.test(t) && ctx.prevAssistant && OFFER.test(clean(ctx.prevAssistant).slice(-300))) return true;
    if (t.length <= 40 && AGAIN.test(t) && ctx.prevUser && isTask(ctx.prevUser)) return true;
    return false;
  }
  // msgs = conv.msgs ({ r: 'u' | 'a', t }); returns the context isTask needs for the LATEST user message.
  function ctxFrom(msgs) {
    const m = Array.isArray(msgs) ? msgs : []; let i = m.length - 1;
    while (i >= 0 && m[i].r != 'u') i--;
    let prevAssistant = '', prevUser = '';
    for (let j = i - 1; j >= 0; j--) { if (!prevAssistant && m[j].r == 'a') prevAssistant = m[j].t || ''; if (!prevUser && m[j].r == 'u') prevUser = m[j].t || ''; if (prevAssistant && prevUser) break; }
    return { prevAssistant, prevUser };
  }
  window.EmberTaskGate = { isTask, ctxFrom, version: '1.10.50' };
})();
