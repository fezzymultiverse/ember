# Ember V1.9.83 HANDOVER
Status: 46 add-on tiles (was 21). New: Translate, Rewrite/Polish, Termux script, Summarise, Draft a message, Spark (Runs); Fact-check, Compare, Explain simply, Read a link, Go deeper (Runs); Music Console, Saved Sites, Keys, Scraping, Permissions, Upload a file, Camera/Vision, Paste; Plan my day, Checklist, Recent chats, Share this chat, Usage; Private chat (mode, drives the existing switch). New kind Runs (does one thing now). Verification: Playwright 360x780 (46 tiles, Private chat switch syncs, Keys/Music/Saved Sites/Recent chats/Share/Usage open their screens, no page errors); node --check; tests/v1981-test.js. NOT done: APK build, device check; Spark and Go deeper not run against a live engine.

# Ember V1.9.82 HANDOVER
Status: spacious Settings. New www/ember_v82.css (layout only): roomier tab row, 18px gutters, 18px between cards, 14px between rows inside a card, 50px inputs/buttons, 56px switch rows, hint text at 1.7 line height. Tab hiding (stab-show) kept intact. Verification: Playwright 360x780 before/after of General and Keys; node --check on all www/*.js; tests/v1981-test.js. NOT done: APK build, device check, other Settings tabs (GitHub, Scraping, Hacking, Music, Permissions) not screenshotted.

# Ember V1.9.81 HANDOVER
Status: egg + Thinking dot + More add-ons. (1) The empty-screen egg is now the app icon as an inline SVG (class ev-hero, no .flame orb rules can touch it). (2) A flashing blue dot sits beside every Thinking label: spin style (.et-led), dropdown and summary headers, the live row, and the top engine pill while Ember works; default live status reads "Thinking…". (3) "+" menu has a top row, More add-ons, opening a Manus-style sheet: search, category chips (Create, Research, Connect, Automate, Modes), Recent row, 21 tiles that are Opens / Mode / Starter (all wired to screens and modes that already exist; nothing is sent until he taps send). New files: www/ember_v81.css, www/ember_v81.js, tests/v1981-test.js.
Verification: node --check on every www/*.js; node tests/v1981-test.js (12/12); v1980 puter test 11/11; Playwright 360x780 check of the egg, + menu, sheet, a Mode tile, a Starter tile and the Thinking row (no page errors). tests/v1945-motion-test.js fails the same way on the untouched V1.9.80 zip (stale assertion), not caused by this build. NOT done: APK build, device check.

# Ember V1.9.80 HANDOVER
Status: Puter runs on its auth token (OpenAI-compatible endpoint, no sign-in window). Visual repair 2 in ember_v80.css / ember_v80.js: compact bubbles, tidy reply action pills, left panel vs music console, slim composer, egg = ember-icon.svg, readable key list. Ember is now always told the GitHub Hub exists. Verification: node --check on every www/*.js; node tests/v1980-puter-key-test.js (11/11); keyscan, routing, router, streaming, context, v1978-steps tests pass. NOT done: APK build, device check, Playwright UI tests, live call to api.puter.com. Plan for aifreeforever.com: AIFREEFOREVER_PLAN_V1_9_80.md.

# Ember V1.9.79 HANDOVER
Status: visual repair only. New www/ember_v79.css + ember_v79.js (loaded after style.css). Download cards rebuilt in ember_getmusic.js (.dj-*). Provider names fields get visible borders. Music tabs get a solid band. Free Mode banner no longer overlaps the empty state. Composer border/focus, jump-to-latest button. Not done yet: PDF engine, data box, song finder. APK not built or tested here.

# Ember V1.9.75 HANDOVER
Status: GitHub Hub (slots, token sync, live feed, files, activity). Verification: node --check on every www/*.js only. Run `node tests/v1974-test.js` first on the next machine; the Hub has no dedicated test yet.

# Ember V1.9.45 HANDOVER
Status: thinking motion. Spinner style = turning spinner + rotating status line (no dropdown). Summary card and compact dropdown reveal one thought at a time through a queue in ember_timeline.js (rv / rvAt flags, pump(), flush()).

## Verification
- `node tests/v1945-motion-test.js`, `v1942-thought-test.js`, `v1941-thought-test.js`, `v1928-test.js`, `v1933-test.js`, `v1940-ui-test.js`: passed.
- Android APK/device verification: not performed in this environment.

## Previous (V1.9.42)
Status: thinking-card repair. Title clipping fixed (no background-clip text), ReAct now feeds the single live card via EmberTimeline.upsert(), card collapses as a dropdown when the run/reply ends. README not touched.

## Previous (V1.9.41)
Status: added a third, optional Claude-like animated status-line thinking display. The existing Summary timeline and compact dropdown remain available and are cycled through using the switch icon. The new style shows observable progress/status updates already emitted by Ember, not private internal chain-of-thought. Existing tool actions and saved summaries remain wired to the same timeline data.

## Verification
- `node --check www/ember_timeline.js`: passed.
- `node tests/v1941-thought-test.js`: passed.
- Android APK/device verification: not performed in this environment.
- Full test suite: not claimed; several existing tests require Playwright and live provider services.

## Notes
- The display switch cycles Summary → compact dropdown → animated status line → Summary and persists the selection.
- The animation respects `prefers-reduced-motion`.
- Web search / download rows still come from actual tool events; no fake download completion is generated.
