# Ember — the one document (V1.10.55)

Everything that used to be spread over README, HANDOVER, TODO, FEATURES, ARCHITECTURE, DATA_FLOW, MEMORY, TESTING, ANDROID_*, SAFETY, PRIVACY, THREAT_MODEL, LIMITATIONS, NEEDS_APPROVAL, CONTRIBUTING, CRISIS_PROTOCOL, TERMUX_PANEL, the provider guide and the old status notes is below, in that order, unedited except for the new Part 1. The originals are kept in `docs/history/pre-1.10.55/` (nothing deleted). `CHANGELOG.md` stays the only changelog. The huge machine registries (`docs/WIRING_MAP.md`, `WIRING_AUDIT.json`, `FILE_RECEIPTS.json`, `FILE_MOVES.json`, `WIRING_BASELINE.json`, `ASSET_MANIFEST.json`) stay in `docs/` because scripts read them.

Known stale text: older parts still say "1.10.17" and mention LongCat. The current version is 1.10.55 and LongCat is removed. Where an old part disagrees with Part 1, Part 1 wins.

## Contents
1. Part 1 — API usage: what eats your keys, what blocks the other engines (NEW, V1.10.55)
2. README / status
3. Handover and open items
4. Features and entry points
5. Architecture
6. Data flow
7. Memory
8. Providers and free-tier guide
9. Android build and permissions
10. Termux panel
11. Safety, crisis protocol, privacy, threat model
12. Testing
13. Limitations and items needing approval
14. Contributing and licence notes

---

# Part 1 — API usage: what eats your keys, what blocks the other engines (V1.10.55)

## What the screenshot error means
`Request too large for model openai/gpt-oss-120b ... tokens per minute (TPM): Limit 8000, Requested ... (413)`. Groq's free plan gives gpt-oss models a pool of 8000 tokens per minute **per organization, not per key**. Groq checks `input tokens + max_tokens` against that pool before it answers. Extra Groq keys from the same org do not add quota. A request bigger than the pool is refused outright with 413, however idle the key is.

## What was eating it
| Cause | Where | Effect |
|---|---|---|
| File requests (PDF / Word) force `max` to at least 4096 and add the 32-rule A4 standards block (~900 tokens) to the system prompt | `ember_document_engine.js` | One document call alone needed roughly 7–9k tokens, over the 8000 pool |
| A file request can run several model calls in one turn (first draft, direct rewrite, continuation) | `app.js` | Each call re-sent the full prompt, burning the same per-minute pool |
| Background jobs (conversation summary, memory extraction, titles, lyric thoughts, terminal helper) started on Groq | `ORDER.util` in `providers.js`, `persona.js`, `ember_lyric_thoughts.js`, `ember_term.js` | They competed with your chat for Groq's small pool |
| Pinned engine was strict: a 413 on Groq ended the whole reply, so Gemini, Mistral, OpenRouter and Cohere were never tried | `onlyPinned` in `providers.js` | "I can't get through the other models" |
| 413 was treated like a permanent fault: the router rested that model 30 s and tried the next Groq model with the same oversized body | `runInner` in `providers.js` | Every Groq model failed the same way |
| OpenRouter was opt-in and off by default | `orderFor` | It never joined Auto fallback |

## What changed in V1.10.55 (all in `www/providers.js` unless stated)
1. **Token fit before sending.** `fitBody()` trims the request to the engine's budget: drops tool declarations first, shortens old long messages, drops the oldest history, then trims the middle of the system prompt (keeps its head and its tail, where the document override sits), then caps `max_tokens`. It works on a copy, so your saved chat history is never shortened.
2. **Budgets.** Built-in: Groq 7000, OpenRouter 16000. Mistral has no built-in cap.
3. **413 learning.** On a 413 the router reads `Limit N` from the error, stores 92% of it for that engine and model (`ember_tpm` in localStorage), refits the body and retries once on the same model. This also protects Mistral and OpenRouter.
4. **Pinned engine fails over on capacity only.** If the pinned engine fails with 413, 429, 402, 5xx or a timeout, Ember now carries on to the next engine and says which engine answered. A bad key or wrong model on the pinned engine still stops with the real reason.
5. **File requests put Groq last** (unless Groq is pinned), because it has the smallest pool.
6. **Background jobs start on Mistral, then Gemini, then Groq, then Cohere** (`ORDER.util`), so they stop draining Groq.
7. **OpenRouter now joins Auto fallback by default, free models only.** The switch is in AI Features. Plugsky stays opt-in.
8. **LongCat removed everywhere**: provider config, model list, ranking, key scanner, Settings menus, icons, service-worker cache. A saved LongCat key, pin or switch is erased once on the next start (same method used for Together and Fireworks).
9. Cache tags bumped (`sw.js` cache `ember-v1.10.55-token-fit`, `providers.js?v=1.10.55`) so the phone loads the new files.

## Engine order now
- Chat (fast): Groq, Mistral, Gemini, Cohere, then OpenRouter (free).
- Chat (deep): Mistral, Groq, Gemini, Cohere, then OpenRouter (free).
- Background jobs: Mistral, Gemini, Groq, Cohere.
- File requests: Mistral, Gemini, Cohere, OpenRouter, Groq last.
- Only engines that hold a live key are used. Cohere is last by design (trial cap: 1,000 calls a month, 20 per minute).

## Per-engine limits worth knowing
- **Groq**: org-wide, per-model per-minute and per-day pools. More keys do not help. Check console.groq.com/settings/limits.
- **Gemini**: free tier limits are per model and reset daily; Pro models are often paid-only on free keys (the router already moves them to the back).
- **Mistral**: free mode has a monthly cap; see your Limits page.
- **OpenRouter**: free models have a daily request cap, and one model can be briefly rate-limited upstream.
- **Cohere**: evaluation key only.

## How to see what is being spent
Settings → Keys → Check all shows each key's state. The Live Terminal bar names the engine and model for every attempt. If a reply says an engine "switched", the first one failed; the reason is shown.

## Not verified
These changes were syntax-checked with `node --check` and the budget logic was run in a node harness (`tests/token-fit-11055-test.cjs`). They were **not** run against live Groq, Gemini, Mistral, OpenRouter or Cohere, and not installed on a phone. The legacy suite's protected-hash and LongCat-name tests were not updated and may fail on the renamed items; see Part 12.

---


# Part 2 — README / status


<!-- source: README.md -->

## Ember 1.10.17 — release candidate, not an all-green release

Source: the supplied `ember-V1_10_16-keyless-router.zip` (not the V1.10.15 fallback).

This archive contains the safe, verified wiring work and explicit blockers. It must not be described as fully certified or completely working: the exhaustive inherited test suite is not all green. See `docs/TESTING.md`, `docs/NEEDS_APPROVAL.md`, `docs/WIRING_MAP.md` and `tests/results/wired/suite/summary.json`.

No UI redesign or stylesheet merge was performed. All eight protected backend files are byte-identical to the supplied V1.10.16 files. No account, API key or credential was added. No real GitHub write, paid generation, live keyless endpoint certification or Android build was performed.

## Run locally

Use Node 20+ with npm and git. Install the existing dependency graph with `npm ci --legacy-peer-deps`, then `npx playwright install --with-deps chromium` for browser tests. Run `npm run serve` and open the displayed localhost address.

`npm test` discovers every top-level `*-test.js` and `*-test.cjs`, runs all of them without short-circuiting, writes separate logs and returns a nonzero exit on failures, skipped checks or timeouts. It does not hide old failures. `npm run test:wiring` and `npm run test:keyless` run the current structural and keyless regressions separately.

## What changed

Six deliberately unloaded Settings controllers moved intact to `archive/www/`; their CSS is retained in its original order because removing it could change computed styles. The service-worker cache is `ember-v1.10.17-wired`, built from the exact page asset closure plus explicitly documented lazy/static assets. The legacy tests for Knowledge Brain, runner validation and inline Termux were repaired to test the current contracts rather than resurrect removed UI.

`ember_wiring.js` supplies small event adapters for Free APIs refresh, non-sensitive readiness diagnostics, post-push refresh and fixed-text download errors. It adds no UI, network request or persistent storage.

## Feature entry points

| Feature | Implementation (under www unless stated) | UI entry point / trigger | Contract / limitation |
|---|---|---|---|
| Chat, persona and safety | app.js; persona.js; safety.js | Message box → Send; Settings → Memory and Settings | Routes through existing provider contracts and safety gates. No router/backend replaced. |
| Provider routing and keys | providers.js; ember_prov_ui.js; ember_prov_next.js | Providers button at chat footer; Settings → Providers | Existing optional credentials are retained. No new key, login or account added. |
| Keyless router and chooser | ember_keyless.js | Ask for a supported task in chat; + → Plugins → Media & Music | Available alternatives show a chooser; unavailable services can fail; mocked regression is not live availability. |
| Plugins and abilities | ember_plugins.js; ember_plus.js; ember_keyless.js | + → Web & Scraping / Media & Music | EmberPlus.stateLine reads current abilities; keyless extends it at runtime. |
| Artifact cards and exports | ember_artifacts.js; ember_deliverables.js | Generated chat artifact → View / Download; ask for PDF / Word / Markdown | Local pdfmake/docx engines; protected repo-runner template is a downloadable artifact, not a browser script. |
| Live terminal and status | ember_command_center.js; ember_v104.js; ember_wiring.js | Live Terminal bar below chat; Settings → Open Command Centre | Command Centre handles runner events; versioned patch supplies tool/route logs; new adapters use fixed text, never event payloads. |
| Thought timeline | ember_timeline.js; ember_react.js; ember_steps.js | Active reply progress; saved thought card | Keyless explicitly writes timeline entries and emits agent notes. This is status/progress, not private model reasoning. |
| Memory / Knowledge Brain | store.js; ember_context.js; ember_github.js; ember_learn.js; ember_find.js | Settings → Memory and Settings; Command Centre → Connect; chat code questions | Read-first gates code answers. IndexedDB caches and configuration are not proof of fresh remote evidence. |
| GitHub discovery and queued sync | ember_cockpit.js; ember_workspace.js; ember_github.js; ember_repo_runner.js | Settings → Open Command Centre → Connect / Repos / Build | Discovery is read-only; staging and selected queue entries require explicit confirmation. Live push not tested. |
| Termux terminal | ember_term.js; ember_cockpit.js | Settings → Hacking → Termux | Inline cockpit terminal uses local ttyd WebSocket; tests use a local mock server. Host installation still required. |
| Browser and Notes | ember_browser.js; ember_create.js; ember_cockpit.js | Globe button → Browser / Documents / Notes | Notes reuse original editor; reader uses enabled scraping providers. External browser/native behavior is platform dependent. |
| Documents library and graph | ai_docs.js; ember_docs_lib.js; ember_graph.js | Paperclip / Docs control; Browser → Documents | Library dispatches ember-docs-changed; readers refresh on that window event. |
| Voice and read aloud | ember_voice.js; ember_native.js; app.js | Mic / Talk controls; reply speaker; Settings → Memory and Settings / Permissions | Browser/native services vary. Physical microphone and real Android speech services not tested. |
| Lyrics and player | ember_lyrics.js; ember_player.js; ember_music_ui.js; ai_music.js | Settings → Music & Tools → Open Music panel; chat lyrics request | Existing music services can be unavailable. Legacy drawer music events have no producers; polling remains authoritative. |
| Media generation bridge | ember_media.js; ember_mediaplus.js; ember_engines.js | + → Media & Music; Settings → Engine & Media Control | Existing Stability optional-key path retained; no paid generation performed in this release work. |
| Downloads | ember_downloads.js; ember_getmusic.js; tools/download-bridge.cjs | Chat music/video download request; native YouTube / configured local bridge | Requires existing platform tools. New adapter reports bridge status errors with fixed non-sensitive text. |
| Scraper and public-source extraction | ai_scraper.js; ai_agent.js; ember_keyless.js | + → Web & Scraping; Settings → Web Scraping; ask to read a public URL | Protected scraper remains untouched; no private-network fetching added. |
| Device plugins | ember_device.js; ember_native.js; android_patch/ | Settings → Device Tools / Permissions | Custom plugins registered in MainActivity; Android compilation and real device use not performed. |
| Projects | ember_projects.js; persona.js | Left drawer → Projects | Active project becomes next-turn persona context; diagnostics expose only revision counts, not project text. |
| Timers and pings | ember_tasks.js; ember_native.js; EmberPingWorker.kt | Chat timer commands; Settings → Permissions | Existing in-app scheduling retained; no background task enabled by this release operation. |

## Release evidence

`docs/FILE_RECEIPTS.json` accounts for every original archive member; original documentation content is preserved under `docs/history/baseline-v1.10.16/`. `FILE_INTEGRITY_1_10_17.json` contains SHA-256 values for delivered files (excluding itself). Protected hashes are in `tests/wired-protected-hashes.json`. Screenshots and raw diffs live under `tests/results/wired/`; test summaries report limitations rather than claiming untested services work.

## Repository layout
The app lives in `www/`. Native Android pieces live in `android_patch/` and are applied by `scripts/apply_android_patch.py`. Tests are in `tests/`. Old verification output, receipts, screenshots and sandbox leftovers are in `dev/` (see `dev/README.md`). Release notes for every version are in `CHANGELOG.md`.


# Part 3 — Handover and open items


<!-- source: HANDOVER.md -->

## Ember 1.10.17 — release candidate, not an all-green release

Source: the supplied `ember-V1_10_16-keyless-router.zip` (not the V1.10.15 fallback).

This archive contains the safe, verified wiring work and explicit blockers. It must not be described as fully certified or completely working: the exhaustive inherited test suite is not all green. See `docs/TESTING.md`, `docs/NEEDS_APPROVAL.md`, `docs/WIRING_MAP.md` and `tests/results/wired/suite/summary.json`.

No UI redesign or stylesheet merge was performed. All eight protected backend files are byte-identical to the supplied V1.10.16 files. No account, API key or credential was added. No real GitHub write, paid generation, live keyless endpoint certification or Android build was performed.

## Safe handover

Use the exact uploaded V1.10.16 source as the baseline. Inspect `docs/FILE_RECEIPTS.json`, `docs/FILE_MOVES.json`, `docs/WIRING_BASELINE.json` and `docs/WIRING_MAP.md` before assuming any file was removed. Protected hashes must remain unchanged. All original file content is retained either in its current file, its archive destination or a pre-rewrite documentation copy.

Do not load archived Settings controllers. Current replacement routes are `EmberCockpit.open/close`, `EmberHub` and `EmberMenu` compatibility APIs in `ember_cockpit.js`. Keep existing loaded CSS and versioned patch order. The next UI work should begin only after recording its own screenshots.

## Next implementation decisions

Resolve NEEDS_APPROVAL before changing protected migrations, platform patching or event contracts. Triage the remaining inherited test logs against today's requirements rather than changing application behavior to satisfy obsolete selectors. The new test runner must keep failing honestly until every required test is resolved; do not mark the package fully certified merely because the 12 structural checks and current keyless scenarios pass.

## Evidence

Current tests and screenshots are under `tests/results/wired/`. Historical evidence copied from the input remains identifiable in its original locations or docs/history. The current integrity manifest is regenerated after all final files and reports. No protected manifest is silently rebaselined to a modified backend.


<!-- source: TODO.md -->

## Open acceptance items

The 1.10.17 safe wiring work is delivered as a release candidate. Before treating it as a fully verified release:

1. Resolve the exact approvals in docs/NEEDS_APPROVAL.md, especially the conflicting literal removed-service ban and protected cleanup.
2. Repair every remaining inherited failure/timeout listed in tests/results/wired/suite/summary.json against explicit current behavior. Do not restore intentionally removed Settings UI.
3. Decide contracts for the four inbound-only legacy events; do not create fake listeners/producers to pass an audit.
4. Compile the native project, review MainActivity merging and test all permissions/workers/services on a target Android device.
5. Validate live keyless endpoints, optional local bridges and authorized GitHub operations outside the mocked fixture environment.
6. Only then consider versioned-patch consolidation with a passing behavior baseline and seven-surface/two-viewport screenshot comparisons. No consolidation is claimed in this package.


<!-- source: docs/history/RELEASE_STATUS.md -->

## Ember 1.10.17 — release candidate handoff

The safe wiring changes are packaged, but this is **not an all-green or fully certified release**.

| Item | Result |
|---|---|
| Input | Supplied V1.10.16 Keyless Router ZIP |
| Version / offline cache | 1.10.17 / ember-v1.10.17-wired |
| Original files accounted for | 370 / 370, each with state, destination and checksum |
| Protected backends / CSS / vendor | 8 backends, 25 CSS files and vendor assets unchanged |
| Retired unloaded Settings controllers | 6, preserved in archive/www |
| Three requested legacy tests | PASS: 48 Termux, 30 runner and 35 Knowledge Brain checks |
| Current keyless browser regression | 47/47 checks PASS |
| Structural wiring gates | 12/12 PASS; four mutation rejection proofs PASS |
| Exhaustive suite | 68/68 scripts; 28 PASS, 28 FAIL, 11 TIMEOUT, 1 SKIP; exit 1 |
| Visual coverage | 14 pairs at both requested sizes, zero page errors/overflow; tiny rasterization diffs explicitly reported |
| Android | Registration/permission source audit and disposable patcher fixture only; no device/build certification |

## Approval / unresolved items

Protected providers.js retains a legacy removed-service credential-cleanup migration. Deleting those references would violate the protected-file rule and change cleanup behavior, so it was not done. The exact proposed decision and source lines are in docs/NEEDS_APPROVAL.md. Historical sources also retain historical references under the no-deletion rule.

The full inherited suite still contains failures, deadlines and a skip; it is not masked as green. Four old incoming-only events lack bundled producers. No loaded patch/CSS consolidation was claimed or attempted without a passing behavior baseline. Live GitHub writes, live endpoint availability and real Android/device behavior are unverified.

## Review locations inside the ZIP

Start with docs/WIRING_MAP.md (complete inventory and three registries), docs/NEEDS_APPROVAL.md, docs/TESTING.md, docs/FILE_RECEIPTS.json, FILE_INTEGRITY_1_10_17.json and tests/results/wired/VERIFICATION_SUMMARY.json. Screenshots, raw differences, baseline repeats and per-test logs are included. All code files are complete, with no omitted-file placeholders.


# Part 4 — Features and entry points


<!-- source: FEATURES.md -->

## Features and real entry points

The following is the current implementation catalogue, not a guarantee that external services are online. Every row identifies code and a UI/chat entry point. Historical feature claims are retained as history only, never current promises.

| Feature | Implementation (under www unless stated) | UI entry point / trigger | Contract / limitation |
|---|---|---|---|
| Chat, persona and safety | app.js; persona.js; safety.js | Message box → Send; Settings → Memory and Settings | Routes through existing provider contracts and safety gates. No router/backend replaced. |
| Provider routing and keys | providers.js; ember_prov_ui.js; ember_prov_next.js | Providers button at chat footer; Settings → Providers | Existing optional credentials are retained. No new key, login or account added. |
| Keyless router and chooser | ember_keyless.js | Ask for a supported task in chat; + → Plugins → Media & Music | Available alternatives show a chooser; unavailable services can fail; mocked regression is not live availability. |
| Plugins and abilities | ember_plugins.js; ember_plus.js; ember_keyless.js | + → Web & Scraping / Media & Music | EmberPlus.stateLine reads current abilities; keyless extends it at runtime. |
| Artifact cards and exports | ember_artifacts.js; ember_deliverables.js | Generated chat artifact → View / Download; ask for PDF / Word / Markdown | Local pdfmake/docx engines; protected repo-runner template is a downloadable artifact, not a browser script. |
| Live terminal and status | ember_command_center.js; ember_v104.js; ember_wiring.js | Live Terminal bar below chat; Settings → Open Command Centre | Command Centre handles runner events; versioned patch supplies tool/route logs; new adapters use fixed text, never event payloads. |
| Thought timeline | ember_timeline.js; ember_react.js; ember_steps.js | Active reply progress; saved thought card | Keyless explicitly writes timeline entries and emits agent notes. This is status/progress, not private model reasoning. |
| Memory / Knowledge Brain | store.js; ember_context.js; ember_github.js; ember_learn.js; ember_find.js | Settings → Memory and Settings; Command Centre → Connect; chat code questions | Read-first gates code answers. IndexedDB caches and configuration are not proof of fresh remote evidence. |
| GitHub discovery and queued sync | ember_cockpit.js; ember_workspace.js; ember_github.js; ember_repo_runner.js | Settings → Open Command Centre → Connect / Repos / Build | Discovery is read-only; staging and selected queue entries require explicit confirmation. Live push not tested. |
| Termux terminal | ember_term.js; ember_cockpit.js | Settings → Hacking → Termux | Inline cockpit terminal uses local ttyd WebSocket; tests use a local mock server. Host installation still required. |
| Browser and Notes | ember_browser.js; ember_create.js; ember_cockpit.js | Globe button → Browser / Documents / Notes | Notes reuse original editor; reader uses enabled scraping providers. External browser/native behavior is platform dependent. |
| Documents library and graph | ai_docs.js; ember_docs_lib.js; ember_graph.js | Paperclip / Docs control; Browser → Documents | Library dispatches ember-docs-changed; readers refresh on that window event. |
| Voice and read aloud | ember_voice.js; ember_native.js; app.js | Mic / Talk controls; reply speaker; Settings → Memory and Settings / Permissions | Browser/native services vary. Physical microphone and real Android speech services not tested. |
| Lyrics and player | ember_lyrics.js; ember_player.js; ember_music_ui.js; ai_music.js | Settings → Music & Tools → Open Music panel; chat lyrics request | Existing music services can be unavailable. Legacy drawer music events have no producers; polling remains authoritative. |
| Media generation bridge | ember_media.js; ember_mediaplus.js; ember_engines.js | + → Media & Music; Settings → Engine & Media Control | Existing Stability optional-key path retained; no paid generation performed in this release work. |
| Downloads | ember_downloads.js; ember_getmusic.js; tools/download-bridge.cjs | Chat music/video download request; native YouTube / configured local bridge | Requires existing platform tools. New adapter reports bridge status errors with fixed non-sensitive text. |
| Scraper and public-source extraction | ai_scraper.js; ai_agent.js; ember_keyless.js | + → Web & Scraping; Settings → Web Scraping; ask to read a public URL | Protected scraper remains untouched; no private-network fetching added. |
| Device plugins | ember_device.js; ember_native.js; android_patch/ | Settings → Device Tools / Permissions | Custom plugins registered in MainActivity; Android compilation and real device use not performed. |
| Projects | ember_projects.js; persona.js | Left drawer → Projects | Active project becomes next-turn persona context; diagnostics expose only revision counts, not project text. |
| Timers and pings | ember_tasks.js; ember_native.js; EmberPingWorker.kt | Chat timer commands; Settings → Permissions | Existing in-app scheduling retained; no background task enabled by this release operation. |

## Keyless definitions

All rows below belong to `www/ember_keyless.js`, exposed via chat task-family matching and + → Plugins → Media & Music. Forge is an existing preserved route, not a newly guaranteed keyless service. Speech-to-text is a device capability. JioSaavn is unofficial and OFF by default. Availability must be rechecked on the target device.

| Tool id | Implementation label | Task family | Group |
|---|---|---|---|
| `pdf` | PDF · pdfmake | pdf | Documents |
| `word` | Word · docx | word | Documents |
| `markdown` | Markdown | markdown | Documents |
| `grammar` | LanguageTool | grammar | Documents |
| `pollinations` | Pollinations | image | Images |
| `dicebear` | DiceBear | avatar,image | Images |
| `picsum` | Picsum | placeholder,image | Images |
| `qr` | QRServer | qr | Images |
| `robohash` | Robohash | avatar,image | Images |
| `tts` | StreamElements TTS | speech | Audio |
| `jiosaavn` | JioSaavn · unofficial | music | Audio |
| `itunes` | iTunes Search | music | Audio |
| `lyrics` | LRCLIB | lyrics | Audio |
| `piston` | Piston | code | Code & Data |
| `dummyjson` | DummyJSON | mock | Code & Data |
| `jina` | Jina Reader | scrape | Code & Data |
| `microlink` | Microlink | metadata | Code & Data |
| `ipify` | IPify | ip | Code & Data |
| `stt` | Speech-to-text | listen | Local |
| `structure` | Text structuring | structure | Local |
| `forge` | Forge · existing route | image | Images |


<!-- source: docs/FEATURES.md -->

## Features and real entry points

The following is the current implementation catalogue, not a guarantee that external services are online. Every row identifies code and a UI/chat entry point. Historical feature claims are retained as history only, never current promises.

| Feature | Implementation (under www unless stated) | UI entry point / trigger | Contract / limitation |
|---|---|---|---|
| Chat, persona and safety | app.js; persona.js; safety.js | Message box → Send; Settings → Memory and Settings | Routes through existing provider contracts and safety gates. No router/backend replaced. |
| Provider routing and keys | providers.js; ember_prov_ui.js; ember_prov_next.js | Providers button at chat footer; Settings → Providers | Existing optional credentials are retained. No new key, login or account added. |
| Automatic built-in capabilities | ember_builtins.js; ember_deliverables.js; ember_artifacts.js | + → Built-in engines; ask naturally in chat | Read-only inventory: PDF, DOCX, Markdown, HTML, code/JSON/CSV, SVG/PNG, colours/themes, charts, covers, layouts, tables, stats, callouts and image embedding. Chat authors content; bundled exporters render it. No output-plugin switches. |
| Plugins and abilities | ember_plugins.js; ember_plus.js; ember_keyless.js | + → Web & Scraping / Media & Music | EmberPlus.stateLine reads current abilities; keyless extends it at runtime. |
| Artifact cards and exports | ember_artifacts.js; ember_deliverables.js; EmberDevicePlugin.kt | Artifact card/viewer → Save PDF or Download | Existing local pdfmake/docx engines retained. Legacy capture exporter removed; all artifact saves use one save handler. Android ACTION_CREATE_DOCUMENT writes bytes after location selection; requires rebuilt APK and device verification. Browser downloads verified. |
| Live terminal and status | ember_command_center.js; ember_v104.js; ember_wiring.js | Live Terminal bar below chat; Settings → Open Command Centre | Command Centre handles runner events; versioned patch supplies tool/route logs; new adapters use fixed text, never event payloads. |
| Thought timeline | ember_timeline.js; ember_react.js; ember_steps.js | Active reply progress; saved thought card | Keyless explicitly writes timeline entries and emits agent notes. This is status/progress, not private model reasoning. |
| Memory / Knowledge Brain | store.js; ember_context.js; ember_github.js; ember_learn.js; ember_find.js | Settings → Memory and Settings; Command Centre → Connect; chat code questions | Read-first gates code answers. IndexedDB caches and configuration are not proof of fresh remote evidence. |
| GitHub discovery and queued sync | ember_cockpit.js; ember_workspace.js; ember_github.js; ember_repo_runner.js | Settings → Open Command Centre → Connect / Repos / Build | Discovery is read-only; staging and selected queue entries require explicit confirmation. Live push not tested. |
| Termux terminal | ember_term.js; ember_cockpit.js | Settings → Hacking → Termux | Inline cockpit terminal uses local ttyd WebSocket; tests use a local mock server. Host installation still required. |
| Browser and Notes | ember_browser.js; ember_create.js; ember_cockpit.js | Globe button → Browser / Documents / Notes | Notes reuse original editor; reader uses enabled scraping providers. External browser/native behavior is platform dependent. |
| Documents library and graph | ai_docs.js; ember_docs_lib.js; ember_graph.js | Paperclip / Docs control; Browser → Documents | Library dispatches ember-docs-changed; readers refresh on that window event. |
| Voice and read aloud | ember_voice.js; ember_native.js; app.js | Mic / Talk controls; reply speaker; Settings → Memory and Settings / Permissions | Browser/native services vary. Physical microphone and real Android speech services not tested. |
| Lyrics and player | ember_lyrics.js; ember_player.js; ember_music_ui.js; ai_music.js | Settings → Music & Tools → Open Music panel; chat lyrics request | Existing music services can be unavailable. Legacy drawer music events have no producers; polling remains authoritative. |
| Optional media connections | ember_media.js; ember_mediaplus.js; ember_keyless_media.js | + → Media & Music → Saved media | Stability is optional images only. Audio/video use a configurable keyless HTTP adapter; NO working anonymous default provider has been verified. Not an on-device music/video model. No live generation was performed. |
| Downloads | ember_downloads.js; ember_getmusic.js; tools/download-bridge.cjs | Chat music/video download request; native YouTube / configured local bridge | Requires existing platform tools. New adapter reports bridge status errors with fixed non-sensitive text. |
| Scraper and public-source extraction | ai_scraper.js; ai_agent.js; ember_keyless.js | + → Web & Scraping; Settings → Web Scraping; ask to read a public URL | Protected scraper remains untouched; no private-network fetching added. |
| Device plugins | ember_device.js; ember_native.js; android_patch/ | Settings → Device Tools / Permissions | Custom plugins registered in MainActivity; Android compilation and real device use not performed. |
| Projects | ember_projects.js; persona.js | Left drawer → Projects | Active project becomes next-turn persona context; diagnostics expose only revision counts, not project text. |
| Timers and pings | ember_tasks.js; ember_native.js; EmberPingWorker.kt | Chat timer commands; Settings → Permissions | Existing in-app scheduling retained; no background task enabled by this release operation. |

## Keyless definitions

All rows below belong to `www/ember_keyless.js`, exposed via chat task-family matching and + → Plugins → Media & Music. Forge is an existing preserved route, not a newly guaranteed keyless service. Speech-to-text is a device capability. JioSaavn is unofficial and OFF by default. Availability must be rechecked on the target device.

| Tool id | Implementation label | Task family | Group |
|---|---|---|---|
| `pdf` | PDF · pdfmake | pdf | Documents |
| `word` | Word · docx | word | Documents |
| `markdown` | Markdown | markdown | Documents |
| `grammar` | LanguageTool | grammar | Documents |
| `pollinations` | Pollinations | image | Images |
| `dicebear` | DiceBear | avatar,image | Images |
| `picsum` | Picsum | placeholder,image | Images |
| `qr` | QRServer | qr | Images |
| `robohash` | Robohash | avatar,image | Images |
| `tts` | StreamElements TTS | speech | Audio |
| `jiosaavn` | JioSaavn · unofficial | music | Audio |
| `itunes` | iTunes Search | music | Audio |
| `lyrics` | LRCLIB | lyrics | Audio |
| `piston` | Piston | code | Code & Data |
| `dummyjson` | DummyJSON | mock | Code & Data |
| `jina` | Jina Reader | scrape | Code & Data |
| `microlink` | Microlink | metadata | Code & Data |
| `ipify` | IPify | ip | Code & Data |
| `stt` | Speech-to-text | listen | Local |
| `structure` | Text structuring | structure | Local |
| `forge` | Forge · existing route | image | Images |


# Part 5 — Architecture


<!-- source: docs/ARCHITECTURE.md -->

## Architecture — actual 1.10.17 code

The entrypoint is `www/index.html`. Its original synchronous script and stylesheet order is preserved, with only `ember_wiring.js` appended after cockpit and keyless. The complete ordered list is in WIRING_MAP and ASSET_MANIFEST.json. Earlier modules export browser globals; later patches wrap selected methods rather than ES-module imports. These intentional wrappers are inventoried, not silently merged.

`store.js` owns `window.U` and `window.Store`. IndexedDB database `ember` v1 contains `convs` and `kv`; settings and optional provider configurations use localStorage. `providers.js` supplies `Prov`; `safety.js` and `persona.js` prepare safe next-turn context before `app.js` invokes the model path.

`ember_cockpit.js` moves original controls and retains their listeners in a flat settings scroll. It owns compatibility APIs `EmberHub` and `EmberMenu`; the obsolete controllers with those roles are archived, never loaded. The Command Centre uses the protected `ember_command_center.js`, GitHub and Repo Runner modules. The iframe/native browser, local ttyd bridge and optional download bridge are separate platform components, not services bundled by a browser-only ZIP.

`ember_keyless.js` adds local document export and enabled public adapters using existing APIs, a chooser and artifact cards. `EmberPlus.stateLine` is wrapped to include its current capabilities. `ember_wiring.js` is an additive subscriber with fixed non-sensitive messages, health booleans and counters only. No protected method implementation is changed.

## Security and offline boundaries

The service worker handles same-origin bundled GET assets only, with network-first/offline-fallback behavior unchanged. Version query strings are allowed for static assets; API/proxy and credential query paths are not newly cached. `repo-runner-template.cjs` and vendor files are intentional lazy dependencies and must not be added as executable browser script tags. No vendor library is merged or modified. A cold-start offline install before any successful service-worker installation remains impossible by design.

## Native components

Custom Capacitor plugins and their worker/service dependencies are mapped in ANDROID_PERMISSIONS.md. The supplied patch tree is not a built APK. `MainActivity.kt` explicitly calls itself a template guess; merging it into an existing Android app requires review because the patcher replaces MainActivity files.

## Unfinished acceptance

No versioned patch consolidation was attempted because an all-green behavioral baseline was not available. No assertion is made that static inventory proves every dynamic property, every platform-only listener or every chat tool invocation is reachable. Remaining evidence gaps and inherited failing tests are release blockers, listed in TESTING and NEEDS_APPROVAL.


# Part 6 — Data flow


<!-- source: docs/DATA_FLOW.md -->

## Data flow — 1.10.17

## Chat and routing

The message box in `index.html` calls handlers in `app.js`. Existing safety/persona gates, memory and optional Read-First GitHub prefetch run through `safety.js`, `persona.js`, `ember_context.js` and protected `ember_github.js`. The provider backend `providers.js` remains authoritative for ordinary model calls. Tool dispatch lives in `ai_agent.js`/`app.js`; the keyless adapter in `ember_keyless.js` intercepts supported intents and calls existing artifact/document interfaces rather than replacing the backend.

`ember-keyless` line reporting writes the same bounded safe status into `ember-terminal`, `EmberTimeline.step`/`.note` and `ember-agent-note`. `ember_command_center.js` listens to terminal, runner, download and routing events using its `on()` helper. `ember_v104.js` logs existing tools and routes. Existing timeline listeners handle tries, switches and notes. New wiring does not replay these streams or duplicate their artifact creation.

## Results and artifacts

Keyless results use artifact-card markup from `ember_artifacts.js`; local PDF/DOCX conversion uses `ember_deliverables.js` and lazy vendor loaders. Generated result blobs remain session-scoped; saving a PDF is an explicit action. GitHub exports use the existing artifact contract. Do not treat progress counters, endpoint-health booleans or cached repository blobs as a new answer artifact.

## New event adapters

`ember-apis-change` → Plugins menu summary refresh; `ember-keyless-health` → only a validated tool-id/boolean readiness snapshot; `ember-brain-pushed` → existing `ember-git-state` refresh and fixed timeline status; `ember-download-status` → fixed terminal and timeline failure status; document `ember-project-changed` → content-free revision count.

No new adapter persists or logs event.detail, arbitrary error strings, args, endpoint URLs, project content, commit identifiers or credentials. Synthetic sentinel tests prove that the new observer does not retain the supplied payload. This is not a blanket security certification of inherited backend logging paths.

## Native and local boundaries

Android events `ember-bg-reply`, `ember-bg-ready` and `ember-media-cmd` are produced by Kotlin WebView bridges and consumed by `app.js`. They are not missing web dispatchers. Termux uses local ttyd WebSocket, and the download bridge is an optional Node host service. Native permission prompts and actual endpoint uptime are outside the mocked browser evidence.

The full event registry records literal static sites and helper call sites. Computed names/arrays and external emitters are listed separately rather than invented. Four legacy inbound-only events currently have no bundled producer; see WIRING_MAP and NEEDS_APPROVAL.


# Part 7 — Memory


<!-- source: docs/MEMORY.md -->

## Storage and memory — actual code

`www/store.js` owns IndexedDB `ember` version 1 with object stores `convs` (keyPath `id`) and `kv` (keyPath `k`). If IndexedDB fails or is blocked, it falls back to in-memory Maps, which are not durable. `Store.all/get/put/del` operate on conversations; `Store.getKV/setKV/delKV` store module data by key. `ember_context.js`, `persona.js`, the document library, learning modules and GitHub use this shared API.

`U.LS` is the common guarded JSON localStorage adapter; individual modules also have guarded adapters. The STORAGE KEYS registry in WIRING_MAP records literal keys, dynamic key expressions, operations and ownership evidence. It does not collect actual browser storage values.

Existing optional credentials are present in the application design (provider keys, scraper keys, music service tokens and GitHub configuration). localStorage is not a secure credential vault; origin scripts can read it. Chat, notes, custom persona and imported documents can also contain user-pasted secrets. No new credential store was added and no user credentials were supplied during this work.

`EmberWiring.snapshot()` is volatile diagnostics only: event counts, validated keyless tool-id/health booleans and a project revision number. It contains no event payload or project text. Closing/reloading a page resets these diagnostics.

GitHub cached content and previous Last Read proof do not replace current protected Read-First checks. A code answer must meet the live evidence gate for its current turn. The runner's deliberate brain==output case avoids copying a repository into itself; non-brain source/output identity remains rejected.

Entry points: Settings → Memory and Settings; Browser → Documents/Notes; drawer → Projects; Settings → Command Centre → Connect. Relevant code is linked in FEATURES.md. Data export, clearing memory and existing privacy modes retain their original handlers.


# Part 8 — Providers and free-tier guide


<!-- source: docs/history/PROVIDER_GUIDE_1_10_51.txt -->

PROVIDER FREE-TIER GUIDE — RESEARCHED 2026-11-03
These are service offerings, not a report of your actual account balance. Provider dashboards
and live API errors remain authoritative. Listed allowances can change; no free guarantee is
inferred merely from a model name or a successful model-list call.

AI PROVIDERS
Gemini: free generation on eligible Flash/Flash-Lite and other listed models. Availability,
quotas and paid-only variants vary; generation and Google Search grounding have separate rules.
https://ai.google.dev/gemini-api/docs/pricing
https://ai.google.dev/gemini-api/docs/rate-limits
Groq: free-plan/model allowances; organization-wide rate limits. Extra keys are not extra quota.
https://console.groq.com/docs/rate-limits
Mistral: Free mode includes limited monthly API usage. Exact allowances are on your Limits page.
https://docs.mistral.ai/admin/billing-usage/usage-limits
Cohere: evaluation API keys are free but limited. The documented trial cap is 1,000 calls/month;
listed chat models generally have a 20 requests/minute trial limit. Production may be paid.
https://docs.cohere.com/docs/rate-limits
https://cohere.com/pricing
OpenRouter: free variants/zero-price text models available with account/model rate limits.
Auto uses verified zero-price text candidates. Explicit paid-model pins retain paid behavior.
Check /api/v1/key and provider dashboard for account counters; do not infer balance from errors.
https://openrouter.ai/docs/api_reference/limits
https://openrouter.ai/docs/guides/routing/routers/free-router
Plugsky: official free plan includes plugsky-micro and plugsky-lite. Plan/fair-use limits apply.
https://plugsky.com/articles/ai-api-for-professional-services-use-cases-security-and-deployment-options
https://plugsky.com/articles/free-ai-api
LongCat: account/model quota is not uniformly free. Current LongCat-2.5 pay-as-you-go and token
packs are paid products. Promotional/initial quota, when granted, is account-dependent.
https://longcat.chat/platform/docs/APIPayAsYouGo.html
https://longcat.chat/platform/docs/change-log
Claude/Anthropic: metered API. Trial or subscriber/API credits are conditional and account-linked,
not a blanket unlimited free API entitlement. Ember retains explicit pin-only usage.
https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
Stability: image/media API, not a chat model provider. Limited new-account credits are advertised;
after they are consumed, generation requires credits. No recurring unlimited free inference.
https://docs.stability.ai/pricing

SEARCH / SCRAPING PROVIDERS ALREADY WIRED IN YOUR PROJECT
Firecrawl: official free plan currently advertises recurring free credits. Check billing dashboard.
https://www.firecrawl.dev/pricing
Browserless: official free plan advertises limited monthly browser units, not unlimited scraping.
https://www.browserless.io/pricing
ScraperAPI: official FAQ documents a free monthly credit plan; signup trial credits are separate.
https://docs.scraperapi.com/resources/faq/plans-and-billing
ScrapingBee: signup trial credits; do not treat a trial as recurring free monthly capacity.
https://www.scrapingbee.com/pricing/
ZenRows: official current pricing advertises a recurring free-credit plan; feature multipliers apply.
https://docs.zenrows.com/first-steps/pricing
Tavily: free Researcher allowance, documented as 1,000 API credits/month; endpoints consume
credits differently. Tavily search and extract use the existing shared key in this project.
https://www.tavily.com/pricing
https://docs.tavily.com/documentation/api-credits
SerpApi: free search plan available; monthly search allowance and throughput limits apply.
https://serpapi.com/pricing
Bright Data: official free-tier documentation describes credits usable across supported APIs.
Products can also require the correct zone/product setup; having a key alone is insufficient.
https://docs.brightdata.com/general/account/billing-and-pricing/free-tier
Sting: this app treats Sting as a configurable HTTPS endpoint, not a verified specific vendor.
No independent free tier was established. Supply the endpoint and follow that vendor's terms.
Octoparse: the app reads a configured task's data via API, not arbitrary page scraping. This
research did not establish free API entitlement; check the task/account plan before use.
Free reader routes: direct fetch, r.jina.ai and allorigins are keyless fallbacks, not guaranteed
services. Browser CORS, origin blocking, third-party uptime and site access rules still apply.

STATUS HONESTY
Catalog reachable = a model list was retrieved. It does not prove authentication on a public
catalog, generation permission, remaining credit or remaining quota. A successful user chat
is stronger evidence. This release does not probe arbitrary third-party keys or send private
credentials to lookup websites. All provider guides link only to public documentation.


# Part 9 — Android build and permissions


<!-- source: docs/ANDROID_BUILD.md -->

## Android build (V1.5.1)

*For the person building the APK.*

## How the APK is built

`.github/workflows/build.yml` runs on every push to `main` and on manual dispatch:

1. `npm install` (Capacitor 6, keep-awake, speech-recognition).
2. `npx cap add android` (skipped quietly if `android/` already exists).
3. `python3 scripts/apply_android_patch.py android android_patch` copies the Kotlin plugins, merges the manifest, enables Kotlin in Gradle and adds release signing. It exits non-zero if a permission is missing, so a bad build never ships.
4. `npx cap sync android`.
5. Android SDK 34 install, keystore decode, `./gradlew assembleRelease`, upload `signed-app`.

## GitHub secrets required (Settings > Secrets and variables > Actions)

| Secret | Meaning |
|---|---|
| `KEYSTORE_BASE64` | your release keystore, base64 encoded (`base64 -w0 release.keystore`) |
| `KEYSTORE_PASSWORD` | keystore password |
| `KEY_ALIAS` | key alias inside the keystore |
| `KEY_PASSWORD` | optional; defaults to `KEYSTORE_PASSWORD` |

## Plugin versions must match Capacitor 6

Every Capacitor plugin declares a peer range on `@capacitor/core`. On Capacitor 6.2.x use `keep-awake` ^5.0.0 and `speech-recognition` ^6.0.1. `keep-awake` 7.x needs Capacitor 7 and makes `npm install` fail with ERESOLVE. Do not "fix" that with `--force` or `--legacy-peer-deps`; pin the plugin instead.

## Java version

Capacitor 6 ships Gradle 8.2.x, which does not run on Java 21. CI uses Temurin 17. If you move to Capacitor 7, move to Java 21 at the same time.

## Device checklist (do this on the phone after installing)

1. Settings > Permissions > tap **Microphone** and **Notifications**: both should say granted.
2. Tap the mic in chat, say a sentence: text appears live; tap again to stop.
3. Tap a reply's speaker button: it reads aloud.
4. Background the app during a reply: a notification with a Reply box appears.
5. Turn on Music Control and allow audio access: the on-device library loads.

If step 2 says "No speech service on this phone", install or enable the Google app / Speech Services from the Play Store.

## Honest status

The Kotlin plugins and the patch script have been checked for structure and idempotency, but not compiled against the real Android toolchain in the environment that wrote them. The first CI run is the real test; read its log if it fails.


<!-- source: docs/ANDROID_PERMISSIONS.md -->

## Android bridge and permissions — 1.10.17 source audit

This is a static audit plus local patcher-fixture test, not an Android compilation or device test. No complete `android/` Gradle project was supplied. All six custom plugins have `registerPlugin(...)` calls in the supplied `MainActivity.kt` and matching JavaScript references. Workers, sessions, services and receivers are dependencies, not Capacitor plugins; registering every Kotlin class as a plugin would be wrong.

| Native source | Registration / dependency | JavaScript caller evidence | UI entry point |
|---|---|---|---|
| DownloadWorker.kt | Native dependency: EmberYoutubePlugin.kt | Indirect via the registered plugin / native event bridge | Music & Tools / chat download |
| EmberAiPlugin.kt | MainActivity.registerPlugin(EmberAiPlugin); bridge EmberAi | ember_native.js | Chat / Settings → Permissions |
| EmberAiWorker.kt | Native dependency: EmberAiPlugin.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |
| EmberDevicePlugin.kt | MainActivity.registerPlugin(EmberDevicePlugin); bridge EmberDevice | ember_native.js, ember_device.js | Settings → Device Tools / Permissions |
| EmberKeepAliveService.kt | Native dependency: EmberNotifyPlugin.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |
| EmberMediaPlugin.kt | MainActivity.registerPlugin(EmberMediaPlugin); bridge EmberMedia | ai_agent.js, ember_mediaplus.js, ember_native.js, ember_v104.js, ember_keyless.js, app.js, ember_features.js, ember_plus.js, ember_media.js | Music & Tools / chat download |
| EmberMediaSession.kt | Native dependency: EmberMediaPlugin.kt | Indirect via the registered plugin / native event bridge | Music & Tools / chat download |
| EmberNotifyPlugin.kt | MainActivity.registerPlugin(EmberNotifyPlugin); bridge EmberNotify | ember_native.js | Chat / Settings → Permissions |
| EmberPingWorker.kt | Native dependency: EmberNotifyPlugin.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |
| EmberRouteHealth.kt | Native dependency: EmberPingWorker.kt, EmberAiWorker.kt, EmberAiPlugin.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |
| EmberWebPlugin.kt | MainActivity.registerPlugin(EmberWebPlugin); bridge EmberWeb | ember_native.js | Globe → Browser |
| EmberYoutubePlugin.kt | MainActivity.registerPlugin(EmberYoutubePlugin); bridge EmberYoutube | ai_agent.js, ember_downloads.js, app.js, ember_getmusic.js | Music & Tools / chat download |
| EmberYtCore.kt | Native dependency: EmberYoutubePlugin.kt, DownloadWorker.kt | Indirect via the registered plugin / native event bridge | Music & Tools / chat download |
| MainActivity.kt | Capacitor BridgeActivity; not a plugin | app.js (native event consumer) | Chat / Settings → Permissions |
| ReplyReceiver.kt | Native dependency: EmberNotifyPlugin.kt, EmberAiWorker.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |

## Permissions actually inserted by the patcher

| Permission | Purpose / entry point | Prompt class |
|---|---|---|
| `android.permission.INTERNET` | Remote chat, scraping, media and WebView traffic | normal |
| `android.permission.RECORD_AUDIO` | Mic / speech input | runtime |
| `android.permission.CAMERA` | Existing camera/vision file chooser | runtime/platform-dependent |
| `android.permission.MODIFY_AUDIO_SETTINGS` | Audio/microphone configuration | normal |
| `android.permission.POST_NOTIFICATIONS` | Replies, pings and media notifications | runtime on Android 13+ |
| `android.permission.READ_MEDIA_AUDIO` | Device music library | runtime on Android 13+ |
| `android.permission.READ_EXTERNAL_STORAGE` | Older device music library; maxSdkVersion=32 | runtime on older versions |
| `android.permission.FOREGROUND_SERVICE` | Foreground service base | normal |
| `android.permission.FOREGROUND_SERVICE_SPECIAL_USE` | Keep-alive service declared specialUse | normal/policy-sensitive |
| `android.permission.FOREGROUND_SERVICE_DATA_SYNC` | WorkManager download foreground service | normal |
| `android.permission.WAKE_LOCK` | Existing work / keep-awake handling | normal |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | User-requested battery exemption | special settings flow |
| `android.permission.ACCESS_NETWORK_STATE` | Device network type / VPN information | normal |
| `android.permission.ACCESS_WIFI_STATE` | Device Wi-Fi information | normal |
| `android.permission.ACCESS_FINE_LOCATION` | Optional Show Wi-Fi name path | runtime; not continuous location tracking |

No contacts, SMS, call-log or accessibility permission is inserted by this patcher. The previous documentation's assertion that camera/location were not requested contradicted the code; it has been corrected. No new runtime permission was added to the patch script.

## Manifest and worker/service reconciliation

`ReplyReceiver` is declared non-exported. `EmberKeepAliveService` is non-exported with specialUse and a subtype property. `androidx.work.impl.foreground.SystemForegroundService` is merged as dataSync; WorkManager schedules `EmberAiWorker`, `EmberPingWorker` and `DownloadWorker` rather than requiring direct manifest declarations for them. The original reference additions omitted DATA_SYNC permission and the WorkManager service even though `scripts/apply_android_patch.py` already inserts both; the reference has now been synchronized, including its tools-namespace note.

Queries include com.termux, Android RecognitionService, RECOGNIZE_SPEECH and TTS_SERVICE. The patcher adds loopback-only cleartext network-security configuration for ttyd, Kotlin/WorkManager/NewPipe/OkHttp/desugaring support, icon resources and versionCode/versionName from package.json.

## Build and migration warning

Run `npm ci --legacy-peer-deps`, `npx cap add android` if needed, `npx cap sync android`, then the patch command only after reviewing the destination project. The supplied patcher deletes/replaces any MainActivity templates; do not run it blindly against a customized MainActivity. This existing destructive behavior is flagged for approval, not changed here. Kotlin API compatibility, Android 14 foreground-service policy, microphone use, battery management and real notifications remain unverified on hardware.


# Part 10 — Termux panel


<!-- source: docs/TERMUX_PANEL.md -->

## EMBER TERMUX panel (V1.6.7)

Settings > Hacking > bottom panel. Bridge: `ttyd` in your own Termux, plain bash, loopback only.

## First run
1. Setup tab > Copy command, paste in Termux, leave it running:
   `termux-wake-lock; pkg install -y ttyd && ttyd -i lo -p 7682 -b /<private path> -W /data/data/com.termux/files/usr/bin/bash`
2. Tap Connect. The light turns green. It reconnects on its own if Termux restarts (re-run the command).

## Notes
- The private path is random per install; "New private path" rotates it. Port 7682 so it never clashes with Prodigy (7681).
- If Termux is running and Connect always fails, Android may be blocking `ws://127.0.0.1` from the https app page. Fix: `"allowMixedContent": true` under `android` in capacitor.config.json, `npx cap sync`, rebuild.
- Ask Ember sends the last 60 terminal lines (keys/passwords masked) to your AI engine when 👁 is on. Turn it off to send only your question.
- Open Termux needs the new APK (EmberDevicePlugin.openApp and the `<queries>` package line in AndroidManifest.additions.xml).

## V1.9.8
- The panel starts as a bar. Tap ▴ to open it. A command line under the screen runs real commands; A−/A+ change the text size.
- Open Termux folds the panel by itself and it stays folded when you come back.


# Part 11 — Safety, crisis protocol, privacy, threat model


<!-- source: docs/SAFETY.md -->

## Safety layer · V1.4.0

*For reviewers and contributors.*

All of it lives in `www/safety.js`. It is instant, offline and has no AI call, so it works when every engine is down. It reads the person's latest message only. For what the person actually sees in a crisis, see [CRISIS_PROTOCOL.md](CRISIS_PROTOCOL.md). For what it cannot do, see [LIMITATIONS.md](LIMITATIONS.md).

## What `Safety.detect(text)` does

1. Normalises the text: curly apostrophes (`’`) become `'` (Android keyboards produce them), and whitespace is collapsed.
2. **Removes idioms** (the guard list below) from the text.
3. Tests the result, strongest level first, and returns `{ level, signals }`.

| Level | Meaning | What matches | What happens |
|---|---|---|---|
| 0 | Nothing found | none | Nothing changes |
| 1 | Heavy distress, no self-harm wording | hopeless, worthless, can't go on, breaking down, falling apart, exhausted / drained / done / sick of everything / life / it all, hate myself, can't do this anymore, can't take it anymore, panic attack, spiralling, overwhelmed | `SOFT_BLOCK` is appended to the system prompt. Lane and directives are unchanged |
| 2 | Self-harm or suicide ideation | want / wanna / going to / thinking about + die, end it, end my life, kill myself; suicide, suicidal, self-harm, hurt or cut myself, kms; don't want to be here / exist / live / be alive; no reason or point to live; wish I was dead; better off dead; nobody would miss me; end it all; end everything; final goodbye | Kill switch, crisis block, local crisis card, red dot, no learning |
| 3 | Ideation **plus** a plan, means or timing in the same message, or a goodbye phrase on its own | ideation plus "I have a plan / pills / rope / gun / knife / razor", tonight, right now, tomorrow, this evening or weekend, ready to go; or "goodbye forever", "this is my last message", "wrote my note" | Handled **identically to level 2** in V1.3.0. The distinction is recorded in `signals` for future use |

Means and timing words ("I have a plan for the weekend", "I have a knife set") do nothing on their own. They only raise level 2 to 3.

## The idiom guard

Phrases that look alarming but are everyday speech are **cut out of the text before matching**. They are not a whole-message pass. A message like "dying laughing, but honestly I want to die" still reaches level 2 on its second half.

The list: `dying laughing / to see / to try / to know / to meet / to go`, `kill(ing) it / time`, `dead tired / serious / slow / funny`, `scared / bored / frightened to death`, `die of laughter / embarrassment / boredom`, `killing me softly / with`, `kill for a/some/an <word>`, and `my / the phone / battery / laptop is dying / dead`.

It exists because a crisis block fired on "I'm dying laughing" teaches the person to stop talking naturally, which makes the app worse at the one moment it matters.

## What `wrapSystem` appends

Level 0 returns the prompt unchanged. Level 1 appends `SOFT_BLOCK`:

> TONE OVERRIDE: he is hurting. No jokes, no cleverness, no thought experiments, no character flavour. Steady and warm. Short sentences.

Levels 2 and 3 append `CRISIS_BLOCK`:

> CRISIS MODE. He may be in real danger. Drop every bit, joke, thought experiment and all cleverness. No character flavour. Be steady and warm. Say you care. Do not diagnose, do not give advice, do not moralise, do not use bullet points. Say plainly that this is bigger than a chat and he needs a real person now. Give these numbers exactly: SADAG suicide crisis line 0800 567 567. Lifeline South Africa 0861 322 322. From a mobile, emergency services 112. Stay with him in the conversation. Ask one short grounding question. Never leave him hanging.

At level 2 and above, `respond` also forces the deep lane, drops any directive, and skips the anti-echo rewrite, so the model's crisis wording is never rewritten away.

## The crisis card

`Safety.crisisCard()` returns static HTML with three `tel:` links (SADAG 0800 567 567, Lifeline SA 0861 322 322, emergency 112) and **no user text**. It is hardcoded for three reasons:

- It must appear when every AI engine is down, rate-limited or slow. It is drawn the moment the message is sent, before any engine answers.
- A fetched or model-written card could be late, wrong or missing. The numbers should never depend on a model.
- Static markup with no user text cannot carry an injection.

## The flag is transient. Do not persist it.

The level lives in one integer inside `safety.js` (`Safety.mark`, `Safety.lastLevel`). It **must not** be written to `conv`, `mem`, `ember_set`, a backup file, or any other storage. A crisis marker saved to disk turns a private moment into a permanent record that is copied into every export. It is reset by "New chat", by opening an old chat, and by the next message that scores below level 2. A reload resets it to 0.

The repo audits this in CI: a `conv.flagged` field is a build failure (see `.gitlab-ci.yml`).

What *is* stored, and is a separate privacy fact: the message text itself is saved in the chat like any other message, and the first message of a chat becomes its title. See [PRIVACY.md](PRIVACY.md).

## Extending the level lists

A change to any list needs, in this order:

1. A written case: the phrase, its intended level, and why.
2. A test in `tests/safety-test.js` for the new phrase, plus tests for the everyday phrases it might wrongly catch.
3. A false-positive review: run the whole table, and read the new pattern against ordinary speech (cooking, gaming, work, jokes, relationships).
4. An update to the level table above.

Prefer over-triggering at level 2 to under-triggering, but remember a false alarm also costs the person's trust. Never loosen a pattern to fix a false positive without adding the missed phrase as a test.


<!-- source: docs/CRISIS_PROTOCOL.md -->

## Crisis protocol · V1.4.0

*For maintainers.*

This is what the app does when `Safety.detect` scores a message level 2 or 3, and what a maintainer should do when it did not work. It describes behaviour. It is not a promise that anyone is kept safe. See [SAFETY.md](SAFETY.md) for the detection rules and [LIMITATIONS.md](LIMITATIONS.md) for what is missed.

## Level 2 (self-harm or suicide ideation)

In this order, on send:

1. `app.js send()` marks the level. The **crisis card** and the red **support dot** are drawn at once, before any engine answers.
2. `Persona.respond` re-checks the message, then forces the **deep lane**, discards any **directive**, and skips the **anti-echo rewrite**.
3. The system prompt gets the **crisis block** appended last: steady and warm, no jokes, no diagnosis, no advice, say plainly it is bigger than a chat, give the numbers, ask one grounding question, stay in the conversation.
4. The reply is shown. The card stays under it.
5. `after()` **does not learn** from this chat, now or for the next 14 messages.

The card and dot clear on "New chat", on opening another chat, or on the next message that scores below level 2. A page reload clears them.

## Level 3 (plan, means or timing, or a goodbye)

The same as level 2. In V1.3.0 there is no extra behaviour at level 3. The signal is only recorded.

## Level 1 (heavy distress)

No card, no dot. The tone override is appended: no jokes, no cleverness, steady and warm. Lane and directives are unchanged.

## The numbers shown

| Service | Number |
|---|---|
| SADAG suicide crisis line | 0800 567 567 |
| Lifeline South Africa | 0861 322 322 |
| Emergency services, from a mobile | 112 |

They are hardcoded in `Safety.crisisCard()` and the crisis block, in the card, as `tel:` links. A draft of this release listed "Emergency 10111"; the code uses 112 because 10111 is the police line, not a general emergency number. Review these numbers before every release (see the date in [LIMITATIONS.md](LIMITATIONS.md)).

## If a user reports the card did not appear

Do not ask for the person's transcript. Ask what they typed only if they volunteer it, and treat it as private.

1. **Was the message a miss?** Check it against the patterns by running it through `Safety.detect`. If it scores 0 or 1, this is a detection gap, not a rendering fault. Follow the "add a Safety pattern" steps in [CONTRIBUTING.md](CONTRIBUTING.md).
2. **Was the card cleared?** A later message below level 2, "New chat", opening another chat or a reload clears it. This is by design, and the question of making it last longer is open.
3. **Is `safety.js` loading?** It must be in `index.html` before `persona.js` and listed in `sw.js`. A stale service-worker cache is possible after an update; the cache name changes with each version.
4. **Was the message sent?** The card is drawn on send from `app.js`. If the chat is blocked (busy state), nothing was sent.
5. Record the finding in [CHANGELOG.md](CHANGELOG.md) without including the person's words.

## What NOT to do

- **Do not describe the app as a safety net**, a monitoring tool, or a substitute for a crisis line or a professional.
- **Do not add a "report this user" feature or any alerting.** There is no server and no authority behind the app, so a report would go nowhere and would break the privacy promise.
- **Do not store the crisis level or log crisis messages**, even for debugging.
- **Do not send the person's text anywhere** to improve detection.
- **Do not shorten the card or hide the numbers behind a tap** to make the UI tidier.


<!-- source: docs/PRIVACY.md -->

## Privacy · V1.4.0

*For users and reviewers.*

Ember has no server and no account. Everything it stores stays on the person's device. The person is the controller of their own data. Under POPIA (South Africa) and GDPR terms, the maintainer does not receive, hold or process the person's data. The third-party AI services the person chooses do (see below).

## Stored on the device

**localStorage**

| Key | Contents |
|---|---|
| `ember_set` | Settings: their name, the "About you" text, Ember's name and curiosities, style choices, the Persona box text, mode, context size, accent colour, Free Mode choice |
| `ember_keys` | API keys for Groq, Mistral and Gemini, with the last health-check result. Stored in plain text on the device |
| `ember_models` | Cached lists of model names from each provider (12 hours) |
| `ember_voice` | Ember Voice choices: engine, voice, and the EasyVoice key if one was pasted (plain text on the device). Cleared by Wipe |
| `ember_voice_gm` | Which Gemini speech model last worked |

**IndexedDB** (database `ember`, version 1)

| Store | Contents |
|---|---|
| `convs` | Every chat: messages, title, short summary, rolling summary, private flag |
| `kv` | One record, key `mem`: Core Memory (see [MEMORY.md](MEMORY.md)) |

**Cache Storage**: `ember-v1.4.0` holds the app's own files for offline use. No chat content.

If the browser blocks IndexedDB, chats and memory live in memory only and are lost on reload.

## What leaves the device

Nothing leaves except calls to the AI provider that answers.

| Call | What is sent | To |
|---|---|---|
| Every reply | The system prompt (character rules, the "About you" text, Core Memory facts and threads, the Persona box, the rolling summary) plus the recent messages, up to 5, 15 or 50 depending on the setting | The engine that answers (Groq, Mistral, Gemini or Pollinations) |
| Memory learning, titles, rolling summaries | The last 14 messages (memory) or older messages (summary) | A key-based engine only. Never Pollinations |
| Key checks and model lists | The key itself, as the provider's own credential | That key's own provider |
| Reading a reply aloud with Ember Voice | The text of that one reply (links and code removed) plus a short tone instruction. Only when the Gemini or ElevenLabs voice is selected; "Phone voice only" sends nothing | Google (Gemini speech, with the Gemini key) or ElevenLabs (with its key) |
| Lyrics preview | Title, artist, album and length of the song that is playing. Only while Settings > Music > Lyrics preview is on | lrclib.net (no key, no account) |
| Key extraction from pasted notes | Nothing, except: each unlabeled 32-character string that passes the filters is tried as a Mistral key, so it is sent to `api.mistral.ai` as a credential | Mistral |

The pasted notes themselves are never sent anywhere and never saved. They are parsed locally.

### Free Mode

Free Mode sends the chat to **Pollinations.ai** (`text.pollinations.ai`), a free third-party service with no uptime promise, no privacy commitment this project can vouch for, and anonymous rate limits. It is on by default while there are no keys. In its fallback route the app builds a short URL from the last four messages (400 characters each) plus a fixed line of safety wording, so message text appears in the request URL. Free Mode is never used for background memory work, so Free Mode chats are not learned from.

## Never stored, by design

- **A crisis flag.** The safety level is a JS variable. It is not in any chat, memory, setting or backup. See [SAFETY.md](SAFETY.md).
- **Health details, how the person copes, crises, secrets, passwords and API keys in Core Memory.** The memory extractor is told never to record them, and a filter drops lines that look like secrets. The model can still get this wrong, so the filter is a net, not a guarantee.
- **Learning from private chats.** A chat marked 🔒 Private is never learned from.
- **Learning from a crisis.** Learning stops while any of the last 14 messages is level 2 or higher.

## Stored anyway, and worth knowing

- The **text of every message** is saved in the chat, including a message that triggered the crisis card.
- The **first message of a chat becomes its title** (cut to 38 characters), which shows in the history list and is searchable. The memory extractor may rename it, but a crisis chat is not learned from, so the first-message title stays.
- The **rolling summary** is written by a model that is told to leave out health details. Nothing enforces that.
- Anyone with the unlocked phone can open the app and read it. There is no app lock in V1.3.0.

## Export, import and delete

**Export** writes one JSON file: the settings (`ember_set`, including the About text and Persona box), Core Memory, every chat, and, only if the person ticks "Include keys in backup", the API keys. A backup without keys still holds the person's whole chat history. Treat it as private. It contains no crisis flag.

**Import** adds chats (same id: replaced), merges memory lines without duplicates, and **replaces the settings** with the backup's. Imported memory lines are not run through the secret filter.

**Delete everything** (Settings > Your data) clears every chat and memory record, removes `ember_set`, `ember_keys` and `ember_models`, and reloads. It does not delete files the person already exported, or anything a provider kept.

## Third parties

Each provider has its own terms and retention. This project controls none of them. See [LICENSE_NOTES.md](LICENSE_NOTES.md) and [LIMITATIONS.md](LIMITATIONS.md).

## V1.5.8 · Proactive AI pings and music notification

- **Proactive AI pings (off by default).** When switched on, the app stores your Groq key and up to 600 characters of open-thread topics in the app's private Android SharedPreferences (`EmberPrefs`) so a background task can run while the app is closed. Every few hours the task sends those topics to Groq (api.groq.com) and shows the one-line reply as a notification. Switching pings off cancels the task and deletes the key and topics from that store. The lock screen shows only a generic line.
- **Music notification.** Track title and artist from Ember's own player are shown in the Android notification and lock screen. Nothing is sent anywhere.

## V1.5.9 · Background replies

When "Keep replying in the background" is on and you leave Ember mid-reply, the request (system prompt, recent messages, and the API keys of the engines to try) is written to a file in the app's private storage (`files/ember_bg/`) and run by a background task. The file is deleted as soon as the task finishes or is cancelled. The finished reply is kept in private SharedPreferences (`EmberBg`) until the page collects it. The request goes only to the same engine providers the app would have used. The notification's lock-screen version only says "New reply".

## V1.6.0 · Agent & API tools

- **Web Search (Tavily, with DuckDuckGo as the fallback):** when on, the words the AI searches for are sent to Tavily (`api.tavily.com`) with your Tavily key. If you have no Tavily key, or Tavily fails, the same words are sent to DuckDuckGo (`api.duckduckgo.com`) instead, with no key and no account. Results come back into the chat. The key is stored in this phone's `localStorage` (`ember_agent`) and is not included in backups.
- **YouTube:** searching and downloading go from the phone straight to YouTube/Google servers, like any browser or app would. Nothing goes through an Ember server. The last download's title and result are kept in the app's private storage. Saved audio lands in `Music/Ember`, where other music apps can see it.
- **Vision:** the image link you paste (and your question about it) is sent to Pollinations (`text.pollinations.ai`), which fetches the picture. Leave it off for private images.
- Search results and image descriptions are passed to whichever chat engine answers (including Free Mode), like other tool results.

## V1.6.5 · Song info lookups

When a song plays in the Music panel, Ember looks up artwork, album, year and a short bio. The song **title and artist name** (never audio, never the library) are sent to `api.deezer.com` (Deezer), `musicbrainz.org` (MusicBrainz) and `en.wikipedia.org` / `www.wikidata.org` (the page MusicBrainz links to). Embedded tags and cover art in an MP3 are read on the phone. Results are cached in localStorage (`ember_meta2`, up to 150 songs). The `get_current_track` tool gives the AI the same artwork link and About text.

## V1.6.6 · Device panel

- Wi-Fi, VPN, RAM, storage, uptime and battery readings are read on the phone and shown on screen only. They are not stored and not sent anywhere.
- **Public IP area:** while a VPN is detected, or when the person taps "Look up my public IP area", the app requests `https://ipwho.is/`, which sees the phone's public IP address. The result (city, region, country, provider) is shown and kept in memory for 5 minutes.
- **Permissions added:** `ACCESS_NETWORK_STATE` and `ACCESS_WIFI_STATE` (normal, no prompt) and `ACCESS_FINE_LOCATION`, which is requested only when the person taps "Show Wi-Fi name". Android will not reveal a Wi-Fi network's name without it. Ember does not read the phone's location.
- Added quotes are stored in localStorage (`ember_quotes`) and are not included in backups.
- The rotating quotes are short credited excerpts from public interviews, not lyrics.


## Song identification (Audd.io, optional)
Off until you paste an Audd.io API token (stored on the phone as `ember_audd`, removed by Remove token or Delete everything). Only when you tap Identify, press Identify link, or ask Ember in chat, a clip of about 12 seconds of the song (small WAV) or the https link you typed is sent to `api.audd.io` with your token. Audd.io's own terms and retention apply.


<!-- source: docs/THREAT_MODEL.md -->

## Threat model · V1.4.0

*For reviewers.*

Scope: a client-only app with no server. The assets are the person's chat history, their API keys, and the quality of Ember's response when the person is in danger. Residual risk is stated plainly; "none" is never claimed.

| Threat | Mitigation | Residual risk |
|---|---|---|
| **Prompt injection through pasted notes** | Pasted notes are parsed locally by regex for key shapes and never sent to any model or saved. Only candidate keys are extracted | Low. A pasted 32-character string that is not a Mistral key is still sent once to Mistral as a credential during the test |
| **Prompt injection through chat text, the About or Persona boxes, or learned memory lines** | The HARD RULES sit first and a FINAL CHECK closes the prompt. Memory lines are cut to 140 characters and run through a secret filter. The crisis block is appended last | Medium. A model can still follow hostile text. A learned line can carry a hostile instruction into later prompts |
| **Key exfiltration via backup export** | Keys are left out of the export unless the person ticks the switch. The toast warns when they are included | Medium. A backup with keys is a plain-text file. The app cannot control where the person saves or shares it. Keys are also plain text in localStorage |
| **Model produces medical or clinical advice** | The prompt forbids advice and diagnosis, and calls Ember "not a therapist". The crisis block repeats it | Medium. Behaviour depends on the provider's model and can drift. Nothing checks the output |
| **Crisis message missed by `Safety.detect` (false negative)** | Broad level 2 lists, curly-apostrophe handling, prompt rule 10 as a second layer, and the crisis wording written for the model | **High, and unavoidable with regex.** Indirect, sarcastic, coded, slang or non-English wording is missed. Only the latest message is read, so a crisis followed by "ok" returns to normal tone next turn |
| **False positive that triggers crisis mode** | Idiom guard; means and timing count only next to ideation; tests for everyday phrases | Low to medium. "I don't want to live in this city" style phrases can still trip a level 2 match, and "I'm not suicidal" scores as level 2. The cost is a card the person did not need, and the safe side was chosen on purpose |
| **False positive that mutes features** | Level 1 changes tone only. Level 2 and above drops Spark / Go deeper for that one turn | Low. Level resets on the next message that scores below 2 |
| **Old save missing new memory keys** | `migrateMem` fills every key from `MEM_DEF` and keeps facts, threads and any extra keys. It runs on load, on clear and on import | Low. Only the memory object is versioned. Chat and settings objects have no migration |
| **Backup import overwriting existing data** | Memory is merged, not replaced, with duplicates skipped. Chats with the same id are replaced after a confirm dialog | Medium. Settings are replaced wholesale. Imported memory lines skip the secret filter. A crafted backup can inject settings (including the Persona text) and memory lines |
| **Third-party provider logs chat content** | The person chooses the provider. Free Mode shows a warning and a badge. Background jobs never use Pollinations | **High and outside our control.** Every reply sends the system prompt and recent messages to the provider. Retention is the provider's policy |
| **Free Mode GET fallback loses the safety wording** | The local crisis card still shows | Medium. In that route the app sends a fixed short prompt instead of the full system prompt, so the crisis block and numbers are not sent. See [LIMITATIONS.md](LIMITATIONS.md) |
| **Device theft or an unlocked phone** | None in the app. No lock, no encryption at rest | **High.** Anyone holding the unlocked phone can read the chats and the keys. Crisis chat titles are visible in the history list |
| **Crisis text reaching memory or summaries** | Learning is skipped for 14 messages after a level 2 or 3 message; extractor prompt bans crises | Medium. The rolling summary is not gated on the safety level |
| **Crisis flag leaking into a backup** | The flag is a JS integer and is never stored. CI fails on `conv.flagged` | Low. Possible regression if a future change persists it |
| **XSS from stored text** | Messages go through `esc()` before rendering. The crisis card has no user text | Low |

Out of scope: a compromised device or browser, a malicious browser extension, attacks on the providers.


# Part 12 — Testing


<!-- source: docs/TESTING.md -->

## Testing — 1.10.17 actual results

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


<!-- source: docs/REVIEW_CHECKLIST.md -->

## Review checklist · V1.4.0

*For reviewers.* Tick each box against the code, not against these docs.

- [ ] `safety.js` is loaded before `persona.js` in `index.html`, and is listed in `sw.js`
- [ ] `Safety.detect` is called before `buildSystem` in `Persona.respond`
- [ ] `killSwitch` forces the deep lane, nulls the directive, and skips the anti-echo rewrite
- [ ] `wrapSystem` wraps the final system prompt (after `buildSystem`)
- [ ] `after()` returns at level 2 or higher, and when a level 2+ message is in the last 14
- [ ] No `flagged` field exists: `grep -rn "flagged" www tests` returns nothing
- [ ] The safety level is not written to `conv`, `mem`, `ember_set` or the export
- [ ] `MEM_DEF` and `migrateMem` are used in `init`, "Clear memory" and import
- [ ] An old `{facts, threads}` save loads with all facts and threads intact
- [ ] The crisis card is static markup with no fetch, no delay and no user text
- [ ] The card is drawn on send, before any engine answers, and survives `renderLog`
- [ ] Card and dot reset on "New chat" and when opening an old chat
- [ ] The numbers (0800 567 567, 0861 322 322, 112) match in `crisisCard()` and `CRISIS_BLOCK`, and are re-checked
- [ ] The footer version in `index.html` reads V1.4.0, matching `package.json` and `sw.js`
- [ ] `node --check` passes on every `.js` file
- [ ] `node tests/safety-test.js` passes
- [ ] `.gitlab-ci.yml` has no secrets and the `audit` job passes
- [ ] `LICENSE_NOTES.md` TBDs are resolved before the repo goes public


# Part 13 — Limitations and items needing approval


<!-- source: docs/LIMITATIONS.md -->

## Limitations · V1.4.0

*For everyone, including reviewers and users.*

## What Ember is not

Ember is **not a therapist**, **not a crisis line**, and **not a medical device**. It cannot call anyone, alert anyone, check on anyone, or know whether a person is safe.

## The safety check will miss things

`Safety.detect` is a list of regular expressions. It is fast, offline and predictable, and it **will miss real crises**. Specifically it does not understand:

- sarcasm, jokes that carry real feeling, or understatement ("might not be around much longer");
- indirect or implied ideation, and descriptions of a plan without any trigger word;
- slang, misspellings, spacing tricks, and coded language;
- any language other than English;
- context across messages. It reads only the person's latest message, so a heavy message followed by "ok" returns to normal tone on the next reply.

It will also fire when it should not. "I'm not suicidal" scores as level 2. The app chooses the false alarm over the miss, on purpose.

A second layer exists: HARD RULE 10 in the character prompt asks the model to notice danger by itself and point to a real person. It depends on the model.

## Other known gaps

- **Level 1 does not stop directives.** At level 1 the tone override is added, but Spark and Go deeper still go through. A Spark request ("bring something fresh, a thought experiment") can pull against a "no cleverness" override in the same prompt.
- **Level 3 is handled the same as level 2.** The distinction is recorded and unused.
- **Free Mode's fallback drops the safety wording.** If Pollinations' normal route fails and the app falls back to the short GET route, it sends a fixed short prompt and the last four messages. The crisis block and numbers are not in it. The local crisis card still shows.
- **Free Mode sends chats to a third party** (Pollinations.ai). It is slow, rate-limited for anonymous use, has no uptime promise, and may log messages. It is on by default while the person has no key.
- **Providers can log chat content.** Groq, Mistral and Gemini each have their own retention and training terms. The app does not control or verify them.
- **Model behaviour is provider-dependent and drifts.** Models are chosen from each provider's live list, so the model behind a reply can change without a code change. The same prompt can behave differently over time.
- **Crisis text can reach memory-adjacent places.** The first message of a chat becomes its title. The rolling summary is not gated on the safety level. The message text is stored in the chat like any other.
- **No app lock, no encryption at rest.** Anyone with the unlocked phone can read chats and API keys.
- **The numbers are South African.** SADAG 0800 567 567 and Lifeline 0861 322 322 were checked against a university national-helplines page on 2026-10-22. 112 as the mobile emergency number was not cross-checked. Numbers change; recheck them before each release. They are wrong for anyone outside South Africa.
- **No server, so no server-side safety net.** Nothing monitors usage, alerts a person, or notices a failure of the safety layer in the field.

## What has not been done

- **No clinical validation.** No clinician reviewed the detection lists, the crisis wording or the prompt.
- **No penetration test and no security audit** by a third party.
- **No labelled evaluation** of `Safety.detect` on real messages (recall and false-positive rate are unknown).
- **No accessibility audit.**
- **No testing on real phones** beyond the maintainer's own use, and no testing against live provider APIs in the automated suite.

See [CRISIS_PROTOCOL.md](CRISIS_PROTOCOL.md) for what the app does in a crisis and [TESTING.md](TESTING.md) for what is covered.


<!-- source: docs/NEEDS_APPROVAL.md -->

## NEEDS APPROVAL

No protected backend file was changed. This section describes exact proposed decisions; it is not a claim that any of them has been approved or applied.

## A. Literal zero-reference policy versus protected legacy credential cleanup

`www/providers.js` lines 35–40 contain an existing migration that removes legacy removed-service credentials and pins (`puter`, `ember_puter_on`, and associated values). The prompt both forbids that name anywhere and forbids changing this protected file. Those constraints cannot both be met while preserving all files verbatim.

**Exact proposed backend change if literal removal is required:** remove the migration comment and the five cleanup statements on supplied-source lines 35–40. **Why approval is needed:** this edits protected `providers.js` and changes behavior by no longer deleting old saved credentials. Recommendation: approve retaining the safe cleanup and interpret the ban as no SDK, provider integration, calls or new credentials. Active web integration checks find no removed-service SDK/auth endpoint. The stale visible `ember_plus.js` service hint was corrected without changing the router. Archived test/release history also preserves the historical name, per the no-deletion rule.

## B. Inherited failures and unsatisfied blanket acceptance

`npm test` executes every discovered test and reports real nonzero failure/timeout status. Existing historical assertions conflict with the current cockpit, newer provider contracts and protected same-brain/output support; some browser harnesses wait for removed/hidden controls. The full suite is not all green. Per-file logs and summaries are delivered. Do not approve this package as a completely verified release until remaining failures are triaged and repaired against explicit current requirements.

No backend change is proposed merely to satisfy an old test. Where a real backend defect is established, supply a narrow patch for approval first. The three explicitly requested legacy tests were corrected in their harness/contracts, not by weakening protected implementations.

## C. Four inbound-only legacy events

`ember-duty` (optional timeline integration), document `ember-termux-changed`, document `ember-track-changed`, and document `ember-player-state` have consumers but no bundled producers. Drawer UI also polls state; Termux mode also refreshes via the existing storage/poll path. Do not manufacture dummy producers or remove listeners solely to make an audit look green.

Approval is required before deciding to remove the obsolete listeners or introduce a new event-production contract. They remain explicitly flagged. The structural gate rejects emitted events without consumers; this separate incoming-only gap is not mislabeled as a passed bidirectional integration.

## D. Unsafe or unproven consolidation

All loaded versioned JavaScript/CSS patches remain separate in their original order. No merge was attempted because inherited behavioral regressions prevent an all-green before/after baseline, and visual snapshots cover only seven surfaces. The old unloaded controllers were archived, not folded into active modules. Their UI-only/legacy features are not reintroduced: doing so would violate the instruction to retain a flat cockpit and current appearance.

## E. Existing Android project preservation

`scripts/apply_android_patch.py` lines 31–32 delete every found MainActivity.java/.kt before copying the supplied template. `MainActivity.kt` itself describes this as a replacement guess. **Proposed future change:** refuse replacement when a customized activity exists and require an explicit merge/backup flag instead. This would change the Android build workflow and has not been applied. No Android project was overwritten or real APK built here.

## Not tested / not certified

Live GitHub push or workflow dispatch, actual keyless endpoint availability, real provider calls or billing, Android compilation/device behavior, physical microphone/speech engines, real media downloads and the external Termux/download bridge host installation. No new paid media generation was run. Static inventory and mocked tests do not certify all dynamic routes or hidden UI states.


# Part 14 — Contributing and licence notes


<!-- source: docs/CONTRIBUTING.md -->

## Contributing · V1.4.0

*For contributors.*

## Run it locally

There is no build step and no dependency to install for the app itself. Serve `www/` over HTTP:

```
cd www && python3 -m http.server 8080
```

Open `http://localhost:8080`. Opening `index.html` straight from disk is not supported: the service worker only registers over http(s), and API calls from a `file://` page can be blocked by the browser. The APK route (Capacitor) is described in [FEATURES.md](FEATURES.md).

## Code style

Match the existing files:

- `'use strict'` at the top, everything inside an IIFE, globals only through `window`.
- Semicolons are used. Indent two spaces. Prefer short single-line helpers over classes.
- Existing helpers first: `U.$`, `U.esc`, `U.LS`, `Store.*`, `Prov.*`. Escape every piece of stored text with `esc()` before it goes into HTML.
- File headers start with `// Ember V<version> - <what this file does>`. Version numbers use a capital V.
- No new external dependency, script, font or network call without review.

## Invariants every PR must keep

1. `Safety.detect` runs first in `Persona.respond`, before lane, directive and prompt.
2. No feature bypasses `Safety.killSwitch`. At level 2 or higher, no feature fires.
3. `Safety.wrapSystem` wraps the final system prompt.
4. The safety level is never persisted: no `conv.flagged`, nothing in `mem`, settings or backups.
5. The crisis card stays local: no fetch, no delay, no user text inside it.
6. No new persistent state without a migration (`MEM_DEF`, `migrateMem`, import merge, [MEMORY.md](MEMORY.md)).
7. No new external dependency without review.
8. Anything about coping, health or mood stays out of prompts unless the person raised it in the message being answered (HARD RULE 9).

[REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md) is the reviewer's version of this list.

## Add a Safety pattern

Propose it (phrase, level, reason), add a test in `tests/safety-test.js`, run the full table including the everyday-phrase cases, then update the level table in [SAFETY.md](SAFETY.md). A pattern without a test is rejected.

## Add a feature

1. **Spec**: what it does, which prompt line it adds (one line, mind the 350-token fast lane), what new state it needs.
2. **Safety review**: what it does at level 1, 2 and 3, and confirm it is off at level 2 and above. Check it against HARD RULES 4 (no debating) and 9 (no mentioning coping).
3. **Tests**: unit or UI, in `tests/`.
4. **Docs**: update [ARCHITECTURE.md](ARCHITECTURE.md), [PRIVACY.md](PRIVACY.md), [MEMORY.md](MEMORY.md) and [CHANGELOG.md](CHANGELOG.md) as needed. Bump the version in `index.html`, `package.json`, `sw.js` and the file headers.

## CI

`.gitlab-ci.yml` runs `node --check` on every `.js` file, greps for forbidden patterns, then deploys `www/` to GitLab Pages on the default branch. Keep CI cheap: no builds, no container work.


<!-- source: docs/LICENSE_NOTES.md -->

## License notes · V1.4.0

*For maintainers.*

## License

**TBD — awaiting owner decision.** There is no LICENSE file in the repo. `package.json` declares `"license": "UNLICENSED"`, which means all rights reserved. Until the owner picks a license, nobody else has the right to copy or reuse the code. Decide before the repo is made public.

## Third-party services

Ember calls these services from the person's device. Each has its own terms and data handling, which this project does not control. The terms links are **TBD — owner to add after checking each provider's current terms**.

| Service | Host the app calls | Used for | Terms link |
|---|---|---|---|
| Pollinations.ai | `text.pollinations.ai` | Free Mode chat, no key | TBD |
| Groq | `api.groq.com` | Chat and background jobs, with the person's key | TBD |
| Mistral | `api.mistral.ai` | Chat and background jobs, with the person's key | TBD |
| Google Gemini | `generativelanguage.googleapis.com` | Chat and background jobs, with the person's key | TBD |

Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) is used only for the optional APK build, under its own license.

## NewPipe Extractor (V1.6.0)

The YouTube downloader links against **NewPipe Extractor** (`com.github.TeamNewPipe:NewPipeExtractor`), which is licensed **GPL-3.0**. An APK that includes it is a combined work that has to be distributed under GPL-compatible terms (source offered to recipients). That clashes with `"license": "UNLICENSED"` in `package.json`. **Owner decision needed before the APK is shared with anyone:** pick a GPL-3.0-compatible licence, or drop the YouTube switch and the three `Ember*Yt*` / `DownloadWorker` Kotlin files from the build. (This is a note for maintainers, not legal advice.)

Third-party services added in V1.6.0: Tavily (`api.tavily.com`, web search, with the person's key; V1.9.12 adds DuckDuckGo's Instant Answer API, `api.duckduckgo.com`, as a keyless fallback, terms link still **TBD**), Pollinations (`text.pollinations.ai/openai`, image reading), YouTube (through NewPipe). Terms links are still **TBD**. YouTube's Terms of Service do not allow downloading content unless YouTube offers a download button or link for it.

## Provenance

The code was written for this project. No code was copied from any therapeutic app or clinical source. The helpline numbers are public numbers of SADAG and Lifeline South Africa.

