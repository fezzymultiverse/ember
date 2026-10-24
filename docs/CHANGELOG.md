# Changelog

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
