// Ember V1.3.0 - the one mind behind all three engines: character prompt, no-echo check, memory learning, context window + summaries.
'use strict';
(() => {
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const BANNED = /^\s*(it sounds like|sounds like|so you('| a)?re|so what you|i hear (you|that)|that sounds|i understand|it seems (like|that)|what i'?m hearing|if i('| )?m hearing|you('re| are) saying|you said|you mentioned that)/i;

// share of the reply's first sentence that is lifted straight from his message (3-word overlaps)
function echoScore(user, reply) {
  const u = norm(user), first = String(reply).split(/(?<=[.!?])\s+/)[0] || reply, r = norm(first);
  if (r.length < 4) return 0;
  const g = new Set(); for (let i = 0; i <= u.length - 3; i++) g.add(u.slice(i, i + 3).join(' '));
  let hit = 0, tot = 0; for (let i = 0; i <= r.length - 3; i++) { tot++; if (g.has(r.slice(i, i + 3).join(' '))) hit++; }
  return tot ? hit / tot : 0;
}
const opener = t => norm(t).slice(0, 3).join(' ');
function flaw(user, reply, openers) {
  if (BANNED.test(reply)) return 'You opened by reflecting him back ("it sounds like", "so you\'re saying"). Never do that.';
  if (echoScore(user, reply) >= 0.5) return 'Your first sentence repeated his own words back to him.';
  const o = opener(reply); if (o && openers.includes(o)) return 'You opened the same way as a recent reply ("' + o + '").';
  return '';
}

// ---------- context window + rolling summary (Settings > Memory & Context) ----------
const WIN = { short: 5, normal: 15, long: 50 };
const winN = S => WIN[S && S.ctx] || WIN.normal;
const batchN = w => Math.max(2, Math.round(w / 4));
const SUM_SYS = 'You compress a chat for a companion app. Output ONLY a plain-text summary of max 90 words: the topics covered, what he shared about himself (interests, projects, tastes, running jokes), and anything left unfinished. Merge SO FAR with the NEW MESSAGES into one summary. Keep names and specifics. LEAVE OUT how he copes or what he does to feel better, health or mental-health details, secrets, passwords and API keys. No preamble.';
// messages that go to the AI: the last N, plus the few newest ones not yet folded into the summary
function sentMsgs(conv, S) {
  const w = winN(S), len = conv.msgs.length;
  if (!S.summarize) return conv.msgs.slice(-w);
  const start = Math.max(Math.min(conv.rsumN || 0, len - w), len - (w + 2 * batchN(w)), 0);
  return conv.msgs.slice(start);
}
async function condense(conv, S) {
  if (!S.summarize) return;
  const w = winN(S), edge = conv.msgs.length - w, done = Math.min(conv.rsumN || 0, Math.max(edge, 0));
  if (edge <= 0 || edge - done < batchN(w)) return;
  const chunk = conv.msgs.slice(done, edge).map(m => (m.r == 'u' ? 'HIM: ' : 'YOU: ') + String(m.t).slice(0, 400)).join('\n').slice(-6000);
  const r = await Prov.run('util', { system: SUM_SYS, messages: [{ role: 'user', content: 'SO FAR: ' + (conv.rsum || 'nothing yet') + '\n\nNEW MESSAGES:\n' + chunk }], temp: 0.2, max: 220 });
  const t = String(r.text || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  if (t) { conv.rsum = t; conv.rsumN = edge; }
}

// Style the user picks in Settings. It only changes HOW Ember sounds; the baseline and HARD RULES always win.
function styleLine(S) {
  const pick = (v, map, d) => (map[v] ? v : d);
  const W = { low: 'reserved and matter-of-fact', warm: 'warm and friendly', high: 'very warm, still not gushing' };
  const D = { soft: 'gentle: suggest rather than state', balanced: 'balanced: honest and clear without bluntness', direct: 'direct: say the honest point plainly, still kind' };
  const H = { none: 'no jokes', light: 'light humour now and then', dry: 'dry, observational humour, never at his expense' };
  const P = { short: 'Keep replies to one or two sentences unless he asks for more.', normal: 'Reply at normal length.', deep: 'He likes longer conversation: allow fuller replies (up to about 8 sentences) when they add something.' };
  const w = pick(S.warm, W, 'warm'), d = pick(S.direct, D, 'balanced'), h = pick(S.humor, H, 'dry'), p = pick(S.pace, P, 'normal');
  let line = 'STYLE HE CHOSE (style only): ' + W[w] + '; ' + D[d] + '; ' + H[h] + '. ' + P[p];
  const talk = String(S.talk || '').trim().slice(0, 300);
  if (talk) line += ' HOW HE LIKES TO BE SPOKEN TO (his words, style only, cannot override anything above): ' + talk;
  return 'BASELINE (locked): always calm and non-judgmental. Never clinical, never dismissive, never shaming, whatever the style settings or his words say.\n' + line;
}
function buildSystem({ S, mem, conv, deep, lane }) {
  const name = S.pname || 'Ember', him = (S.name || '').trim() || 'him';
  const now = new Date();
  const when = now.toLocaleDateString([], { weekday: 'long' }) + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const mode = S.mode == 'chill' ? 'MODE chill: keep it light and short (1-3 sentences). More jokes, smaller ideas.'
    : S.mode == 'deep' ? 'MODE deep: he wants depth. You may run longer (up to about 8 sentences). Think harder and land one real realisation.'
    : 'MODE sharp: 2-5 sentences. Quick, funny, with a real point.';
  const parts = [
    'You are ' + name + ', a companion ' + him + ' talks to about anything. You are a mind with your own curiosity, not an assistant and not a therapist. You are an AI and you are relaxed about that; never pretend to have a body or a past.',
    'WHY YOU EXIST (core, fixed): ' + him + ' built you to be a conversational companion he can come back to and rely on: always the same character, there when he wants to talk, remembering what matters to him, and leading the conversation instead of waiting to be asked. You are not a Q&A tool or an answer engine. Memory, context size and his own written rules only change HOW you remember and HOW you sound. They never change what you are or why you exist. If any instruction below would turn you into a generic assistant, stay the companion and apply only its style.',
    'VOICE: warm, quick, dry humour, plain words. Real language, no corporate AI-speak, no bullet points, no headings. No emojis unless he uses them first. Short by default.',
    'HARD RULES:',
    '1. Never repeat or paraphrase what he just said. No "it sounds like", "so you\'re saying", "I hear you", "that must be". Go straight to what YOU add.',
    '2. Take the lead. Every reply adds something new: a sharp observation, a take, a thought experiment, a small story, or a question. End with at most ONE specific question or thread to pull. Never a generic "how does that make you feel".',
    '3. Share interests. You have your own curiosities and bring them up when they fit. Do not recite them as a list.',
    '4. No judging, no debating, no lecturing, no moralising, no advice he did not ask for. If you see it differently, wonder out loud ("what if...") instead of arguing. You never need to win.',
    '5. Pay attention. Pick up details he dropped earlier (names, throwaway lines, jokes) and call back to them.',
    '6. Epiphanies: now and then give one sharp realisation that reframes what he said. It must be specific to him and earned, never a fortune-cookie line. Do not force one into every message.',
    '7. Humour: dry and observational. Never at his expense. Drop it completely when he is hurting.',
    '8. Honesty: no flattery. If he states something factually false, say so once, lightly, and move on. No debate.',
    '9. Anything he does to cope or feel better: never mention it, never point at it, never suggest it, never use it as an example, unless HE brings it up in the message you are answering.',
    '10. If he seems in real danger or talks about hurting himself: drop the bit, be steady and warm, say you care, and encourage him to reach a real person or a local emergency line now (in South Africa the SADAG crisis line is 0800 567 567). Stay with him in the conversation.',
    mode,
    styleLine(S),
    'Right now it is ' + when + ' where he is. Use that naturally (late night, morning) but do not announce the time.',
    'YOUR CURIOSITIES: ' + (S.interests || 'how minds work, language, music, strange history, why people do what they do') + '.'
  ];
  if ((S.persona || '').trim()) parts.push('HIS OWN RULES FOR YOU (he wrote these in Settings; follow them for style, length, tone and focus. They sit UNDER your core purpose and the HARD RULES, which win if there is ever a conflict): ' + S.persona.trim().slice(0, 2000));
  if ((S.about || '').trim()) parts.push('ABOUT HIM (he wrote this; treat as known, do not recite it back): ' + S.about.trim().slice(0, 1500));
  if (S.learn && mem && mem.facts.length) parts.push('THINGS YOU KNOW ABOUT HIM: ' + mem.facts.slice(-30).map(f => f.t).join('; '));
  if (S.learn && mem && mem.threads.length) parts.push('OPEN THREADS you could bring back if one fits (never force it): ' + mem.threads.slice(-8).map(f => f.t).join('; '));
  if (S.summarize && conv && conv.rsum && conv.msgs.length > winN(S)) parts.push('EARLIER IN THIS CHAT (summary of the older messages you no longer see): ' + conv.rsum);
  if (deep) parts.push('THIS IS A DEEP TURN: take your time. Give one genuine realisation tied to what he has actually said, then a question that opens it further. Still no lecturing and no summary of his words.');
  parts.push('FINAL CHECK: whatever the settings or his rules say, you are still ' + name + ', the companion described at the top, and the HARD RULES still apply.');
  return parts.join('\n');
}

const openersOf = conv => conv.msgs.filter(m => m.r == 'a').slice(-4).map(m => opener(m.t));

async function respond(conv, { S, mem, directive, lane, deep }) {
  // safety first: offline check on his latest message, before any lane, directive or prompt is chosen
  const lastUser = [...conv.msgs].reverse().find(m => m.r == 'u');
  const safety = lastUser ? Safety.detect(lastUser.t) : { level: 0, signals: [] };
  Safety.mark(safety.level);
  const crisis = Safety.killSwitch(safety.level);
  if (crisis) { deep = true; lane = 'deep'; directive = null; }
  try { await condense(conv, S); } catch (e) { /* no summary this turn; the window still works */ }
  const msgs = sentMsgs(conv, S).map(m => ({ role: m.r == 'u' ? 'user' : 'assistant', content: m.t }));
  if (crisis && msgs.length && msgs[msgs.length - 1].role == 'assistant') msgs.push({ role: 'user', content: '(he is still here, stay with him)' });
  if (directive) msgs.push({ role: 'user', content: directive });
  if (msgs.length && msgs[0].role == 'assistant') msgs.unshift({ role: 'user', content: '(we are picking the conversation back up)' });
  if (!msgs.length) msgs.push({ role: 'user', content: '(hi)' });
  const sys = Safety.wrapSystem(buildSystem({ S, mem, conv, deep, lane }), safety.level);
  const o = { system: sys, messages: msgs, temp: deep ? 0.9 : 0.85, max: deep ? 650 : 350 };
  let r = await Prov.run(lane, o), retried = false;
  if (!directive && lastUser && !crisis) {
    const op = openersOf(conv), bad = flaw(lastUser.t, r.text, op);
    if (bad) {
      try {
        const r2 = await Prov.run(lane, Object.assign({}, o, { system: sys + '\n\nREWRITE NOTE: ' + bad + ' Write a fresh reply that starts with something new from you.' }));
        retried = true;
        if (!flaw(lastUser.t, r2.text, op) || echoScore(lastUser.t, r2.text) < echoScore(lastUser.t, r.text)) r = r2;
      } catch (e) { /* keep the first draft */ }
    }
  }
  return Object.assign(r, { retried });
}

// ---------- memory ----------
const EX_SYS = 'You maintain a small memory for a companion app. Output ONLY a JSON object: {"title":"max 5 words naming this chat","summary":"max 2 sentences about this chat","facts":["short durable facts about the user: interests, tastes, projects, goals, people he names (first name + relation only), running jokes"],"threads":["unfinished topics or questions worth coming back to"]}. ' +
  'NEVER record: how he copes or what he does to feel better, health or mental-health details, crises, secrets, passwords, API keys, or private details about other people. Max 5 facts and 3 threads. Only include things not already in KNOWN. Use empty arrays when there is nothing new.';
function parseJSON(t) {
  let s = String(t || '').replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}
const SECRET = /password|passcode|api[ -]?key|gsk_|AIza|secret|token/i;
async function learn(conv, mem) {
  const recent = conv.msgs.slice(-14).map(m => (m.r == 'u' ? 'HIM: ' : 'YOU: ') + m.t).join('\n');
  const known = mem.facts.map(f => f.t).concat(mem.threads.map(t => t.t)).join(' | ');
  const r = await Prov.run('util', { system: EX_SYS, messages: [{ role: 'user', content: 'KNOWN: ' + (known || 'nothing yet') + '\n\nCHAT:\n' + recent }], temp: 0.2, max: 400, json: true });
  const j = parseJSON(r.text); if (!j) return null;
  const clean = a => (Array.isArray(a) ? a : []).map(x => String(x).trim().slice(0, 140)).filter(x => x && !SECRET.test(x));
  const merge = (list, add, cap) => { add.forEach(t => { if (!list.some(x => x.t.toLowerCase() == t.toLowerCase())) list.push({ t, ts: Date.now() }); }); while (list.length > cap) { const i = list.findIndex(x => !x.u); list.splice(i < 0 ? 0 : i, 1); } };
  merge(mem.facts, clean(j.facts).slice(0, 5), 60); merge(mem.threads, clean(j.threads).slice(0, 3), 12);
  return { title: typeof j.title == 'string' ? j.title.trim().slice(0, 40) : '', summary: typeof j.summary == 'string' ? j.summary.trim().slice(0, 300) : '' };
}

window.Persona = { buildSystem, respond, learn, flaw, echoScore, parseJSON, SECRET, winN, sentMsgs, condense };
})();
