// V1.9.20: DDG HTML parser, receipts, Bojack trigger gone, copy/paste wiring
const fs = require('fs'), path = require('path'); let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const W = f => fs.readFileSync(path.join(__dirname, '..', 'www', f), 'utf8');
global.window = global; global.document = { getElementById: () => null };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
eval(W('ai_agent.js'));
const html = '<div class="result"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa%3Fx%3D1&amp;rut=abc">Grant <b>Festers</b> - Example</a><a class="result__snippet" href="x">A &amp; B snippet</a></div><div class="result"><a class="result__a" href="https://second.org/p">Second</a><a class="result__snippet" href="x">Two</a></div>';
const r = window.EmberAgentAddon._parseDdgHtml(html, 5);
ok(r.length == 2, 'parses 2 results'); ok(r[0].url == 'https://example.com/a?x=1', 'decodes uddg url'); ok(r[0].title == 'Grant Festers - Example', 'strips tags'); ok(r[0].snippet == 'A & B snippet', 'snippet entities'); ok(r[1].url == 'https://second.org/p', 'direct url kept');
ok(window.EmberAgentAddon._parseDdgHtml('<html>blocked</html>', 5).length == 0, 'no results on junk');
const app = W('app.js');
ok(!/BOJACK_REPLY/.test(app), 'Bojack reply no longer referenced in app.js');
ok(/receiptOf/.test(app) && /honestTail/.test(app) && /rc: lastReceipts/.test(app), 'receipts wired');
ok(!/came back empty\.'/.test(app), 'old fake "add-on came back empty" message removed');
ok(/data-act="copy"/.test(app) && /bPaste/.test(W('index.html')), 'copy/paste wired');
ok(/reasoning_effort/.test(W('providers.js')), 'gpt-oss reasoning budget handled');
ok(/user-select:text/.test(W('style.css')), 'selectable chat text');
console.log('v1920: ' + pass + ' pass, ' + fail + ' fail'); process.exit(fail ? 1 : 0);
