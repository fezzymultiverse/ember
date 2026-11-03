// Ember V1.10.47 - typewriter tests. Virtual clock, no browser needed.
// Usage: node tests/typewriter-11047.cjs [path-to-ember_typewriter.js]
// Run it against the 1.10.40 file to see the three bugs reproduce, against the new file to see them gone.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'www', 'ember_typewriter.js'));
const src = fs.readFileSync(file, 'utf8');

function rig() {
  let now = 0, seq = 0; const timers = new Map(), vis = { state: 'visible' }, listeners = [];
  const win = {};
  const ctx = {
    window: win,
    performance: { now: () => now },
    document: { get visibilityState() { return vis.state; }, addEventListener: (t, f) => { if (t === 'visibilitychange') listeners.push(f); } },
    setTimeout: (f, d) => { const id = ++seq; const wait = vis.state === 'hidden' ? Math.max(d || 0, 1000) : (d || 0); timers.set(id, { at: now + wait, f }); return id; },
    clearTimeout: id => timers.delete(id),
    console
  };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const paints = [];
  const w = win.EmberTypewriter.create({ paint: t => paints.push(t) });
  // advance the virtual clock; stops early when nothing is left to run
  const run = ms => {
    const end = now + ms;
    for (;;) {
      let nextId = 0, nextAt = Infinity;
      timers.forEach((t, id) => { if (t.at < nextAt) { nextAt = t.at; nextId = id; } });
      if (!nextId || nextAt > end) { now = end; return; }
      const t = timers.get(nextId); timers.delete(nextId); now = Math.max(now, t.at); t.f();
    }
  };
  const setHidden = h => { vis.state = h ? 'hidden' : 'visible'; listeners.forEach(f => f()); };
  return { w, paints, run, setHidden, clock: () => now };
}

let pass = 0, fail = 0; const bugs = [];
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; bugs.push(name); console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); } };
const LOREM = 'Here is the plan for tonight. First we check the keys, then we run the router and read what comes back. '.repeat(40);

const flush = () => new Promise(r => setImmediate(r));
(async () => {
console.log('file:', file);

console.log('\n1. final text slightly different from the streamed text');
{
  const r = rig(); const streamed = LOREM + '  \n';           // provider streamed trailing whitespace
  r.w.push(streamed); r.run(20000);
  const before = r.w.state().shown.length, painted = r.paints.length;
  let done = null; r.w.finish(LOREM.trim(), () => false).then(v => { done = v; });
  r.run(12000); await flush();
  const blank = r.paints.slice(painted).some(t => t === '');
  ok('no blank flash when the final text is trimmed', !blank);
  ok('shown ends equal to the final text', r.w.state().shown === LOREM.trim(), 'shown ' + r.w.state().shown.length + ' vs ' + LOREM.trim().length);
  ok('finish() resolves true', done === true);
  ok('did not re-type the whole reply (paints after finish stay small)', r.paints.length - painted < 5, (r.paints.length - painted) + ' paints, was ' + before + ' chars on screen');
}
{
  const r = rig(); const a = 'Alpha beta gamma delta. '.repeat(80), b = 'Alpha beta gamma delta. '.repeat(70) + 'Epsilon corrected ending. ';
  r.w.push(a); r.run(15000);
  const painted = r.paints.length; r.w.finish(b, () => false); r.run(15000);
  ok('mid-text correction keeps the common start on screen', !r.paints.slice(painted).some(t => t === ''));
  ok('mid-text correction ends exactly on the new text', r.w.state().shown === b);
}

console.log('\n2. a genuinely different text still starts over (tool round / retry)');
{
  const r = rig(); r.w.push('First answer that goes one way and then is thrown away. '.repeat(5)); r.run(3000);
  const painted = r.paints.length; r.w.push('Completely different second round text. '); r.run(3000);
  ok('screen is cleared once', r.paints.slice(painted).filter(t => t === '').length === 1);
  ok('then the new text is typed', r.w.state().shown === 'Completely different second round text. ');
}

console.log('\n3. app in the background');
{
  const r = rig(); r.w.push('x'.repeat(200)); r.run(500); r.setHidden(true);
  let done = null; const t0 = r.clock(); r.w.finish(LOREM, () => false).then(v => { done = v; });
  r.run(1200); await flush();
  ok('whole reply is shown within ~1s of the page being hidden', r.w.state().shown === LOREM, 'shown ' + r.w.state().shown.length + ' of ' + LOREM.length + ' after ' + (r.clock() - t0) + 'ms');
  ok('finish() resolved while hidden', done === true);
}
{
  const r = rig(); r.setHidden(true); r.w.push('short streamed bit'); r.run(1);
  ok('streaming while hidden paints at once', r.w.state().shown === 'short streamed bit');
}

console.log('\n4. half-typed artifact tag never shows');
{
  const r = rig(); const parts = ['Here you go <', 'Here you go <a', 'Here you go <ar', 'Here you go <artif', 'Here you go <artifact'];
  const seen = [];
  for (const p of parts) { r.w.push(p); r.run(2000); seen.push(r.paints[r.paints.length - 1]); }
  ok('"<a" ... "<artif" are hidden', seen.slice(1, 4).every(t => t === 'Here you go '), JSON.stringify(seen));
  ok('a full <artifact tag becomes the "Writing artifact" line', /Writing artifact/.test(seen[4] || ''), JSON.stringify(seen[4]));
  const r2 = rig(); r2.w.push('Use the <a href="x">link</a> tag'); r2.run(4000);
  ok('a normal anchor tag in the text is untouched', r2.w.state().shown === 'Use the <a href="x">link</a> tag' && r2.paints[r2.paints.length - 1] === 'Use the <a href="x">link</a> tag');
}

console.log('\n5. long replies paint less often');
{
  const r = rig(); const big = ('Sentence number one is here and it goes on a little. ').repeat(240); // ~12.5k chars
  r.w.push(big); r.run(60000);
  ok('long reply fully typed', r.w.state().shown === big);
  console.log('       paints for a ' + big.length + '-char burst: ' + r.paints.length);
  ok('paint count for a 12.5k burst is bounded (<= 400)', r.paints.length <= 400, String(r.paints.length));
  const maxJump = Math.max.apply(null, r.paints.map((t, i) => i ? t.length - r.paints[i - 1].length : t.length));
  ok('no single paint dumps more than 96 characters', maxJump <= 97, String(maxJump));
}

console.log('\n6. emoji are never split');
{
  const r = rig(); const t = 'ok 🔥🚀 fire and rocket 👍 done'.repeat(20);
  r.w.push(t); r.run(20000);
  ok('no paint ends on a lone high surrogate', r.paints.every(p => !/[\uD800-\uDBFF]$/.test(p)));
  ok('typed to the end', r.w.state().shown === t);
}

console.log('\n7. plain behaviour is unchanged');
{
  const r = rig(); const t = 'Streaming text arrives in pieces. '.repeat(20); let acc = '';
  for (let i = 0; i < t.length; i += 37) { acc = t.slice(0, i + 37); r.w.push(acc); r.run(120); }
  let monotonic = true; for (let i = 1; i < r.paints.length; i++) if (r.paints[i].length < r.paints[i - 1].length) monotonic = false;
  ok('appended chunks only ever grow on screen', monotonic);
  let done = null; r.w.finish(t, () => false).then(v => { done = v; }); r.run(10000); await flush();
  ok('finish resolves true with the full text', done === true && r.w.state().shown === t);
  let cancelled = false; const r2 = rig(); let res = 'unset'; r2.w.finish(t, () => cancelled).then(v => { res = v; }); r2.run(100); cancelled = true; r2.run(500); await flush();
  ok('cancel resolves false and clears', res === false && r2.w.state().shown === '');
  const r3 = rig(); r3.w.push('abc'); r3.w.reset(); ok('reset empties state', r3.w.state().shown === '' && r3.w.state().target === '');
}

})().then(() => {
console.log('\n' + pass + ' passed, ' + fail + ' failed' + (fail ? '  (' + bugs.join(' | ') + ')' : ''));
process.exit(fail ? 1 : 0);
});
