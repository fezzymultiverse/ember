/* Ember 1.10.56 - ember_thoughts.js: the opening lines of the thinking card, built from THIS message.
   Before: every turn opened with the same five lines ("Reading your message · N words", "Quick lane", "Memory: ...", "Safety: calm", "No extra tools").
   Now: the first line says what kind of message this is and which words it caught, a second line ties a short follow-up to the message it follows
   (or to the question Ember just asked), and the app-state lines (route, tools, memory, safety, GitHub) appear only when they CHANGED since the last
   turn. The wording of each line rotates and never repeats the previous turn's wording. Everything shown is read from the message and the app state;
   it is a summary of what Ember is doing, not a dump of private reasoning. Pure functions, no network, no storage except a tiny rotation counter. */
'use strict';
(() => {
  const W = window;
  const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
  const STOP = new Set('a an the and or of for to in on at by with from into is are was were be been am do does did i me my we you your it its this that these those there here can could would should will just really very also some any all so if but not no yes ok okay hey hi hello please pls want need like get got make let lets then than them they what when where which who how why have has had one'.split(' '));
  const keywords = t => { const out = []; (String(t).toLowerCase().match(/[a-z0-9][a-z0-9+#._-]*/g) || []).forEach(w => { w = w.replace(/^[._-]+|[._-]+$/g, ''); if (w.length > 2 && !STOP.has(w) && !out.includes(w)) out.push(w); }); return out.slice(0, 4); };
  const last = { route: '', tools: '', mem: '', safety: '', gh: '', pick: {} }; // what the previous turn showed, so unchanged facts are not repeated
  let turn = 0;
  const pick = (pool, list, salt) => { // rotate through the variants, never the one used last time
    const prev = last.pick[pool] == null ? -1 : last.pick[pool]; let i = (turn + (salt || 0)) % list.length; if (i === prev) i = (i + 1) % list.length;
    last.pick[pool] = i; return list[i];
  };
  const POOLS = {
    follow: ['Short message, so I am reading it against your last one', 'This looks like a follow-up: filling the gaps from the last few messages', 'Treating this as a continuation, not a new topic', 'Not much to go on alone, so I am leaning on what we just said'],
    fix: ['Something is not working: finding out what first', 'This sounds like a problem to solve: looking for the cause before the fix', 'A fault report: checking what you already tried', 'Troubleshooting mode: the symptom comes before any answer'],
    order: ['This is a request to get something done', 'You want something made or run: working out what the result has to be', 'An action request: pinning down the outcome you expect', 'A task, not a question: aiming for something you can use as it is'],
    ask: ['A question: working out what exactly you want to know', 'You are asking, so I am looking for the direct answer first', 'Question received: deciding how much detail it needs', 'Looking for the short, correct answer to this one'],
    chat: ['Just talking: keeping it natural', 'A conversational message: answering like a person, not a form', 'No task here, so I am staying in the conversation', 'Reading the tone before the words']
  };
  const LEAD = ['Caught', 'Main words', 'Focus', 'Key terms'];
  function kind(text, prevU, TG, msgs) {
    const t = String(text).trim(), words = (t.match(/\S+/g) || []).length;
    if (/\b(not working|doesn'?t work|broken|error|failed|fails|crash|stuck|wrong|bug|why (?:is|does|did|won'?t)|still (?:not|no))\b/i.test(t)) return 'fix';
    if (prevU && (words <= 5 || /^\W*(so|and|also|yes|yeah|yep|ok|okay|no|nope|but|then|now|well|right|sure|what about|how about)\b/i.test(t) || /\b(does that|do that|do it|that one|the same|same thing|again|continue|go on|keep going|more of|like that)\b/i.test(t))) return 'follow';
    let task = false; try { task = !!(TG && TG.isTask && TG.isTask(t, TG.ctxFrom ? TG.ctxFrom(msgs || []) : {})); } catch (_) { task = false; }
    if (task || /\b(i need|i want|i'?d like|can you|could you|would you|will you|help me|give me|show me|make me|write me|build me)\b/i.test(t)) return 'order';
    if (/\?\s*$/.test(t) || /^(what|why|how|when|where|who|which|is|are|can|could|do|does|did|should)\b/i.test(t)) return 'ask';
    return 'chat';
  }
  function build(c) {
    turn++;
    const msgs = Array.isArray(c.msgs) ? c.msgs : [], out = [];
    const us = msgs.filter(m => m && m.r === 'u'), lu = us[us.length - 1], pu = us[us.length - 2];
    const text = lu ? String(lu.t || '') : '', prevU = pu ? String(pu.t || '') : '';
    const k = kind(text, prevU, c.taskGate, msgs), kw = keywords(text), words = (text.match(/\S+/g) || []).length;
    // 1) what kind of message this is, with the words that matter
    out.push({ ic: 'msg', key: 'r1', text: pick(k, POOLS[k], words) + (kw.length ? ' · ' + pick('lead', LEAD, kw.length) + ': ' + kw.join(', ') : '') });
    // 2) tie it to what came before
    const ai = msgs.filter(m => m && m.r !== 'u'), la = ai[ai.length - 1];
    const asked = la && /\?\s*$/.test(String(la.t || '').trim()) && words <= 14 && msgs.indexOf(la) > msgs.indexOf(pu || {});
    if (asked) { const q = String(la.t).trim().split(/(?<=[.!?])\s+/).filter(x => /\?$/.test(x)).pop() || la.t; out.push({ ic: 'brain', key: 'r3', text: 'Answering the question I just asked: “' + clip(q, 80) + '”' }); }
    else if ((k === 'follow' || k === 'fix') && prevU) out.push({ ic: 'brain', key: 'r3', text: 'Following on from: “' + clip(prevU, 70) + '”' });
    else if (!pu && msgs.length <= 1) out.push({ ic: 'brain', key: 'r3', text: 'First message in this chat: no earlier context to lean on' });
    // 3) app state, only when it changed since the last turn
    const chips = Array.isArray(c.chips) ? c.chips.slice() : []; if (c.termux) chips.push('Termux Mode');
    const tools = chips.join(', '); if (tools !== last.tools) { last.tools = tools; out.push({ ic: chips.some(x => /device|termux/i.test(x)) ? 'termux' : chips.some(x => /web/i.test(x)) ? 'globe' : 'files', key: 'r4', text: tools ? 'Tools on for this one: ' + tools : 'Extra tools are off now' }); }
    const gh = c.github ? 'on' : 'off'; if (gh !== last.gh) { last.gh = gh; if (c.github) out.push({ ic: 'github', key: 'r4b', text: 'Knowledge Brain Repo is connected' }); }
    const mem = String(c.memFacts || 0); if (mem !== last.mem) { last.mem = mem; if (+mem) out.push({ ic: 'brain', key: 'r3c', text: 'Memory now holds ' + mem + ' fact' + (mem === '1' ? '' : 's') + ' about you' }); }
    const sf = c.safety >= 2 ? 'care' : 'calm'; if (sf !== last.safety) { last.safety = sf; if (sf === 'care') out.push({ ic: 'shield', key: 'r3b', text: 'Care mode is on for this chat (safety level ' + c.safety + ')' }); }
    const route = c.pinned ? 'Engine: ' + c.pinned + ' (pinned)' : c.route && c.route.length ? 'Route: ' + c.route.join(' → ') + (c.deep ? ' (careful lane)' : '') : 'Route: Free Mode (no keys saved)';
    if (route !== last.route) { last.route = route; out.push({ ic: 'egg', key: 'r5', text: route }); }
    return out;
  }
  W.EmberThoughts = { build, _kind: kind, _keywords: keywords };
})();
