# Changelog

*For everyone.* Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
