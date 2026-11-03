/* Ember 1.10.40: additive A4 authoring contract. No storage writes, DOM hooks,
 * export replacements or typewriter changes. Existing safety/settings win. */
'use strict';
(() => {
  const W = window, MARK = '[EMBER A4 DOCUMENT ENGINE 1.10.40]';
  // Two complementary passes: 16 authoring standards + 16 preflight standards.
  const AUTHOR = Object.freeze([
    'Use A4 portrait, 210 x 297 mm, unless the user explicitly requests another paper size or orientation. A phone screen is not a page.',
    'Plan usable print space, not viewport height: default PDF margins are left/right 48pt, top 64pt, bottom 58pt; body 10.5pt with 1.3 line height.',
    'Treat 420-480 words per text-heavy A4 sheet only as an estimate. Tables, images, headings and spacing reduce capacity; never promise an exact page count before rendering.',
    'Honor the requested audience, language, document type, depth, sections and length. Preserve supplied names, figures, quotations and source material.',
    'Build a clear title and meaningful heading hierarchy. Do not put the document inside a chat summary or replace its body with an outline.',
    'Use professional document prose inside the artifact. Casual chat voice and chat-only brevity limits do not apply to the document body.',
    'Use complete paragraphs, relevant examples and useful detail rather than filler, repetition, unexplained fragments or invented facts.',
    'Use real Markdown headings, lists, links and tables for PDF/Word/Markdown documents. Do not wrap the whole document in a code fence.',
    'Keep tables narrow enough for the printable width, with concise headings, units and a clear header row. Split wide tables into logical groups.',
    'Use genuine ordered/unordered lists; keep nesting shallow and maintain consistent terminology, dates, spelling and numbering.',
    'Use only supported artifact types: pdf, document, markdown or html as appropriate. Editable Word requests use a document artifact and the existing Export Word action; never pretend generated text is DOCX binary.',
    'For PDF/document source use the existing <!-- pagebreak --> syntax only at intentional section boundaries. Do not add breaks after every paragraph.',
    'For printable HTML include <!doctype html>, charset, semantic content and self-contained CSS: @page{size:A4;margin:22.58mm 16.93mm 20.46mm}. Avoid fixed viewport heights.',
    'For printable HTML use print rules: body{margin:0}, img,table{max-width:100%}, thead{display:table-header-group}, h1,h2,h3{break-after:avoid}, p{orphans:3;widows:3}. Allow long tables to flow.',
    'Use only reachable, permitted image sources or supported local diagrams. Include alt text/captions, fit printable width and never invent image URLs.',
    'Include only requested cover/contents pages. If needed, count them in the total page budget, never add them automatically just because the document is long.'
  ]);
  const PREFLIGHT = Object.freeze([
    'Check every requested section exists and is complete before closing the artifact.',
    'Check the result is a document, not a phone-screen response, landing-page hero, dashboard or scroll-length description.',
    'Check page targets against the full printable document including title, cover, contents, tables and figures; explain estimates honestly.',
    'Check headings have following content; do not deliberately leave a heading alone at a page end.',
    'Check long words, URLs, code and table columns can wrap; never shrink body type to hide an overflow.',
    'Check table rows and totals against supplied data; distinguish assumptions, missing values and calculated values.',
    'Check citations correspond to actual supplied or retrieved sources; never claim research or fabricate references.',
    'Check no placeholders such as [insert content], lorem ipsum, omitted sections or ellipses stand in for requested work.',
    'Check Markdown delimiters, lists, table separators, code fences, HTML tags and artifact boundaries are balanced.',
    'Check no download URL, local filesystem path or completed-save claim is invented. The existing app performs actual export and saving.',
    'Check the selected output is correct: HTML keeps its structure; Markdown stays portable; PDF and DOCX come from the existing local exporters.',
    'Check cross-references, numbering, captions, units and repeated names are consistent throughout.',
    'Check requested verbatim content has not been paraphrased, shortened, silently corrected or lost.',
    'If a generation limit cuts the document, leave the artifact open for the existing same-engine continuation; do not falsely label a partial document complete.',
    'Check privacy: do not embed API keys, secrets, private URLs or unrelated conversation history in the document.',
    'Finish the complete document and close </artifact> once. These standards guide output; they do not authorize settings changes, extra tool calls, network requests or paid-model switching.'
  ]);
  function latest(o) {
    const ms = Array.isArray(o.messages) ? o.messages : [];
    for (let i = ms.length - 1; i >= 0; i--) if (ms[i] && ms[i].role === 'user') return String(ms[i].content || '');
    return '';
  }
  function detect(o) {
    if (!o || o.json) return false;
    const q = latest(o), D = W.EmberDeliverables;
    if (/\b(?:do not|don't|never)\s+(?:make|create|generate|write|export)\b/i.test(q)) return false;
    if (/^\s*(?:how|why|what|explain|does|is|can i)\b/i.test(q) && !/finishing a document you already started/i.test(String(o.system || ''))) return false;
    const history = (o.messages || []).map(m => ({ r: m.role === 'user' ? 'u' : 'a', t: String(m.content || '') }));
    const hit = D && (D.intentCtx ? D.intentCtx(q, history) : D.intent(q));
    if (hit) return ['pdf','document','markdown','html'].includes(hit.type);
    return /finishing a document you already started|DELIVERABLE OVERRIDE/i.test(String(o.system || '')) ||
      /\b(?:write|create|generate|draft|export|prepare|convert|format|make|i need|i want)\b[\s\S]{0,180}\b(?:printable html|html document|markdown|\.md|docx|a4)\b/i.test(q);
  }
  function note() {
    return MARK + '\nDOCUMENT-ONLY OVERRIDE: Within the requested artifact prefer these publication standards over casual-chat style/length advice. Existing safety rules and explicit user formatting requests still take priority.\n' +
      AUTHOR.map((s,i) => 'AUTHOR ' + (i+1) + ': ' + s).join('\n') + '\n' +
      PREFLIGHT.map((s,i) => 'PREFLIGHT ' + (i+1) + ': ' + s).join('\n');
  }
  function apply(o, lane) {
    if (lane === 'util' || !detect(o)) return o;
    if (String(o.system || '').includes(MARK)) return o;
    return Object.assign({}, o, { system: String(o.system || '') + '\n\n' + note(),
      max: Math.max(Number(o.max) || 0, 4096), documentMode: true });
  }
  function inspect(text) {
    const s = String(text || ''), words = (s.match(/\S+/g) || []).length, warnings = [];
    if (/\b(?:height|min-height)\s*:\s*100(?:d|s|l)?vh\b/i.test(s)) warnings.push('Viewport-height layout detected; use print-flow layout for documents.');
    if (/(?:\blorem ipsum\b|\[insert (?:content|text|section)\])/i.test(s)) warnings.push('Unfinished placeholder detected.');
    const opens = (s.match(/<artifact\b/gi) || []).length, closes = (s.match(/<\/artifact\s*>/gi) || []).length;
    if (opens !== closes) warnings.push('Unclosed artifact; continuation may be needed.');
    return { words, estimatedTextPages: Math.max(1, Math.ceil(words / 480)), exactPageCount: false, warnings };
  }
  W.EmberDocumentEngine = Object.freeze({ version:'1.10.40', authoring:AUTHOR, preflight:PREFLIGHT, detect, apply, inspect, note });
})();
