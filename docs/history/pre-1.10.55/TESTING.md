# Testing — 1.10.17 actual results

## Release status

**Candidate; acceptance incomplete.** The full inherited suite is not green. Source: the supplied V1.10.16 Keyless Router, not a fallback. All eight protected backends, all 25 stylesheet files and all vendor files are byte-identical to that source. No loaded patch/CSS merge was attempted.

## Reproduction

Use Node 20+, npm and git. Install with `npm ci --legacy-peer-deps`, then install the browser and OS dependencies with `npx playwright install --with-deps chromium`.

`npm test` invokes `scripts/run-tests.cjs`, discovers every top-level `*-test.js` and `*-test.cjs`, runs them sequentially (old harnesses share fixed ports), writes per-test logs and does not short-circuit. It returns nonzero for any failure, skip, printed FAIL or timeout. `scripts/test-preload.cjs` blocks unmocked third-party HTTP while allowing localhost fixtures; routes explicitly installed by an individual test take precedence. No real user credentials are involved.

The delivered full run used `EMBER_TEST_TIMEOUT_MS=15000 npm test`. This sets 15-second deadlines on historical harnesses; the runner gives keyless 180 seconds and cockpit/Termux/current wired browser tests 90 seconds. Default historical deadline without that environment variable is 45 seconds. **A timeout is not a proven product defect or a passed test**: it may be a stale hidden selector, test-specific fixture/dependency issue or insufficient budget. All are unresolved acceptance items until triaged. Rerun without that override for longer diagnosis.

Full discovered/completed scripts: **68/68**. Final results: **28 PASS, 28 FAIL, 11 TIMEOUT, 1 SKIP**. Exit status: **1**. Raw logs and the machine-readable summary are in `tests/results/wired/suite/`. The initial baseline run is separately retained under baseline-suite; many early baseline failures were dependency-path/browser-library setup issues, so its raw counts are not a clean behavioral A/B baseline and no causal improvement claim is made from them.

## The three explicitly requested legacy repairs

| Test | Actual correction | Current result |
|---|---|---|
| term-test.js | Open the authoritative cockpit Hacking section instead of clicking a hidden retired Termux affordance. Assert inline panel, hidden legacy expand/minimize controls and actual viewport-resize WebSocket handling rather than obsolete half-screen geometry. Terminal core, socket handshake, typing, command safety and reconnection checks remain. | 48 passed, 0 failed |
| v1992-repo-runner-test.js | The protected runner intentionally permits brain==output and filters self-copy. Verify that exception and keep a negative assertion for non-brain source/output collision. Do not change backend behavior to fit an obsolete assertion. | 30 checks passed |
| knowledge-brain-test.js | Assert the single cockpit Command Centre runner owner and hidden superseded card, not a removed Advanced accordion. Existing Read-First security checks remain. | 35 checks passed |

Developer-machine-specific Playwright require paths in inherited tests were changed to local dependency resolution; no application logic was changed for portability.

## Current focused gates

`npm run test:wiring`: **12/12 structural checks pass**. The requested orphan-script, unconsumed-emitted-event, duplicate-root-API and precache/page-mismatch gates were mutation-tested in `scripts/verify-wiring-gates.cjs`: all four deliberately broken fixtures were rejected and every file was restored before finalization. Proof: mutation-proof.json. Dynamic event names and method-wrapper ownership limits are listed in WIRING_MAP, not pretended exhaustive.

`npm run test:keyless`: **47/47 mocked browser checks pass**, including both requested viewports, chooser interaction/cancellation/preferences, fallback/timeout behavior, disabled tools, documents with real PDF/DOCX signatures, public-source extraction constraints, chat routing to normal artifact cards and a Save PDF download. No external availability claim follows from a mocked success.

`node scripts/verify-native-fixture.cjs`: **PASS**. The patcher applies twice identically to a disposable minimal project, copies all 15 Kotlin sources, inserts required manifest service declarations and sets version 1.10.17. This is source transformation/idempotence, not Kotlin/Gradle compilation or hardware validation.

## Visual preservation — no hidden masks or threshold pass

Fourteen before/after captures cover chat, Settings, Command Centre, Browser, Plugins, chooser and terminal at 412x915 and 1280x900. All captured browser cases have **zero page errors and no horizontal document overflow**. Fixtures block third-party HTTP, use fixed time/randomness, suppress animation/caret transitions, and use identical browser/viewport setup on original and changed code. They do not change production stylesheets. This is only the seven-surface state coverage, not every scroll position or every overlay combination.

| Viewport / view | Changed pixels | Max channel delta | Changed bounds (x0,y0,x1,y1) |
|---|---|---|---|
| browser-1280x900.png | 0 | 0 | None |
| browser-412x915.png | 0 | 0 | None |
| chat-1280x900.png | 0 | 0 | None |
| chat-412x915.png | 0 | 0 | None |
| chooser-1280x900.png | 0 | 0 | None |
| chooser-412x915.png | 0 | 0 | None |
| command-centre-1280x900.png | 0 | 0 | None |
| command-centre-412x915.png | 0 | 0 | None |
| plugins-1280x900.png | 31 | 3 | (282, 767, 319, 840) |
| plugins-412x915.png | 0 | 0 | None |
| settings-1280x900.png | 0 | 0 | None |
| settings-412x915.png | 0 | 0 | None |
| terminal-1280x900.png | 0 | 0 | None |
| terminal-412x915.png | 0 | 0 | None |

Thirteen of the final fourteen screenshot pairs are pixel-identical. The remaining 31 changed pixels are on the dimmed underlying Modes/composer outline in the desktop Plugins capture, with a maximum RGB channel difference of 3. A repeat capture of the **untouched** source reproduced exactly that 31-pixel, maximum-3-channel-delta pattern at the same bounds (baseline-repeat/aa-report.json). That demonstrates rendering/compositing variance in the original application, not evidence of a new layout change. No production CSS or DOM layout was altered to hide it. The strict pixel gate remains nonzero, and raw diff PNGs are delivered.

The current wired-browser test is deliberately **strict** and returns nonzero for any changed pixel, including these tiny differences. It therefore does not earn a false pixel-perfect PASS. Its functional adapter checks pass, including fixed-text status forwarding and a synthetic sensitive-payload sentinel that is not retained in new logs/diagnostics. Zero-page-error capture success must not be confused with a passed strict image gate.

## Complete result ledger

| Test | Result | Evidence |
|---|---|---|
| agent-test.js | TIMEOUT | `tests/results/wired/suite/agent-test.js.log` |
| app-test.js | TIMEOUT | `tests/results/wired/suite/app-test.js.log` |
| artifact-test.js | PASS | `tests/results/wired/suite/artifact-test.js.log` |
| cockpit-browser-test.js | FAIL | `tests/results/wired/suite/cockpit-browser-test.js.log` |
| command-center-browser-test.js | TIMEOUT | `tests/results/wired/suite/command-center-browser-test.js.log` |
| command-center-test.js | FAIL | `tests/results/wired/suite/command-center-test.js.log` |
| context-test.js | PASS | `tests/results/wired/suite/context-test.js.log` |
| download94-test.js | PASS | `tests/results/wired/suite/download94-test.js.log` |
| handoff-test.js | PASS | `tests/results/wired/suite/handoff-test.js.log` |
| keyless-browser-test.cjs | PASS | `tests/results/wired/suite/keyless-browser-test.cjs.log` |
| keyscan-test.js | PASS | `tests/results/wired/suite/keyscan-test.js.log` |
| knowledge-brain-browser-test.js | TIMEOUT | `tests/results/wired/suite/knowledge-brain-browser-test.js.log` |
| knowledge-brain-test.js | PASS | `tests/results/wired/suite/knowledge-brain-test.js.log` |
| lyrics-test.js | PASS | `tests/results/wired/suite/lyrics-test.js.log` |
| music-test.js | TIMEOUT | `tests/results/wired/suite/music-test.js.log` |
| panel-browser-test.js | FAIL | `tests/results/wired/suite/panel-browser-test.js.log` |
| router-test.js | PASS | `tests/results/wired/suite/router-test.js.log` |
| routing-fallback-test.js | PASS | `tests/results/wired/suite/routing-fallback-test.js.log` |
| routing94-browser-test.js | FAIL | `tests/results/wired/suite/routing94-browser-test.js.log` |
| routing94-test.js | PASS | `tests/results/wired/suite/routing94-test.js.log` |
| safety-test.js | PASS | `tests/results/wired/suite/safety-test.js.log` |
| scrape-test.js | PASS | `tests/results/wired/suite/scrape-test.js.log` |
| settings-right-panel-test.js | PASS | `tests/results/wired/suite/settings-right-panel-test.js.log` |
| speaker-test.js | TIMEOUT | `tests/results/wired/suite/speaker-test.js.log` |
| streaming-routing-test.js | PASS | `tests/results/wired/suite/streaming-routing-test.js.log` |
| term-test.js | PASS | `tests/results/wired/suite/term-test.js.log` |
| tool-followup-routing-test.js | FAIL | `tests/results/wired/suite/tool-followup-routing-test.js.log` |
| v1105-browser-test.js | TIMEOUT | `tests/results/wired/suite/v1105-browser-test.js.log` |
| v168-test.js | PASS | `tests/results/wired/suite/v168-test.js.log` |
| v183-test.js | TIMEOUT | `tests/results/wired/suite/v183-test.js.log` |
| v1915-test.js | FAIL | `tests/results/wired/suite/v1915-test.js.log` |
| v1924-test.js | TIMEOUT | `tests/results/wired/suite/v1924-test.js.log` |
| v1925-test.js | PASS | `tests/results/wired/suite/v1925-test.js.log` |
| v1927-test.js | PASS | `tests/results/wired/suite/v1927-test.js.log` |
| v1927b-test.js | PASS | `tests/results/wired/suite/v1927b-test.js.log` |
| v1928-test.js | PASS | `tests/results/wired/suite/v1928-test.js.log` |
| v1929-test.js | FAIL | `tests/results/wired/suite/v1929-test.js.log` |
| v1930-test.js | FAIL | `tests/results/wired/suite/v1930-test.js.log` |
| v1932-test.js | PASS | `tests/results/wired/suite/v1932-test.js.log` |
| v1933-test.js | PASS | `tests/results/wired/suite/v1933-test.js.log` |
| v1940-ui-test.js | FAIL | `tests/results/wired/suite/v1940-ui-test.js.log` |
| v1941-thought-test.js | FAIL | `tests/results/wired/suite/v1941-thought-test.js.log` |
| v1942-thought-test.js | FAIL | `tests/results/wired/suite/v1942-thought-test.js.log` |
| v1945-motion-test.js | FAIL | `tests/results/wired/suite/v1945-motion-test.js.log` |
| v1950-ui-stability-test.js | FAIL | `tests/results/wired/suite/v1950-ui-stability-test.js.log` |
| v1951-api-audit-test.js | PASS | `tests/results/wired/suite/v1951-api-audit-test.js.log` |
| v1955-api-profile-test.js | FAIL | `tests/results/wired/suite/v1955-api-profile-test.js.log` |
| v1957-newpipe-direct-test.js | FAIL | `tests/results/wired/suite/v1957-newpipe-direct-test.js.log` |
| v1973-test.js | FAIL | `tests/results/wired/suite/v1973-test.js.log` |
| v1974-test.js | FAIL | `tests/results/wired/suite/v1974-test.js.log` |
| v1978-steps-test.js | PASS | `tests/results/wired/suite/v1978-steps-test.js.log` |
| v198-test.js | TIMEOUT | `tests/results/wired/suite/v198-test.js.log` |
| v1980-puter-key-test.js | FAIL | `tests/results/wired/suite/v1980-puter-key-test.js.log` |
| v1987-test.js | FAIL | `tests/results/wired/suite/v1987-test.js.log` |
| v1988-test.js | FAIL | `tests/results/wired/suite/v1988-test.js.log` |
| v1989-test.js | FAIL | `tests/results/wired/suite/v1989-test.js.log` |
| v1991-browser-test.js | FAIL | `tests/results/wired/suite/v1991-browser-test.js.log` |
| v1991-deliverables-test.js | PASS | `tests/results/wired/suite/v1991-deliverables-test.js.log` |
| v1992-repo-runner-browser-test.js | TIMEOUT | `tests/results/wired/suite/v1992-repo-runner-browser-test.js.log` |
| v1992-repo-runner-test.js | PASS | `tests/results/wired/suite/v1992-repo-runner-test.js.log` |
| v1996-memgroups-test.js | FAIL | `tests/results/wired/suite/v1996-memgroups-test.js.log` |
| v1999-ui-refinement-test.js | FAIL | `tests/results/wired/suite/v1999-ui-refinement-test.js.log` |
| voice-cloud-test.js | FAIL | `tests/results/wired/suite/voice-cloud-test.js.log` |
| voice-native-test.js | SKIP | `tests/results/wired/suite/voice-native-test.js.log` |
| wired-browser-test.cjs | FAIL | `tests/results/wired/suite/wired-browser-test.cjs.log` |
| wiring-test.cjs | PASS | `tests/results/wired/suite/wiring-test.cjs.log` |
| workspace95-browser-test.js | FAIL | `tests/results/wired/suite/workspace95-browser-test.js.log` |
| workspace95-test.js | FAIL | `tests/results/wired/suite/workspace95-test.js.log` |

## Explicitly not tested / not certified

Live GitHub push or Actions execution, actual keyless endpoint uptime/auth behavior, paid provider calls or generation, Android Kotlin/Gradle build, real Android permissions/workers/notifications/battery management, physical microphone and speech services, real media downloads and installation of external Termux/download bridges. Static code references, patcher fixtures and mocked endpoints cannot replace that evidence. The four incoming-only legacy event contracts and protected removed-service cleanup conflict remain open in NEEDS_APPROVAL.md.
