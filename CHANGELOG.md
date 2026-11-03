# Changelog

## 1.10.54 - File requests are written directly (fix: "I tried, but the add-on came back empty")
- Fixed: a file request (PDF / Word / essay) no longer offers the tool catalog to the first model call. Engines such as Cohere and Mistral were answering with a tool call instead of the essay, the tool loop then ended empty, and Ember showed "I tried, but the add-on came back empty."
- Fixed: if an engine still answers a file request with a tool call, Ember skips the tool loop and asks the same engine to write the file directly (tools off, evidence already in the prompt).
- Added: last-resort document. If no engine returns a file, Ember builds a real document (headings, overview, web sources, Sources table) from the Wikipedia and web evidence it already fetched, so the PDF / Word buttons always appear. It says plainly that it was built from the sources, not by an engine.
- Fixed: "a pdf and a Document" (also "pdf and word", "document and pdf") now makes ONE document artifact with both Save PDF and Word .docx buttons; before it made a PDF-only artifact.
- Tested: syntax checked (node --check) and the new logic run in a node harness (see tests/file-direct-11054-test.cjs). Not tried on the phone.
- Files changed: www/persona.js, www/app.js, www/ember_deliverables.js, www/index.html (cache tags), www/sw.js, package.json, package-lock.json.

## 1.10.53 - Freeze guard for document requests
- Implemented: in a document request the router now gives up on an engine after 2 failed or timed-out attempts and moves to the next engine (before: up to 100 s per engine, walking every model on every key). A pinned engine stays strict and is not affected.
- Implemented: the "Trying <engine> · <model>" pill now counts "waiting Ns" after 6 seconds and switches to "Writing" once words arrive, so a slow engine no longer looks like a frozen app. New file www/ember_wait.js, display only.
- Tested: syntax checked only (node --check). Not run in any test harness and not tried on the phone.
- Files changed: www/providers.js (4 small additions), www/ember_wait.js (new), www/index.html, www/sw.js, package.json, package-lock.json.

## 1.10.52 - Document fact step uses your Web Search keys
- Implemented: when a document request names a subject, Ember still reads the Wikipedia page, and now also runs the Web Search chain (Tavily, then any saved scraper search key, then DuckDuckGo) for up to 5 more sources. The extra sources are listed as links in the thinking card and added to the prompt as untrusted evidence.
- Implemented: the extra search is cut off after 20 seconds and any failure falls back to Wikipedia alone, so it cannot freeze the turn. It is skipped when Web Search is off in Settings and the + menu pill is off.
- Tested: new tests/fact-search-11052-test.cjs, 10 checks, in a simulated environment only. Not yet tried on the phone.
- Note: with a Tavily key saved, each document request about a named subject now uses 1 Tavily credit.
- Files changed: www/ember_deliverables.js, www/index.html (cache tag), www/sw.js (cache name), package.json, package-lock.json, tests/fact-search-11052-test.cjs.

## 1.10.52 - Document fact search uses your web search keys
- Implemented: for a document about a named subject, Ember now searches the web (Tavily, then any saved scraper search key, then DuckDuckGo) and adds up to 5 sources next to the Wikipedia page, instead of Wikipedia only. The "1 source" dropdown lists them all.
- Implemented: the extra search is cut off after 20 seconds, so it can never freeze the turn; if it fails, the document is built from Wikipedia exactly as before.
- Respects Web Search: skipped when the Settings switch is off, unless the Web Search pill is on.
- Files changed: www/ember_deliverables.js (new moreSources helper, subjectContext), version strings (package.json, package-lock.json, www/sw.js cache name, ember_deliverables.js cache-buster in www/index.html). New test: tests/fact-search-11052-test.cjs.
- Tested: 10 new checks pass (node, vm harness). Not tested on a device.

## Repository cleanup (app version unchanged at 1.10.51)
- No app code changed: every file under www/, android_patch/, scripts/, tools/, tests/ and vendor/ is byte-identical to V1_10_51.
- 479 root-level files that were byte-identical copies of files already in www/, tests/, docs/, android_patch/ and similar folders were removed.
- 73 loose release-note files (root, docs/, docs/history/) merged verbatim into the "Release notes archive" at the bottom of this file.
- Evidence, logs, screenshots, receipts and sandbox leftovers moved into dev/ (see dev/README.md). Repo went from 1,488 to 934 files.

## 1.10.32 - LongCat AI + Permissions & background redesign
- LongCat AI: keyed, opt-in chat engine (off in Auto until switched on or pinned).
- Permissions & background: summary banner, card rows, orange call-to-action buttons, new switches. See RELEASE_1_10_32.txt.

## 1.10.31 - Together AI + Fireworks AI
- Two new keyed, opt-in chat engines (off in Auto until switched on or pinned). See RELEASE_1_10_31.txt.

## 1.10.30 - New chat button + Artifacts box
- Header ＋ starts a fresh chat like the menu's New chat.
- Left panel: Artifacts (N) row, searchable and filterable list across all chats, opens the existing viewer, "new" dot. See RELEASE_1_10_30.txt.

## 1.10.17 — 2026-10-29 — safe wiring release candidate

Source was the supplied V1.10.16 Keyless Router archive. Added AST-backed inventory, event/storage/global registries, complete original-file receipts, explicit load-order and static/lazy precache closure. Archived six unloaded nested-Settings controllers without deleting them. Preserved all active stylesheet and patch ordering. Added small no-payload event adapters and documented unmatched incoming legacy events. Bumped package version and service-worker cache. Corrected three specified legacy tests to the current contracts and replaced nonportable test dependency paths. Added whole-suite discovery with non-short-circuiting real failure/timeout reporting and new structural/browser gates. Reconciled the Android manifest reference with the existing patcher. Rewrote current documents and retained earlier originals/history. Protected backend and vendor file hashes remain unchanged.

Not a completely verified release: inherited suite failures remain, a literal removed-service reference ban conflicts with protected credential-cleanup code, native/live operations are untested, and patch consolidation was deliberately deferred. See NEEDS_APPROVAL and TESTING.

## Previous releases

See docs/history/INDEX.md. Per-version changelogs are historical source evidence, not competing current changelogs.

## 1.10.18 Part 1 - one Settings
- Removed the header gear (bSetTop); Settings opens only from the right panel (Settings & connections).
- "App settings" now opens the top of the Settings sheet; "Memory & persona" opens its own section (renamed from "Memory and Settings").
- Tests updated to open Settings through the panel.

## 1.10.18 Part 2 - panel drill-down, one scroller
- Right panel opens on the main menu: the seven category rows only. Tapping a category opens its tools as their own screen (no inline expanding); tap the header arrow or press Back/Escape to return. Reopening the panel always starts on the main menu.
- Searching still lists matching tools straight away; clearing the box returns to the main menu.
- Command Centre no longer sits in a capped box with its own scrollbar; when expanded it takes over the panel body and is the only scroll area.
- Compact spacing on phones so every screen fits without scrolling, including short screens with browser toolbars showing (360x605).
- Assets re-versioned (?v=1.10.18-p1) and service-worker cache renamed ember-v1.10.18-panel-p1.

## 1.10.18 Part 3-4 - Settings panel + unified Command Centre
- Settings is full-size and uses the nine-row menu (General, Engine Keys, GitHub, Features, Advanced, Web Scraping, Termux & Hacking, Music, Permissions). Tap a row for its sub menu; back/Escape returns. GitHub and Advanced open the Command Centre. Black surfaces with orange and blue accents.
- Command Centre is one dashboard with tabs: Overview, GitHub (Brain / Search / Run & Push), Routing & keys, Inspector, Memory. Overview shows providers, free models, key rotation and GitHub status from live data.
- Repository terminal opens by default as a desktop-style window; results, Sync checkboxes and Confirm sit in the same GitHub > Search flow.

## 1.10.18 Part 5 - Settings re-slotted
- Device Tools is its own Settings row. General row is "Memory and Settings" (Voice lives there; the panel item is renamed to match). yt-dlp stays in Termux & Hacking; System integrations stay in Music.
- Termux Mode and Ember Termux are one block: mode switch on top, terminal directly under it.

## 1.10.18 Part 6 - one Settings (black)
- Termux button and the chat "Open Keys" chip no longer open the old bare Settings sheet; they open the black Settings (Termux & Hacking row, Engine Keys row).
- app.js: new openBlackSettings() routes to EmberCockpit.open(), falling back to the original sheet only if the cockpit is not loaded.
- Assets re-versioned (app.js?v=1.10.18-p6) and service-worker cache renamed ember-v1.10.18-panel-p6.

---

# Release notes archive

Every individual release-note file that used to sit loose in the repo root, docs/ and docs/history/ is merged below, newest first. Text is verbatim; each block names the original file(s) it came from.

## RELEASE_1_10_51.txt

Original file(s): RELEASE_1_10_51.txt

~~~~~~~~text
EMBER 1.10.51 — PROVIDER / UI REPAIR RELEASE
Based on your supplied Ember-V1_10_50-FULL.zip. Updated project source, not a compiled APK.

OPEN THE NEW CONTROLS
Tap the existing top-right Settings/actions button, then API keys.
The dedicated right-side panel adds/removes AI keys and refreshes model catalogs.
AI providers & routing stays separate. Auto chooses models from live provider catalogs;
explicit model pins stay exact and strict provider pins are not silently bypassed.
Appearance is at the top of Settings: Dark, Light, or Use device setting.
Actual web-search results show expandable source cards, full URLs and site icons
(with a local letter fallback when an icon cannot load).

PATCH SCOPE
- Bounded HTTP requests through response-body completion, not only response headers.
- JS-side timeout/cancellation for native HTTP fallback; native plugin operations may
  still need their own underlying network timeout. No Android hardware test was performed.
- Ordinary chat calls: up to 25 seconds per attempt, 40 seconds per provider and
  150 seconds for routing. Document calls retain longer allowances (90 seconds per
  attempt, 100 seconds per provider, 330 seconds for routing). Catalog pagination
  has one 15-second total budget. Existing outer app/turn deadlines remain.
- Automatic model catalogs are invalidated after model 404 responses so the next
  request discovers a fresh list. Explicit model pins remain unchanged.
- Adding a Gemini key no longer starts a hidden generation probe.
- Key catalog checks use up to three concurrent jobs.
- Web scrape response-body reads remain under an 18-second per-request timeout.
- Separate AI-key entry from provider/routing settings. No new credential store.
- Blue on-state styles no longer paint whole connection rows.
- Answer-badge styles no longer collide with routing statistics cards; logo sizes bounded.
- Restored the existing fire orbit with a compositor-friendly rotation; reduced-motion respected.
- Narrowed the cosmetic whole-body observer and avoided unchanged permission-banner rewrites.
- Enhanced amber activity rail, safe source cards and direct page-read evidence links.
- Optional Light Mode with persisted device/system preference.
- Removed the duplicate unstyled startup block from layout; existing animated startup retained.
- Source assets and www assets synchronized; cache namespace and package version updated.

WHAT WAS PRESERVED
Existing provider order, key rotation, safety/persona rules, tool follow-up provider ownership,
paid-provider opt-ins, strict pins and existing credential storage are retained. No settings
are forcibly changed to allow paid providers or bypass a pin. GitHub/native/build code is
not replaced. Existing source tree and historical release/test evidence remain in the ZIP.

VERIFICATION
170 focused checks passed: 14 new provider/network, 28 new browser/UI, 10 routing fallback,
3 streaming/cancellation, 74 scraper and 41 document/provider checks.
Browser tests use synthetic network responses and fixture credentials, not your private keys.
Phone-size 393 x 852 and desktop drawer behavior checked. Spinner movement, UI event-loop
responsiveness, clickable full URLs/icons, light-theme persistence, API-key add/remove,
Back navigation, and absence of JavaScript exceptions checked in those flows.
No compiled APK or real-phone/native-plugin run is included. Your saved on-device keys
and their actual quotas were not accessible here, so real generation access is unverified.

The old tests/wiring-test.cjs is NOT a clean release gate: it still expects the historical
ember-v1.10.17-wired cache name and original V1.10.16 backend hashes. Its static event check
also cannot see one inherited array-registered listener. The full historical test suite was
not run and is not claimed to pass. New tests are included alongside old ones, not substituted.
See verification-1.10.51/ for focused test logs and mobile previews, and
RELEASE_MANIFEST_1_10_51.json for changed-file accounting.

INSTALL / UPDATE
Use this ZIP as the updated project with your existing Capacitor/GitHub Android build flow.
package.json is 1.10.51; the existing Android patcher derives the native version from it.
Build with the same app ID and signing key to update in place. Do not clear app storage or
uninstall the existing app just to test this source update: that can erase device-local keys.
For a hosted web/PWA deployment, deploy www and reload after the updated service worker
activates. Native APK users must rebuild/install an APK to receive these source changes.

ACCOUNT LIMITS
The app cannot force invalid/revoked/restricted keys to work, create missing credits, bypass
project/organization quotas, or guarantee public-service uptime. Key rotation does not multiply
shared provider quotas. Catalog visibility is not proof that a key can generate a reply.
Select Auto in provider routing for cross-provider selection; a strict pin intentionally stays
with the pinned provider. Consult PROVIDER_GUIDE_1_10_51.txt for official free-tier references.
~~~~~~~~

## RELEASE_1_10_50.txt

Original file(s): RELEASE_1_10_50.txt

~~~~~~~~text
Ember 1.10.50 - fast replies to normal questions, tools only for orders
- NEW www/ember_taskgate.js (window.EmberTaskGate): tells a normal question/chat line from an order (search, find, download, build, fix, please..., a link, a file, news/weather/prices, "yes" to an offer, "try again" after an order). Word lists at the top of the file are editable.
- Normal message: no GitHub read, no tool list shown to the model, no native tool calling. One model call, answered straight away.
- Order: everything works as before (Read-First for code, web search, scraping, music, downloads).
- ember_github.js: prefetch() no longer reads the repo on non-code turns (it used to fetch the live tree + up to 3 files on EVERY message while a token was saved). isCodeQuestion(): weak words (app, file, error, build, server, token...) only count when the message is an order.
- persona.js: tool list only for orders; chat summarising (condense) can no longer hold a reply longer than 0.4s.
- package.json 1.10.50, sw cache ember-v1.10.50-task-gate, precache + index.html wired.
Files changed: www/ember_taskgate.js (new), ember_github.js, persona.js, index.html, sw.js, package.json, package-lock.json (root copies synced).
Not changed: placeholders for ember_chat_polish.* / ember_graphics.js are still empty (originals missing from the package).
~~~~~~~~

## RELEASE_1_10_49.txt

Original file(s): RELEASE_1_10_49.txt

~~~~~~~~text
Ember 1.10.49
- Thinking card: web search steps now show what was searched plus every source with its site icon and link, open by default (tap the row or the pill to fold). Saved replies keep the searched text too.
- Providers: tapping a provider row now SWITCHES to it (pins that engine). Tap the pinned one again to go back to Auto. A provider with no key still opens Keys.
- The rotating live engine status moved from the header to the bottom of the chat (Provider activity line above Modes). Tap it to open Keys.
- Thinking line: the yellow connector thread between steps was already present and is unchanged.
Files changed (all under www/): ember_timeline.js, ember_prov_ui.js, ember_prov_next.js, ember_finish.css, index.html (cache-bust params), sw.js (cache name).
- Root copies of every top-level www file synced to the www versions (33 updated, 16 added, provider-icons longcat.svg + ATTRIBUTION). Nothing deleted. www/ remains the app's webDir.
~~~~~~~~

## PATCH_1_10_48_NOTES.txt

Original file(s): PATCH_1_10_48_NOTES.txt

~~~~~~~~text
EMBER 1.10.48 — ADDITIVE PUBLICATION / UI PATCH
Base: the supplied Ember-V1_10_47-FULL.zip. Primary runnable build: www/.

WHAT WAS ADDED
- PDF/document/Markdown previews render the ACTUAL exported PDF with bundled PDF.js.
  Preview and Save PDF share identical cached bytes. Lazy page canvases, fit-width,
  zoom, page picker, source tab, clickable PDF links, mobile sizing and close cleanup.
- Existing pdfmake layout features are retained: charts, stats, callouts, tables,
  headings, covers, themes, columns and page breaks. No replacement document model.
- Local PDF image resolution runs three bounded loads at a time. Maximum 32 distinct
  images per new export, with original URL/private-host checks and labelled failures.
- DOCX now embeds images and preserves nested/numbered lists, headings, hyperlinks,
  code, tables, callouts, intentional page breaks and the final document text.
- Complex file continuation can exceed the old four-follow-up limit: bounded at 16.
  Ordinary conversation and provider routing/token policy are unchanged. Cancel
  still stops further calls. Partial recovered artifacts are labelled INCOMPLETE.
- HTML type aliases including html.html normalize to html; repeated HTML filename
  extensions normalize to one .html. Existing interactive HTML sandbox stays intact.
- Search activity rows are tappable/keyboard accessible as a whole; actual source
  links and site icons still come from the existing timeline and saved snapshots.
- Real-image lookup: Wikimedia Commons search with exact image URL, source page,
  artist and license metadata. Web-enabled AI can use search_images. A manual Find
  real image action is available in document/HTML/SVG/image previews. Offline/error
  states do not fabricate images. This is search, not paid AI image generation.
- Add a local photo or selected search image to an export preview copy. Attribution
  accompanies search images. Original chat artifacts are NOT overwritten; save the
  PDF/DOCX/Markdown export to keep the preview additions.
- Compact provider logo badges read each reply's saved eng metadata (never the
  selected provider). Existing local provider logos reused; unknown remains unknown.
- Distinct PDF, DOC, MD, SVG, IMAGE and HTML badges in the real Artifacts list,
  chat cards and shelf. Existing list search/filter/storage behavior retained.
- Blue enabled toggles alongside Ember orange; calm ember-flicker thinking;
  yellow timeline connectors; reduced-motion support; local SVG new-chat art.

PRESERVATION
Only seven original files receive hooks: ember_artifacts.js and www copy,
index.html and www copy, sw.js and www copy, and serve.js (.mjs MIME type).
New functionality is in ember_builds.js, ember_image_lookup.js, ember_finish.js,
ember_finish.css and ember-empty.svg. PDF.js is vendored with its Apache-2.0 license.
Providers, app.js, persona.js, safety, tool execution, memory, storage, native code,
GitHub/Termux integrations and existing document/source engines are byte-unchanged.
The old root and newer www builds were NOT flattened over one another. Their
existing differences remain. No originals removed. See PATCH_1_10_48_RECEIPT.json.

RUN / INSTALL
Use your existing build/deployment workflow with this complete extracted folder.
The app remains served from www (as in capacitor.config.json and serve.js).
For local web use: npm install, then npm run serve. Reload after deploying; the
service-worker cache version is bumped for the new assets. APK users must rebuild
and install through their existing Capacitor/Android workflow. This ZIP is source,
not a compiled APK. No API keys, settings or saved chats are added or reset.

VERIFICATION
28 new full-browser checks plus 12 edge checks passed in Chromium (412px mobile
and 1280px desktop). Original sources: 25/25; typewriter: 23/23; document/provider
unit regressions: 41/41. Details/logs/screenshots and real PDF/DOCX test exports are
under verification-1.10.48/. Image search response tests use controlled fixtures;
live Commons availability/relevance and Android WebView/native saves are not
claimed tested. A browser-launch dependency issue was resolved in the test
environment. Edge testing found and fixed toast-element compatibility and a
preview-resize race; final browser runs have no uncaught app errors. Sandboxed
HTML checks run with Playwright's service-worker blocking injection disabled,
because that injection itself throws inside an opaque sandbox.

To rerun the new checks after npm install and Playwright Chromium installation:
  Start: node serve.js 8080
  Run:   node verification-1.10.48/tests/builds-browser.cjs
  Run:   EMBER_TEST_BASE=http://127.0.0.1:8080 node verification-1.10.48/tests/builds-edge.cjs
Outputs can be redirected with EMBER_TEST_OUTPUT. Tests use controlled fixture
content in an isolated browser context; those fixtures are not app defaults.

LIMITS / HONEST EXPECTATIONS
HTML's Live Preview preserves its original interactive page. PDF conversion is
structured publication output, not a pixel-identical capture of arbitrary web CSS.
DOCX chart/stats/steps blocks preserve their underlying lines, not native Word chart
objects or identical PDF artwork. Font coverage remains that of bundled fonts.
A relevant real-image match cannot be guaranteed: inspect subject and license.
Remote image embedding remains subject to the source server's CORS/availability;
failed images are labelled rather than silently claimed embedded. Continuation is
bounded, model/context limits still apply, and an exact target page count is not
guaranteed by prose length alone. No live paid provider or media generation used.
~~~~~~~~

## RELEASE_1_10_47.txt

Original file(s): RELEASE_1_10_47.txt

~~~~~~~~text
EMBER V1.10.47 - TAPPABLE SEARCH SOURCES + TYPEWRITER FIXES (additive; apply over 1.10.46, which includes 1.10.42 / 1.10.45)
SOURCES     www/ember_timeline.js: a finished search row in the thinking card now has a "N sources" pill. Tap it and the links drop open, each with the site icon, the page title (2 lines max) and the host. Tap a link and it opens outside the app.
            Works for web_search (results), search_and_read (pages + also_found) and youtube_search (results). A FAILED row and every non-search row get nothing.
            Only plain http(s) URLs with a real host survive: javascript:, data:, ftp:, localhost and dotless hosts are dropped (search results are untrusted web data). Duplicate pages (same host + path) merge. Max 8 per row.
            Saved with the reply: the links ride in the existing timeline snapshot (9th field), so "Thought for Xs" shows the same lists after a reload. Turns saved by 1.10.46 and earlier have no such field and render exactly as before. About 100 bytes per link.
            Icons: https://icons.duckduckgo.com/ip3/<host>.ico (DuckDuckGo is already the keyless search engine, so no new third party). Requested only when a row is drawn, lazy, no referrer. An icon that fails becomes a letter chip and is not asked for again this session.
            The CSS is injected by ember_timeline.js itself (style#ek-src-css), so there is no new file and no stylesheet link to add.
TYPEWRITER  www/ember_typewriter.js, three bugs reproduced against 1.10.40 and fixed:
            1. Blank and re-type: when the final text was not an exact continuation of the streamed text (trimmed, normalised, tags stripped, visual-pass rewrite) the whole reply was wiped and typed again from the first letter. Now mostly-the-same text is corrected in place and typing carries on. A genuinely different text (tool round, retry) still starts over once.
            2. Background: a hidden page throttles timers to ~1 a second and the old pacing then gave ~4 characters a second, while the turn (and its save) waited for it. A hidden page now shows the whole reply at once, and going to the background mid-reply flushes it.
            3. Long replies: every paint re-formats the whole message, so the gap between paints now grows with length (16ms, up to 64ms past ~10k characters). A 12.7k-character burst went from 881 paints to 319. Short replies type exactly as before.
            Also: half-typed "<a", "<ar" ... "<artif" no longer flash on screen (only "<art" and "<artifact" were hidden before).
FILES       Changed: www/ember_timeline.js, www/ember_typewriter.js. One-line wiring: www/index.html (?v=1.10.47 on both script tags), www/sw.js (cache name ember-v1.10.47-sources). New: tests/typewriter-11047.cjs, tests/sources-11047-browser-test.cjs, RELEASE_1_10_47.txt. Everything else byte for byte as 1.10.46.
TESTED      node --check on all 86 www/*.js. tests/typewriter-11047.cjs (virtual clock): 23 checks, 23 pass; the same file run against the 1.10.40 typewriter fails 8 of them (that is the reproduction).
            tests/sources-11047-browser-test.cjs (headless Chromium, phone viewport, icon host intercepted): 25 checks, 25 pass - lists only on successful search rows, bad URLs dropped, tap opens once via window.open, summary does not collapse the card, broken icon -> letter chip, only the icon host is contacted, snapshot round-trip, old saved turns render, no page errors.
            Existing suites re-run: visuals-11042 22 passed. v11033-output-save: all checks pass up to "plus panel retains optional Stability images", which also fails on the same tree WITHOUT these changes (not caused by 1.10.47, not fixed here, and the checks after it did not run).
NOT TESTED  Physical Android device / APK; whether the Capacitor WebView opens window.open links in the system browser (it follows the existing [data-link] path in app.js); the live DuckDuckGo icon service; live provider replies.
NOTE        The typewriter symptom as you first reported it was not in the thread this release was built from. These are the defects found by reading and running the code. If your symptom is something else, send it and it gets its own fix.
~~~~~~~~

## RELEASE_1_10_46.txt

Original file(s): RELEASE_1_10_46.txt

~~~~~~~~text
EMBER V1.10.46 - GEMINI FREE-KEY DETECTION + GEMMA (additive; includes 1.10.43, 1.10.44, 1.10.45; apply over 1.10.42)
FREE KEYS   www/providers.js: a Gemini key now knows whether it is free. Google has no "which plan am I on" call, so it is learned two ways:
            (1) when a Gemini key is added, ONE tiny request (maxOutputTokens 8, prompt "hi") goes to the top Pro model, not awaited, so adding a key is no slower:
                429 naming the free tier = free key, 200 = paid key, anything else = unknown (behaves exactly like 1.10.45).
            (2) any real call that fails with 429 / 400 / 403 / 404 and the words free tier / FreeTier in Google's reply marks the key free.
                Keys saved before this version learn on their first such failure, in the same route.
            A free key: Pro / Argon and any model that answered "no free quota" (limit 0) go to the back of the list, and it tries up to 6 models per route instead of 3
            (Flash x2, Flash-Lite x2, Gemma x2). A paid-tier 429 does not mark a key free. A marked model that answers clears the mark. A mark expires after 7 days.
            The Providers detail line shows "Free-tier key detected" until the next health check overwrites it. Stored on the key as tier / tierAt / noFree.
GEMMA       www/providers.js: gemma-* models from the key's live list are now routed (they were excluded). Order: after Flash-Lite, newest then largest first
            (live list decides; Google documents gemma-4-31b-it and gemma-4-26b-a4b-it on the Gemini API). Embedding / speech / image / shield / live variants stay out.
            Gemma 4 gets normal systemInstruction, JSON mode and tools. Older Gemma builds that refuse them are handled: "Developer instruction is not enabled" ->
            instructions go in front of the first user turn; "JSON mode is not enabled" -> JSON instruction in the prompt and a code fence stripped from the reply;
            tools refused -> retried without tools. Each refusal is remembered per model (ember_gem_quirks) so it is not asked twice.
            Reply parts flagged thought:true are dropped from the text.
BUG FIXED   streamClaude(): `parsed` was never defined there, so any Claude HTTP error (bad key, 429, 5xx) on the streaming path came out as
            "parsed is not defined" instead of the real status. Reproduced on 1.10.45, fixed here.
EXPORT      Prov.tierOf(id,key), Prov.probeTier(key), Prov._gemAdjust (read-only helpers for tests).
NOT DONE    Nothing shows the tier in the UI beyond the Providers detail line (not asked for). Gemini limits are per Google project, not per key: two keys from one
            project share one quota and detection cannot see that. Groq untouched.
UNVERIFIED  The exact error Google returns for a paid-only model on a free key. Detection relies on the free-tier wording in the reply, which Google has used for
            quota errors. If Google answers differently the key stays "unknown" and routing is the same as 1.10.45, no worse.
            Gemma free-tier numbers (RPM / RPD) were not verified; third-party pages quote different figures. The live /models list and Google's pricing page decide.
SOURCES     Google AI "Gemma on the Gemini API" (gemma-4-31b-it, gemma-4-26b-a4b-it, system instruction + function calling) and Gemini pricing page via search, 2026-11-03.
FILES       www/providers.js (changed), tests/gemini-free-gemma-11046.cjs (new). Other files as in 1.10.45. index.html / sw.js untouched.
TESTED      node --check. node tests/gemini-free-gemma-11046.cjs: 30 checks, 30 pass. It runs providers.js in Node with a mocked network and drives the real router:
            ranking with Gemma; probe on add (free / paid / paid-tier 429); deep lane on a free key never tries Pro and reaches Gemma; an unknown key learns mid-route;
            mark expiry and clearing; Gemma quirks and their memory; Gemma 4 keeps systemInstruction; Groq ranking from 1.10.45; Claude error path.
NOT TESTED  Live Google calls, Android device, APK, the app UI (index.html is not in this package), existing suites.
~~~~~~~~

## RELEASE_1_10_45.txt

Original file(s): RELEASE_1_10_45.txt

~~~~~~~~text
EMBER V1.10.45 - GROQ / GEMINI MODEL LISTS (additive; includes 1.10.43 and 1.10.44; apply over 1.10.42)
GROQ      www/providers.js: canopylabs/orpheus-* (text-to-speech) no longer count as chat models in the router, the model picker or the cached list. gpt-oss-120b now ranks ahead of gpt-oss-20b. Llama stays first when the key's live /models list has it. Ember still hard-codes no Groq roster: the list is whatever Groq returns for the key (refreshed when a key is saved, cached 12h, refresh button in Providers).
GEMINI    www/providers.js: speech models (gemini-*-transcribe, *-translate) are no longer treated as chat models. Flash-Lite (3.5 / 3.1) was excluded outright; it now ranks after Flash (before Pro in the fast lane, last in the deep lane). Reason: the router tries only the top 3 models per engine; once the first two Flash models hit their small free daily cap it would fall to a Pro model with no free quota.
EXPORT    Prov._rank (read-only helper for tests).
NOT DONE  Deep lane still ranks Pro first (paid-only on free keys: costs two failed tries, then reaches Flash). Left alone because paid keys exist. Say if you want free keys detected.
SOURCES   Groq /docs/models and /docs/rate-limits, Google Gemini /pricing, fetched 2026-11-03 through a summariser; live lists from the key are authoritative. Quoted limits (RPM/RPD) are not verified and Google says they are not guaranteed.
FILES     www/providers.js (new here), plus 1.10.43/44: www/app.js, ember_deliverables.js, ember_github.js, persona.js. Tests: tests/groq-gemini-rank-11045.cjs and the two earlier ones. index.html / sw.js untouched.
TESTED    node --check; headless Chromium: with the docs' Groq list the router order is gpt-oss-120b, gpt-oss-20b, qwen3.8-27b, muse-spark-open and no orpheus / guard / safeguard / whisper; with Llama present Llama stays first; Gemini fast = 3.8-flash, 3.6-flash, 3.5-flash-lite, 3.1-flash-lite, then paid models; no transcribe / live / image models; 0 page errors.
NOT TESTED Live Groq/Gemini calls, Android device, APK, existing suites.
~~~~~~~~

## RELEASE_1_10_42.txt

Original file(s): RELEASE_1_10_42.txt

~~~~~~~~text
EMBER V1.10.42 - VISUALS ADD-ON (additive)
ADDED      Provider badge: a small logo chip at the start of each reply footer, taken from the engine that really answered (Free mode gets the flame chip). Claude/Gemini/Groq/Mistral/Cohere/OpenRouter/Plugsky/LongCat/Stability use the local provider-icons/ files.
ADDED      Artifact type badges: PDF, Doc, SVG, Image, HTML, Code and Data line icons in coloured tiles in the Artifacts list.
ADDED      Ember-flicker thinking animation: three calm flames replace the bouncing dots in the typing bubble and the thinking card. Off under reduced-motion.
ADDED      Empty-state art: a local SVG hearth glow with slowly rising sparks above the Ember mark on a new chat. Still under reduced-motion.
CHANGED    Blue toggles: the switches that were still orange (Permissions ON/OFF switches, cockpit feature switches, keyless switches) now use the same blue as the rest.
ALREADY    Together AI and Fireworks AI were already removed in V1.10.37 and nothing for them remains in www/. Not touched here.
FILES      New: www/ember_visuals.css, www/ember_visuals.js, RELEASE_1_10_42.txt. Edited (one-line wiring only): www/index.html (one link, one script), www/sw.js (cache name + two precache entries).
UNTOUCHED  Every other file, byte for byte. package.json and Android versions unchanged.
NOTE       The blue toggles use the literal blue (#3d8bff), not var(--blue): the cockpit stylesheet remaps --blue to orange inside Settings.
TESTED     node --check on every www/*.js. New tests/visuals-11042-browser-test.cjs (headless Chromium, offline): 22 checks passed - badges on Groq/Free/Gemini (incl. a pin-failed footer)/Claude/OpenRouter/Cohere/Mistral/LongCat/Plugsky, none on unknown engines or user messages, no duplicates; 9 artifact types map to the right icon; flame animation applied; reduced-motion turns the animations off; Permissions, cockpit and keyless switches computed blue; no external requests; no page errors. Existing suites re-run unchanged: chat-graphics 42 passed, A4 unit 41 passed, A4 browser 22 passed.
NOT TESTED Physical Android device, APK rebuild, live provider replies. Reply footers and Artifacts-list rows in the test are injected with the same markup the app renders (not produced by a real chat or the real Artifacts sheet). The ember-flicker look and empty-state art were checked for presence, not judged by eye on a phone.
~~~~~~~~

## RELEASE_1_10_40.txt

Original file(s): RELEASE_1_10_40.txt

~~~~~~~~text
EMBER 1.10.40 - ADDITIVE A4 DOCUMENT ENGINE / ROUTING PATCH

WHAT CHANGED
Added a document-only authoring contract with 16 authoring standards plus 16
preflight standards. This is a two-pass quality specification, not a claim that
Cohere's underlying model intelligence is doubled. Normal chat, utility tasks
and JSON jobs keep their prior instructions and budgets. Document requests and
same-engine continuations gain A4 print-first instructions and a minimum 4096
output-token request budget; metadata can lower it to a provider's supported
ceiling. Existing larger document budgets remain intact.

When Cohere is already the selected provider, unpinned document model selection
uses its deeper model ranking rather than preferring r7b for speed. Explicit
provider/model pins are honored. No paid provider is newly enabled.

Word export now declares A4 (11906 x 16838 twips) and explicit margins matching
the PDF margins. PDF rendering and saving are NOT replaced. Page targets now
understand phrases such as '2 A4 pages'.

A small document-only stylesheet contains collapsed first/last child margins
so the existing preview paginator measures complete blocks. The tested A4
sheets now measure 794 x 1123 CSS pixels, not an expanded screen-height page.
It also wraps long code/tokens and constrains document images. No app-wide
layout, save-handler or typing code was rewritten.

ROUTING / FREE MODELS
Live discovery retains model pricing, output capabilities, supported parameters
and output ceilings. Every matching free conversational text model in the live
OpenRouter catalog is discovered dynamically; no brittle hard-coded roster.
At verification, the live public catalog returned 451 models and
14 eligible free conversational text routes (including openrouter/free).
This count will change as providers add or retire models.

Automatic OpenRouter routing uses free variants only. Mixed-media generation
models, guardrails, positive auxiliary prices and conditional-price entries
are excluded from the free chat selection. A live check caught music models
advertising zero token prices but per-song fees; these are excluded by output
capability checks. Explicit provider/model pins retain their existing behavior,
including paid pins the user already chose. OpenRouter's Auto opt-in remains
required. No saved engine is enabled behind the user's back. The existing
Groq/Mistral/Gemini/Cohere/LongCat/etc. definitions remain as supplied; no removed
service is reinstated. Other providers' free quotas depend on the user's plan.

Cohere and Gemini model catalogs now follow bounded, deduplicated pagination.
OpenRouter public discovery works without a key, but generation still needs a
valid personal key and is subject to provider quotas and model availability.
Unsupported tool/temperature/response-format options are omitted or fall back
to JSON instructions. Model output ceilings are respected. Free Mode OFF is
persisted and cannot silently trigger the final keyless fallback. Partial
streams cannot silently mix replies from another provider. Retries and cooldowns
remain bounded by the existing routing behavior.

PRESERVATION
Only FOUR previously existing files changed:
  www/providers.js          routing integration / discovery
  www/ember_deliverables.js A4 Word section and A4 page-target qualifier only
  www/index.html            load additive JS/CSS and cache-bust provider script
  www/sw.js                 cache additive assets under a new cache version
Two new runtime files were added: ember_document_engine.js and .css.
All 1333 other original files remain byte-for-byte identical. No original file
was deleted. PDF rendering functions inside ember_deliverables.js are identical.
The full ember_artifacts.js (including all Save PDF / native Save As logic),
the archived ember_pdf.js shim, ember_typewriter.js, app.js, document library, persona, safety,
settings schema, dependencies, package/lockfile and all 21 supplied Android patch
files are unchanged. Hash evidence is in PATCH_MANIFEST.json.

TEST RESULTS
New deterministic unit/integration checks: 41 PASS
New real Chromium browser checks:          22 PASS
Export/source/cache validation checks:     27 PASS
Live unauthenticated OpenRouter catalog:   PASS
Browser page errors during new tests:      0

Real PDF files were generated, reopened and checked for A4 MediaBoxes,
selectable/searchable text and the complete final marker. Real DOCX ZIP/XML was
checked for A4 size, margins, all 12 sections and the final marker. The actual
Save PDF button produced a downloadable file. Exact Markdown/HTML downloads,
the native Save bridge contract and cancellation, gradual typing, hidden
artifact markup, Stop, settings preservation, mobile/desktop layout, warm
offline export and cold service-worker offline reload all passed.

Legacy tests compared on original AND patched source: 16
  Passing on both: 6
  Failing on both: 9
  Timing out on both: 1
  Newly failing compared with original: 0
The old test suite is NOT fully green. Existing failures include outdated
provider-profile assertions, stale fixed UI/source expectations and incomplete
DOM stubs; the old app-test also timed out on both versions. They were NOT
silenced, rewritten or labeled as passes. See baseline-/patched-*.log and
existing-regression-comparison.json for exact evidence. npm test still includes
those legacy failures. Only the focused tests listed above are certified here.

HOW TO USE
Back up the current project, then use this complete source ZIP as the updated
project. The active application is www/ (as specified by Capacitor and serve.js).
The old duplicate root-level app sources are archival and intentionally unchanged.
Run your normal same-origin web update or normal Capacitor build/sync flow;
no uninstall, storage clearing, key reset or document database migration is
required. Keep the same origin/app ID so browser/device storage is retained.
If an old app view is still open, close and reopen it to load the new assets.
Do NOT clear app data to update. An already-installed APK needs its normal
web-asset rebuild/sync; this ZIP is source, not a signed APK.

REPRODUCE THE FOCUSED CHECKS
  npm ci
  npx playwright install chromium
  node tests/document-engine-11040-test.cjs
  node tests/document-engine-11040-browser-test.cjs
Optional public read-only live check:
  node scripts/verify-live-free-catalog-11040.cjs
Linux browser tests may require Playwright system libraries. No real key is
bundled or required for deterministic fixture checks.

LIMITS / HONEST TEST SCOPE
No authenticated live Cohere or other provider generation was exercised; routing
was tested with fixtures. The live public catalog GET was actually exercised.
No Android hardware, OS picker, Android background worker, APK signing/build,
iOS, Word desktop pagination or non-Chromium browser was tested. The native save
contract was mocked, not run on a real phone. A stronger authoring contract is
not a new trained model and cannot guarantee compliance or an exact page count.
The preview and PDF/DOCX use different renderers; their page counts can differ.
The original paginator still does not split an individual oversized paragraph,
image, code block or table row into exact preview sheets. Such a block may
exceed preview page height; it is not silently clipped by this patch. PDF
pagination remains the original local renderer. Uploaded PDF/DOCX ingestion,
OCR, font coverage and existing library input limitations are not expanded here.
No universal 'all free models on every provider' guarantee is made: discovery
covers the existing provider integrations, with verified zero-price filtering
for OpenRouter only; other providers' quotas and prices are account-specific.
~~~~~~~~

## RELEASE_1_10_39.txt

Original file(s): RELEASE_1_10_39.txt, docs/RELEASE_1_10_39.txt

~~~~~~~~text
EMBER V1.10.39 - DOCUMENTS ON A4, AND EMBER DECIDES WHEN TO MAKE ONE
A4 PREVIEW  Document and PDF artifacts now open as real A4 sheets (210 x 297 mm, same margins and 10.5pt type as the exported PDF), page by page with "Page 1 of N", not one long screen-width scroll. Blocks are never cut: what does not fit moves to the next sheet, a heading never ends a sheet, long lists continue on the next sheet, <!-- pagebreak --> starts a new sheet. The sheets scale to the phone width and rebuild when pictures load.
AUTO DOC    Ember no longer needs "make a pdf". A named document (CV, cover letter, report, essay, assignment, invoice, letter, doc, Word, ...) with any asking phrase ("I need", "give me", "put together", "turn this into") becomes a document; "as a PDF" / "into a Word doc" and page counts ("a 2 page essay") count too. Questions ("how do I write a CV") and chat stay in chat. Plain "give me 5 minutes", "a quote" or "a plan for my day" are not documents.
PERSONA     Ember is told to decide by itself (keep/print/send/submit, or longer than a phone screen of structured writing), pick pdf vs document, and to size writing in A4 pages: about 480 words per sheet, one page request = one sheet about 420 words.
FILES       www/ember_artifacts.js, ember_deliverables.js, persona.js, style.css, index.html (cache-bust), sw.js.
TESTED      Headless Chromium 412x915: 12 prompts classified as expected; a 5-section report split into A4 sheets of exactly 1123px with labels and a forced page break; no page errors.
NOT TESTED  Android device, APK rebuild, pictures inside the A4 preview, the exported PDF itself (it was already A4 via pdfmake and is unchanged).
~~~~~~~~

## RELEASE_1_10_38.txt

Original file(s): RELEASE_1_10_38.txt, docs/RELEASE_1_10_38.txt

~~~~~~~~text
EMBER V1.10.38 - SETTINGS: AI KEYS, SCRAPING AND MEDIA EACH IN ONE PAGE
AI KEYS    Settings row renamed "AI keys & providers": Free Mode, which engine answers, every AI key (paste & detect, per-engine list, add by hand), provider routing and fallback switches.
SCRAPING   Row "Web scraping & search": every scraper and search key, free reader, health checks, tests (unchanged content, clearer name).
MEDIA      Row "Media" (was "Music & downloads"): NEW top card "Media keys & engines" holds the Stability AI key (add, check, remove) and the keyless music/video endpoints, moved here from + > Media & Music. Below it: song ID, player, music control, YouTube / yt-dlp downloads.
PLUS MENU  + > Media & Music no longer holds keys; it shows one row that opens Settings > Media. Its action toggles (Create audio/video, Music Brain, identify a song) stay.
FILES      www/ember_cockpit.js, www/ember_plugins.js, www/index.html (cache-bust), www/sw.js.
TESTED     Headless Chromium at 412x915: row names, Media card renders, Stability key add/remove flow, keyless panel present, AI and scraping pages open, no page errors. A fake key was rejected as expected (no network).
NOT TESTED Android device, APK rebuild, a real Stability key.
~~~~~~~~

## RELEASE_1_10_37.txt

Original file(s): RELEASE_1_10_37.txt, docs/RELEASE_1_10_37.txt

~~~~~~~~text
EMBER V1.10.37 - TOGETHER AI AND FIREWORKS AI REMOVED
REMOVED    Together AI and Fireworks AI are gone from the live build (www/): engine config, model list and picker, key scanner, key links, AI Features switches, Providers menu, key dropdown, icons and service-worker cache entries.
CLEANUP    On first run a saved key, pin, last-good or opt-in switch for either engine is erased once, like the old Puter cleanup.
UNTOUCHED  Groq, Mistral, Gemini, Cohere, Claude, OpenRouter, Plugsky and LongCat work as before.
FILES      www/providers.js, ember_features.js, ember_menu.js, ember_keys.js, ember_keyscan.js, app.js, index.html, sw.js, provider-icons/ATTRIBUTION.txt (together.svg and fireworks.svg deleted).
TESTED     Syntax check (node --check) on every edited JS file; no remaining references in www/.
NOT TESTED Browser run, APK rebuild. Old copies at the zip root (providers.js, app.js, index.html) are stale and were not edited.
~~~~~~~~

## RELEASE_1_10_33.txt

Original file(s): RELEASE_1_10_33.txt

~~~~~~~~text
EMBER V1.10.33 — TYPEWRITER + ARTIFACT SAVE FIRST

SCOPE
Patched the active www/ app and the two existing copies of EmberDevicePlugin.kt.
Existing chat providers, scraper backend, branding, permission styling and old docs/history retained.
No engines were rebuilt. No dependencies were added. Active webDir remains www.
Root-level legacy web copies are deliberately unchanged; run node serve.js or build with Capacitor's www webDir.

OUTPUT PACING
Provider chunks now enter one buffered queue instead of painting whole chunks immediately.
Backlog-based acceleration (65–1400 characters/second; at most 48 code units per animation tick).
Applies to streamed, one-shot and visible native-background replies. Stop clears pending output.
A completed artifact replaces its writing indicator; partial artifact markup is not dumped into chat.
This speeds display catch-up, not the remote model's inference.

ARTIFACT SAVING AND PDF
Removed the legacy capturing click handler that stole export/download events for Ember-prefixed artifacts.
All exports use the existing EmberArtifacts save handler and the original bundled pdfmake/docx engines.
Android now implements saveFile via ACTION_CREATE_DOCUMENT and writes the real bytes to the chosen URI.
No broad storage permission is needed. Cancelling Save is not success. Missing native save support no longer pretends a blob click saved the file.
IMPORTANT: THE APK MUST BE REBUILT from this source for Android saveFile to exist. Updating JavaScript alone cannot patch an installed APK's native plugin.
Browser real-file downloads verified for PDF, Markdown, document, HTML, code, JSON, CSV and SVG-to-PDF.
PDF header/EOF and extracted text verified.

BUILT-IN VS OPTIONAL CONNECTIONS
+ > Built-in engines is a read-only inventory, not format/plugin switches.
It lists PDF/DOCX/Markdown; HTML/layouts; code/JSON/CSV; SVG illustration and PNG conversion; colours/themes;
bar/hbar/line/donut charts; tables/stats/callouts/steps; covers/TOC/page layouts; image embedding;
artifacts/saving; reply pacing; speech integration; plan/execute; guided reasoning; knowledge/context;
and existing music/download adapters, with their actual external/device requirements.
These abilities are included in the model's live capability instructions. Chat authors content; exporters render locally.
Built-in image creation means SVG illustration, not a secretly installed photorealistic model.
Automatic output abilities are not listed as Plugins or as Settings media generators.

REMOVALS AND STABILITY
Removed LanguageTool, Unsplash, WhoisJSON and WordsAPI from tool definitions, callable handlers, panel and key inventory.
Existing stored credentials are not erased. Existing IP and lyrics integrations retained.
Stability controls live only in + > Media & Music and now advertise optional IMAGES only.
Settings media form and the cockpit relocation of output engines were removed; unrelated routing/download settings remain.

MUSIC / VIDEO — PARTIALLY COMPLETE, NOT A WORKING PROVIDER REPLACEMENT
Audio/video no longer submit to Stability or use its billed image+music slideshow path.
The new keyless HTTP adapter uses a configured endpoint under + > Media & Music. No key field, hidden paid fallback or automatic duplicate request.
Contract: POST JSON {prompt,kind,duration,aspect}; return audio/* or video/* bytes, or JSON {url,model?}.
HTTPS or localhost HTTP only; credential-bearing endpoints rejected; browser endpoint must permit CORS.
There is NO verified anonymous provider URL preloaded. An unconfigured endpoint reports that no generation was submitted.
This connection layer does NOT implement a built-in music/video model. A verified provider-specific adapter remains outstanding.
Existing media storage, playback, download and recovery cards moved into + > Media & Music > Saved media.
No live provider-generation test was performed.

VERIFICATION
33 targeted headless Chromium checks passed at 412x915, including actual button downloads, all PDF source converters,
chat one-shot pacing, mocked native background pacing/Stop, native save-byte delivery/cancel and UI/tool removals.
Existing streaming-routing (3), routing-fallback (10) and handoff (6) checks pass.
Historical artifact unit test fails on its own incomplete DOM stub; same failure reproduced on the untouched uploaded version.
Historical knowledge-brain test passes 31 checks then references absent www/ember_github_ui.js (absent in original ZIP too).
No full historical-suite clean-pass claim. No physical-device save verification and no APK build claimed.
Run the self-contained targeted regression with: node tests/v11033-output-save-test.cjs (npm install and Playwright Chromium required).
Exact original-file changes and hashes are recorded in PATCH_CHANGED_FILES.json.
~~~~~~~~

## RELEASE_1_10_32.txt

Original file(s): RELEASE_1_10_32.txt, docs/RELEASE_1_10_32.txt

~~~~~~~~text
EMBER V1.10.32 - LONGCAT AI (KEYED, OPT-IN) + NEW PERMISSIONS & BACKGROUND LOOK
ADDED      LongCat AI as a chat engine. Your own key, OpenAI-style endpoint:
           https://api.longcat.chat/openai/v1   (chat goes to /chat/completions with a Bearer key)
           Same rotation, cooldowns, streaming, tools and health checks as Together/Fireworks (existing OpenAI-style code path).
OPT-IN     Like OpenRouter, Together and Fireworks: NOT in Auto by default. It answers only when pinned in the Providers chip, or after you switch
           "Allow LongCat AI in automatic fallback (uses your quota)" ON in AI Features (also in the Engines & media menu). Nothing spends your quota unasked.
MODELS     Live /models list is used if LongCat has one. If that route answers 404/405 the app falls back to: LongCat-2.5-Preview, LongCat-2.0-Preview,
           LongCat-Flash-Thinking, LongCat-Flash-Chat. Ranking puts 2.5-Preview first (deep lane: 2.5, thinking, 2.0, flash).
           The free daily quota you described is for LongCat-2.0-Preview: pin that model if you want to stay on the free quota.
KEYS       Settings > Keys dropdown lists it. Pasted-notes scanner recognises a key written next to the words "LongCat" / "Long Cat". There is no
           bare-key pattern (its key shape is not documented here), so a key with no name beside it is not auto-filed.
UI-LOOK    Settings > Permissions & background redrawn (new files ember_v129.css + ember_v129.js, loaded last, scoped to that screen only):
           - summary banner: ring "4/6", "2 things need attention", tap a chip to jump to that row
           - each permission is a card: icon tile | name + coloured status dot | action
           - anything not ready gets an orange call-to-action button, ready rows stay quiet
           - ON/OFF switches: wide orange pill, white knob, label centred
           - Notifications (Request + Test) buttons sit on their own line, so the name is never squeezed
           - "Background & pings" rows share the card look; hint text says "Orange" switches (was "Light-blue")
FILES      www/providers.js (PROTECTED backend: edited on your request, additive), ember_features.js, ember_keys.js, ember_keyscan.js, ember_menu.js,
           app.js (key link), index.html, sw.js, package.json, provider-icons/longcat.svg (+ATTRIBUTION), ember_v129.css, ember_v129.js.
TESTED     Headless Chromium, mocked HTTP, no real key: registered, in Keys dropdown, not in Auto by default, in Auto when switched on, /models 404
           falls back to the model list, a chat reply comes back through it, request goes to .../openai/v1/chat/completions with a Bearer key and
           model LongCat-2.5-Preview, no page errors. Permissions screen rendered at 360px wide with the statuses from your screenshot: no sideways overflow.
NOT TESTED Real LongCat account or key. The exact base path (/openai/v1) and the model names come from your notes and LongCat's docs as I know them;
           they could not be checked live. If chat returns 404, change base in www/providers.js (the longcat line near the top). Android device, APK rebuild.
NOTE       Because /models may be missing, a wrong key is only caught on the first real chat message, not by the health check.
           tests/*protected*.json and wired-protected-hashes.json already held an older providers.js hash before 1.10.31; not regenerated.
~~~~~~~~

## RELEASE_1_10_31.txt

Original file(s): RELEASE_1_10_31.txt, docs/RELEASE_1_10_31.txt

~~~~~~~~text
EMBER V1.10.31 - TOGETHER AI + FIREWORKS AI (KEYED, OPT-IN)
ADDED      Together AI and Fireworks AI as chat engines. Your own key, OpenAI-style endpoints:
           Together  https://api.together.xyz/v1        Fireworks  https://api.fireworks.ai/inference/v1
           Same rotation, cooldowns, streaming, tools and health checks as Groq/Mistral (they use the existing OpenAI-style code path).
OPT-IN     Like OpenRouter and Plugsky: NOT in Auto by default. They answer only when pinned in the Providers chip, or after you switch
           "Allow Together AI / Fireworks AI in automatic fallback (uses your credits)" ON in AI Features (also in the Engines & media menu).
           Chosen so nothing spends your credits behind your back.
MODELS     Model lists come from each provider live. Together returns a bare array with a type per model: only chat/language/code kept.
           Fireworks: only supports_chat models. Embeddings, image, rerank, audio, guard and vision models are filtered out.
           Ranking prefers Llama 3.3 70B, DeepSeek, Qwen, gpt-oss (deep lane prefers the bigger ones).
KEYS       Settings > Keys dropdown lists both. Pasted-notes scanner now recognises fw_... (Fireworks) and tgp_v1_... (Together) and a key next to the
           words "Fireworks" / "Together AI". Together AI was removed from the scanner's "no slot for this service" list.
UI         Names, monograms (provider-icons/together.svg, fireworks.svg: simple original glyphs, not their logos), key links, Command Centre label "Opt-in · uses your credits".
FILES      www/providers.js (PROTECTED backend: edited on your request, additive), ember_keyscan.js, ember_features.js, ember_menu.js, ember_keys.js,
           ember_cockpit.js, app.js (key links), index.html, sw.js, provider-icons/*, package.json.
TESTED     Headless Chromium with mocked HTTP (no real keys): both registered, in the Keys dropdown, not in Auto by default, in Auto when switched on,
           model lists parsed and non-chat dropped, a chat reply comes back through each, request hits the right endpoint with a Bearer key, scanner files both key shapes, no page errors (13/13).
NOT TESTED Real Together/Fireworks accounts: live /models response shapes are from their docs, not a live call. Free credits and model names change; check yours.
           Android device, APK rebuild.
NOTE       tests/*protected*.json and wired-protected-hashes.json already held an older providers.js hash before this release (they were stale); not regenerated.
~~~~~~~~

## RELEASE_1_10_30.txt

Original file(s): RELEASE_1_10_30.txt, docs/RELEASE_1_10_30.txt

~~~~~~~~text
EMBER V1.10.30 - NEW CHAT BUTTON + ARTIFACTS BOX
NEW CHAT   A ＋ button sits in the header, always visible, first in the top-right group (before Browser and Actions).
           One tap starts a fresh chat through the same code as "＋ New chat" in the left menu. If a reply is still running it says "Wait for the current reply to finish". Logo and welcome screen untouched.
ARTIFACTS  Left panel > Chats tab, under Recent Chats and Saved Sites: a row "Artifacts (N)", N counted from all saved chats (private chats included).
           Tapping it opens a list: icon, title, type (PDF, Doc, Markdown, HTML, Code, JSON, CSV, SVG, Image), chat name, day and time. Newest first.
           Search box (title, chat name, type, start of the content) and type chips (All, PDF, Doc, HTML, Code, Image) with counts.
           Tapping an item opens the existing full-screen viewer, which keeps its PDF button. Closing the viewer returns to the list.
           Small "new" dot on the row when Ember makes an artifact you have not looked at; it clears when you open the list. Existing artifacts on first run do not count as new.
           Android Back and Escape close the list.
FILES      www/ember_artbox.js and www/ember_artbox.css (new), www/index.html, www/app.js (one handler), www/ember_back.js, www/sw.js, package.json.
TESTED     Headless Chromium: 38 checks passed at 412x915 (plus header layout at 360 and 320): header button position, new chat clears the log and shows the welcome screen, count, dot on/off, reload, list order, filters, search, viewer opens with its PDF button, Escape, Back, no page errors.
NOT TESTED Android device, APK rebuild, the PDF button inside the viewer on a phone. The inherited wiring test already failed before this change on the ember-boot-ready event; not touched.
NOT DONE   No dot on the ☰ header button (only the Artifacts row has it). Say if you want that.
~~~~~~~~

## RELEASE_1_10_29.txt

Original file(s): RELEASE_1_10_29.txt

~~~~~~~~text
EMBER V1.10.29 - BUILT-IN ONLY (KEYLESS APIs REMOVED)
REMOVED  The keyless router's third-party tools: Pollinations, Forge (AI Horde), DiceBear, Picsum, QRServer, Robohash, StreamElements TTS, JioSaavn, iTunes, LRCLIB, Piston, DummyJSON, Jina Reader, Microlink, IPify, LanguageTool.
         Also gone: Pollinations/Forge picture routing (+ > Create image, Media engines sheet), Pollinations pictures inside PDFs (img: lines), the Jina/Microlink/weserv calls used to find page pictures for PDFs.
KEPT     Built-in tools that run on the device: PDF (pdfmake), Word (docx), Markdown, dictation (device speech), text structuring (your existing chat engines).
         Stability AI stays only because it uses YOUR saved key (Plugins > Media & Music). Ember still draws SVG itself.
UI       Media engines sheet is now "Built-in engines". Engines & media menu, Plugins panel and the router chooser say Built-in. Ember's tool list tells the AI only the built-in tools exist.
NOT TOUCHED  Chat Free Mode and your keyed chat providers, web search (Tavily / DuckDuckGo), Music Brain and the lyrics/music modules, and the player's own sources. Say the word if those should go too.
NOT TESTED  Android device, APK rebuild. Headless Chromium at 412x915: router lists only built-in tools, PDFs still build, zero external requests on load.
~~~~~~~~

## RELEASE_1_10_28.txt

Original file(s): RELEASE_1_10_28.txt

~~~~~~~~text
EMBER V1.10.28 - PDF FOR EVERY ARTIFACT + STRUCTURED LAYOUTS + UI FIXES
PDF      Every artifact now has a PDF button (card, shelf, picture row and full-screen viewer): markdown, document, pdf, html, code, json, csv, svg, image.
         Built on the device by pdfmake. Saves through the same Save plugin / share sheet as before. HTML now builds a real PDF too; "Print view" stays as its own button.
         Code    -> cover-style header, stat cards (language, lines, size), language chip, line numbers.
         JSON    -> stat cards, a Records table (array of objects) or Top-level fields table, then the full pretty JSON with line numbers.
         CSV     -> stat cards and a real table (landscape when wide), bar chart for plain numeric tables.
         SVG / image -> the picture, scaled to the page, with a format/size card.
LAYOUT   Structured exports get: coloured top bar on every page, kind label in the header (CODE - PYTHON, CSV...), cover page + contents page on long documents
         (cover shows words / sections / reading time), h1 rule, language chips on code.
         New Markdown the AI (and you) can write: ```stats  > [!NOTE|TIP|WARNING|IMPORTANT|SUCCESS]  ```chart (bar|hbar|line|pie|donut)  ```steps
         <!-- columns --> ... <!-- col --> ... <!-- endcolumns -->  <!-- pagebreak -->. A plain label + number table gets an automatic bar chart.
         Artifact tag attributes: theme, accent, cover, toc, orientation, subtitle, author. Ember's prompts (persona.js, PDF mode) now teach these.
UI       Blue light by "Ember": always flashes, also when Android "remove animations" is on (reduced-motion now blinks instead of freezing).
         Stop (bottom, while a reply runs): the word Stop only, no square/block glyph. Reply read-aloud button says Stop, no block.
         Top-right blocks (Browser, Actions): same size and shape as the menu block on the left (44px rounded squares, caret is a corner badge).
FILES    www/ember_deliverables.js, www/ember_artifacts.js, www/ember_v128.css (new, loaded last), www/app.js, www/persona.js, www/ember_plus.js, www/index.html, www/sw.js, package.json.
NOT TESTED  Android device, APK rebuild. Checked in headless Chromium at 412x915: PDFs for all 9 types render, header/Stop/dot computed styles.
~~~~~~~~

## RELEASE_1_10_27.txt

Original file(s): RELEASE_1_10_27.txt

~~~~~~~~text
EMBER V1.10.27 - SETTINGS SEARCH + GITHUB WIDGET
SEARCH   Settings: "Search settings" box on top of the menu. Finds any control or card in every section and jumps to it.
         Right panel search: "Search Settings for ..." row sends the word into it.
GITHUB   One widget at the BOTTOM of Settings, tap to expand: Brain | Search | Push | Terminal.
         Loads ONLY Ember's Brain (fezzymultiverse/ember-brain). Search repos (read-only) > View (README + file map) > Add > Push (one commit, no force-push).
TERMINAL GitHub Terminal kept: its own tab in the widget, also mirrored in the Command Centre terminal (GIT tag).
STRIPPED Command Centre GitHub card (Brain/Search/Run & Push), Actions runner, SSH key gate, output repo, whole-repo sync queue.
         ember_repo_runner.js and ember_github_ui.js moved to archive/www. ember_brainpush.js now has its own search.
NOT TESTED  Android device, live GitHub push, FILE_INTEGRITY / WIRING manifests (not regenerated), old legacy tests that expect the removed runner UI.
~~~~~~~~

## RELEASE_1_10_26.txt

Original file(s): RELEASE_1_10_26.txt

~~~~~~~~text
EMBER V1.10.26 - ENGINE-ONLY PDF
SAVE     Artifact Save now tries: native Downloads/Ember (EmberDevice.saveFile) > share sheet > viewer tab > browser download > copy text.
         The toast names what worked or why not. Direct save to Downloads/Ember needs an APK rebuild with EmberDevicePlugin.kt.
PDF      ember_pdf.js (basic writer) retired to archive/www. pdfmake is the only engine; its parser now lives in ember_deliverables.js.
         Dead cloud-PDF stubs removed from ember_engines.js. If the engine fails, the print view opens with the real error shown.
IMAGES   ![caption](img:description) drawn with Pollinations; ![caption](https://...) downloaded (proxy fallback); data: and stored pictures.
         A failed picture becomes a labelled placeholder; max 8 per PDF; if embedding fails the PDF is rebuilt with placeholders.
SCRAPE   "make a PDF of <link>" reads the page first, finds its pictures (page markdown, free reader, preview image) and offers them to Ember.
LAST     Parity from the old writer: strikethrough; code blocks now paint their grey card with an accent bar (rows capped so none outgrows a page).
NOT TESTED  Android device, live Pollinations/Jina/scraper keys, FILE_INTEGRITY/WIRING manifests (not regenerated).
~~~~~~~~

## RELEASE_1_10_25.txt

Original file(s): RELEASE_1_10_25.txt

~~~~~~~~text
EMBER V1.10.25
BOOT     Rising ember sparks, shock rings after the flame lights, live status line (engines, keys, free models), progress bar, S.O.I footer.
BOOT     Ends when the app has really loaded (min 2.8 s, max 6 s); tap still skips.
ROUTING  A document ask never becomes a picture because Create image was armed (unless PDF mode is armed too).
MEDIA    Stability pictures stored as bytes and shown as data URLs.
PDF      Pictures via ![caption](img:...), 12000-token ceiling, per-engine tests in + > Media & Music, lyrics reference trimmed.
NOTE     All fixes are in www/ (the real app). Earlier V1.10.23/24 zips patched the stale root copies.
~~~~~~~~

## RELEASE_1_10_22.txt

Original file(s): RELEASE_1_10_22.txt

~~~~~~~~text
EMBER V1.10.22
CREATE     Several Create modes (image, audio, video, PDF) can be switched on together. The Plugins sheet and the + menu stay open
           after each tap, and the next message runs every armed mode one after another on the same prompt.
STABILITY  Restored: Create audio, Create video, Stability bridge, the Stability key box and the AI-features media card.
           Stability's own API still needs a key for audio/video; images fall back to the keyless tools without one.
AUDD       Audd.io token card restored.
BOOT       Animated boot scene (grow, then shrink away); tap to skip.
ROUTING    Groq, Mistral, Gemini, Cohere last; only engines with a live key are tried; Cohere is never remembered as "last good".
MENU       Settings > AI: "Engines & media menu" with a toggle per chat engine and per keyless media tool.
SAVE       Artifact Save/Download writes to Downloads/Ember via the new EmberDevice.saveFile native method.
           REQUIRES an APK rebuild: copy EmberDevicePlugin.kt into android/app/src/main/java/com/fezzy/ember/ and rebuild.
GITHUB     Apply and Apply as Brain show a toast and scroll to the pending list.
~~~~~~~~

## RELEASE_1_10_17.txt

Original file(s): RELEASE_1_10_17.txt

~~~~~~~~text
EMBER V1.10.17 — FULLY WIRED REQUEST: SAFE RELEASE CANDIDATE
Input: supplied V1.10.16 Keyless Router; no fallback used.
package.json: 1.10.17
sw cache: ember-v1.10.17-wired
All eight protected backend files and all vendor assets preserved byte-for-byte.
Six unloaded Settings controllers archived with receipts and replacement owners.
New event adapters store counters/health booleans only; no payload/credential logs.
Every original archive file is accounted for. Historical documentation is preserved.
No loaded CSS or versioned-patch merges; no UI redesign.
Whole-suite npm test reports real failures/timeouts and is NOT all green.
Current keyless mocked browser test: 47/47 checks pass; three specified legacy tests repaired.
See docs/TESTING.md for final exact counts and screenshot differences.
NEEDS APPROVAL: docs/NEEDS_APPROVAL.md.
Not tested: live GitHub push, Android compilation/device, live keyless endpoints and real local bridges.
This is not certified as complete merely because the requested ZIP filename contains fully-wired.
~~~~~~~~

## RELEASE_1_10_16.txt

Original file(s): RELEASE_1_10_16.txt, docs/history/RELEASE_1_10_16.txt

~~~~~~~~text
EMBER V1.10.16 — KEYLESS ROUTER
=================================
Deliverable: ember-V1_10_16-keyless-router.zip (complete source tree, not an APK)
Source: uploaded V1.10.15 chat-bar-fix archive.

IMPLEMENTED
-----------
New www/ember_keyless.js and www/ember_keyless.css; existing public window objects/events are the integration surface. ember_plugins.js is unchanged.
20 independent persisted toggles plus an informational preserved Forge route, grouped in the existing Plugins sheet and inline Settings > Engine & Media Control.
Single healthy tool runs automatically. Multiple candidates show an explicit keyboard-accessible bottom sheet: once, always, Auto. It never submits on idle. Preferences persist; disabling the remembered engine removes it from candidates.
Task routing for documents, images, avatars, placeholder photos, QR, speech, music search, lyrics, code, mock data, page reading, metadata, IP, microphone and text structuring.
At most three fallback tool attempts, no repeated engine within an attempt chain. Random-photo fallback is clearly labelled as a placeholder, not an image of the prompt.
Routing summaries feed ember-terminal, EmberTimeline note/step/tool and ember-agent-note; fallback uses ember-try and ember-switch. Activity reports waiting for the chooser. The abilities line updates immediately on tool switches.
Pasted essay chain: available LanguageTool -> existing AI structure route -> bundled pdfmake -> normal Artifact Card. Long grammar input is chunked and a local rate budget is enforced. Failure preserves the complete input rather than silently truncating it. No unsolicited cover, QR or speech generation.
Actual PDF/DOCX blobs are built with bundled engines; Markdown uses EmberArtifacts. New artifacts use the existing parser/cards, local save handlers and file sharing when available (download fallback otherwise).
Package and web manifest version: 1.10.16. Service worker cache: ember-v1.10.16-keyless.

PUBLIC INFORMATION AND YOUR EXISTING API KEYS
--------------------------------------------
Your chat addition permits existing configured web-provider keys for public-source reading; it does not introduce accounts or credentials for the 20 new tools.
Public URL reading selects existing configured scraper providers through EmberScraper.plan/scrape_url, preserving existing provider/key rotation, and falls back to enabled/healthy Jina only if the existing free-reader switch permits it.
Public-information/name research without a URL selects the existing configured search providers, then reads at most two returned public pages. Returned names are source-published claims, not verified identity matches. Output includes source URLs and retrieval timestamps; failed page reads are labelled as search snippets, not complete pages.
The router does not read, copy, persist or log key values. Existing legacy provider settings and credential storage remain unchanged, not removed by this update. No real user API key was supplied to or exercised in QA; provider selection/rotation integration was tested with mocked public methods.
Scraping OFF prevents requests. Private/local addresses, URL userinfo and credential-bearing query parameters are rejected. Pages are treated as untrusted evidence, never instructions. No login, paywall or CAPTCHA bypass is added. Published professional names may be extracted; no private contact-detail inference or identity disambiguation claim is made.
Example prompts:
  Extract the published staff names from https://example.com/staff
  Find public information and names for Example staff
  Make a PDF and fix grammar:
  [paste the full essay after a newline]
Replace example.com with a real publicly accessible source.

LIVE CHECKS AND EXPLICIT LIMITATIONS
-----------------------------------
Endpoint checks recorded at 2026-10-29T11:43:38Z from the release build server. Availability, CORS, quota and phone connectivity may differ. The in-app Check availability action performs fresh checks from the device.

| Tool | Endpoint | Worked | HTTP | Notes |
|---|---|---|---|---|
| LanguageTool | https://api.languagetool.org/v2/check | YES | 200 | HTTP response and content checked |
| Pollinations | https://image.pollinations.ai/prompt/a%20small%20orange%20circle?width=64&height=64&seed=11016&nologo=true | YES | 200 | Anonymous GET returned JPEG; 64 by 64 smoke image, actual model may vary |
| DiceBear | https://api.dicebear.com/9.x/bottts/svg?seed=Ember | YES | 200 | HTTP response and content checked |
| Picsum | https://picsum.photos/32/32 | YES | 200 | HTTP response and content checked |
| QRServer | https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Ember | YES | 200 | HTTP response and content checked |
| Robohash | https://robohash.org/Ember.png?size=32x32 | YES | 200 | HTTP response and content checked |
| StreamElements TTS | https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=Hello | NO | 403 | HTTP Error 403: Forbidden |
| JioSaavn (unofficial) | https://saavn.dev/api/search/songs?query=hello&limit=1 | NO |  | <urlopen error [Errno -2] Name or service not known> |
| iTunes Search | https://itunes.apple.com/search?term=hello&media=music&limit=1 | YES | 200 | HTTP response and content checked |
| LRCLIB | https://lrclib.net/api/search?q=hello | YES | 200 | HTTP response and content checked |
| Piston | https://emkc.org/api/v2/piston/execute | NO | 401 | HTTP Error 401: Unauthorized |
| DummyJSON | https://dummyjson.com/products?limit=1 | YES | 200 | HTTP response and content checked |
| Jina Reader | https://r.jina.ai/https://example.com | YES | 200 | HTTP response and content checked |
| Microlink | https://api.microlink.io/?url=https%3A%2F%2Fexample.com | YES | 200 | HTTP response and content checked |
| IPify | https://api.ipify.org?format=json | YES | 200 | HTTP response and content checked |
| Forge | https://aihorde.net/api/v2/status/heartbeat | Heartbeat YES; generation not verified | 200 | HTTP response and content checked; original adapter unchanged; unavailable in strict router (header/queue conflict) |
| PDF (pdfmake) | local: vendor/pdfmake-0.2.20.min.js | YES |  | Real bundled PDF generated in browser; real offline export also passed |
| Word (docx) | local: vendor/docx-9.5.1.iife.js | YES |  | Real bundled DOCX generated in browser; ZIP signature validated |
| Markdown | local: ember_artifacts.js | YES |  | Bundled Markdown rendering and artifact generation passed |
| Text structuring | local: providers.js | Conditional |  | Existing text router callable; full model answers mocked for browser QA; runtime depends on configured providers / Free Mode |
| Speech-to-text | local: ember_voice.js | Conditional |  | Existing device speech bridge; permission and on-device transcription not exercised |

StreamElements TTS: live 403, unavailable, skipped. Piston: live 401, unavailable, skipped; no authentication workaround added. JioSaavn: documented public host failed DNS; remains unofficial, OFF by default and unavailable. The upstream project still documents https://saavn.dev/docs (https://github.com/sumitkolhe/jiosaavn-api); no working replacement was verified.
DiceBear uses the tested 9.x endpoint rather than the old 7.x suggestion. Pollinations anonymous GET returned a real 64x64 JPEG in the smoke check; a service-chosen model is not promised to be Flux. Production requests use the requested 1024x1024 size and remain subject to service limits.
Forge's heartbeat worked, but generation was not tested. The unchanged existing adapter uses an anonymous API header and long queue, which conflict with the strict no-header/10-second network contract. It remains intact as a public legacy route but is marked unavailable in the strict router. Consequently the requested Pollinations -> Forge -> Picsum generation chain was NOT claimed as passing; production skips unavailable Forge. Tests verify bounded fallback among the remaining healthy image engines.
Strict new keyless HTTP calls use AbortController, 10-second timeout covering response bodies, credentials:omit, cache:no-store and no authentication headers. Existing saved-key scraper and text-router implementations remain outside that no-auth contract, since your addition explicitly asks to use those providers. Existing scraper methods expose no cancellation signal: the router stops waiting after 10 seconds, but cannot guarantee cancellation of a legacy in-flight provider request. Their internal deadlines/key rotation are unchanged.
Speech recognition was not physically tested on an Android phone. Availability depends on device/browser speech support and permissions; the router delegates to the device mic path, not a new credential-based transcription provider. AI model calls and TTS/audio contents were mocked in deterministic QA; real PDF/DOCX serialization was not mocked.

NETWORK / CSP / ANDROID / OFFLINE
---------------------------------
Existing Android patch already grants INTERNET and RECORD_AUDIO. All newly routed remote services use HTTPS. No cleartext opt-in or broad network-security exception was added. No native Android build or handset was available, so APK build/device reachability is not claimed.
No new CDN script or external export library was added. Existing bundled pdfmake 0.2.20/Roboto and docx 9.5.1 are reused.
The existing artifact iframe policy gained media-src data: blob: for locally embedded audio, and the existing sandbox gained allow-downloads for explicit artifact download links. No new remote script permission was added.
The service worker now caches only its bundled static-asset allowlist, never external APIs or same-origin non-asset proxy/API paths. Only version query parameters are cacheable. Failed/non-OK responses are not cached. New JS/CSS and the static build health snapshot are pre-cached.
A real service-worker test found the new cache, all new assets, zero cached external responses, successful offline boot and successful offline PDF creation; no page errors.

VALIDATION
----------
New browser suite: 47/47 checks PASS; 0 failures. Chromium via Playwright 1.56.1, 412x915 and 1280x900, reduced-motion mode, mocked third-party HTTP.
Checks include toggle persistence/abilities, chooser once/always/Auto, no idle submit, bounded fallback and timeout abort, disabled tools, terminal/thought parity, actual PDF/DOCX export signatures, plain-chat Artifact Card and actual PDF download, public names with sources, configured-keyed-reader dispatch without new key storage, all other HTTP adapters, no authentication headers/cookies in keyless traffic, no new credential fields and zero browser page errors.
All eight required protected backend files AND ember_plugins.js match uploaded SHA-256 bytes. See tests/keyless-protected-hashes.json and KEYLESS_1_10_16_MANIFEST.json.

Legacy suites (not hidden; failures were reproduced on the untouched upload):
term-test.js: FAIL (updated exit 1); untouched original also FAIL (exit 1)
v1992-repo-runner-test.js: FAIL (updated exit 1); untouched original also FAIL (exit 1)
knowledge-brain-test.js: FAIL (updated exit 1); untouched original also FAIL (exit 1)
artifact-test.js: PASS (updated exit 0)
routing-fallback-test.js: PASS (updated exit 0)
streaming-routing-test.js: PASS (updated exit 0)
safety-test.js: PASS (updated exit 0)
scrape-test.js: PASS (updated exit 0)
keyscan-test.js: PASS (updated exit 0)
workspace95-test.js: FAIL (updated exit 1); untouched original also FAIL (exit 1)
command-center-test.js: FAIL (updated exit 1); untouched original also FAIL (exit 1)
routing94-test.js: PASS (updated exit 0)
download94-test.js: PASS (updated exit 0)
app-test.js: FAIL (updated exit 2); untouched original also FAIL (exit 2)

Known three failures requested in the brief:
- term-test: old browser click targets a hidden control; 26 core checks pass before the browser failure.
- v1992-repo-runner-test: old integration expects an exception no longer thrown.
- knowledge-brain-test: old assertion expects ghRunnerCard in the advanced tab.
Additional baseline failures discovered:
- workspace95-test: expects output cannot be applied as Brain.
- command-center-test: old hard-coded V1.9.94 ai_agent.js hash no longer matches the input archive.
- app-test: old browser click target is hidden. Its environment-specific Playwright path was supplied through the existing PW environment variable for both original and updated runs; same click timeout reproduced on both.
This is not a claim that the entire legacy npm test chain passes. Complete logs are bundled under tests/results/keyless/.

REPRODUCE / REVIEW
------------------
Install the project's development dependencies and Playwright Chromium, then run npm run test:keyless. The browser suite starts its own local static server and mocks third-party HTTP. It writes the test report and screenshots to tests/results/keyless/.
Production preview: npm run serve, then open the served app. To test only local export without sending text to a provider, switch OFF Grammar and Text structuring; PDF/Word export itself stays local.
Screenshots: chooser-412.png, chooser-1280.png, plugins-412.png, plugins-1280.png, terminal-chain-412.png, terminal-chain-1280.png and chat-artifact variants under tests/results/keyless/.
Source files and historical tests/docs are kept complete. No protected backend implementation was patched.
~~~~~~~~

## RELEASE_1_10_15.txt

Original file(s): RELEASE_1_10_15.txt, docs/history/RELEASE_1_10_15.txt

~~~~~~~~text
EMBER V1.10.15
==============
Header: the blue dot now sits in front of the Ember name and flashes (1.2 s pulse; respects reduced-motion).
Chat footer: Providers selector on the left (opens the real provider health dropdown), verified active API key count far right.
Providers dropdown: Check button no longer overflows.
No backend files touched. Offline cache version ember-v1.10.15-cockpit.
Settings repair: Media engines cards (Keyless engines, Pictures) now have even padding and full width, no jammed caption.
~~~~~~~~

## RELEASE_1_10_14.txt

Original file(s): RELEASE_1_10_14.txt, docs/history/RELEASE_1_10_14.txt

~~~~~~~~text
EMBER V1.10.14 — THE COCKPIT UPDATE
===================================

Apply this archive as the updated source tree. package.json is version 1.10.14.
It contains no node_modules, build output APK, or real test credentials.

IMPLEMENTED
Settings: full-screen on mobile and desktop, one scroll container, no category subpages or sliding panels. Engine & Media Control includes inline picture/PDF controls, engine pinning, key detection, provider-list accordion and notepad. Individual providers expand in place. All bundled providers remain listed even without keys; cached live model catalogs and :free labels are exposed. Original key rotation, cooldowns, strict pinning and fallback behavior is retained.

Flat categories: Engine & Media Control; Providers; Features; Memory and Settings (including Voice); Device Tools; Web Scraping; Hacking; Music & Tools; Permissions. Scraping paste/keys/health/test are together, Music/API/system-integration controls are merged, and Termux settings and the actual terminal are inline in Hacking. YouTube/yt-dlp lives in Hacking. Browser now has a direct Notes tab using the existing editor and autosave. Core Memory facts show inline by topic, without child pages.

Command Centre: single GitHub workflow, with three tabs: Brain, Search, Run & Push. The repository Files tab, file-manager UI and its UI event logic are removed. Knowledge reads, document attachments, artifacts and backend file operations are deliberately retained to preserve backend behavior. Thought/context diagnostics remain below the repository cockpit.

Search opens the Live Terminal dropdown containing actual discovery results, pagination and status. Apply exposes a Sync checkbox. Confirm selected adds to a persistent, waiting queue, without changing runner sources or writing to GitHub. Run & Push separately confirms the selected queue, stages it through the existing runner API, then installs/updates and dispatches. Failed operations retain retryable queued work. A dispatched workflow is explicitly not reported as a successful build.

SSH: Run & Push requires a public SSH key already linked to the authenticated GitHub account, verified again before each run. /user is read through the existing adapter; public authentication-key metadata is read without credentials from GitHub's public API. No backend allowlist was widened. No private key is accepted or stored. This is an extra UI prerequisite: the existing runner continues to use the original GitHub-token/Actions authentication. This release does NOT switch the runner to SSH transport.

Chat: top Panel affordance removed. Far-bottom-right footer shows only the verified active API-key count, excluding unchecked/rejected/rate-limited/cooling keys. No aggregate key-count widget in Settings. Pollinations can be selected from the engine list by mapping to the existing Free Mode route; no fake provider or invented hosted model was added.

PRESERVATION
providers.js and ai.js are byte-for-byte identical to the uploaded archive.
GitHub backend, Repo Runner backend, runner template, command-centre event adapter, scraper and download backend also hash-identical. app.js changes are confined to UI rendering / event handlers calling existing provider methods. ember_term.js has one UI visibility-condition change for inline placement. No backend routes were changed.
The retired multilevel Settings controllers and duplicate widget scripts remain as historical source files but are no longer loaded by index.html. Offline cache version advanced to ember-v1.10.14-cockpit.

VERIFICATION
72 Playwright assertions pass at 412x915, with additional 1280x900 checks. Includes full-screen geometry, smooth scrolling, no horizontal overflow, inline controls, provider accordions, original pinning, Pollinations, notepad, Notes autosave, inline terminal setup, flat memory, all command tabs, keyboard navigation, queue confirmation/cancellation/persistence, SSH gating, private-key rejection, failed-run handling, honest dispatch status and zero page errors.
102 additional targeted regression assertions pass: fallback 10, streaming 3, routing/security 23, artifacts 22 and key scanning 44.
Tests use mock GitHub HTTP responses and a stubbed runner dispatch. No live repository push/build or Android native testing was performed.

KNOWN LEGACY TEST FAILURES (also reproduced against the untouched uploaded V1.10.13)
- npm test stops at term-test.js: hidden #bTermux click in the old harness.
- v1992-repo-runner-test.js: missing expected exception, line 77.
- knowledge-brain-test.js: obsolete advanced-tab markup expectation, line 87.
These are documented, not suppressed or represented as passing. Full suite is NOT green.

RUN LOCALLY
npm install
npx playwright install chromium
npm run serve
Open http://127.0.0.1:8080
npm run test:cockpit
On a fresh Linux test host, browser system dependencies may be needed: npx playwright install --with-deps chromium.

EVIDENCE
Tests, original/updated legacy logs, verification-summary.json, the browser report and four 412x915 screenshots are in tests/cockpit-results/.
Backend hashes are in tests/cockpit-protected.json.
Full changed-file hashes are in COCKPIT_1_10_14_MANIFEST.json.
~~~~~~~~

## RELEASE_1_10_13.txt

Original file(s): RELEASE_1_10_13.txt, docs/history/RELEASE_1_10_13.txt

~~~~~~~~text
EMBER 1.10.13 - One GitHub place
- GitHub and the Runner now live ONLY in the Command Centre: one "GitHub" card with tabs Connect, Repos, Build & Run, Files, Activity.
- Removed: Settings > Keys GitHub card, Settings > GitHub tab, Settings > Features Repo Runner card, Settings > Advanced (Optional GitHub Runner), the separate GitHub side panel (ember_gitflow.js/.css), and the Brain / Find-and-write sections of the Settings chat widget.
- The old Quick Actions (Run Build, Clear Cache, Push to GitHub, Check runner status) moved into Build & Run. "Repositories & Brain" button is gone.
- Hub and chat widget keep one "GitHub" shortcut each that opens the Command Centre card (window.EmberGit.open / EmberWorkspace.open).
- Same DOM nodes, IDs, storage and handlers as before; only moved and tagged with data-ghp for the tabs.
- Messages that said "Settings > GitHub / Advanced" now say "Command Centre > GitHub".
Not run on a phone or in a browser. Not tested.
~~~~~~~~

## RELEASE_1_10_11.txt

Original file(s): RELEASE_1_10_11.txt, docs/history/RELEASE_1_10_11.txt

~~~~~~~~text
EMBER 1.10.11 - Settings menus rebuilt
- Every menu now works the same way: a row opens a page to the RIGHT, the arrow in the header comes back. Nothing drops down.
  Gear > side panel > section (list of rows) > one row = one page.
- Side panel: API keys opens a provider list, a provider opens its own page (keys, Check, Manage). Command Centre opens as a page.
- Settings sections are now a short list of compact rows (icon, name, one line) in one rounded group. Pages are flat: no box inside a box.
- One header on every Settings page: back arrow, title and where you are, close. The second back bar under it is gone.
- Core Memory groups open as pages (no <details> drop-downs).
- Slimmer controls everywhere: rows, inputs, selects and buttons are 42px, small actions 34px (was 56px / 50px / 44px).
- Permissions rows: name and status on the left, the action on the right.
- New: ember_menu.js / ember_menu.css (menu controller + look), ember_icons.js (one icon set), ember_hub.js / ember_hub.css rewritten.
- app.js: old card "subpage" code removed (key provider drill and Memory groups now use the same page system).
- Brand: S.O.I. x Bojack line at the bottom of the side panel, Ember-accent to blue hairline under the headers.
Not run on a phone or in a browser (no test pass this build).
~~~~~~~~

## RELEASE_1_10_10.txt

Original file(s): RELEASE_1_10_10.txt, docs/history/RELEASE_1_10_10.txt

~~~~~~~~text
EMBER 1.10.10
- One Settings button in the header (gear). The 5-card Actions dropdown is gone. The gear opens the side panel; the side panel routes to every sub-option.
- "Open classic settings" button removed from the side panel. The old keys side panel no longer opens.
- Ember now shows a flashing blue dot IN FRONT of her name (a real element, not a pseudo-element, and not stopped by reduce-motion). The three lights under the name are hidden.
Not run on a phone.
~~~~~~~~

## RELEASE_1_10_9.txt

Original file(s): RELEASE_1_10_9.txt, docs/history/RELEASE_1_10_9.txt

~~~~~~~~text
EMBER 1.10.9
- One Settings: the old "All Settings" list no longer appears. Side-panel rows open straight to their page; Back returns to the side panel.
- Media engines (and any sheet opened from Settings) now opens ABOVE the Settings panel. It was opening underneath, which is why it looked dead.
- Permissions, Voice & Background rows rebuilt as clean two-line rows.
Not run on a phone.
~~~~~~~~

## RELEASE_1_10_8.txt

Original file(s): RELEASE_1_10_8.txt, docs/history/RELEASE_1_10_8.txt

~~~~~~~~text
EMBER 1.10.8
- Removed both "Get a key" cards (Engine Keys & Providers, Web Scraping).
- Settings card titles no longer squash: the title sits on its own line and the provider list wraps underneath (ember_v104.css, ember_ui.js).
~~~~~~~~

## RELEASE_1_10_7.txt

Original file(s): RELEASE_1_10_7.txt, docs/history/RELEASE_1_10_7.txt

~~~~~~~~text
EMBER 1.10.7
- Provider bar "Next <engine>" indicator: the spinning ring around the blue dot is gone. It is now a plain blue dot that flashes (faster while a reply is being made). No other UI changed.
~~~~~~~~

## RELEASE_1_10_6.txt

Original file(s): RELEASE_1_10_6.txt, docs/history/RELEASE_1_10_6.txt

~~~~~~~~text
EMBER 1.10.6 (repackage of 1.10.5, no feature changes)
- Version bumped so the build is a real update over 1.10.5 / 1.10.4 (package.json, service-worker cache name, Settings version line).
- Zip layout: package.json, .github/workflows/build.yml and www/ at the top level. Checked with ember_deploy.sh.
~~~~~~~~

## RELEASE_1_10_5.txt

Original file(s): RELEASE_1_10_5.txt, docs/history/RELEASE_1_10_5.txt

~~~~~~~~text
EMBER 1.10.5
- Command Centre widget (bottom of Settings): token, brain repo, search, write to brain and push, media, live terminal
- + menu: Create audio, Create video, Stability bridge toggle
- Brain can be the push target
NOT run on a phone or against live providers. Browser test (tests/v1105-browser-test.js) passed 27 of 28 checks before the last fix; last check not re-run.
~~~~~~~~

## RELEASE_1_10_4.txt

Original file(s): RELEASE_1_10_4.txt, docs/history/RELEASE_1_10_4.txt

~~~~~~~~text
Ember V1.10.4 (on V1.10.3)
IMPLEMENTED + browser-checked (headless Chromium 360x780): Settings scroll fix (ember_v104.css). Cause: ember_acc.css display:block!important beat ember_v96.css flex/overflow:hidden, so Settings pages could not scroll.
IMPLEMENTED, syntax-checked only: Live Terminal richer (ticker, tags, ms timings, filters, Copy, auto-open) fed by ember_v104.js from tool calls, engine tries/skips/switches, picture/PDF/web/GitHub steps; app.js emits ember-tool-log.
IMPLEMENTED, syntax-checked only: + > Create PDF (one-shot PDF artifact; Save PDF builds the file); + > Create image now always beats the AI Features media hand-off.
NOT DONE (planned): Stability in the image router; media button feedback/confirm fix; GitHub + Features merged into Command Centre and removed from Settings; brain repo as push target (runner rule brain != output unchanged). No live provider, GitHub or APK test.
~~~~~~~~

## RELEASE_1_9_102.txt

Original file(s): RELEASE_1_9_102.txt, docs/history/RELEASE_1_9_102.txt

~~~~~~~~text
Ember V1.10.0 (was 1.9.102) - Ember Hub (new right-hand side panel), on top of V1.9.101
- NEW: tapping Settings in the header dropdown opens a right-hand side panel (Ember Hub). Existing Settings screen, tabs, cards and saved settings are NOT modified.
- Ember Command Centre is pinned at the top of the panel as a live widget (memory files, terminal state, log lines, three-phase thought summary) with Open Command Centre and Repos & Brain buttons.
- API Keys row drops down every provider with its logo, key count and state. Tap a provider to see its keys (masked only), Check keys, or Manage.
  Search/scraping/GitHub/Audd keys are listed underneath (names and counts only).
- All nine Settings sections are listed as option rows; each opens the original Settings screen on that section.
- "Open classic settings (unchanged)" opens the original screen. Programmatic opens by other features still go to the classic screen.
- Close: X, tap outside, Escape, or swipe right.
- New files: www/ember_hub.js, www/ember_hub.css. Edited: www/index.html (2 tags), www/sw.js (cache name + file list), package.json (version).

GitHub, one panel (added in the same release)
- NEW: "GitHub · Brain & Repos" row in the Ember Hub, and the Command Centre's "Repositories & Brain" button, open ONE panel (www/ember_gitflow.js / .css):
  1 Token & Brain  : save token, check access, set Brain repo, "Load brain into Ember" (sets it and runs a forced sync).
  2 Find & add     : search GitHub or list your own repos, Add whole repos, add by URL, remove linked repos, "Use as output" for your own repos.
  3 Clone & push   : set output repo, "Clone & push update" (two taps; publishes runner + repo list to the output repo and starts the clone on GitHub Actions), "Check run status".
- Control Panel sync: the Command Centre gets a live "GitHub · Brain & Repos" card and the Hub widget shows the same line (brain, files, last sync, linked repos, output, token). Panel actions also write to the Command Centre terminal.
- It only drives EmberGithub and EmberRepoRunner. The original GitHub tab and Features > Repo Runner are untouched (reachable via "Open classic GitHub settings").
- Cloning/pushing happens on GitHub Actions in your output repo. A browser/phone cannot run git clone, and nothing is force-pushed.

BUILD FIX (why no APK since 1.9.100)
- scripts/apply_android_patch.py refuses any minor/patch above 99 (versionCode = major*10000 + minor*100 + patch).
  package.json said 1.9.101, so the "Apply Ember native patch" CI step exited non-zero and no APK was built after 1.9.99.
- package.json is now 1.10.0 (versionCode 11000, higher than the installed 1.9.95 = 10995). Next releases: 1.10.1, 1.10.2 ... up to 1.10.99.
~~~~~~~~

## RELEASE_1_9_101.txt

Original file(s): RELEASE_1_9_101.txt, docs/history/RELEASE_1_9_101.txt

~~~~~~~~text
Ember V1.9.101 - render fix on top of V1.9.100
- Service worker cache renamed (ember-v1.9.101-right-panel) and now lists ember_v96_ui.css/js, so the new UI is no longer served from an old cache.
- index.html loads ember_v96.css, ember_v96_ui.css and ember_v96_ui.js with ?v=1.9.101 to defeat stale WebView caches.
- Header icon rules scoped to #bHist and #bActionMenu only (they were leaking into menu rows and the footer Providers button).
- All six dropdown rows (Command Centre, API Keys, Browser, Termux, Settings, AI Features) share one layout: coloured emoji tile + text.
- Footer Providers button: no more oversized clipped label.
- Provider logos: bundled provider-icons SVGs shown on a full-size app-icon tile with the provider name beside them.
~~~~~~~~

## RELEASE_1_9_99_UI_REFINEMENT.txt

Original file(s): RELEASE_1_9_99_UI_REFINEMENT.txt, docs/history/RELEASE_1_9_99_UI_REFINEMENT.txt

~~~~~~~~text
Ember UI refinement (based on the complete supplied project)

- Header controls are now in one animated actions dropdown, including the Ember Command Centre, Browser, Termux, Settings and AI Features.
- Settings categories and individual settings cards navigate into right-side detail views with back navigation. Existing right-hand Command Centre widget and bottom chat layout are retained.
- API-key provider rows open isolated right-side detail views. Provider marks are bundled locally with provider names, and work offline.
- Removed the AI/status chip from the lower-left chat footer. Added a centered Ember title with three blue lights pulsing left-to-right from larger to smaller.
- Added the new action-menu script and provider marks to the service-worker offline cache; cache version bumped.

Checks: UI refinement, settings right-panel, Command Centre, and workspace regression suites passed. Browser smoke checks verified the action menu, Command Centre, Settings and provider-key navigation. The pre-existing Node browser-test script could not run because it hardcodes a Playwright module path unavailable in this sandbox; equivalent interaction smoke checks were run with Python Playwright.
~~~~~~~~

## RELEASE_1_9_97.txt

Original file(s): RELEASE_1_9_97.txt, docs/history/RELEASE_1_9_97.txt

~~~~~~~~text
Ember V1.9.97 — Header placement refinement

- Added a pulsing blue status light after Ember's name in the main chat header only.
- Kept the Settings title free of the blue light.
- Improved right-side header action alignment, spacing, icon sizing, focus visibility, and narrow-screen fit.
- Preserved the existing theme colours and existing button IDs/actions.

Verification: CSS syntax/selector review and ZIP integrity checks performed. Full browser and Android runtime testing has not been performed.
~~~~~~~~

## RELEASE_1_9_95.txt

Original file(s): RELEASE_1_9_95.txt, docs/history/RELEASE_1_9_95.txt

~~~~~~~~text
EMBER V1.9.95 — COMPLETE SOURCE RELEASE
Based on the uploaded ember-V1_9_94-routing-media.zip. No original project files deleted.

WHAT CHANGED
1. Floating Stop removed. Compact Stop sits at the right of the thinking row in
   rotating, dropdown and timeline displays. Fallback reasoning has its own real
   stop endpoint. Keyboard Enter/Space activates Stop instead of toggling its row.
   Stop cancels chat routing, read-first retrieval, native response handoff and the
   reasoning state machine; it releases the composer even if a provider ignores
   abort. Late results are discarded. Cancellation does not undo remote writes,
   already-dispatched Actions jobs or already-started independent media downloads.
2. Provider indicator, provider name, Providers menu and AI shortcut now occupy a
   compact bar below the message input, not the crowded header. Existing provider
   status handlers remain attached to the same nodes. Menu opens upward and is
   bounded to the viewport. No floating jump-to-bottom arrow is created.
3. GitHub and Features now contain the SAME repository workspace, moved between
   entry points, not duplicated forms. The existing token and settings namespaces
   are retained. Apply Brain accepts owner/repo and GitHub URLs. A Brain change
   updates all live knowledge tools and the runner manifest sources, invalidates
   old read proofs, and retains other staged sources. Every source is whole-repo.
4. Repo discovery offers authenticated Search, My repos, Previous/Next, Add whole
   repo, Apply as Brain, and Use as Ember output when push permission is reported.
   Direct owner/repo/URL entry also works. Results and linked sources use separate,
   vertically spaced cards with wrapping action rows. Enter submits search/add.
   Search, staging and local settings do not write to GitHub.
5. Output selection persists and is shared by Repo Runner and Command Centre.
   Save -> Install/update commits 3 managed files atomically on the default branch,
   provisions an encrypted Actions secret and dispatches the whole-repo sync.
   Sync verifies that the committed manifest matches the current sources/settings.
   Run status reads GitHub workflow runs, not guessed success. Install/sync require
   confirmation; errors and cancellation are shown. Whole sources remain isolated
   snapshots under external/, not automatically merged into app entry points.
6. Command Centre docks to the right without covering chat at >=1100px. Smaller
   screens use a right-side drawer with backdrop, background inertness, focus
   containment and Escape close. Resizing/rotation updates modal semantics.
   Repository workspace and runner-status actions use the same saved config.
7. New workspace files and previously missing routing/media/download modules are
   included in the offline app shell, with a new cache version.

SAFE REPOSITORY ROLES
Brain = the complete repository used by live knowledge/file reads and an always-
included runner source. Ember output = the existing repository receiving managed
snapshot files and the build/sync workflows. Extra discovered repos = staged whole
sources. Output cannot also be a source/Brain (prevents recursive self-copy).
Applying a Brain is a local configuration change; Check access verifies its token
permissions. Live reads/grep can disclose continuation limits, excluded secret,
binary or oversized files, and submodules; no false unlimited-coverage claim.
Private sources cannot be copied into a public output. No force-push. Source
package hooks are not executed by the snapshot runner. Review licenses first.

HOW TO USE
- Unzip the complete ember-V1_9_95 folder. Use the included existing PWA/server or
  Capacitor build workflow; this is source code, not a newly compiled APK.
- Open Settings -> GitHub / Brain & Repo Runner (also accessible under Features).
- Your existing saved GitHub token is reused on the same browser/app origin.
  If starting on a new origin/device, paste it into GitHub token and Save token.
  Check access. No real token is shipped in this release.
- Apply the desired whole Brain using owner/repo or its GitHub URL.
- Search repositories or choose My repos. Add whole sources; choose your existing
  writable Ember output via Use as Ember output or the output field.
- Select the existing build workflow filename. It must support workflow_dispatch.
  If no build workflow exists, uncheck Dispatch build after source updates first.
- Save settings, then Install/update + sync + build, and approve the GitHub writes.
  Check Run status or the Command Centre terminal. Dispatch is not build success.
- After changing sources/Brain/build settings, Install/update again before Sync.
- Token access: source Contents read; output Contents, Workflows, Actions and
  Secrets write (or corresponding classic token scopes). Protected branches,
  disabled Actions or organization rules can still reject a live installation.
- Browser run: npm install, then npm run serve. Tests: npx playwright install
  --with-deps chromium, then npm run test:release. PW can override Playwright's
  module location. Capacitor Android tooling remains as in the original project.

VERIFICATION
262 assertions passed across 11 release suites (tests/release95/release-tests.log):
  23 new workspace configuration/security checks
  35 Knowledge Brain checks
  29 whole-repo/local-git integration checks
  17 Command Centre static checks
  23 routing/provider/security checks
  12 local download bridge checks
  44 new Chromium workspace/layout/cancellation checks
  15 existing live-Brain Chromium checks
  18 existing Repo Runner Chromium checks
  24 Command Centre Chromium checks
  22 routing/media/download Chromium checks
All www/*.js files passed node --check. Layout checked at 320, 390, 768 and 1440px.
Real bundled libsodium sealed-box encryption was exercised. Local git clone,
commit, update and push behaviour was exercised against local bare test repos.
GitHub, AI providers and media endpoints were MOCKED. No live user token was
available here, no real repository was pushed, no paid media was generated, and
no APK/native Android compilation or device execution was performed.

LEGACY TEST NOTE
The old npm test command still includes tests/app-test.js, whose hidden pre-
accordion .stab click times out. The same failure was reproduced in the untouched
uploaded V1.9.94 project; before/after logs are included. It is not represented as
a passing full legacy suite. Use npm run test:release for the 11 verified release
suites. Existing runner browser tests were updated to accept the new explicit
write-confirmation dialogs. Command Centre tests now test desktop docking and
mobile modal focus. Preservation hashes now reference the actual uploaded V1.9.94
files; the deliberately modified Stop renderers are tested as modifications,
not falsely labelled unchanged.

DELIVERABLE CONTENTS
Complete original project plus updated source, new regression tests, this change
report, test logs, actual browser screenshots, and FILE_INTEGRITY_1_9_95.json.
No node_modules, browser binaries, or development scratch scripts are included.

CHANGED ORIGINAL FILES
  package.json
  www/ember_github.js
  www/index.html
  www/ember_think_inline.js
  www/ember_github_ui.js
  www/ember_repo_runner.js
  www/style.css
  www/ember_v79.js
  www/ember_command_center.js
  www/app.js
  www/ember_timeline.js
  www/sw.js
  tests/v1992-repo-runner-browser-test.js
  tests/command-center-test.js
  tests/command-center-preservation.json
  tests/command-center-browser-test.js
~~~~~~~~

## RELEASE_NOTES_V1_9_91.txt

Original file(s): RELEASE_NOTES_V1_9_91.txt, docs/history/RELEASE_NOTES_V1_9_91.txt

~~~~~~~~text
EMBER 1.9.91 — WEB ROUTING AND PRIVATE DELIVERABLES

WHAT CHANGED
- Keys-only installs with no explicit scraping preference expose scraping automatically.
- Explicit OFF remains OFF. When a page read is requested with saved keys but scraping OFF, Ember asks permission before turning it on.
- Explicit read/scrape/summarise/review requests with URLs run a real page fetch BEFORE the answer model. Up to two links are prefetched per turn. Other links and saved-site names retain the existing tool route.
- Existing saved-key rotation/failover remains in place. A named provider is forced through the existing via parameter. The free reader remains a fallback, not a replacement for saved keys.
- Actual provider/cached status appears on the thinking timeline. Source provenance is recorded with the answer. Provider secrets are never injected into prompts.
- The scraper tool no longer disappears merely because the saved-sites module is absent.
- PDF/Word/report requests get a 4096-token output allowance, including post-tool synthesis, rather than the former 350/450-token limits. Complete prose-only deliverables can be repaired into artifact cards; refusal/missing-input messages and malformed JSON are not packaged as completed files.
- Ordinary report citations and document artifact filenames no longer trigger the code-answer read-first blocker. User code questions and executable code artifacts still require the existing repository proof.
- Ember PDF uses bundled pdfmake 0.2.20 plus embedded Roboto fonts, with the original basic PDF writer as fallback.
- Ember Documents exports genuine Office Open XML .docx using bundled docx 9.5.1. A clearly announced legacy .doc HTML fallback remains if that engine fails.
- Original Markdown, HTML, JSON, CSV, SVG and code artifacts remain available.
- Removed the unverified anonymous cloud PDF endpoints. Document EXPORT does not upload the document to a renderer. AI drafting still uses the configured chat provider and its existing terms/quotas.
- App/service-worker version updated; all 76 cached assets exist, including the local export libraries. No CDN fetch is required at runtime.

FREE / NO-SIGNUP MEANING
The PDF and DOCX exporters are local open-source libraries, not a supposedly unlimited hosted API. No exporter account or key is needed, and no per-export service charge is introduced. Existing chat/scraping providers still have their own signup, access, billing and rate-limit rules. Jina/public readers are third-party limited fallbacks, not guaranteed unlimited services. Font coverage is not universal.

BRANDING
The UI can call these capabilities Ember PDF and Ember Documents: Ember owns the integration/workflow. pdfmake, docx and Roboto attributions/licenses are retained under www/vendor. Do not claim Ember invented those underlying engines or that third-party scraping results are an Ember-owned web service.

RUN / UPDATE
This is a source release, NOT a compiled APK or an update already installed on your device.
For the browser/PWA: extract the project and run node serve.js 8080, then open http://localhost:8080. Use the same origin/port as before to retain that origin's stored settings. Refresh once online so the new service worker can cache the assets.
For an existing Android project: apply these source changes, keep your signing identity and existing native setup, then use your normal Capacitor sync/build process. The original android_patch/ and build instructions are preserved. See docs/ANDROID_BUILD.md. Do not uninstall the installed app or clear storage just to apply this patch; that can delete saved keys/documents.
If scraping is explicitly OFF, turn on Settings > Scraping or accept Ember's permission prompt when requesting a page read.
If network providers fail in a browser because of CORS, provider access controls or quota, the app reports failure/fallback. No unauthenticated proxy or access-control bypass was added.

TRY
Read https://example.com using Firecrawl and summarize what the page says.
Create a Word document with a title, sections and a comparison table.
Create a PDF report from this text: [your content].
Open a document artifact: Save PDF or Word .docx.

VERIFICATION
- 32 new routing/consent/artifact unit checks passed.
- 13 new real-Chromium integration checks passed: real saved-key request with mocked service, source text reaches model, 4096-token budget, artifact repair, real PDF and DOCX buttons, no document upload, no runtime errors, offline exports, and a fresh offline reload loading the providers from the service-worker cache.
- Binary verification: PDF text extracted successfully, Cyrillic/Greek/accented Latin preserved with bundled fonts, DOCX ZIP/XML/table/hyperlink structure validated.
- Existing scraper suite: 74 passed; existing repository unit checks: 35 passed; existing repository browser checks: 15 passed.
- Other targeted existing suites passed: artifact parser, provider fallback, streaming/cancellation, document context, safety, key extraction, background handoff.
- The full legacy npm test run is NOT all-green: app-test.js times out on an obsolete hidden Keys-tab selector. Reproduced on the original untouched 1.9.90 archive. The agent suite retains two pre-existing failed expectations (YouTube tool list and person-search wording), also reproduced on original 1.9.90. Its OFF-state fixture was updated to explicitly turn scraping OFF because keys-only mode now auto-enables.
- Historical cloud-PDF integration tests target the removed endpoints and are not certification of this release.
- Your real API credentials, account limits, live provider permissions, and Android APK compilation/device save flows were NOT tested. Service calls in browser tests use fake credentials and mocked responses. Test those on your device before deployment.
- Very large documents can still hit the chat model's context/output limits; split larger work into sections. Artifact repair cannot make weak or incomplete model writing factually correct.

TEST COMMANDS
npm run test:deliverables
npm run test:deliverables:browser  (requires Playwright and its Chromium/system dependencies; PW can point to an existing Playwright module)
npm run test:brain
npm run test:brain:browser
node tests/scrape-test.js

SOURCES
https://github.com/bpampuch/pdfmake
https://github.com/dolanmiu/docx
https://jina.ai/reader/
~~~~~~~~

## CHANGELOG_V1_9_50.md

Original file(s): CHANGELOG_V1_9_50.md, docs/history/CHANGELOG_V1_9_50.md

~~~~~~~~text
# Ember V1.9.51 — Thinking stability and plus alignment

This is a focused update to the supplied V1.9.49 thinking-dropdown patch. The app retains its existing dark/orange design, provider routing, tools, attachments, native patches, and build workflow. The package/cache release identity is V1.9.50 for this source ZIP.

## Thinking text

The live spinner display now updates one existing text node rather than overlapping outgoing and incoming text with a vertical 3D flip. Its status row has a fixed height and uses a single line with ellipsis for long provider/model names. The full progress text remains available in the saved “Thought for…” history.

The spinner continues to rotate normally. Compact-dropdown rows no longer replay drop animations on every update, and new Summary rows fade in without translating vertically. Progress scrolling is immediate rather than repeatedly restarting smooth-scroll animations; timeline paints do not force a reader of older messages to the bottom. The live card does not shrink in the chat’s flex layout and survives unrelated chat/download rerenders without restarting its spinner.

The rotating status is the first view. Tapping the row or its chevron now expands the dots-and-icons timeline in the same card; tapping it again collapses the details. The switch control remains available for the compact alternative, and the expanded control also supports Enter and Space keyboard activation.

The previous 250px scrollable-history cap and provider/model retry deduplication remain intact. Reduced-motion preferences disable the spinner and entry animations.

## Plus control

The add button now has the same 38×38px size as the Talk, Mic, Stop, and Send controls. Its two-bar cross remains geometrically centered, including when it rotates into an × for the open menu. Alignment stays centered when the message input expands to multiple lines. Menu actions, attachments, chips, and keyboard dismissal are unchanged.

## Version and build

Package metadata, the in-app version label, and the service-worker cache are updated to V1.9.50 so a PWA update uses the new asset cache. This ZIP contains the full source project, not a compiled APK. Use the existing README and Android build instructions to rebuild/sync the app; replace the project files rather than installing this ZIP directly as an APK.

## Regression checks

A new `tests/v1950-ui-stability-test.js` browser regression checks text/node stability, header geometry, rotating-first expansion into the dots/icons timeline, plus alignment for empty/single-line/multiline input, menu rotation and dismissal, same-label tool failure/recovery, rapid updates, escaped text, history caps, style cycling, retained live DOM across chat rerenders, and reduced motion at viewport widths 320, 360, 390, 430, and 760px.

Run it with Playwright available using `npm run test:ui-stability`, or set `PW` to an existing Playwright module path. `CHROME` optionally selects a Chromium executable; `WWW` optionally selects a different source web folder.

Verification results and limitations are recorded in `UI_FIX_VERIFICATION.md` after testing. Android hardware/WebView verification and a native APK build are not performed in this source repair.
~~~~~~~~

## CHANGELOG_V1_9_48.md

Original file(s): CHANGELOG_V1_9_48.md, docs/history/CHANGELOG_V1_9_48.md

~~~~~~~~text
# Ember V1.9.48

## Included
- Restored the original charcoal/black and orange Ember visual palette; no global white-theme override was introduced.
- Refined the chat composer into a tighter rounded pill with clearer focus, send, and stop states.
- Added a live routing state to the provider pill while an engine/model is being attempted.
- Added OpenAI-compatible SSE token streaming for normal chat completions when the provider supports streaming and the request does not require JSON or native tool calls.
- Added a Stop control that aborts active fetch/SSE work and prevents routing from continuing to another provider after the user cancels.
- Preserved automatic provider fallback, rate-limit cooldowns, pinned-engine behavior, native background handoff, and existing chat history.
- Added `tests/streaming-routing-test.js` for streaming chunks and cancellation, and updated the abort regression test to expect explicit cancellation.

## Verification
- JavaScript syntax checks passed for `www/providers.js`, `www/persona.js`, and `www/app.js`.
- Passing focused tests: routing fallback, streaming/cancel, safety, key scan, handoff, scraping, and several regression tests.
- Full `npm test` cannot complete in this environment because Playwright is not installed. Some browser-based tests were therefore skipped. Live provider credentials and Android device behavior were not verified.

## Streaming scope
Streaming currently applies to OpenAI-compatible provider calls when there are no native tool declarations and the request is not JSON mode. Providers using different streaming protocols (such as Gemini/Cohere) continue to use their existing non-streaming response path, but can still use routing fallback. The Stop button cancels supported in-flight network/stream work.

### Follow-up routing correction (2026-10-27)
- Tool-result synthesis now carries the provider and model that issued the tool call, and the router keeps that follow-up on that same provider/model rather than restarting the general fallback order.
- If the original provider cannot continue the tool-result turn, Ember returns an explicit failure instead of silently starting another full routing chain.
- Added `tests/tool-followup-routing-test.js` as a regression check for the fixed-route handoff.
~~~~~~~~

## docs-CHANGELOG.md

Original file(s): docs-CHANGELOG.md, docs/history/docs-CHANGELOG.md

~~~~~~~~text
## V1.9.89
- Routing: a permanent 4xx from one model or key (400, 402, 404, 413, 422) no longer aborts the whole route. The router records it and moves to the next model, key and engine, with Free Mode last. A pinned engine is still strict and shows its real error.
- Puter: provider-prefixed model ids (openai/gpt-5-nano and similar) are also tried; a rejected token now says where to copy it (puter.com/dashboard > Account > Auth Token).
- The toast ("Switched to ...", saved, copied) now floats just above the message box instead of on top of the header and the orange engine pill; long text wraps to three lines.

## V1.9.88
- GitHub: repo slots can be pinned; a full set replaces the oldest unpinned repo after you confirm (Add is never greyed out).
- GitHub: Ember reads the files your message points at before she answers (Read first), shown in the thinking card.
- GitHub: cloud runner wording only appears in Setup > Advanced.
- Add-ons sheet removed (Settings: Music; Media engines moved to Engine Keys). GitHub pill removed; repos work in chat once linked (switch in GitHub Hub > Home).

## V1.9.86
- Download card ("Saved to your phone") is no longer clipped to its header row: the chat column used to squeeze it. It now keeps its full height (file name, bar, status).
- A finished download gets a green Play button, in the chat card and in the Music > Get jobs list. It finds the track in the library (scanning Music/Ember if it is not listed yet) and plays it in Ember's player.

## V1.9.85
- Left menu: the tabs now read Prompts, Chats, Projects (Prompts first, Chats second).
- Left menu: Usage removed. It is now a Usage card in Settings > General (replies per engine, today and this week).
- Left menu: Notes removed. Notes is now the first row in Browser > Documents and opens the same Notes sheet.
- Settings > Keys > Provider names: the "tap to rename" line, the rename boxes and Reset names are gone. The card is just the engine names in padded rows. Names saved by the old rename boxes are cleared so every engine shows its real name.

## V1.9.84
- Settings is a vertical accordion: 7 slim rows with longer names and a one-line description each; tap one to open its cards under it (one open at a time, plain Settings opens folded). Header: close button, "Ember" (the AI's own name) over "Settings", the app icon on the right edge. Neutral grey controls, thin hairlines, no coloured top bars, slimmer buttons and fields. The old tab strip is hidden but still drives the sections, so every shortcut into Settings still lands on the right one.
- Reply actions: Save, Save .md and Note removed. Copy is grey, Again is orange.
- GitHub pill by the message box: off by default; on = Ember's GitHub tools (read, and write where a repo slot allows) reach the AI.
- Blue accent #3d8bff on switches, text fields, the composer focus ring, chips and selections.
- Puter has a real token slot (Settings > Keys > Puter): paste, Save token, Check, Remove. No email, no sign-in window, nothing opens in a browser.
- Settings > Keys > Provider names: the name, a "Tap the box below to rename" line and the box each sit on their own line, so nothing is squeezed or cut off.
- Left menu: Imagine removed. "+" > Create image routes the next message to Pollinations (flux, no chat engine) and Ember answers with an HTML artifact: the picture, her thought process (live in the thinking card and saved in the artifact), the prompt sent and the settings. One-shot: it switches itself off after the picture.
- "+" menu: Paste, Copy and Device tools removed (Device tools now live in Settings > General). New Think group in this order: Reasoning, Go deeper, Learn, Spark.
- Modes pill by the box (shows the current mode): Chill, Sharp and Deep sit inside it.

## V1.9.83
- Add-ons sheet: 25 more tiles (46 total) across Create, Research, Connect, Automate, Modes. New tile kind Runs for one-tap actions (Spark, Go deeper).

## V1.9.82
- Settings is more spacious: bigger gaps between cards and rows, roomier tabs, taller inputs, buttons and switch rows, easier-to-read hint text. CSS only.

## V1.9.81
- Egg on the empty screen = the Ember app icon (inline SVG, breathes slowly). The old orange orb styles no longer apply to it.
- Flashing blue dot beside Thinking in every thinking style, the live row and the top engine pill; live status text defaults to "Thinking…".
- "+" menu: new top row More add-ons opens a Manus-style Add-ons sheet (search, categories, Recent, Opens / Mode / Starter tiles). Modes: Web Search, Reasoning, Code Mode, Device Access. Starters: Make a PDF, Build a page, Slide deck, Wide Research, Timer / Reminder.

## V1.9.80
- Puter: auth token as the key via https://api.puter.com/puterai/openai/v1 (OpenAI-compatible). Removed the puter.js sign-in path. Paste & detect files a bare Puter JWT under Puter; Puter is in the manual provider list; Get-key button opens the Puter dashboard. Chat models only (embedding, image, audio models skipped); no temperature sent.
- Fixed: pinned Puter said "no Puter key is saved" because the old build never stored a real key.
- UI: user bubbles compact (text and time on one line); Ember reply actions are one row of equal pills with the time above; left panel rows compact and the Music Console bar is raised, brighter, shows the track and has a play button; composer is one slim dock (chips scroll sideways, modes row hides while the keyboard is open); the empty-state egg is the Ember logo SVG; key groups show "N working" and wrap long text.
- GitHub: EmberGithub.stateBlock() always describes the GitHub Hub (before: nothing was sent until a token and a slot existed) and persona.js includes it even when no tool set is on.

# Ember V1.9.77
- Interface pass, Manus-style: calmer black canvas, wider gutters, softer cards, pill buttons, one orange accent. Pure CSS (final layer at the end of style.css), no logic changed.
- Chat box is black again (an old white-composer rule was winning). Header buttons are an even 38px round set: the Termux icon is no longer squeezed and the engine name is never cut.
- Replies: clean sans text, 1.75 line height, real spacing between paragraphs, lists and code; bullets no longer hang off the edge; action row wraps into thumb-sized buttons. Your own messages are a soft right-aligned bubble.
- Music > Get: the three tabs stay on one row, Track / List playlist / Whole playlist and the Downloads and Saved cards no longer crush; sections have room.
- Drawer, Prompts, Projects, Settings tabs and cards: roomier padding and consistent radii.

# Ember V1.9.76
- Learn add-on (www/ember_learn.js): teach Ember from links. Plus menu > Learn, or just ask in chat. Pages are read through the existing scraper (your keys and provider order apply) and saved into Documents, so the normal document search finds them. Nothing is trained.
- Learn from a document: pick a saved document (e.g. a research .md) and Ember learns every link in it. GitHub repo links become Reference repo slots (needs your GitHub token, then sync in Settings > GitHub); without a token the repo page is read as a plain page. github.com/.../blob/... links are fetched as the raw file.
- New tools: learn_url, learn_from_document, list_learned, refresh_learned, forget_learned. Learned documents start with an untrusted-content header. Re-learning a link updates its document instead of duplicating it. Refresh all / Forget in the panel.
- Wired with one line each in app.js (tool catalog + dispatcher), persona.js (tool list), ember_plus.js (menu), index.html and sw.js. Nothing existing was changed.

# Ember V1.9.75
- GitHub Hub: new Settings > GitHub tab with Home, Repos, Sync, Files, Activity and Setup views (www/ember_github_ui.js). The old GitHub card in Keys now points to it.
- Repo SLOTS (12): add owner/name or a github.com link, or pick from your own account. Per slot: nickname, branch, Mine (read+write) or Reference (read-only), write switch, sync switch, depth (Map only / Key files / Deep read).
- Sync runs straight from the token, no runner: branch head check, full file tree (the index), only changed files re-read, then a repo profile built by code (stack, folders, key files). Master sync switch, auto-sync with interval, Sync all, Stop, Re-read all, Clear cache.
- Live view: per-repo progress and a live feed of every file indexed, read, new, changed or removed, with filters and recent sync history.
- Files view: browse the synced index, search paths or code, open a file, copy it, open it as an artifact. "Open report as artifact" on Home.
- AI knowledge: the repo profiles and hard rules go into her instructions (ground truth, read before explaining or editing, no invented paths, no placeholder pushes, say only what tool results say, professional report style, deliver as artifacts).
- New tools: github_repos, github_sync, github_repo_map, github_find. github_read_file / list_files / write_file take a repo and pick the slot from his words. Writes refuse files not read this session, files changed since, truncated or placeholder content, and big accidental shrinks.
- Activity tab logs every GitHub call the AI makes. Thinking card shows live labels for the new tools.
- The Actions runner is now OPTIONAL and off by default (Settings > GitHub > Setup).
- Secrets in cached file text are masked; .env and key files are never read.
- Not run or device-tested in this build (syntax check only).

# Ember V1.9.74
- Repo reading: Ember now has to read a file after repo_search. New hard rule in the system prompt (persona.js, only when a repo is linked and repo_read_file is available): if repo_search returns a list of files it MUST use repo_read_file on the most relevant one before answering, and it never writes code based on assumptions. Same rule in the repo state block and in the repo_search / repo_read_file tool descriptions.
- repo_search results now say, in the result itself, that they are paths only and a repo_read_file call must follow.
- repo_read_file uses the path exactly as given. If the path does not exist it now fails with a clear reason plus `did_you_mean` (real paths this repo returned earlier, else a file-name search), so a guessed path like lib/scrapy/... gets corrected instead of ending the attempt.
- Test: tests/v1974-test.js.

# Ember V1.9.73
- OpenRouter removed entirely: provider entry, router order, key scanner / sorter, Settings dropdown and hints. A saved OpenRouter key or pin is ignored.
- Bojack easter egg card removed (chat reply, icon card and its CSS).
- Sting scraper: the endpoint is now a plain generic `https://` URL. Ember calls it with `?url=<page>` and sends the key as a Bearer / x-api-key header. Endpoints saved with the old `{key}` / `{url}` placeholders still work.
- Left-panel Music Console now shows the cover art (same artwork as the full player, 🎵 fallback).
- Lyric thought bubbles (`www/ember_lyric_thoughts.js`): while a song plays and lyrics are found, the persona sometimes has a passing thought about the current line. Shown as a thought bubble in the chat, not saved in the conversation. Uses the existing Lyrics switch. First thought 30-70 s into a song, then every 80-200 s, max 5 per song; paused in the background, with a panel open, during a reply or a crisis state. The last thought is given to the AI for 10 minutes so he can reply to it.
- Project Workspace (`www/ember_projects.js`): new Projects tab in the left drawer. Create a project (Name, Goal, GitHub repo link), open, edit, delete. The open project's name, goal and repo are added to the system prompt on every message (not during a crisis reply). Saved in localStorage `ember_projects`. A chip under the header shows the open project.
- Tests: `tests/v1973-test.js`; OpenRouter references removed from older tests and tools/diag.js.
- Not device-tested.

# Ember V1.9.72
- GitHub Classic token: new card in Settings > Keys (token + owner/name repo, Check token, Install runner). Stored in localStorage `ember_github`, never in backups, never shown to the AI.
- New `www/ember_github.js` tools (appear only while a token is saved): github_status, github_list_files, github_read_file, github_write_file, github_run, github_run_status, github_install_runner.
- Cloud runs: github_run dispatches the installed `Ember Run` workflow (Ubuntu, Node 20, Python 3.12, Java 17). The log is committed to the `ember-results` branch, files copied to `$EMBER_OUT` become a Release, and Ember reads both back. Live progress shows as one row in Thinking (GitHub icon, step name, % bar).
- Gates: writes need a push/save/commit message that mentions GitHub or the repo; runs need a run/build/test/compile message; the runner is only installed when asked (or by the Install runner button). Writes under `.github/` and content that looks like a secret are refused.
- UI pass (closer to Claude and Manus): warm near-black surface, neutral soft user bubble (was bright orange), Ember's replies as plain book-style text, calmer action row, blue flashing light beside the Thinking status, a steps counter (done/total) and a green tick on every finished step. Artifacts were already supported (<artifact> blocks: markdown, document, PDF, SVG, HTML, code, JSON, CSV).
- Reference repos: link up to 8 GitHub repos (Settings > Keys > GitHub > Reference repos, with one-tap suggestions: SWE-agent, Aider, OpenHands, github-mcp-server, MCP servers and SDK). Nothing is cloned. Tools repo_overview, repo_list_files, repo_read_file and repo_search read them live; public repos need no token (a saved token only raises the rate limit; repo_search needs it).
- Claude engine: new provider `anthropic` (Messages API, direct from the phone with the browser-access header). Model list comes live from /v1/models; replies stream; native tool calls work. It is PAID, so it is never in the automatic order: it answers only while pinned in the Providers chip. Pasting an `sk-ant-` key anywhere now files it as a Claude key.
- Version label, service-worker cache and package.json now agree (1.9.72).
- Not device-tested. Needs a Classic token with `repo` + `workflow` scopes. A public repo makes logs and Release files public.

# Ember V1.9.70
- UI: white on black with orange highlights everywhere (blue/cyan/purple accents removed).
- Thinking: no card, border or grid. The egg is the app icon (ember-icon.svg) with an orange arc orbiting it; it spins, then each step drops in one by one. Real icons per step: YouTube, Files, Termux, Globe (plus music, image, graph, egg for engines). Finished turns collapse to "Thought for Xs" with the same icon rows.
- Artifacts: real PDF files (new ember_pdf.js, offline, no libraries), Word (.doc) export, SVG preview + PNG export, documents shown as paper pages, dark Markdown viewer. Ember's prompt now creates pdf / document / svg / markdown artifacts.
- Bojack egg uses ember-icon.svg instead of the PNG.

## V1.9.69
- Removed the warm multicolor glow from the main chat canvas, made the textarea itself explicitly white, and changed composer focus/send accents to blue so the reply surface no longer reads orange.

## V1.9.68
- The live header now shows the current activity label directly, and the Thinking timeline gets a visibly pulsing blue light immediately beside its label (reduced-motion respected).

## V1.9.67
- Unified the Termux tab family with the same single active accent as other tabs and desaturated the music-tab emoji glyphs.
- Updated the chat easter egg to use the exact 512px launcher app icon asset.

## V1.9.66
- Extended the single-color active state to the Chill/Sharp/Deep lane selector as well as settings and navigation tabs.

## V1.9.65
- Unified tab styling to a single solid accent color, removing multicolor active gradients.
- Refined Ember’s actual Thinking timeline with a soft rounded dark panel, subtle orange accent, dashed connector, clearer activity nodes, and reduced-motion-aware active pulse.

## V1.9.64
- Restored the white reply composer against Ember’s dark canvas, with dark text, legible placeholder, cyan focus ring, and higher-contrast composer controls.

## V1.9.63
- Added structured artifact cards for assistant <artifact> blocks, safe downloads, sandboxed HTML Live Preview, a per-chat Artifact shelf, and Save .md for ordinary assistant replies.
- Markdown artifacts render headings, lists, inline links, tables and code; code artifacts include syntax coloring, Copy, and an Android-only Open in Termux action that copies code but never runs it.
- Added Save PDF via the browser print dialog for Markdown/HTML artifacts, chat context badges, filename-aware Writing activity status, and a reduced-motion-aware completion pulse. Existing Copy/Regenerate/Read-aloud actions remain.
- Added artifact-generation guidance to the assistant prompt for explicit deliverables. PDF export depends on the device/browser print-to-PDF facility; PDF-tagged output itself remains source content.
- Ember already offers Gemini and EasyVoice TTS voices with voice audition controls; no cloned/custom voice was generated or added.
- Added artifact regression tests, service-worker cache entry and app version bump.

## V1.9.61
- Added a blue live activity indicator/status in the header and a STOP control in both live thinking-card layouts. The control routes to Ember’s existing current-turn cancellation flow; it does not claim per-tool remote cancellation.
- Limitation: no Manus task-control endpoint is configured in this source project, so Pause and remote per-action stop are not implemented.
- Validation: JavaScript syntax checks pass. Existing checks requiring Playwright could not run because Playwright is absent in the supplied environment; no Android-device verification performed.

## V1.9.42
- **Fixed: "Thinking..." title losing letters ("Thi king...").** The animated gradient text (background-clip:text) rendered as a grey box on some Android WebViews. The title is now plain text with a colour pulse; reduced-motion respected.
- **One thinking card for every run.** The ReAct "Summary" card (ember_think_inline.js) used to be a second card that was wiped by every chat re-render and never saved. It now feeds the main card (EmberTimeline): thoughts, skipped / repeat / blocked actions, approval waits and the final step. Real tool calls still arrive through runTool(). The old card remains only as a fallback when no live timeline exists.
- **Dropdown behaviour.** Open while working, collapses 0.8s after a ReAct run ends and when the reply lands (saved "Thought for Xs" row, tap to re-open). Bigger header tap target and chevron button, soft open/close, accent sweep on the top edge while running.
- ReAct steps now persist in the saved row, including SKIPPED / REPEAT / BLOCKED pills and error text.
- Tests: `tests/v1942-thought-test.js` added, `tests/v1941-thought-test.js` made version-agnostic, `tests/v1928-test.js` still passes (20/20). Not tested on a device.

## V1.9.41
- Added a third optional Claude-like thinking display: animated three-dot indicator, live status line, expandable progress log, and a completed “Thought for Xs” summary.
- Preserved the existing Summary timeline and compact dropdown; the switch cycles through all three styles and saves the selected style.
- Uses observable progress notes and real tool events only; does not display or claim access to hidden internal reasoning. Reduced-motion preferences are respected.
- Added `tests/v1941-thought-test.js`. JavaScript syntax and targeted regression checks pass; Android-device verification not performed.

## V1.9.40
- Restored a dark composer with readable light text; removed the white input-pill regression.
- Moved Paste, Copy, Device, Reasoning, Spark, Go deeper and Normal mode into the + menu to reduce composer clutter.
- Rebalanced thinking-card accents toward neutral grey/white while retaining Ember orange as a secondary accent.
- Kept YouTube search/download tool labels in the timeline so real tool calls show search followed by download when both run.

# Changelog

# Ember V1.9.71
- Composer: + button inset and aligned with send; flat mic/talk icons; wider text column (Talk hides while typing).
- Knowledge Graph: Unicode-aware words (no broken fragments), no code/links/ids, English+Afrikaans filler skipped, only topics shared by 2+ sources, cleaner layout.
- Downloads: playlist jobs returned to Thinking; one row per download with live % bar; row keeps updating inside the saved "Thought for Xs" after the turn ends; direct NewPipe route only fires on real download requests.
- Thinking labels/icons now match the real action (play, pause, skip, library, timers, etc.).
- New tool play_song: library first, else NewPipe search -> save to Music/Ember -> play in Ember's player.
- Not device-tested.


## V1.9.45
- **Spinner style (the first card) now spins and rotates instead of dropping down.** The status-line display is a turning two-ring spinner with ONE status line. When the status changes, the old line rotates away and the next one rotates in (3D flip). The dropdown body, chevron and tap-to-open are gone from this style; the full list still shows in the saved "Thought for Xs" row after the reply. The DOM is kept between updates so the spinner never restarts or jitters. Reduced-motion: slow spinner + plain fade.
- **Summary card (the second card) drops down thought by thought.** Events that arrive in a burst (Reading your message, Quick lane, Loading the chat, Choosing the best engine, Asking ..., tool calls) used to land on screen all at once. New reveal queue in `ember_timeline.js`: the first thought shows at once, every next one drops in after its own beat (about 0.5s, faster when a backlog builds), the tool row shows RUNNING then flips to SUCCESS / FAILED in place, and "Thinking..." stays pinned at the bottom. Same queue feeds the compact dropdown. Nothing is lost: lines still waiting when the reply lands are kept in the saved row.
- A repaint in the middle of a drop (for example RUNNING -> SUCCESS) carries on the animation instead of snapping.
- Files: `www/ember_timeline.js`, `www/style.css` (appended CSS), `www/sw.js` (cache `ember-v1.9.45`), `package.json`, `www/index.html` version text.
- Tests: new `tests/v1945-motion-test.js`; `v1941` and `v1942` thought tests made version-agnostic and brought up to date with the V1.9.43 default style. NOT tested on a device.

## V1.9.39
- **Thinking card now follows the mockup.** While Ember works the card glows orange, the header shows a spark and shimmering "Thinking…", which switches to "Executing Tool…" while a tool runs. Rows drop in one by one. When the reply lands the header becomes a muted "Thought for Xs" and the card stays above the reply, collapsed (tap to open). Same look for the ReAct card (`ember_think_inline.js`), which now collapses 0.8 s after the run ends. Files: `ember_timeline.js`, `ember_think_inline.js`, CSS appended to `style.css`. Cache `ember-v1.9.39`.
- **Bug fixed:** the RUNNING pill and "Executing Tool…" never showed while a tool ran (the line was marked running after the repaint). `tool()` now repaints.
- Test `tests/v1928-test.js` updated for the new header text. NOT tested on a device.

## V1.9.38
- **White message box.** The reply box pill is white with dark text, grey placeholder and a light "+" circle; the orange ring shows on focus (`www/style.css`, appended CSS only). Cache `ember-v1.9.38`. NOT tested on a device.

## V1.9.37
- **Modifier bar shows every pill.** Paste, Copy, Device, Reasoning, Spark, Go deeper and Normal now wrap onto a second line instead of scrolling sideways, so Spark / Go deeper / Normal are no longer cut off at the screen edge (`www/style.css`, appended CSS only; same buttons, same behaviour). Cache `ember-v1.9.37`. NOT tested on a device.
- Checked against the UI concept in a real browser: Summary timeline (grey dot, terminal icon + pill, orange radar), orange tool card, provider rows (status dot, model, latency, Rate limited / Retry in Ns) and pills with orange glow all render as drawn. Cost per 1k tokens is still not shown: Ember has no real price data.

## V1.9.36
- **Two thinking styles.** Tap the arrows button on the thinking card to switch between the Summary timeline (dots, terminal icons, pills, radar) and the dropdown (shimmer "Thinking..." with text lines). Your pick is kept. The saved row above a reply follows the same style.
- **Richer steps on every reply** (`app.js`): Reading your message, Deep or Quick lane, Loading the chat and settings, Choosing the best engine, then "Asking <engine>", then "Got a reply from <engine> (model) in Ns", then the existing results note. Cache `ember-v1.9.36`. NOT tested.

## V1.9.35
- **Message box:** the "+" is now drawn with two bars (CSS), so it is centred in its circle instead of sitting skewed; it still turns into an x when open. Message box text 15px to 16px. Cache `ember-v1.9.35`. NOT tested.

## V1.9.34
- **Summary timeline design restored** in `www/ember_timeline.js` (grey dot = thought, terminal icon = tool call with RUNNING / SUCCESS / FAILED pill, orange radar = "Thinking..."). It had been replaced by a shimmer text panel. Saved row reads "Worked through N actions". CSS appended to `style.css`. Cache `ember-v1.9.34`. NOT tested.

## V1.9.33
- **A reply can no longer freeze on "Thinking…".** Cause found in the code: in Auto mode the router tries Free Mode, then every engine, key and up to 3 models in turn, each with its own 15 to 60 second wait, and the panel showed nothing while it did. Deep lane, Reasoning and long "step by step" asks make that worst. Now: (1) `app.js` gives every reply 100 seconds (`REPLY_MS`), then stops trying engines (`Prov.abortInflight`, new in `providers.js`) and shows "No reply after 100 seconds ... Tap resend, or pin a different engine"; (2) the thinking panel says which engine it is asking ("Asking Groq (model)…") through a new `ember-try` event, so a stuck engine is visible.
- Not changed: the engines' own timeouts, and the handoff to the background worker (it only runs when the app is in the background).
- Tests: new `tests/v1933-test.js` (4). NOT tested on a phone; I could not reproduce the freeze here, so the deadline is a safety net and the "Asking ..." line will show you which engine is slow.

## V1.9.32
- **Paste keys card (Settings > Keys, top)** (`www/ember_pastekeys.js`, markup in `index.html`, `.pk-*` in `style.css`). **Paste & detect** reads the clipboard (or use the box and **Detect** if the phone blocks it), the one key finder (`EmberKeyScan`) works out which key belongs to which provider, and only keys not saved yet are filed (chat engines are tested live, scraper keys join the rotation, Audd.io and EasyVoice go to their own settings). The result is a named list: provider, masked key, **NEW · saved** / **already added** / slot already has a different key.
- Key-like strings with no provider name beside them are never guessed. Each is listed with a provider picker and a Save button that files it under the one you pick.
- **Copy named list** copies every saved key as `Provider: key`, one per line, only when you tap it.
- `app.js`: exposes `window.emberToast` and `window.emberRenderKeys` for the card. Cache `ember-v1.9.32`, `ember_pastekeys.js` added to the service worker list. Existing paste boxes (Keys notes, Notepad, Scraping) are unchanged.
- Tests: new `tests/v1932-test.js` (13, Node, real key finder and stores, no network). `tests/v1930-test.js` no longer hard-codes the cache version. NOT tested: on a phone or in a real browser (clipboard permission, layout).

## V1.9.31
- **Thinking timeline for every reply** (`www/ember_timeline.js`, new add-on, classes `.et-*`). Until now the "Summary" card (`ember_think_inline.js`) only appeared during a `run_react` job. Now, while Ember works on any reply, a card replaces the three typing dots: grey dot = a thought or step, square terminal icon = a tool call with SUCCESS / FAILED, orange radar = "Thinking…". The × collapses it. Tool rows come from `runTool` (chat, plan and ReAct calls).
- During a `run_react` job the older Summary card stays in charge and the new live card hides, so there is never a double card. When the reply lands, the timeline is saved on that message as a collapsed "Worked through N actions" row; plain answers keep none.
- `app.js`: `runTool` now wraps `runToolRaw`; `typing()`, `renderLog`, `bub` and `reply` hook the timeline. `index.html`, `sw.js`, `style.css` updated. Version 1.9.31.
- NOT tested: nothing was run for this change (no Node suites, no browser, no device).

## V1.9.30
- **"+" button on the left of the message box** (`www/ember_plus.js`, markup in `index.html`, `.plus` / `.pmenu` / `.pchip` in `style.css`). Opens a menu above the box. Toggles stay on and show a removable orange chip above the box (remembered between launches): **Device Access** (turns the Documents tools on and tells the model it may use them and the Termux panel), **Web Search** (the model must search before answering anything factual), **Reasoning** (always the deep lane, step-by-step instruction), **Code Mode** (code first, fenced and complete). The prompt text is added in `uiStateBlock()`, the lane in `laneFor()`, the Documents switch in `toolCatalog()` and `runTool()` (`app.js`).
- **Do-it-now items** put their result in the message box as a block he can edit before sending: **Upload File** (text files: first 20,000 characters; images: read by the image reader; audio: song ID), **Camera / Vision** (opens the camera, shrinks the photo to a JPEG, describes it and copies out any text), **Audio Context** (records 10 s from the mic and identifies the song through Audd.io).
- Photos go to Pollinations' free image reader (the same one `see_image` already used), so they only work while Settings > Vision is on. The Vision hint text says so. Song ID needs the Audd.io token already in Settings > Music.
- Docs and the Chill / Sharp / Deep pills stay where they were.
- `CAMERA` permission added to `apply_android_patch.py` and `AndroidManifest.additions.xml` (rebuild the APK; without it the camera picker cannot open).
- Cache name `ember-v1.9.30`, `ember_plus.js` added to the service worker list. Tests: new `tests/v1930-test.js`.
- NOT tested: on a phone (camera, microphone, real Audd.io and Pollinations calls). The Privacy table's Vision row now says photos from the + menu go to Pollinations.

## V1.9.29
- **Tool-execution card (no raw JSON).** The download card in the chat (`cardHtml` in `www/ai_agent.js`, `.act-*` in `www/style.css`) is now a card with an orange border: music note, "Downloading Audio", the file name, a glowing progress bar and a "Saving to Music/Ember" + percent line. Done = green "Saved to your phone", failed = red with the reason. Same `dl-<id>` element id, so the live updater in `app.js` still replaces it in place. The Music > Get tab keeps its own step timeline.
- **Provider dashboard.** Each engine in the header Providers dropdown (`www/ember_prov_ui.js`) is a card: status dot, name, the model the best key uses, and on the right the real latency of the last reply or check (`⚡ 120ms`) plus the key count. A resting engine is dimmed and says "Rate limited / Retry in 30s", counting down every second while the dropdown is open. A rejected key says "Rejected" and why; no key says "No key". New `Prov.detail(id)` in `www/providers.js` (model, latency, keys, retry seconds) and every successful reply and health check now stores its latency (`lat`) and model on the key.
- **No prices.** The mockup showed a cost per 1k tokens. Ember has no real cost data (free tiers, keys of different plans), so no number is shown; inventing one would be wrong. Say if you want a per-engine price you type in yourself.
- **Pill modifier bar.** Chill / Sharp / Deep and the Device, Reasoning, Spark, Go deeper toggles above the message box are now rounded pills; an active pill gets the dim orange fill, orange border and glow (CSS only, same buttons and behaviour).
- **Thinking timeline reads as sentences.** Tool steps show "Searching YouTube: “gunna”" instead of a tool name, no raw arguments; the active line says "Synthesizing final answer" once the model has answered.
- Tests: new `tests/v1929-test.js` (12), `tests/v1928-test.js` updated (20). NOT tested: on a device or in a real browser (layout, glow, countdown), real latency numbers from live engines, `Prov.detail()` against a real key list.

## V1.9.28
- **"Summary" thinking timeline in the chat** (`www/ember_think_inline.js`, styles `.tl-*` in `www/style.css`). While a reasoning run (`run_react`) is active, a card follows the new design: grey dot = a thought, square terminal icon = a tool call with a SUCCESS / FAILED / SKIPPED / REPEAT / WAITING pill, orange radar ping = the active "Thinking..." step (says "Running <tool>" while a tool runs, "Waiting for your approval" at the gate). Dashed line joins the steps. Header "Summary" shows steps and elapsed time (ticks every second). Card collapses 1.8 s after the run ends; tap the header to open it again; the x dismisses it for that run. All text is escaped; the final reply is not duplicated in the card. The older `.atk-*` card style is removed.
- `ember_think_inline.js` added to the service worker file list (it was missing), cache name `ember-v1.9.28`.
- Tests: new `tests/v1928-test.js` (20, fake DOM, in `npm test`). NOT tested: on a device or in a real browser (layout, radar animation), a real `run_react` run.
- **One key finder for every paste box** (`www/ember_keyscan.js`, loads before `providers.js`). Replaces the two old extractors. Fixes: `Name: key  Name2: key2` on one line, blank lines after a label, Cohere key under its label, `CO_API_KEY`, key before its name, hex-only labelled Mistral keys, Audd.io and EasyVoice keys, Bright Data key and zones.
- **Several keys per provider** (`ai_scraper.js`): first = primary, rest = extras (max 8), never overwritten. Extras take turns and cover for a key that is rejected, out of credits or rate limited (401/402/403/429/432/433). A 5xx stops at once (no double billing). Tavily extras also cover web search (`ai_agent.js`). Health checks every key.
- **Bright Data** (10th provider, after SerpApi): SERP search backup; Web Unlocker zone makes it a page fetcher, with only a SERP zone it returns snippets flagged degraded. NOT tested against the live service.
- UI: Bright key, SERP zone, Web Unlocker zone, extra-keys list with remove (Settings > Scraping). All three paste handlers use `EmberKeyScan.ingestAll`.
- Tests: new `tests/keyscan-test.js` (44 checks), `scrape-test.js` and `v168-test.js` updated. Version 1.9.14.

# Changelog

## V1.9.27
- **Native function calling.** When a message looks like it needs a tool (search, find, download, get, play, link, music words...), the engine now gets the tool list through its own tool API: OpenAI-style `tools` for Groq/Mistral/OpenRouter/HuggingFace, v2 `tools` for Cohere, `functionDeclarations` for Gemini (`call()` in `www/providers.js`). A native call comes back as the same `<tool_call>` text the app already runs, so the router, schema binding and ReAct loop are untouched. If an engine rejects the tools (400/422) the call is repeated once without them. Loose text calls (V1.9.26) and the tag still work. Tool results follow-up calls carry the tools too, so search -> download can chain. JSON-mode calls never carry tools.
- **Downloads are tagged.** `DownloadWorker.kt` writes TITLE, ARTIST, ALBUM and TRACK into MediaStore: title and artist from "Artist - Title (Official Video)" with the noise removed (else the channel name without "- Topic"), the playlist name as the album, the playlist position as the track number.
- **Whole playlist.** Up to 100 tracks (was 30), read across all pages (`PlaylistInfo.getMoreItems`), queued one after another in a unique work queue per playlist (a failed track does not block the next). Button now says "Whole playlist". The AI tools `playlist_list` and `playlist_download` use the same 100 limit.
- **Covers.** Search and playlist results show the YouTube thumbnail. What you download is remembered (`ember_dlmeta`: thumbnail, artist, album) and the library uses it as the cover when the file has no embedded picture and the online lookup (Deezer/MusicBrainz) finds none.
- NOT done: cover art or tags written INSIDE the m4a file (needs an MP4 atom writer, not safe to ship uncompiled). Other music apps read the MediaStore tags, not the cover.
- Tests: new `tests/v1927-test.js` (11, mocked Groq/Cohere/Gemini) and `tests/v1927b-test.js` (7). NOT tested: real engine tool calls, any Kotlin (never compiled here; uses `Image.url`/`height`, `PlaylistInfo.getMoreItems`, `ExistingWorkPolicy.APPEND_OR_REPLACE`), a device or APK.

## V1.9.26
- **Tool calls written as plain text now run.** Weaker engines (Cohere command-r7b in your screenshots) wrote `youtube_search {"query":"..."}` in a code box instead of the `<tool_call>` tag, so the app showed it as chat text and nothing ever ran (this is why "download" did nothing, regardless of the switch). `canon()` in `www/app.js` now accepts `name {json}`, `name({json})`, a fenced or bare `{"tool"/"name": ..., "args"/"arguments"/"parameters": ...}`, only for tools that exist right now, and removes the code box from the shown reply. A plain mention of a tool name, or an unknown name, is not a call.
- Tests: new `tests/v1925-test.js` (9). NOT tested: a real Cohere reply, a real YouTube download on the phone. The download itself still needs an APK built with the native NewPipe patch.

## V1.9.25
- **Name search no longer says "no info".** Cause: with no Tavily/scraper key the only search was DuckDuckGo's Instant Answer API, which only knows encyclopedia topics, so any ordinary name came back empty. `web_search` now falls through DuckDuckGo Instant Answer -> DuckDuckGo web results (`html.duckduckgo.com`, works in the APK because CapacitorHttp has no CORS limit) -> Wikipedia search. If all of them find nothing, the tool note tells the AI to say so plainly, ask for a city/employer/username, and never invent facts about a person. A Tavily key is still the best option.
- **Web Search and YouTube/SoundCloud download are switched ON once** (they were OFF by default, so "download it" never reached the downloader and lookups never ran). Migration flag `defaultsV1924`; turning a switch off afterwards is kept.
- **📋 Paste and ⧉ Copy buttons above the message box.** Paste inserts at the cursor (clipboard fallback message if the webview blocks it); Copy copies the selection, or the whole box when nothing is selected.
- Tests: new `tests/v1924-test.js` (6), `tests/agent-test.js` 75 (3 new name-search checks, mocks for the new endpoints). NOT tested: real DuckDuckGo/Wikipedia responses from a phone, real YouTube downloads, any device or APK. If downloads still fail after this, the installed APK was built without the native downloader (CI never confirmed green past V1.9.23-1).

## V1.9.23-1
- **CI fix.** `android-actions/setup-android@v3` runs `sdkmanager tools` by default and that package no longer exists ("Failed to find package 'tools'", run #50 failed at that step). Both workflows now pass `packages: ''` so that default install is skipped; the runner already has the SDK and the next step installs platform 34 and build-tools 34.0.0. Later steps (cap add, patch, Gradle) have not been seen to pass yet.

## V1.9.23
- **Phone voices load fully.** The voice list was cached even when the phone's speech engine answered empty (it is often still starting on the first call), so the picker could stay on "Default" with few or no voices. Now an empty answer is never cached, the call is retried (6 x 0.7 s), duplicate voice names get unique ids, and a chosen voice speaks in its own language. New **Reload voices** and **Hear it** buttons plus a count line under Phone voice. If it still says 0, the phone has no TTS engine/voice data installed (Android Settings > Text-to-speech). NOT tested on a device.

## V1.9.22
- **Copy buttons.** Every chat bubble (yours and Ember's) has a `⧉ Copy` button; code in triple backticks now renders in its own box with `⧉ Copy code` that copies only the code. Clipboard fallback for webviews that block `navigator.clipboard`.
- **Music > Get tab (`www/ember_getmusic.js`).** Search YouTube or SoundCloud, paste a track or playlist link, list a playlist, download one track or up to 30, with live progress bars. Uses the existing native `EmberYoutube` plugin (NewPipe extractor). Works without the YouTube AI switch. Finished tracks trigger a phone scan so they appear in the Library. Downloads started here do not post cards or messages into the chat (`silent` flag in `trackJob`).
- **More natural voice.** New "How it speaks" setting (Natural, Lively, Chill, Storyteller). Text sent to the voice now drops markdown, links and code (says "The code is in the chat"), turns headings, list items and line ends into pauses, and expands e.g./i.e.
- **Talk mode (new 🗣 button by the mic).** Hands free: listens, sends when you stop talking (1.5 s of quiet), reads the reply aloud, listens again. Stops after 3 empty listens, on a failed reply, or when you tap 🗣 or 🎤. Needs a Gemini key and mic permission.
- **Music sleep timer.** 15 to 90 minutes, fades volume over 10 s, then pauses and restores the volume.
- Tested headless (Chromium, mocked native plugin): copy of message and code, Get tab search, download, playlist listing, job progress, sleep timer: pass. Existing Node suites pass except `router-test` (same Gemini AQ-key failure as V1.9.21). NOT tested: real YouTube downloads, Talk mode with a real mic, the voice styles against live Gemini, Kotlin. APK rebuild needed.

## V1.9.21
- **Natural-talk downloads.** The download gate (`DL_INTENT` in `www/ai_agent.js`) only opened for download/save/grab/rip/keep/store or a pasted link, so "get me X", "put X on my phone", "add X", "I want X" were refused with "He did not ask to download". Widened to also accept get/fetch/pull/put/add/want/need/newpipe and -ing/-ed forms. The seen-link guard is unchanged: the AI still cannot download a video id that did not come from him or from `youtube_search`.
- **Ember is told it can download.** The agent state block (`stateBlock`) and the TOOLS line in `www/persona.js` now say plain requests count and give the flow: youtube_search, pick best match, youtube_download.
- Tests: 5 new checks in `tests/agent-test.js`. Not run on a device. Reminder: the YouTube switch is OFF by default. Version 1.9.21.

## V1.9.20
- **Download path audited, nothing removed from the code.** `youtube_download`, `playlist_download`, `EmberYoutubePlugin.kt`, `DownloadWorker.kt`, `EmberYtCore.kt` and the NewPipe/OkHttp/desugaring/JitPack patch are all present. `tests/agent-test.js` passes 67/67 (gate, link checks, job start, progress cards). `scripts/apply_android_patch.py` was run against a fresh `npx cap add android` project and wires NewPipe v0.26.5 correctly.
- **Restored the missing CI files.** The V1.9.19 zip had no `.github/` folder, so no workflow could build an APK carrying the native downloader (the app then says the native downloader is missing). Added `.github/workflows/build.yml` (signed release APK, steps as in `docs/ANDROID_BUILD.md`) and `.github/workflows/newpipe-update.yml` (Monday NewPipe bump, commits only if the build passes). `.gitlab-ci.yml` is not restored.
- Reminder: Settings > Music > Ember add-ons > YouTube search & audio download is OFF by default. Kotlin was still never compiled or run on a device. Version 1.9.20.

## V1.9.18
- **Wiring audit, no app code changed.** Checked the three layers for the document tools, `scrape_url`, the router and the ReAct loop, and locked each one in with tests so a future edit cannot silently disconnect them: schema shown to the model (`persona.js` toolsBlock), dispatcher (`app.js` runTool), the ReAct host (`setHost({ run: runTool ... })`), and strict engine pin (a pinned Gemini calls only the Gemini API; if Google rejects it you see Gemini's error, never a Groq answer). The ReAct test drives a scripted model through `run_react` and checks every Action reached the real document tools in order and that the model saw the real result.
- Tests: `tests/v1915-test.js` now 45 checks, all passing. Not run on a device; Playwright suites not run here. Version 1.9.18.

## V1.9.17
- **Document tools checked end to end (tested in Node).** `get_document_outline(fileId)`, `search_in_document(query, fileId?, page?, limit?)` and `read_document_chunk(fileId, chunk, span?)` were already in the tool list the model is shown (via `ai_docs.js`) and already routed to `ember_context.js` by the dispatcher in `app.js`; a new test proves the model sees the real argument names and that each tool really runs. The chunk argument is `chunk`, not `chunkId` (renaming would break the schema and 63 context tests).
- **Hard rule added to the persona (implemented):** with documents in the library, Ember must look in them (use the FROM HIS DOCUMENTS block, else `search_in_document`), never say it cannot read his local files, never guess, and never claim to have read a document it only saw part of. Added only when the library has files and the tool is in the prompt, so it can never promise what is not there.
- Tests: `tests/v1915-test.js` now 34 checks. Not run on a device; Playwright suites not run here. Version 1.9.17.

## V1.9.16
- **Ember knows how it thinks (implemented, tested in Node).** The "about the app" block (`ember_find.js`) now tells every engine, live, what it can do on big jobs: `run_react` (Thought/Action/Observation, 8 default / 10 hard steps, 4 minutes, exact repeats blocked, the 🧠 Reasoning panel with "Approve each action first" and "Edit what it sees"), `run_plan` (up to 12 steps, validated first, 3 read-only steps in parallel, 45 s per step / 120 s total), schema-checked tool calls, the three long-document tools, the 8000-character cut on `read_document` (never claim to have read the rest), automatic document retrieval and the strict engine pin. A test reads the real limits out of the source files so the text cannot drift from the code.
- Tests: `tests/v1915-test.js` now 27 checks. Not run on a device. Playwright suites not run here. Version 1.9.16.

## V1.9.15
- **Strict pin (implemented, tested in Node).** With an engine pinned, a failure now shows the real reason (for example the HuggingFace 403 text) and Ember does NOT silently answer from another engine. Before, the default order put Groq first, so every failed pin landed on Groq. Auto mode and background jobs (titles, memory) still fail over. Unpin = Auto. `Prov.setStrict(false)` turns it off (no Settings switch yet).
- **Free Mode no longer goes first when an engine is pinned** (it failed, cost seconds and fired a "Switched to Groq" toast while already on Groq). The background task (`handoff`) obeys the same rule.
- **"Switched to X" toast** is not shown when the pinned engine itself answered; when it does show, it carries the real reason and stays 6 s.
- **HuggingFace / OpenRouter prototypes:** a 400/402/403/422 on one model tries the next model (5 instead of 3) and no longer marks the key rejected. Only a 401 does.
- **One Ember on every engine (implemented; NOT checked against live replies).** The "you are only the model named above" line is replaced by an IDENTITY line (always Ember, same voice) and each engine gets a one-line voice note (Groq: not terse; Gemini: no assistant prose, headings or bullets; Mistral: casual).
- **Long answers on request (implemented; not run on a device).** If he asks to explain, write, script, break down, or pastes 600+ characters, the sentence limits are lifted for that reply and the cap goes from 350/650 to 1600 tokens.
- **Documents are searched automatically (implemented, tested in Node).** `EmberContext.autoBlock(message)` ranks chunks of his library for every message and puts the best 2-3 into the system prompt for every engine, labelled as data. Nothing is added for greetings, no match, or safety level 2+. Before, the model had to choose to call a tool, so engines that did not call it showed no document knowledge. Plain-text documents only (PDF/Word still unsupported). Keyword ranking, not embeddings.
- **Engine and model name shown under every reply** (Settings > show engine is switched on once; he can switch it off again).
- Tests: new `tests/v1915-test.js` (24 checks). Router, context, handoff, keyscan, scrape, agent, safety, term re-run: pass. Playwright suites (app, v198...) NOT run in this build environment. Version 1.9.15.

## V1.9.13
- **Web search fails over through your scraper keys.** `web_search` order: Tavily (if a key is saved) -> SerpApi -> Firecrawl -> ScraperAPI -> ScrapingBee (each only if its key is saved) -> DuckDuckGo. An engine that errors or returns nothing is skipped and named in the result's `tried` list; `source` says which one answered. A rejected or out-of-credit key is not retried for 10 minutes. With no extra scraper keys it behaves exactly as V1.9.12.
- **New tool `search_and_read(query, objective?, count?)`.** Searches, then opens the top 1-3 distinct pages and returns their text trimmed to a 6000-character budget (whole result stays under the 9000-character tool-result cap). Needs Web Search and Web Scraping both on. A page that only came back as SerpApi snippets is flagged `degraded`; a page that cannot be opened is an error entry.
- **Nine providers take a key.** Tavily Extract joins the url rotation (same key as web search, stored once in `ember_agent`). Octoparse is real: `scrape_url` with `via:"octoparse"` reads the rows of your saved task (Task ID box in Settings > Scraping, or pass the id as the url) from `openapi.octoparse.com/data/all`; `op_sk_` keys go in `x-api-key`. It never joins the url rotation. The Octoparse API needs a Standard plan or higher.
- **Keys never leak.** Every error, tried list, test result, health line and page text passes through a scrubber (all saved keys, `?api_key=` values, Bearer tokens, `x-api-key`). Health shows keys masked.
- **Fix: Delete everything now also removes the scraper keys, the Tavily key and the notepad** (they were left behind before). Backups still never contain them.
- **Fix: Get-a-key buttons** showed lowercase ids; they now show proper names, and Tavily is added.
- **Key extractor hardened**: JSON dumps, escaped JSON, CRLF, Markdown tables, quotes and backticks, several keys per provider, curl lines, two providers on one line, labelless `fc-`/`tvly-`/`op_sk_` keys, placeholders, variable names, url paths, chat-engine keys. A 160-character blob is rejected whole, not cut into 128+32. "testing" no longer counts as the Sting provider. A pasted Sting https endpoint is saved with `{key}` and `{url}` filled in; the https-only rule is unchanged.
- **Tests.** `tests/scrape-test.js` (73 checks) and `tests/agent-test.js` (67) extended and passing against mocked services. The rest of `npm test` was not re-run for this version. Not run against the live services or on a device. APK rebuild needed.
- Version 1.9.13.

## V1.9.13
- **Web search fails over through your scraper keys.** `web_search` order: Tavily (if a key is saved) -> SerpApi -> Firecrawl -> ScraperAPI -> ScrapingBee (each only if its key is saved) -> DuckDuckGo. An engine that errors or returns nothing is skipped and named in the result's `tried` list; `source` says which one answered. A rejected or out-of-credit key is not retried for 10 minutes. With no extra scraper keys it behaves exactly as V1.9.12.
- **New tool `search_and_read(query, objective?, count?)`.** Searches, then opens the top 1-3 distinct pages and returns their text trimmed to a 6000-character budget (the whole result stays under the 9000-character tool-result cap). Needs Web Search and Web Scraping both on. A page that only came back as SerpApi snippets is flagged `degraded`; a page that cannot be opened is an error entry, not hidden.
- **Nine providers take a key.** Tavily Extract joins the url rotation (same key as web search, stored once in `ember_agent`). Octoparse is real: `scrape_url` with `via:"octoparse"` reads the rows of your saved task (Task ID box in Settings > Scraping, or pass the id as the url) from `openapi.octoparse.com/data/all`; `op_sk_` keys go in `x-api-key`. It never joins the url rotation. Octoparse API needs a Standard plan or higher.
- **Keys never leak.** Every error, tried list, test result, health line and page text passes through a scrubber that removes all saved keys, `?api_key=` values, Bearer tokens and `x-api-key` values. Health shows keys masked (first and last four characters).
- **Fix: Delete everything now also removes the scraper keys, the Tavily key, and the notepad** (they were left behind before). Backups still never contain them.
- **Fix: Get-a-key buttons** showed lowercase ids (`firecrawl`); they show proper names and Tavily is added.
- **Key extractor hardened** (Paste & extract, Keys notepad): JSON dumps, escaped JSON, CRLF, Markdown tables, quotes and backticks, several keys per provider, curl lines with the key in the url or a header, two providers on one line, labelless `fc-`/`tvly-`/`op_sk_` keys, placeholders, variable names, url paths and chat-engine keys are handled. A 160-character blob is rejected whole instead of being cut into 128+32. The word "testing" no longer counts as the Sting provider. A Sting https endpoint pasted with its key is saved with `{key}` and `{url}` filled in; the https-only rule is unchanged.
- **Wording:** AI state text, key map, app block, Settings hints and the Test dropdown (Tavily, Octoparse) updated.
- **Tests.** `tests/scrape-test.js` (73 checks) and `tests/agent-test.js` (67) extended; mocked services only. Not run against the live Tavily, SerpApi, Firecrawl, ScraperAPI, ScrapingBee or Octoparse services, and not on a device. APK rebuild needed.
- Version 1.9.13 (`package.json`, service worker cache `ember-v1.9.13`).

## V1.9.12
- **Web search works without a key.** `web_search` still tries **Tavily first** when a Tavily key is saved. With no key, or when Tavily errors out (bad key, plan or rate limit used up, network, not JSON), it now falls back to the **DuckDuckGo Instant Answer API** (`api.duckduckgo.com`, `format=json`, `no_html=1`, `skip_disambig=1`). No key, no account. Before this, search with no Tavily key just returned an error.
- **What DuckDuckGo gives, honestly.** It is an instant-answer service, not a full search engine: an encyclopedia-style abstract (with its link) plus related topics (nested groups are flattened), mapped into the same `{answer, results[title,url,snippet], note}` shape Tavily uses, with `source: 'DuckDuckGo'`. For news and current events it often returns nothing; that comes back as an honest empty result with a note telling the AI to say so and not invent results, not as an error.
- **Which engine answered.** Every `web_search` result now carries `source` (`Tavily` or `DuckDuckGo`). When Tavily failed and DuckDuckGo answered instead, the note says why (for example "Tavily failed (Tavily rejected the key...) so this came from DuckDuckGo."). If both fail, the original Tavily error is returned unchanged; with no key and DuckDuckGo down you get "No Tavily key, and DuckDuckGo ...".
- **Where it is wired in (all of it, not just the handler).** `www/ai_agent.js` (new `ddg_search`, new `web_search` wrapper over the renamed `web_search_tavily`, tool description, the AGENT TOOLS STATE text the AI reads, the settings test button, `EmberAgentAddon.searchEngine()`); `www/ember_find.js` (the live app block no longer says search is OFF without a Tavily key: it says ON through DuckDuckGo only, ON with Tavily plus DuckDuckGo backup, or OFF with "no key is needed"); `www/ember_keys.js` (key map and key-map tool text: the Tavily key is optional); `www/index.html` (Settings > Music > Agent & API Tools: "Web Search (Tavily + DuckDuckGo)", key box marked optional, button renamed **Check search**, privacy table row).
- **Check search button.** With a Tavily key it still spends 1 Tavily credit and says "Works via Tavily". With no key it tests DuckDuckGo with a query it can answer and says "Works via DuckDuckGo"; if the service answers but has nothing it says so instead of claiming success.
- **Privacy.** With no key (or after a Tavily failure) the words the AI searches for go to `api.duckduckgo.com`, with no key and no account. See `docs/PRIVACY.md` and `docs/LICENSE_NOTES.md`.
- **No change** to the Tavily request itself, the stored key (`ember_agent`, still never in backups), the Web Search switch (`agentAddon`, still off by default), or any other tool.
- **CORS.** In the APK `CapacitorHttp` is on, so the call skips browser CORS rules. In the plain web version the DuckDuckGo call depends on `api.duckduckgo.com` allowing browser requests: not tested against the live service from here (the tests mock it).
- **Tests.** `tests/agent-test.js` extended: no-key fallback, request URL, result mapping and flattening, honest empty result, both-down error, Tavily 401/429 with an empty DuckDuckGo (original error preserved), Tavily 401 with DuckDuckGo answering (falls back and says why), Tavily healthy (DuckDuckGo not called), the AI state text, the app block in all three states, the settings card wording and both Check search outcomes. Run against mocked services only; not run on a device. APK rebuild needed for the APK to carry it.
- **Fix: white box in Settings > Scraping.** The "Paste & extract scraping keys" box (`#swPad`) was missing the `pad` class, so it skipped the dark input style and showed white with grey text. It now uses the same dark style as the Keys notepad.
- Version bumped to 1.9.12 (`package.json` drives `versionCode` and `versionName` in `scripts/apply_android_patch.py`; service worker cache renamed `ember-v1.9.12`).

## V1.9.11
- **Header unchanged from V1.9.10.** The Providers chip (the chip icon that drops down every AI engine with live dots) stays.
- **Mic is back, and it no longer needs the phone's speech service.** The 🎤 button sits left of 📎 Docs. Tap, talk, tap again: the phone records, the audio is sent to Gemini (your saved Gemini key) and the words are typed into the message box. Only the recording is sent, only when you tap the mic. Without a Gemini key the old route (Android speech recogniser, then the "Speak now" dialog) is used. Not run on a device: the first tap asks for the microphone permission; if it is refused the toast says where to allow it.
- **ElevenLabs removed** from Ember Voice (settings rows, code, stored key is ignored). Engines are now Gemini voice and Phone voice only.
- **All 30 Gemini prebuilt voices** in the picker (was 18).
- **Termux "process exited with code 254" fixed.** ttyd could not find `bash` in its own PATH (exit 254 is "no such file"). The Setup command now starts `/data/data/com.termux/files/usr/bin/bash`. **Copy the new command from Setup and run it again in Termux** (Ctrl+C the old one first).
- **Ember keyboard for Termux.** ⌨ button in the panel header. The terminal no longer opens the phone keyboard (the hidden input is `inputmode=none`); Ember's own keys (letters, ?123 symbols, shift, backspace with hold-repeat, space, enter, plus the Ctrl/Esc/Tab/arrow row) sit inside the panel, so nothing is pushed up or cut in half. Shown in the full panel; tapping ⌨ in half opens full. Turn it off to get the phone keyboard back. The command line box still uses the phone keyboard.
- **Hacking-tab cards fold by themselves** when the Termux panel is half or full and open again when you minimise it to the bar (only the ones it folded).
- **Termux panel is taller at half** (58% of the screen, was 50%).
- **Screen locked to portrait** (`screenOrientation` added in `scripts/apply_android_patch.py`; needs a rebuild).
- **EasyVoice as a third voice** (Settings > Perms > Voice > Ember Voice > EasyVoice). Paste your free EasyVoice key (easyvoice.ae/account/keys), tap **Test key** (shows plan and characters left) and **Load my voices** (fills the picker with the voices your key may use). Free key: 12 voices, 5,000 characters a day. Uses its MCP endpoint `text_to_speech`, then downloads the mp3. A failure (bad key, daily limit, offline) falls back to the phone voice like the others. Tested against a mock server only: the real service has not been called yet.
- **Mic moved into the message box**, left of Send, round.
- **Settings > Scraping: its own "Paste & extract scraping keys" box** (Paste, Extract keys, Clear), the same idea as the Keys notepad but for the scraping providers.

## V1.9.10
- **Lyrics preview (3 lines).** New `ember_lyrics.js`. A Lyrics card under the now-playing card shows at most 3 lines from LRCLIB (free, no key). With timed lyrics the first line is the one being sung and the next two follow it as the song plays; with plain lyrics the opening lines show. Long-press or hover the song title to see the same lines as a tooltip. The lookup tries exact (artist, title, album, length), then a search, and cleans tags like "(Official Video)" and "- Topic" first. Settings > Music has a **Lyrics preview** switch (on by default).
- **Privacy.** Only the title, artist, album and length of the playing song go to lrclib.net, only while the switch is on. The full lyric text is held in memory for the last 12 songs and is never saved or shown beyond 3 lines. Not sent to any AI.
- Tests: `tests/lyrics-test.js` (LRCLIB mocked, no network). Not run on a device: LRCLIB match rate for your files is untested. APK rebuild needed.

## V1.9.9
- **Ember Voice: a real voice instead of the Android default.** New `ember_voice.js`. Settings > Perms > Voice has an **Ember Voice** picker: **Gemini voice** (on by default, uses the Gemini key already saved in Settings > Keys, 18 voices such as Puck, Charon, Fenrir, Aoede, Sulafat, Algenib) or **ElevenLabs** (your own key, 7 premade voices or any voice ID) or **Phone voice only**. The 🔊 button, auto-read and Test this voice all use it, and the red Stop button stops it. Speed slider applies (0.8 to 1.4); the phone-voice Pitch and Lively sliders only affect the fallback.
- **Gemini voice details.** Models are tried in order and the one that works is remembered (`gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-preview-tts`, `gemini-3.8-flash-tts`); each saved Gemini key is tried in turn on 401/403/429. Delivery asks for a warm, quick-witted tone; when the safety layer has flagged the conversation (level 1 or higher) it asks for a slow, soft, calm tone with no jokes.
- **Never silent.** If the cloud voice fails (no key, rate limit, offline, model has no audio, audio blocked until a first tap) the unread text is read by the phone voice and a short toast says why. Long replies: first 6 chunks go to the cloud voice, the rest to the phone voice. Chunk N+1 is fetched while chunk N plays.
- **Privacy.** Reply text goes to Google (Gemini) or ElevenLabs only when a reply is read aloud and only if that engine is selected; Settings says so. The ElevenLabs key is stored in `ember_voice` on the device and is cleared by Wipe.
- Tests: `tests/voice-cloud-test.js` (fetch and audio mocked, nothing is heard, no network). Not run on a device: voice quality, model names and free-tier limits are untested against the live services. APK rebuild needed.

## V1.9.8
- **Providers chip (header).** A chipset icon left of Ember's name opens a dropdown of every engine (Groq, Mistral, Gemini, OpenRouter, Cohere, HuggingFace, Free Mode) with a live dot: green working, amber rate limited, red rejected/unreachable, hollow grey no key. Opening it lists each key's models (no chat call, no credit). `ember_prov_ui.js`, `Prov.stateOf / ping / pingAll` in `providers.js`.
- **Fix: Gemini showed green with no Gemini key / the AI said it was Gemini.** Health was never re-checked and the picker's first option was a hard-coded green dot. State now comes from `stateOf()`: no key = never green; keys not checked in 30 min = grey "unknown"; real replies and live checks refresh it. The runtime facts told to every model now list the engines with NO key and, in Free Mode, forbid claiming to be Gemini or any named model.
- **Ember's name sits in the true middle of the header** (left group and right group take equal width).
- **Termux:** a command line (`$` input + ⏎, history with the arrow keys, destructive commands need a second tap) runs real commands over the bridge; terminal text is smaller (A− / A+ keys, default 10.5 px, scrollback 500 lines); the panel starts as a bar. **Open Termux folds Ember's panel by itself**, it folds when the app goes to the background, and it never expands again on its own (the ▾/▴ arrow still toggles). The Hacking page no longer slides up to make room.
- **Documents:** the `＋ Files` / `＋ Note` text buttons are one 📎; tap it for two icons (file, note).
- **Dictation button removed** (did not work on this phone); a 📎 Docs button sits in its place. The mic code is guarded so nothing breaks without the button.
- **Fix: app kept restarting after exit.** `EmberKeepAliveService` returned `START_STICKY` so Android recreated it (and its notification) after the app was closed; now `START_NOT_STICKY` plus `onTaskRemoved` stops it. APK rebuild needed. Not run on a device.

## V1.9.7
- **No more fake actions.** If a reply says it searched, looked up, read, downloaded or saved something but no tool ran that turn, `resolveAddonCalls` (`app.js`) now makes one corrective call (do it for real with a tool_call, or say plainly what is off); if it still claims, the reply is replaced with an honest "nothing was done" line. Tool-result synthesis is told to claim only what the result says. A "NO FAKE ACTIONS" rule is in the system prompt.
- **YouTube switch off is now stated.** The prompt tells the model the YouTube tools are off (and where the switch is) instead of letting it pretend to download.
- **Your rules get the last word.** Settings > Persona text is repeated at the very end of the system prompt (it was buried mid-prompt under the tools list).
- **Download notification:** the app asks for notification permission before starting a download (`ai_agent.js`), so the device notification can appear on Android 13+. The chat progress card and "saved" message already existed; they only show when the tool actually runs. Not run on a device.

## V1.9.6
- **Scraper honesty + tool choice.** `scrape_url`'s description now tells the model to use it (not `web_search`) for any scrape/read/open request or link, that it rotates all saved keys itself, and to read its `tried` list instead of giving up. `via` now lists Sting. The SCRAPER STATE prompt block says the AI has live web access when scraping is on, and names saved keys that cannot run (Sting with no endpoint, Octoparse: no fetcher exists). No change to the rotation code. Not run on a device.

## V1.9.5
- **Fix: Termux panel dead (Connect, Terminal, Port, New path did nothing).** `paintSetup()` bound `$('etGo')`, a button V1.9.0 removed, so it threw "Cannot set properties of null" before binding every other Setup button, and because `setState()` called it, `connect()` threw before it opened the WebSocket. Removed the dead line; **Open Termux** now copies the command and opens Termux; `setState` can no longer be broken by a paint error. Found by `tests/term-test.js` (was 51/52).

## V1.9.4
- **Composer box:** removed the brown inner rectangle (the old focus ring drawn inside the pill) and the spellcheck underline; the whole pill glows on focus instead.
- **Hero vs music widget:** the "Evening. Talk to me." block no longer sits under the mini music widget; it now measures the widget + composer height live (`--dock`, `ember_ui.js`). Not run on a device.

## V1.9.3
- **Browser buttons restyled.** The stock white Android buttons in the native browser are now dark rounded pills with a thin border; Ask Ember is orange; the address box is a matching pill (`mkButton` in `EmberWebPlugin.kt`). Kotlin not compiled or run; APK rebuild needed.

## V1.9.2
- **Browser opens as a medium sheet.** The native browser (globe button) now opens as a bottom sheet about 62% of the screen high instead of full screen (`EmberWebPlugin.kt`). Same address bar, progress line, Ask Ember / Save to Documents / Open in Chrome buttons. **Kotlin not compiled or run: first CI build is its first compile.** APK rebuild needed.

## V1.9.1
- Settings > Keys: "Get a key" and "Notepad" cards start folded. Get-a-key buttons are one sideways-scrolling row (also in Scraping). Engine picker shows key health dots (🟢 working, 🟡 rate-limited, 🔴 failing, ⚪ no key / unchecked) and refreshes after a key check. Not run on a device.

## V1.8.3
- **Real browser.** The globe button's Browser sheet now opens pages in a real full-screen Android browser inside Ember (`EmberWebPlugin.kt`: WebView with JavaScript, cookies/logins, back, forward, reload, address bar, progress line, blocks non-web links like intent: and file:). Typing a site opens it with https://; typing words searches DuckDuckGo. Its bottom buttons: **Ask Ember** and **Save to Documents** send the visible text of the page you are on (only when you tap them), **Open in Chrome** hands it to the phone's browser; the Back key walks back through pages and then closes. The sheet's switch (**Real browser: on / Reader view**) goes back to the clean-text reader that uses your scraping keys; if the native browser cannot open, Ember falls back to the Reader view by itself. Real browsing spends no scraping credits. (Written and wired in `ember_native.js` / `ember_browser.js` / `MainActivity.kt` / `apply_android_patch.py`. The JS side is tested with the plugin mocked. **The Kotlin file has NOT been compiled or run: the first CI build is its first compile, and the browser itself has not been seen on a phone.**)
- **Termux connects by itself.** Running a command (a preset, Run on a code block from Ask Ember, or an extra key) while disconnected now connects and waits up to 7 s, then sends it. If Termux is not running or the bridge is down, it says so and copies the command instead. `EmberTerm.ensureOn()` is exported. It cannot START the bridge inside Termux; that still needs the Setup-tab command once per Termux session. (Implemented, tested with a mocked WebSocket.)
- **No more double billing on background replies.** When the app goes to the background mid-reply the request is handed to the native worker. Before, the page kept going too, so one reply was billed twice. Now, if the app is already hidden when the reply starts, the page waits for the worker to accept and then makes no call at all; if it is hidden mid-reply, the call already in flight finishes but no failover call follows. If the worker cannot take it, the page answers itself as before. If the worker's reply never arrives, the chat is freed after 3 minutes with a "tap resend" note. (`Prov.holdInflight` / `Prov.stopInflight` in `providers.js`, `handoff()` in `app.js`.) (Implemented, tested in Node with mocked fetch. The native worker side itself is unchanged and not run on a device.)
- Tests: `tests/handoff-test.js` (6), `tests/v183-test.js` (18, Chromium, native browser plugin and WebSocket mocked). Not run on a device. The APK has to be rebuilt.

## V1.8.2
- **Scraping keys go first and take turns.** Before, the Free reader was tried first, so Firecrawl, Browserless, ZenRows and the others never ran unless the AI passed `via`, while the AI could still say it used them. Now `plan()` in `ai_scraper.js` puts your keyed providers first and rotates the starting one on every page (round-robin, counter kept in `ember_scrape_rot`) so every key's credits are used evenly. The Free reader is only the fallback after them; SerpApi snippets stay last. Naming a provider (`via`) still runs only that one. (Implemented, tested with mocked fetch.)
- **Honest reporting.** Every scrape result now carries `tried`: which providers were skipped or failed and why ("Firecrawl: key rejected (HTTP 401)"). The Browser's note line shows the provider that fetched the page, "(cached)" when it came from cache, and what was skipped. The AI's SCRAPER STATE text no longer says the reader goes first. Settings > Scraping shows the real order. (Implemented, tested.)
- **Credit savers (what could be eating the paid scraping keys).** (1) A 5xx or network error was retried on the same paid key, billed twice; scraping calls now try once and the rotation moves to the next provider. (2) ScrapingBee and ZenRows always rendered JavaScript, which they bill several times over; the first pass is now plain and the rendered pass only runs if the page came back thin (under 400 characters). (3) The same page within 3 minutes is served from memory (20 pages); Reload in the Browser bypasses it. (4) A key that answers 429 rests for 60 s, as 401/402/403 already rested for 10 minutes. (Implemented, tested.)
- **Browser.** Works with keys only: the enable panel now says "Turn on Web Scraping" and only switches the Free reader on when you have no key. A failed page says the reason and points to the open-outside button. (Implemented. Not run on a device.)
- Not changed, found while tracing the chat keys (Groq, Gemini, Mistral...): with Background replies on, the request is handed to the native worker when the app goes to the background while the page's own request may still run, so one reply can be billed twice. Memory learning and chat summaries also make their own small calls (user message 2, then every 6th; and when older messages are condensed). Settings can turn each off (Background replies, Persistent Memory, summaries). Planned: stop the page-side request once the worker has it.
- Tests: `tests/scrape-test.js` (17 checks, fetch mocked, no network, no credits). The HTML-to-Markdown and key-cleaner checks inside `selfTest()` need a browser DOM and already failed in plain Node before V1.8.2; they run in the Chromium suites. Not run on a device. The APK has to be rebuilt.

## V1.8.1
- **The 🔊 on a reply turns red and says "■ Stop" while Ember is reading it.** Tap it to stop; it goes back to 🔊 when the voice finishes or is stopped. It stays red if the chat redraws mid-sentence. (`setSay` / `paintSay` in `app.js`; `.talking` in `style.css`.)
- **Voice is no longer stuck on the Android default.** The Voice picker in Settings > Perms now lists the voices the phone's own speech engine has (own language first, online ones marked) and the choice is actually used by the installed app. Before V1.8.1 the picker only worked in a browser, never in the APK. New Speed and Pitch sliders, a **Test this voice** button, and **Lively delivery** (on by default): per sentence, questions lift in pitch, exclamations speed up a little, trailing "..." slows down; everything is clamped to 0.5-2. (`tts.voices()` and `tts.speak(text, lang, {voice, rate, pitch})` in `ember_native.js`.)
- **The 🎤 is explained.** It is dictation: tap, talk, your words are typed into the message box, tap again to stop. The button's label and tooltip say so, and Settings > Perms explains it.
- **Fix: the left-panel Music Console's "Open Full Music Panel" now draws the panel.** With the composer pill gone it only added the `show` class, so the library, playlists and now-playing were not rendered. It now calls `EmberMusicUI.open()` and closes the menu behind it. The stale "Music pill" wording is gone.
- Tests: `tests/speaker-test.js` (26 checks, native text-to-speech mocked). `music-test` now expects Music in the left panel and not in the composer (48/48; its V1.8.0 timeout was only the removed pill). `voice-native-test` now accepts the deliberate Android "Speak now" popup fallback (16/16).
- Not run on a device. The APK has to be rebuilt. Voice quality, the red button and the sliders are tested against a mock engine only.

## V1.8.0
- **Local Context** (`ember_context.js`). Long documents are never read whole. They are cut into ~1,500-character chunks on the phone (paragraph and heading aware, 150 characters of overlap) and searched by plain string matching, so only the few relevant sections reach the model. No vector database, no embeddings, no new dependency, no new stored data: the chunk index lives in memory and is rebuilt from the text when it changes. Three tools join the document set: `get_document_outline` (size, chunk count, headings or landmarks), `search_in_document` (ranked snippets; ladder exact phrase > all words > most words > any word, the level is reported; `page` and `limit`; omit `fileId` to search every document) and `read_document_chunk` (one chunk, `span` 2 adds the next if it fits, next and previous chunk numbers returned). Every result is sized to fit one ReAct observation. Chunk numbers start at 1. Nothing runs at safety level 2 or higher.
- **`read_document` and `summarize_document` stop hiding truncation.** Long files now come back with `truncated` / `partial`, the real `total_chars` and a hint to use the Local Context tools. Before, a summary of a long file silently covered only its first 6,000 characters.
- **ReAct is now an explicit state graph** (`GRAPH` in `ember_react.js`): THINK, PARSE, FORMAT_FIX, GATE_ACTION, ACT, GATE_OBS, OBSERVE, FORCE_FINAL, DONE, FAILED, STOPPED. Every move goes through `go(event)`, which throws on an edge that is not in the table; the trail is kept in `E.react.state().graph`. Recovery edges: a bad reply goes to FORMAT_FIX and back (twice at most); a failed, repeated or blocked tool call still returns an Observation; running out of steps, time, or three failures in a row forces FORCE_FINAL (answer with what you have). New: an exact repeat of a call that already failed is not run again, and a tool that fails three times in a row is switched off for the rest of the run.
- **`run_react` mode `document`**: only the document tools are offered, plus retrieval rules and an evidence ledger (searches tried, chunks read) kept in the system prompt, because older observations shrink and the chunks already read are what the answer needs.
- **Typed tool binding** (`ember_schema.js`). `runTool` in `app.js` is the one choke point for chat, plans and ReAct, and every call is bound there before anything runs. Tools that declare `schema` (JSON Schema subset, OpenAPI-compatible) are strict: unambiguous coercion only, numbers clamped or refused, enums and lengths enforced, unknown arguments refused, `__proto__` dropped, and a bad call returns a structured error (`problems`, `expected`). Older tools keep their loose `parameters` and are only coerced (numbers, booleans), never rejected, so nothing that worked can break. The three new tools are strict.
- **Fix:** `ember_music_ui.js` assigned `$('bMusic').onclick` but `#bMusic` is no longer in `index.html`, so the file threw on load and everything after that line never ran. Guarded. This was what failed term-test, voice-native-test and agent-test on "no page errors".
- Documents tab: a LOCAL CONTEXT badge with the chunk count on documents over 8,000 characters. Reasoning panel: chips for search words, chunk number, match level and hit count.
- Tests: `tests/context-test.js` (63 checks: chunking, search ladder, read, outline, binding, graph shape and illegal edges, document mode end to end with a scripted model, breaker, format recovery, and the real app in Chromium). Not run on a device. Needs an APK rebuild for the web files to ship.

## V1.7.2
- **ReAct loop** (`ember_react.js`, tool `run_react`). One step per model reply: `Thought:` then `Action: {"tool","args"}`, or `Final:`. Ember runs the action through the normal tool dispatch and returns the result as an Observation. Guards: 10-step hard cap (default 8), 4-minute cap, 45 s model and tool timeouts, repeat detection (the same action is not run twice), 2 format-error recoveries, unknown or banned tools reported not crashed (no `run_plan` or `run_react` inside), the model's own invented Observation is cut, observations are labelled data and older ones shrink, plain-prose replies count as the Final. On the last step it is told to answer with what it has.
- **🧠 Reasoning panel** (`ember_react_ui.js`): live Thought / Action / Observation for every step. Change what it analyses: **Approve each action** (edit the Thought, the tool or its JSON arguments, run, skip or stop), **Edit what it sees** (edit the Observation before the model reads it), **Steer** (a note added to its next step), and Stop. Opens by itself when a run needs you. Two settings kept in `ember_engine`; the trace is in memory only.
- `app.js`: `toolCatalog()` and an `llm` host call (same safety wrapper and router as chat). `run_plan` now also refuses `run_react` steps.
- Not run, not tested.

## V1.7.1
- **Plan-and-Execute logic engine** (`ember_engine.js`, tool `run_plan`). The AI writes a whole plan up front as a DAG of steps `{id, tool, args, after, on_fail}`. The engine validates it before anything runs (schema, tool available, unique ids, real dependencies, no cycles, no nested plan, `{{id.field}}` only from steps it waits for, max 12 steps), runs it in dependency order, runs independent read-only steps in parallel (max 3) and anything that changes something alone, with a 45 s step timeout, 120 s total, `on_fail` stop / skip / retry (2 retries, backoff), and returns one trace of every step (status, attempts, time, clipped result or error). `dry_run` checks and shows the order only.
- Every step goes through the normal tool dispatch, so each add-on's own gate (music intent, download intent, switches) still decides. Tool output can fill later arguments but cannot add steps.
- Wired in `app.js` (`toolOn`, `setHost`) and `persona.js` (MULTI-STEP PLANS). Not run, not tested.

## V1.7.0
- **Spotify removed completely.** Deleted `ember_spotify.js`, the Spotify settings card, Spotify tab, sign-in, app link (`com.fezzy.ember://spotify` intent-filter and `handleLink` in MainActivity), the six Spotify AI tools, credits/privacy rows and the Spotify tests. Reason: Spotify's developer terms (Premium for dev accounts, 5 users, no AI control of playback).
- **Song info now Deezer + MusicBrainz.** Deezer (keyless) gives artwork, album, year, genre; MusicBrainz gives artist and album background, following its link to the Wikipedia page. iTunes and TheAudioDB are gone. New "album" section in About. Cache key bumped to `ember_meta2`.
- **Audd.io song identification** (`ember_audd.js`): paste your API token in Settings > Music. 🎧 Identify this song in the Music panel, Identify link in settings, and an `identify_song` AI tool (off until a token exists). A ~12 s WAV clip or your link goes to Audd.io only when you tap or ask. Result never changes the library until you tap Use these tags.
- Not built: identifying music inside web pages and blocking copyrighted tracks (needs audio capture from the browser).
- Not run: nothing in this version has been tested or compiled. Needs an APK rebuild (`apply_android_patch.py` no longer adds the app link).

## V1.6.8
- **Router tells the truth.** The system prompt now gets RUNTIME FACTS added at send time, after the router picks the engine: real engine, real model id, how many keys he saved, pinned-engine state, "no bundled/placeholder key exists", and "never claim tool results without a [TOOL RESULTS] block". Background replies get the same facts without naming an engine.
- **Pin is honest.** If the pinned engine cannot answer (rejected key, rate limit, none saved), the reply bubble says "<Engine> pin failed" and Settings shows why in plain words (`Prov.pinNote`).
- **Model picker.** Settings > Keys: pin an engine, tap Load models from my key, pick any model that key can see (OpenRouter `:free` models listed first, HuggingFace and the rest too). A pinned model is strict: only that model is requested.
- **Scraper keys obeyed.** `scrape_url` takes `via` (firecrawl, browserless, ...): only that provider runs and failures are reported, no silent swap to the free reader. The prompt states whether the Web Scraping switch is ON/OFF and which scraper keys are saved.
- Tests: tests/router-test.js (16 checks, no network).
- **Key scripts import properly.** Settings > Keys "Extract + check keys" now also saves scraper keys (Firecrawl, Browserless, ZenRows...) and Tavily, not just chat engines. Shell lines like `GROQ_API_KEY="..."` and `MISTRAL_KEYS=("a" "b")` are read by variable name, and a variable name is never saved as the key (it was, for scraper keys).
- **Prompts:** the white text boxes in the drawer are dark; new fields per prompt: Don't (constraints), Remind me on, Task. They are added as labelled lines when the prompt is used or copied, and included in export/import.
- **Timers and reminders** (ember_tasks.js): the AI can set a timer, e.g. "play music for an hour" = play, then set_timer 60 with stop_music. Fires while Ember is running; if Android closed it, it fires on reopen marked late.
- **Music:** the AI is told what is playing and may remark on it. New switch "Small freedoms": skip, volume, shuffle, play a library song on her own; pause/stop still need him to ask.
- **Humour rule:** quick simple jokes, callbacks, and short human reactions when he is funny.
- Reply bubbles show the model id after the engine name (needs Settings > Show which engine answered ON).
- Tests: tests/v168-test.js (25 checks).

## V1.6.7
- **EMBER TERMUX** panel docked at the bottom of Settings > Hacking: Ember logo, status light (green flashing = connected, red flashing = not), three tabs: Terminal, Ask Ember, Setup.
- Slides full ⇄ half (collapse stops halfway), ▾ drops it to a bar, drag or tap the header. While collapsed a red console beacon sweeps the top edge.
- Terminal engine written inside Ember (VT100/xterm subset: colours, cursor, scrollback, alt screen for nano/vim, line drawing). No CDN, works offline. Talks to a plain `ttyd ... bash` you start in your own Termux (127.0.0.1, random private path, port 7682). Ember never runs or sources your scripts.
- Extra key row (Ctrl, Esc, Tab, ^C, ^D, arrows, / - ~ | $, Copy, Paste) and a preset bar at the bottom (tap = type + Enter, or type only; add, edit, delete, reset).
- Ask Ember replaces Ask Termux: reads the last 60 screen lines (keys and passwords masked, 👁 toggle), answers with command cards (Insert / Run / Copy). Nothing runs until you tap; destructive commands need a second tap.
- Open Termux button (needs the V1.6.7 APK: EmberDevicePlugin.openApp + `<queries>` entry for com.termux).
- Tests: tests/term-test.js (core + real Chromium against a mock ttyd).

## V1.6.6
- **Fix (V1.6.5 bug):** the saved accent colour (old default pink) was overriding the new cyan at startup. New default accent is cyan; anyone still on the old pink or purple default moves to it once. Text on the accent now switches between dark and white automatically.
- New 📟 Device panel (pill above the message box): network (Wi-Fi name, signal, VPN on/off and, with a VPN on, the exit area), AI details (engine mode, key health per provider, persona, add-ons, chat and memory counts), storage and RAM with colour bars, uptime, battery integrity (health, temperature, voltage, cycles, a 0-100 guide score).
- Rotating Juice WRLD interview quotes (not lyrics, credited, under 15 words each) on top, plus "Add your own quote".
- Privacy tab (what is stored, what leaves the phone, permissions, your control) and About tab (disclaimers, crisis numbers, music/copyright, trademarks, no-warranty) with a credits grid: YouTube, AI, web scraping, GitHub, GitLab, Spotify.
- Android: new EmberDevicePlugin.kt (read-only). New permissions ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE and ACCESS_FINE_LOCATION (location is requested only when the person taps Show Wi-Fi name; Android needs it to reveal a Wi-Fi name). Needs a new APK build.

## V1.6.5
- New colour system: deep #0a0a10 background, cyan #00e5ff primary, purple glow, blue info, green good, amber warning, red #ff3b30 danger. Delete/Clear buttons are red; Save/active are cyan; cards are colour-coded by Settings tab.
- Glowing borders on the playing music card, widget and the latest chat bubble.
- Permission/system rows: coloured icons and green / amber / red status pills.
- Music panel: album artwork, Artist/Album/Year/Genre chips, scrollable About section (song + artist), timeline bar pinned at the bottom.
- ember_player.js: metadata fetcher (MP3 tags + embedded cover first, then iTunes for art/album/year, Wikipedia and TheAudioDB for the About text). Cached on the phone.
- get_current_track now returns album, year, genre, artworkUrl and about so Ember can talk about the song and artist.

*For everyone.* Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## V1.6.4
- Browser: the globe button opens a Browser (search or paste a link, clean reader view, tap links to keep browsing, back/forward/reload, saved sites). Send a page to Ember or save it to Documents.
- Documents: a real library on the phone (add text files, make notes, save pages). The AI's list/search/read/summarize tools now have it behind them; the bridge they called did not exist before.
- Left prompt box: fixed the save crash (the input shared the header's id), then added search, tags, pin, edit, copy, export/import and a starter pack.
- AI knowledge: the system prompt now carries a live map of the app (what is ON/OFF and the exact switch), a find_in_app tool (chats, prompts, sites, memory, notepad, documents, masked keys), and a log of actions it already took so it stops forgetting them. Tools no longer switch off for ordinary distress, only for a crisis.

## V1.6.3
- Termux: the top-right Termux button now opens the existing Termux (Hacking) tab in Settings, where the mode switch and Ask Termux live.
- Engine label: every reply shows the engine that answered it (ms stays behind the Show engine switch), and the header chip of the engine that answered last is marked.
- Notifications: every Ember notification (replies, pings, downloads, media, keep-alive) uses the Ember flame as its status-bar icon. Needs an APK rebuild.
- Permissions: Settings shows the real notification status and remembers the microphone answer instead of "tap to check".

## V1.6.2
- Safety: ordinary distress (levels 1-2) no longer shows a hotline card or injects numbers. Ember stays present and lifts instead of pitying. Tools stay on. Only a plan, means or goodbye (level 3) switches to crisis mode with 112 and SADAG.
- Chat: live download progress cards (title, percent bar) and a "saved to Music/Ember" message when each track lands. The AI is told the last result.
- SoundCloud: track download, set/playlist listing (playlist_list), whole-playlist download (playlist_download), SoundCloud search. YouTube playlists use the same tools.
- Native: EmberYoutubePlugin gains playlist, downloadPlaylist, per-job status. DownloadWorker picks the service and saves per-job progress. Not compiled on a phone yet.

## [V1.6.0] - 2026-10-24

### Added (not tested on a phone, the Kotlin and Gradle parts never compiled; the web part has a Playwright test, `tests/agent-test.js`)
- **Agent & API Tools card** (Settings > Music): three switches, each off by default.
  - **Web Search (Tavily)** (`www/ai_agent.js`): tool `web_search` returns Tavily's short answer plus the top results (title, url, snippet). The key is stored in `localStorage` `ember_agent`, never in backups. A Check key button spends 1 credit.
  - **YouTube search + audio download** (`EmberYoutubePlugin.kt`, `EmberYtCore.kt`, `DownloadWorker.kt`): tools `youtube_search` and `youtube_download`. NewPipe Extractor finds the audio stream, a WorkManager task downloads it in 4 MB ranged chunks with a progress notification, and the file is saved to `Music/Ember` through MediaStore (app music folder on failure). Needs an APK rebuild.
  - **Vision** (`see_image`): describes an https image link through Pollinations' free OpenAI-style endpoint.
- `apply_android_patch.py` adds NewPipe Extractor (version from `scripts/newpipe.version`, `v0.26.5`), OkHttp, `desugar_jdk_libs_nio` 2.1.5, a `META-INF` packaging exclude, the JitPack repository, the `FOREGROUND_SERVICE_DATA_SYNC` permission and a `dataSync` type on WorkManager's foreground service (needed on Android 14). Checked against a mock Capacitor project, twice, to confirm it is safe to re-run.

### Taken from Prodigy Syncing (it already builds and downloads)
- NewPipe version `v0.26.5` (the plan named `v0.24.1`), `desugar_jdk_libs_nio:2.1.5`, the `META-INF` packaging excludes, the `en`/`US` locale in `NewPipe.init`, the search call chain, 1 MB ranged chunks, 416 as end-of-file, and the weekly `newpipe-update.yml`. A `.gitlab-ci.yml` mirrors `build.yml` (untested).

### Changed from the plan this was built from
- **NewPipe was never initialised.** `NewPipe.init(downloader)` must run first or every lookup throws, and the plan had no `Downloader`. Added `EmberYtCore` (OkHttp).
- **Download worker:** the plan saved every stream as `.m4a` (it could be WebM), called `setForeground` on every 8 KB, deleted the progress notification when the job ended (so "complete" was never visible), used the raw video title as a filename, and never handled Android 14's foreground-service type. Now: M4A preferred and the real extension used, updates throttled, a separate result notification, sanitised names, `dataSync` type, and a fallback to a plain notification if foreground is refused.
- **`see_image` was a stub** that returned "Image analyzed" without looking at anything. It now makes a real request and returns an error (never an invented description) when the service fails.
- **Tavily:** the plan read `window.S`, which does not exist (`S` is private to `app.js`), and put the key in `S.keys` (the engine key store). The key now has its own store. It also crashed if Tavily returned no `results`.
- **Tool routing:** the plan's `resolveAddonCalls` snippet overwrote the result of every tool with the agent dispatch, checked a `window.EmberYoutubePlugin` that never exists, and tied YouTube to the Music switch. Tools are now listed and run per switch, like the other add-ons.
- **Guard rails:** `youtube_download` only runs if your latest message asks to download or save, and only for a link you pasted or that `youtube_search` returned (the AI cannot invent a video id).
- The plan's hint promised "camera upload" for vision; there is no image upload in the chat, so vision works on pasted https links only.

### Limits
- NewPipe breaks when YouTube changes. `.github/workflows/newpipe-update.yml` builds with the newest release every Monday and commits `scripts/newpipe.version` only if the build passes; you can also set `NEWPIPE_VERSION` for one build.
- Audio only, progressive streams only (no DASH/HLS manifests), no playlists.
- Like the other add-ons, these tools do not run in the background reply task.
- Pollinations' free image endpoint may change or start requiring a token; the tool then reports an error.
- Downloading from YouTube is against YouTube's Terms of Service, and copyright can apply to what you save. See `LICENSE_NOTES.md` for the NewPipe licence.

## [V1.5.9] - 2026-10-24

### Added (not tested on a phone, never compiled)
- **Background chat replies** (`EmberAiPlugin.kt`, `EmberAiWorker.kt`, `ember_native.js`, `app.js`, `providers.js`): if you leave Ember while a reply is still being written, the request the page already built (persona, memory, safety wrapper, history, the engines it would try) is handed to a WorkManager task. It finishes the reply even if the WebView is frozen or the process is killed, stores it, and posts a notification with the inline reply box (the existing `ReplyReceiver`). The page picks the stored reply up on return and adds it to its chat once. If the app finishes first, the background copy is cancelled. Settings > Permissions > System integrations > Keep replying in the background (on by default). Needs an APK rebuild.
- `Prov.pending()` / `Prov.nativePlan(lane)`: expose the in-flight request and the OpenAI-style engines to try (cached model lists only, no extra network).

### Limits
- Add-on tools (music, documents, web) do not run in the background; tool tags are removed from the reply. The same-opener rewrite check (`flaw` / `echoScore`) only runs in the page.
- Only OpenAI-style engines (Groq, Mistral, OpenRouter, HuggingFace) and the free engine run natively; Gemini and Cohere do not.
- The request file holds the API keys in app-private storage until the task finishes, then is deleted.

### Changed from the plan this was built from
- The plan pushed the AI's answer through `ember-bg-reply`, which the app treats as something *you* typed (it would have started a second reply). Results now go through a separate stored-results queue.
- The plan replaced `reply()` with a stub and sent only the last prompt (no persona, history or safety). The real request is now handed over unchanged.
- The plan called a `showBackgroundNotification` method on the plugin instance and used the retired `llama3-8b-8192`; the worker posts the notification itself and uses the page's own model choice.
- Plain thread replaced by WorkManager, so the work survives the process dying.

## [V1.5.8] - 2026-10-24

### Added (not tested on a phone, never compiled)
- **Native music notification** (`EmberMediaSession.kt`, `EmberMediaPlugin.updateNotification` / `clearNotification`): Ember's own player now owns a real Android MediaSession and media notification with previous, play/pause, next, on the shade and lock screen. Buttons are real PendingIntents and come back into the page as the `ember-media-cmd` event. Follows the local player only, not Spotify. Settings > Permissions > System integrations > Native music widget. Needs an APK rebuild.
- **Proactive AI pings** (`EmberPingWorker.kt`, `EmberNotifyPlugin.saveNativeConfig` / `setProactivePings` / `pingNow`): opt-in WorkManager task, about every 4 hours, asks Groq for one short check-in about your open threads. Off by default. Quiet 22:00 to 08:00 and for 30 minutes after you last used the app. Lock screen shows only "Ember pinged you". Switching it off cancels the task and wipes the Groq key and topics held by the native side. Includes a Send test ping button. Needs an APK rebuild.
- `apply_android_patch.py` adds `androidx.work:work-runtime-ktx:2.9.0` and checks all 7 Kotlin files.

### Changed from the plan this was built from
- Notification buttons were `null` actions (dead); now real broadcasts. The WebView was reached through a `context as MainActivity` cast that always failed; now a weak WebView reference set by the plugin. The shade style used a framework token with a compat style (would not compile); now framework `Notification.MediaStyle` throughout, so no extra media dependency.
- The Groq key was only written to `localStorage`, which the background worker cannot read; now saved natively via `saveNativeConfig`. Model changed from the retired `llama3-8b-8192` to `llama-3.1-8b-instant`. Added timeouts, quiet hours, retry cap, and a private lock-screen version.

## [V1.5.7] - 2026-10-24

### Added (not fully tested)
- **Ember's own music player** (`ember_player.js`): upload songs (stored in the app) or scan the phone (APK only), playlists, shuffle/repeat, lock-screen controls. No bridge, no other app.
- **Now-playing widget** above the message box and a **Music panel** (🎵 pill): Library, Spotify, Ember tabs.
- **Spotify connect** (`ember_spotify.js`): PKCE sign-in with your own Client ID (Settings > Music), what is playing, play/pause/skip/seek/volume, search, playlists. Needs Premium for control.
- **AI music rules** (`ai_music.js`): real tools only, told live state and limits, code refuses any music tool unless your latest message is about music, every AI action is logged in the Ember tab. If web lookup is off the AI says so.
- Native: `readChunk` in `EmberMediaPlugin.kt`, app link `com.fezzy.ember://spotify` in `MainActivity.kt` and the patch script. Needs APK rebuild, never compiled.

### Known
- `tests/music-test.js`: 74 pass, 4 fail (get_current_track after pause, rogue-pause chat case, Spotify get_current_track, one prompt-text check). Not investigated yet. `tests/app-test.js` was already failing before this version.

## [V1.5.6] - 2026-10-24

Batch 2 of 3. Status labels: **implemented** = written into this zip; **not tested** = nothing here has been run on a phone or built with Gradle; **needs APK rebuild** = needs `npm install`, `cap sync`, the patch script and a new APK.

### Fixed
- **Gemini AQ. keys.** The key finder only matched one literal prefix (`AQ.Ab8RN6LW`). It now matches any `AQ.` key as well as `AIza`. (implemented, not tested)
- **401/403 on keys.** Pasted keys are cleaned before they are stored or sent: zero-width characters, quotes, a leading `Bearer ` / `key=`, trailing commas. Stored keys are cleaned on load. (implemented, not tested)
- **Gemini rejections now explain themselves.** A 401/403 is retried once with the key as a `?key=` query parameter before the key is marked bad, and the real Google reason is kept with a plain hint (for example `ACCESS_TOKEN_TYPE_UNSUPPORTED`: some accounts get AQ. keys that the REST API refuses, and an AIza key made in Google Cloud Console is the workaround). Engine-switch errors and Check all now show the provider and HTTP code. (implemented, not tested)
- **Browserless 401/403.** The token is tried against the sfo, lon and ams regions in turn. (implemented, not tested)
- **Plugins not found inside the APK.** `ember_native.js` read plugins from `Capacitor.Plugins.X`, which is empty for plugins this no-bundler app never registered in JS. It now asks Capacitor for the native plugin by name. This is the most likely reason the mic, wake lock and notifications did nothing. (implemented, needs APK rebuild, not tested)
- **Saved wake lock was not re-applied** after reopening the app. It is now restored on launch. (implemented, not tested)

### Added
- **Free reader (no key).** New first provider in Web Scraping: fetches the page straight from the phone, then r.jina.ai, then allorigins. Own on/off switch, health row and Test option. `scrape_url` accepts `format: "text"` for plain text with no Markdown. (implemented, not tested)
- **Voice playback.** Native text-to-speech via `@capacitor-community/text-to-speech` (^5.0.0, the Capacitor 6 line), used first inside the APK, with the browser voice as fallback and an en-US retry. The patch script adds the Android 11+ `TTS_SERVICE` query that the engine needs to be visible. (implemented, needs APK rebuild, not tested)
- **Mic fallback.** If the quiet recogniser cannot start, Android's "Speak now" dialog is tried before an error is shown. Adds the `RECOGNIZE_SPEECH` query. (implemented, needs APK rebuild, not tested)
- **Background keep-alive.** New Permissions row backed by `EmberKeepAliveService` (foreground service, `specialUse` type for Android 14, CPU wake lock, ongoing notification with a Turn off action). New permissions: `WAKE_LOCK`, `FOREGROUND_SERVICE_SPECIAL_USE`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`. (implemented, needs APK rebuild, not tested)
- **Battery exemption** is now a real native call (`hasBatteryExemption`, `requestBatteryExemption`) and an **Open app battery & launch settings** button was added, because Honor/MagicOS has its own battery manager on top of the Android one. (implemented, needs APK rebuild, not tested)
- **App icon.** `www/ember-icon.svg` (the file `index.html` already pointed at) plus the manifest and service-worker entries, and an adaptive launcher icon (`android_patch/res/`) that the patch script copies in. (implemented, needs APK rebuild, not tested)
- **Termux Mode label.** The header button reads `💻 Termux Mode` instead of `💻 TX`. (implemented)
- **Chat menu tabs.** The ☰ menu has Chats and Prompts tabs; Prompts is a saved-prompt list (add, tap to put it in the message box, delete), stored on the phone. (implemented, not tested)

### Not done yet (Batch 3)
- Tests were not run or updated for this batch; `tests/voice-native-test.js` still expects the old behaviour when no speech service exists and `tests/app-test.js` may reference the old drawer title.
- Wake lock and keep-alive behaviour on the real phone, and whether the AQ. key works against your Google account.

### Files touched
`www/providers.js`, `www/ai_scraper.js`, `www/ai.js`, `www/app.js`, `www/ember_native.js`, `www/index.html`, `www/style.css`, `www/sw.js`, `www/manifest.webmanifest`, `www/ember-icon.svg` (new), `package.json`, `README.md`, `scripts/apply_android_patch.py`, `android_patch/` (new `EmberKeepAliveService.kt`, `res/`, updated plugin and manifest additions).

## [V1.5.5] - 2026-10-24

### Changed (Batch 1 of 3 — UI declutter + Settings restructure)
- **Header decluttered.** Chill/Sharp/Deep mode switcher moved out of the header and down into the composer footer, above the Spark/Go deeper/Normal row. The header now only has History, Termux toggle, title/engine dots, and Settings.
- **999 moved out of the header.** The `🔥 999` button is gone from the top bar; 999 (Quote/Playlist/Lyrics) now opens from a "🔥 Open 999" button next to Lucid Dreams Mode in Settings → General → Voice & pacing, where it's thematically grouped.
- **Settings is now tabbed.** Instead of one 13-card scroll, Settings opens with a tab bar: **General, Keys, Scraping, Hacking, Music, Permissions.** Each existing card moved under the tab it belongs to with no content changes. Every card's header (`.ct`) is now also a collapse/expand toggle, so any section can be folded to save scroll space.
- **Permissions tab rebuilt.** Was two buttons (Notifications, Microphone) and a "Checking…" label. Now five rows with live status: Notifications, Microphone, **Keep screen awake (wake lock)** — a real toggle, not just a during-reply hold — **Battery optimization** exemption request, and **File/media access**. The wake-lock toggle is wired end to end in `ember_native.js` (`setWakeLock`/`wakeLockAvailable`); battery exemption and the native file-access prompt call into `EmberNotify`/`EmberMedia` and report plainly when the native method isn't built into this APK yet (that native half lands in V1.5.6, see docs/ANDROID_PERMISSIONS.md).

### Files touched
`www/index.html`, `www/style.css`, `www/app.js`, `www/ember_native.js`, `www/sw.js` (cache bump), `package.json`, `README.md`, `scripts/apply_android_patch.py`.

## [V1.5.4] - 2026-10-23

### Fixed
- **CI `npm install` ERESOLVE failure.** `package.json` pinned `@capacitor-community/keep-awake@^7.0.0`, whose peer dependency is `@capacitor/core >=7.0.0`, but this repo is on Capacitor 6.2.x. Pinned to `^5.0.0`, the line that pairs with Capacitor 6 (the plugin maintainer's own demo app pairs `keep-awake 5.0.0` with `@capacitor/core 6.0.0`). The plugin's majors do not track Capacitor's one-to-one: 4.0.0 already requires Capacitor 5 and 7.x requires Capacitor 7. The JS API used in `www/ember_native.js` (`keepAwake()` / `allowSleep()`) is unchanged across these versions. Upgrade `keep-awake` to 7.x only together with the whole Capacitor 7 move (and Java 21, see `docs/ANDROID_BUILD.md`). Versions bumped everywhere: `package.json`, `www/sw.js` (cache `ember-v1.5.4`), `index.html`, README, `apply_android_patch.py`.

## [V1.5.3] - 2026-10-23

### Fixed
- **CI install failure.** `package.json` depended on `@capacitor-community/wakelock`, which has never existed on npm (404 on install). The real package is `@capacitor-community/keep-awake`. Swapped the dependency and fixed the usage in `www/ember_native.js`, which was also wrong in two more ways that would have surfaced only after install succeeded: it looked up the plugin as `Capacitor.Plugins.Wakelock` (the plugin actually registers as `KeepAwake`) and called `.acquire()`/`.release()` (the real API is `.keepAwake()`/`.allowSleep()`). All three are fixed together so the hold-screen-awake-during-a-reply feature will actually work once the correct package installs. Docs (`ANDROID_PERMISSIONS.md`, `ANDROID_BUILD.md`) and the manifest comment updated to match. No test covered this path, so it only surfaced via a real `npm install` in CI, not the test suite.

## [V1.5.2] - 2026-10-23

### Fixed
- `index.html` footer still read "Ember V1.5.0" after the V1.5.1 bump touched every other file. Now V1.5.2 everywhere: `index.html`, `package.json`, `www/sw.js` (cache `ember-v1.5.2`), README.

## [V1.5.1] - 2026-10-23

The voice and permissions fix. Android WebView has no `SpeechRecognition`, so the mic button could never work in the installed APK.

### Fixed
- **Voice input in the APK.** `app.js` now uses the native Android recogniser (`@capacitor-community/speech-recognition`) when running inside the app, and keeps the Web Speech API in browsers and the PWA. Live partial results fill the message box; tapping the mic again stops it; a 60 s guard stops a stuck session.
- **Missing permissions.** The merge of `android_patch/` was manual and never ran in CI, so the APK shipped without `RECORD_AUDIO`, `POST_NOTIFICATIONS` and the reply receiver. `scripts/apply_android_patch.py` now merges them on every build and fails the build if any is missing.
- Added `MODIFY_AUDIO_SETTINGS` (WebView mic) and the Android 11+ `<queries>` entry for `android.speech.RecognitionService`, without which the speech engine is invisible to the app.
- Kotlin plugins could not compile: Capacitor 6's template has no Kotlin Gradle plugin, and `MainActivity.java` clashed with `MainActivity.kt`. The patch script enables Kotlin and removes the template `MainActivity`.
- `EmberNotifyPlugin.kt`: wrong `RemoteInput` class for `NotificationCompat` (now `androidx.core.app.RemoteInput`), nullable launch intent, and a notification channel call that needed an API 26 guard.
- Release signing: `assembleRelease` produced an unsigned APK, so the upload step found nothing. The patch adds a `signingConfig` driven by the CI secrets.
- CI uses Java 17 (Capacitor 6 / Gradle 8.2 do not run on Java 21).
- Two stale tests updated (persona rule 9 wording, V1.5.0 session restore).

### Added
- `docs/ANDROID_BUILD.md`: CI setup, required GitHub secrets, and a device checklist.
- `.github/workflows/build.yml` and `scripts/apply_android_patch.py` in the repo.

## [V1.4.0] - 2026-10-23

The add-ons release. Both add-ons are off by default.

### Added
- `www/ai_music.js` (Music Control) and `www/ai_docs.js` (Document Reading): tool schemas plus handlers that call the `EmberMedia` and `EmberDocs` bridges when a host app provides them, and fall back gracefully when it does not.
- Settings > **Add-Ons** card with two switches (`musicAddon`, `docsAddon`, saved in settings).
- `resolveAddonCalls` in `app.js`: finds `<tool_call>` blocks in a reply, runs the matching tool (max 3), then asks the AI to turn the result into a normal reply. Tool results are passed as data, not instructions.
- `toolsBlock` in `persona.js`: tool instructions are added to the system prompt only while an add-on is on.

- `www/ai_scraper.js` (`scrape_url(url, objective)`; Firecrawl, Browserless, ScraperAPI, ScraperBee, Sting, ZenRows in that order), `www/ai_sites.js` (`save_site`, `list_sites`) and `www/ai.js` (Settings > Web Scraping keys card, Saved Sites list in the drawer). Keys also accepted for SerpApi and Octoparse (stored only). Tool calls now chain for up to 3 rounds.

- **Prototype engines:** OpenRouter (free models only), Cohere (v2 chat) and HuggingFace (router) added to `providers.js` with `status: 'prototype'` and a Prototype badge. They sit last in every lane. New Gemini key format `AQ.Ab8RN6LW…` is recognised. Engine switches fire an `ember-switch` event and `ai.js` shows a toast.
- Scraper chain extended with SerpApi (snippets only) and Octoparse (not supported, skipped). `scrape_url` accepts a saved site name.

- **Voice:** 🎤 button (Web Speech API, red pulsing while recording, fills the message box, never auto-sends), 🔊 on every reply, and an auto-read switch under Settings > Voice.
- **Globe:** 🌐 button reads a pasted link (or a saved site name) with `scrape_url` and adds the page to the chat as marked, untrusted context. Anything typed in the message box becomes the objective.
- **History:** the chat list is a collapsible "Recent Chats (N)" section; open/closed state is remembered. Searching opens it temporarily.

### Safety
- No tool instructions are sent and no tool is run at crisis level 2 or higher (`noTools` plus a `Safety.lastLevel()` check).

### Changed
- Version bumped to V1.4.0. `ai_music.js` and `ai_docs.js` are added to the service-worker file list (cache `ember-v1.4.0`).
- Tools are routed by tool name, so document tools are no longer swallowed by the music handler.
- Privacy note: with Document Reading on, document text is sent to whichever engine answers, including Free Mode (Pollinations).

## [V1.3.0] - 2026-10-22

The safety release. No new chat features.

### Added
- `www/safety.js`: offline `Safety.detect` (levels 0 to 3), `wrapSystem`, `killSwitch`, `crisisCard`, and a transient level (`mark`, `lastLevel`). See [SAFETY.md](SAFETY.md).
- Wiring in `Persona.respond`: the safety check runs first. At level 2 or higher it forces the deep lane, drops directives, skips the anti-echo rewrite, and appends the crisis block to the system prompt. Level 1 appends a tone override.
- A local **crisis card** (SADAG 0800 567 567, Lifeline SA 0861 322 322, 112) shown the moment the message is sent, plus a red support dot beside Ember's name.
- `after()` skips memory learning at level 2 or higher and for 14 messages after one.
- Memory migration: `MEM_DEF` and `migrateMem`, used on load, on "Clear memory" and on import. Seven keys, five reserved for V1.4.0. Old V1.2.0 saves keep all facts and threads.
- `tests/safety-test.js` (43 checks), and these docs.

### Changed
- Version bumped to V1.3.0 in `index.html`, `package.json`, `sw.js` (cache `ember-v1.3.0`), the README and file headers. `safety.js` is added to the service-worker file list.
- The root README is now a short pointer. The old feature notes moved to [FEATURES.md](FEATURES.md).
- `.gitlab-ci.yml` gains a `lint` job (`node --check`) and an `audit` job (forbidden-pattern grep) ahead of the existing Pages deploy.

### Fixed (audit items closed)
- The crisis card could be wiped by the next re-render. It is now drawn inside the render function.
- A directive could be sent to the model before the kill switch cleared it. The check now runs before the message list is built.
- "I have a plan" or "I have a knife" alone could score level 3. Means and timing now count only next to ideation.
- An idiom anywhere in a message could cancel a real crisis phrase in the same message. Idioms are now removed before matching.
- Curly apostrophes from Android keyboards broke every `don't` / `can't` pattern. Text is normalised first.
- The first draft's support-dot style would have turned the whole name into a red dot. It is now a small `::after` dot.
- Import dropped future memory items that use `text` or `name` instead of `t`, and accepted a `__proto__` key. Both fixed.
- README feature tags for Free Mode, Voice & pacing and Memory & Context read V1.3.0 after a bulk version bump. They are back to V1.2.0.

### Not shipped (deferred to V1.4.0)
Vibe check, mood weather, pattern spotting, running bits, character modes, Thought Courtroom, Surprise button, coping deck, letters to future self, debate mode, micro-surprises, easter eggs. Open decisions: the coping deck conflicts with HARD RULE 9 and debate mode with HARD RULE 4, so both need a redesign before they are built. Also open: making crisis mode last for a few messages after a trigger.

## [V1.2.0]
The state of the code before the safety layer: Free Mode, voice and pacing settings, memory and context settings. No tag exists in this repo; see the commit history.

## V1.9.0
See docs/V1_9_0_PLAN.md. Not run on a device. APK must be rebuilt (run `npm run patch:android` again for the network security config).
~~~~~~~~

## COMMAND_CENTER_RELEASE_NOTES.txt

Original file(s): COMMAND_CENTER_RELEASE_NOTES.txt, docs/history/COMMAND_CENTER_RELEASE_NOTES.txt

~~~~~~~~text
EMBER 1.9.93 — COMMAND CENTER PATCH
Based on the supplied ember-V1_9_92.zip. This is source code, not a compiled APK.

INSTALL
Extract ember-V1_9_93-command-center.zip and use the extracted project as the updated source tree. Run npm run serve to open the existing local PWA. For Android, follow the project's existing Capacitor/build instructions. The updated service-worker cache includes both new UI assets.
No GitHub build, repository push, or live-device action was performed during implementation.

UI
The header's new square/panel button opens the right-hand Command Center. Escape, the backdrop, or its close button dismisses it; keyboard focus returns to the header. Mobile layouts, reduced-motion preference, focus trapping and ARIA state are included.
Cards: Thought Inspector, Memory Matrix, Quick Actions.
The separate bottom-of-chat Live Terminal drawer supports stdout, stderr, status, and merged-log filters; follow scrolling; clear display; a 1,000-line buffer; and text-only rendering. Logs are ephemeral, not saved in localStorage.

THINKING TIMELINE PRESERVATION
These original modules are byte-for-byte identical to the uploaded version:
www/ember_timeline.js
www/ember_think_inline.js
www/ember_react.js
www/ember_steps.js
www/ai_agent.js
The existing begin/note/tool/snapshot/drop wiring remains in app.js. Existing timeline event emitters were not removed, renamed, or replaced. New terminal telemetry uses distinct event names and never calls or wraps timeline methods.
The preservation test includes original SHA-256 hashes.

3-PHASE PUBLIC SUMMARY
For coding answers, the main system prompt requests these exact headings, in this order, before code:
Phase 1: Architecture/Constraint Check.
Phase 2: Tactical Execution Plan.
Phase 3: Edge-Case Mitigation.
One short outcome-focused sentence follows each heading, then Implementation: and the requested code/artifacts. The inspector renders that actual public response text, during streaming where available and from the final response otherwise. It never reads provider hidden-reasoning fields and does not fabricate a plan if the provider omits it. This is a public decision summary, not a private chain of thought. Tool-only outputs retain their existing formats; crisis handling and ordinary chat remain exempt. Coding replies have a larger output budget.
A prompt contract cannot guarantee every provider follows formatting. Missing/nonconforming phases stay absent rather than being invented.

MEMORY MATRIX
The observer inspects the actual app-level provider request (system plus message contents), not the list of all stored documents. It shows observed document excerpts, parsed file-bearing tool results, and repo read-first files whose provenance markers are in that request. Source content is not copied into the panel. Files absent from the next observed request disappear.
This is a latest-observed-request inventory, not a tokenizer-level view of a provider's internal context. External/native model calls that bypass the browser's Prov.run entry point cannot be observed by this UI.

QUICK ACTIONS
Run Build: resolve the existing configured output repo/branch; confirm; validate and dispatch the configured workflow via GitHub's existing restricted managerRequest interface; poll run/job/step status. Dispatch is explicitly not reported as build success. Monitoring pauses while hidden/offline and is bounded to an hour.
Push to GitHub: confirm and reuse EmberRepoRunner.sync(). This dispatches the existing installed whole-repository sync/push workflow. It does NOT commit arbitrary chat artifacts or install workflows/secrets automatically. Install/update the runner first in Features > Repo Runner if needed.
Clear Cache: confirm and clear the existing GitHub repository read caches only. It refuses while a repo sync is active. Chats, document library, settings, saved keys, and offline app assets are preserved. The terminal's separate Clear button clears only the display.
Buttons are locked during an operation and errors are displayed. Existing token, permissions, branch restrictions, and runner manifest checks remain authoritative. Concurrent external dispatches or clock skew can make workflow-run correlation ambiguous; the GitHub Actions run page is the source of truth.

LIVE TERMINAL: WHAT WORKS NOW
1. NewPipe: subscribes to the existing ember-dl events without changing their producer or the timeline listener. Displays real native state, title, percent, and detail updates. The existing native implementation does not expose process stdout/stderr.
2. Ember GitHub command runner: mirrors existing real status updates using separate new telemetry. When its existing published log tail is returned, the terminal labels it MERGED because the original workflow joins stdout and stderr with 2>&1. It never pretends to split a merged log.
3. Repo Runner install/sync and Command Center quick actions: observe real GitHub run/job/step status using the existing restricted API client. Full workflow logs remain available on the GitHub run page.
4. Raw real-time stdout/stderr: a tested front-end EventSource adapter and direct event API are included. A real authenticated backend/native producer is REQUIRED to supply those bytes. No backend relay is implemented or deployed in this source patch. The current static server has no live GitHub shell-stream endpoint. Do not connect the adapter to a nonexistent URL and expect logs.

CONNECT AN EXISTING SAME-ORIGIN SSE BACKEND
From your trusted app bootstrap, only after your backend provides the endpoint:
  EmberCommandCenter.connectStream('/api/terminal/stream');
Disconnect explicitly:
  EmberCommandCenter.disconnectStream();
Use same-origin session/cookie authentication, not secrets or tokens in the URL. The browser adapter rejects external origins, URL credentials, query strings and fragments. Stop the stream on an SSE event named end. It closes streams and polling on pagehide. Reconnect explicitly after navigation/BFCache restoration when needed.

SSE wire examples (each frame ends in a blank line):
  event: stdout
  data: {"source":"GitHub Runner","text":"compiler output line"}

  event: stderr
  data: {"source":"GitHub Runner","text":"compiler error line"}

  event: end
  data: {}

Unnamed message events can carry {"source":"NewPipe","stream":"stdout","text":"..."}.
The producer must authenticate and authorize job access, redact secrets BEFORE transmission, emit keepalives, and terminate streams for completed jobs. Browser-side common-token redaction is defense-in-depth, not a guarantee against arbitrary secret formats. Never emit credentials, entire environments or API response headers.
The bridge receives data only; printed text cannot execute commands.

DIRECT IN-PROCESS / NATIVE BRIDGE
A trusted bridge can forward already-authorized output without SSE:
  window.dispatchEvent(new CustomEvent('ember-terminal', {
    detail: { source: 'GitHub Runner', stream: 'stdout', text: chunk }
  }));
  // stream may be stdout, stderr, status, or merged.
Or call EmberCommandCenter.write(...) with the same data object.
These examples are wiring contracts, not evidence that a remote process was run.

TESTS AND VERIFICATION
New command-center-test.js: 17 static/preservation checks passed.
New command-center-browser-test.js: 23 Chromium checks passed, including a real local SSE test endpoint, simulated NewPipe events, timeline preservation, keyboard behavior, context eviction, bounded log buffer, safe rendering, token masking, and mocked quick actions. Remote GitHub writes are mocked; no real build/push occurred.
Existing v1992-repo-runner-test.js: 29 checks passed.
Existing v1992-repo-runner-browser-test.js: 18 Chromium checks passed.
Existing v1991-deliverables-test.js: 32 checks passed.
The legacy npm test chain is NOT fully green: tests/app-test.js times out clicking a hidden old .stab[data-st="keys"] Settings tab. The same timeout was independently reproduced against the unmodified uploaded V1.9.92. No claim of a full-suite pass is made.

Run:
  npm run test:command-center
  npm install --no-save playwright
  npx playwright install chromium
  npm run test:command-center:browser
On Linux CI, Chromium may also need: npx playwright install-deps chromium
Existing test files may expect a historical Playwright installation path; set PW to your installed Playwright module path for those files.

DELIVERY
Full updated source project: ember-V1_9_93-command-center.zip
Optional unified patch against original root: ember-command-center.patch
New UI source: www/ember_command_center.css and www/ember_command_center.js; component markup lives in www/index.html.
~~~~~~~~

