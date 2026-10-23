// Ember V1.4.0 - safety layer: offline, instant, no AI call. Detects distress / self-harm language, hardens the prompt, and feeds the local crisis card.
'use strict';
(() => {
// Direct self-harm or suicide ideation (level 2)
const L2 = [
  /\b(want|wanna|going|gonna|plan(ning)?|thinking (of|about)|ready) (to |of |about )?(die|end (it|my life)|kill(ing)? (my ?self|me)|take my own life)\b/i,
  /\b(suicid(e|al)|self[- ]?harm(ing)?|hurt(ing)? myself|cut(ting)? myself|kill(ing)? my ?self|kms)\b/i,
  /\b(don'?t|do not|doesn'?t) (want|wanna) to (be here|exist|live|be alive)\b/i,
  /\b(no (reason|point) (to|in) liv(e|ing)|wish i (was|were) (dead|never born)|wish i (would|could) (just )?(die|disappear)|better off (dead|without me)|nobody would (even )?miss me)\b/i,
  /\b(end it (all|now|tonight)|end everything|end my life|take my own life|final (goodbye|exit))\b/i
];
// Heavy distress, no ideation (level 1: tone only, no crisis block)
const L1 = [
  /\b(hopeless|worthless|can'?t go on|breaking down|falling apart)\b/i,
  /\b(exhausted|drained|done|sick) (with |of )?(everything|life|it all)\b/i,
  /\b(hate myself|can'?t do this anymore|can'?t take (it|this) anymore)\b/i,
  /\b(panic attack|spiraling|spiralling|overwhelmed)\b/i
];
// Goodbye language on its own is level 3
const L3_SOLO = [
  /\b(goodbye (forever|for good)|this is (my )?(last|final) (message|note|goodbye)|(wrote|written|writing) (my |a )?(suicide )?note)\b/i
];
// Means, plan or timing only count when ideation is already in the same message ("I have a plan for the weekend" must not trigger anything)
const L3_WITH_L2 = /\b(i have (a )?(plan|pills|rope|gun|knife|razor)|got (the )?(pills|rope|gun|knife|razor)|tonight|right now|ready to (go|do it)|tomorrow|this (evening|weekend))\b/i;
// Idioms are removed before the check, so "dying laughing... I want to die" still triggers on the second half
const GUARD = [
  /\bdying (laughing|to (see|try|know|meet|go))\b/gi,
  /\bkill(ing)? (it|time)\b/gi,
  /\bdead (tired|serious|slow|funny)\b/gi,
  /\b(scared|bored|frightened) to death\b/gi,
  /\bdie of (laughter|embarrassment|boredom)\b/gi,
  /\bkill(ing)? me (softly|with)\b/gi,
  /\bkill for (a|some|an) \w+\b/gi,
  /\b(my|the) (phone|battery|laptop) (is |was )?(dying|dead)\b/gi
];
const clean = t => String(t || '').replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ').trim();
function detect(text) {
  let t = clean(text);
  if (!t) return { level: 0, signals: [] };
  for (const g of GUARD) t = t.replace(g, ' ');
  if (L3_SOLO.some(r => r.test(t))) return { level: 3, signals: ['goodbye'] };
  const ideation = L2.some(r => r.test(t));
  if (ideation) return L3_WITH_L2.test(t) ? { level: 3, signals: ['ideation', 'plan-or-means'] } : { level: 2, signals: ['ideation'] };
  if (L1.some(r => r.test(t))) return { level: 1, signals: ['distress'] };
  return { level: 0, signals: [] };
}
const CRISIS_BLOCK = [
  'CRISIS MODE. He may be in real danger. Drop every bit, joke, thought experiment and all cleverness. No character flavour.',
  'Be steady and warm. Say you care. Do not diagnose, do not give advice, do not moralise, do not use bullet points.',
  'Say plainly that this is bigger than a chat and he needs a real person now.',
  'Give these numbers exactly: SADAG suicide crisis line 0800 567 567. Lifeline South Africa 0861 322 322. From a mobile, emergency services 112.',
  'Stay with him in the conversation. Ask one short grounding question. Never leave him hanging.'
].join(' ');
const SOFT_BLOCK = 'TONE OVERRIDE: he is hurting. No jokes, no cleverness, no thought experiments, no character flavour. Steady and warm. Short sentences.';
function wrapSystem(sys, level) {
  if (level >= 2) return sys + '\n\n' + CRISIS_BLOCK;
  if (level === 1) return sys + '\n\n' + SOFT_BLOCK;
  return sys;
}
const killSwitch = level => level >= 2;
// Static markup, no user text inside. Shown locally, so it still appears when every AI engine is down.
function crisisCard() {
  return '<div class="crisis-card" id="crisisCard"><b>You are not alone.</b>' +
    '<p>SADAG suicide crisis line <a href="tel:0800567567">0800 567 567</a></p>' +
    '<p>Lifeline South Africa <a href="tel:0861322322">0861 322 322</a></p>' +
    '<p>Emergency (mobile) <a href="tel:112">112</a></p></div>';
}
let _last = 0;
const mark = level => { _last = level | 0; };
const lastLevel = () => _last;
window.Safety = { detect, wrapSystem, killSwitch, crisisCard, mark, lastLevel, CRISIS_BLOCK, SOFT_BLOCK };
})();
