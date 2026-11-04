// V1.10.55: token fit + 413 learning + LongCat removal. Node only, no network.
'use strict';
const fs = require('fs'), path = require('path');
const www = path.join(__dirname, '..', 'www');
const src = fs.readFileSync(path.join(www, 'providers.js'), 'utf8');
const a = src.indexOf('const TPM_DEFAULT'), b = src.indexOf('async function call(id, key, model, o)');
if (a < 0 || b < 0) { console.error('FAIL helpers not found'); process.exit(1); }
const store = {}; const LS = { get: (k, d) => k in store ? store[k] : d, set: (k, v) => { store[k] = v; } };
const T = new Function('LS', src.slice(a, b) + '\nreturn { fitBody, learnTpm, tpmBudget, estTok };')(LS);
let bad = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };
const hist = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'turn ' + i + ' ' + 'y'.repeat(2500) }));
const lens = hist.map(m => m.content.length).join(',');
const body = { messages: [{ role: 'system', content: 'x'.repeat(14000) }].concat(hist), max_tokens: 4096, tools: [{ type: 'function', function: { name: 'f', description: 'z'.repeat(4000) } }] };
T.fitBody('groq', 'openai/gpt-oss-120b', body);
ok(T.estTok(body.messages) + T.estTok(body.tools || '') + body.max_tokens <= 7000, 'oversized Groq body fits the 7000 budget');
ok(hist.map(m => m.content.length).join(',') === lens, 'caller chat history is not trimmed');
ok(body.max_tokens >= 256, 'max_tokens keeps a usable floor');
T.learnTpm('groq', 'm', { message: 'Request too large ... Limit 8000, Requested 11234' });
ok(T.tpmBudget('groq', 'm') === 7360, '413 teaches the real limit (92% of 8000)');
ok(T.tpmBudget('mistral', 'm') === 0, 'Mistral has no built-in cap');
ok(!/longcat/i.test(src.replace("['together','fireworks','longcat']", '')), 'providers.js has no LongCat left except the one-time key cleanup');
for (const f of fs.readdirSync(www).filter(x => /\.(js|html)$/.test(x) && x !== 'providers.js')) if (/longcat/i.test(fs.readFileSync(path.join(www, f), 'utf8'))) { ok(false, 'LongCat still in ' + f); }
ok(!fs.existsSync(path.join(www, 'provider-icons', 'longcat.svg')), 'longcat icon removed');
process.exit(bad ? 1 : 0);
