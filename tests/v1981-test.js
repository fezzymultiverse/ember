// Ember V1.9.81: egg = inline app icon, blue blink beside Thinking, More add-ons sheet. Pure Node, no network, no browser.
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (x || '')); };
const W = f => fs.readFileSync(path.join(__dirname, '..', 'www', f), 'utf8');
const html = W('index.html'), css = W('ember_v81.css'), js = W('ember_v81.js'), sw = W('sw.js'), tl = W('ember_timeline.js');

ok('hero egg is an inline SVG with the icon flame path', /<svg class="ev-hero"[^>]*>[\s\S]*M256 70c20 58 96 104 96 192/.test(html));
ok('hero no longer carries the old .flame orb class', !/class="[^"]*\bflame\b[^"]*ember-logo-hero/.test(html) && !/<[^>]+class="flame/.test(html.split('id="empty"')[1].split('</div>')[0]));
ok('inline gradient ids do not clash with ember-icon.svg ids', /id="evBg"/.test(html) && !/id="bg"|id="fl"|id="core"/.test(html.split('id="empty"')[1].split('id="mw"')[0]));
ok('v81 css + js are loaded after v80', html.indexOf('ember_v81.css') > html.indexOf('ember_v80.css') && html.indexOf('ember_v81.js') > html.indexOf('ember_v80.js'));
ok('service worker caches v81 files and bumps its version (V1.9.83)', /ember-v1\.9\.83/.test(sw) && /'ember_v81\.css'/.test(sw) && /'ember_v81\.js'/.test(sw));
ok('blue blink on the spin led, both shimmer labels, the live row and the top pill', ['.et-led', '.tl-shimmer::before', '.et-shimmer::before', '.tl-item.tl-now .tl-live', '#engs.activity i'].every(s => css.includes(s)) && /ev-blink/.test(css) && /#3b9eff/.test(css));
ok('blink respects reduced motion', /prefers-reduced-motion:reduce\)\{[^}]*animation:none/.test(css));
ok('default live status now reads Thinking…', /: \{ t: 'Thinking\\u2026'/.test(tl));
try { new vm.Script(js); ok('ember_v81.js compiles', true); } catch (e) { ok('ember_v81.js compiles', false, e.message); }
const ids = [...js.matchAll(/\{ id: '([a-z]+)', cat: '([a-z]+)'/g)].map(m => m[1]);
ok('tile ids are unique', new Set(ids).size === ids.length && ids.length >= 40, ids.join(','));
ok('every tile has a kind and a real runner or mode', (js.match(/kind: '(open|mode|starter|act)'/g) || []).length === ids.length);
ok('no network calls in the add-ons file', !/fetch\(|XMLHttpRequest|WebSocket/.test(js));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
