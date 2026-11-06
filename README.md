<p align="center">
  <img src="resources/icon.png" alt="Horizon" width="128">
</p>

<h1 align="center">HORIZON</h1>

<p align="center">A clean Android AI chat app built with Capacitor. Gemini, Groq, Cohere or free Pollinations, one at a time, no fallback chains. V1.3.0 turns Settings into a three-row list, adds a PERMISSIONS panel with red/green switches, and adds a YouTube music feature: ask the AI about music, ask it to download, and watch progress in a Downloads box.</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-00e5ff"></a>
  <img alt="Platform: Android" src="https://img.shields.io/badge/platform-Android-000000">
  <img alt="Capacitor 6" src="https://img.shields.io/badge/Capacitor-6-00e5ff">
</p>

## What's new in V1.12.1

- **Stop button (red).** While Horizon is working, the send button turns into a red Stop square. Tap it and the request is dropped at once: the loading bubble goes, a "Stopped" note shows, and the late reply is thrown away. Further retries and tool rounds of that turn are cancelled too. While a reply is still typing out, Stop just finishes the text. Works for image mode as well.
- **Copy button (cyan, green when copied) on every Horizon reply**, next to the read-aloud button. It copies the reply text as written (Markdown) and shows "Copied" for a moment.
- **Calmer chat.** A thin divider line now sits between one exchange and the next. Nothing else was changed.
- *(Checked in headless Chromium with a mocked provider: copy and clipboard text, red Stop, instant release, late reply discarded, next turn works, Stop while typing. Not run on a phone. Stop drops the answer on your side; the provider may still finish the request it already received.)*

## What was new in V1.12.0

- **HORIZON VAULT is now encrypted.** The item list is one AES-256-GCM blob in the app's storage. The key is made from a passphrase you choose (PBKDF2-SHA256, 600,000 rounds, random salt). The passphrase and key are never stored, every save uses a fresh IV, and there is no recovery: forget it and the Vault can only be erased.
- **First open = set a passphrase.** Existing V1.11.0 items are encrypted with it; the old plaintext copy is removed only after the encrypted copy is written and checked to open.
- **Locks itself** after 5 minutes idle or 1 minute in the background, or with **Lock now**. Locked means the list is gone from memory and from the page, the AI cannot file notes and sees no titles. **Change passphrase** is on the unlocked page. Wrong tries are slowed down after the third miss. **Erase the Vault** is on the lock screen.
- **Not covered:** a key you switch on with **Use** is also kept by its provider card in the app's normal storage, outside the Vault. Anything you copy to the clipboard stays there. Deleted plaintext may linger in flash until Android reuses the space.
- *(Checked in headless Chromium at phone size: migration, ciphertext contents, lock / unlock, wrong-passphrase lockout, tampered data, change passphrase, background lock, erase, AI note filing locked and unlocked. Not run on a phone.)*

## What was new in V1.11.0

- **Robot button (top right).** The robot icon sits beside the menu button. Tap it and a sheet lists all four providers (Gemini, Groq, Cohere, Pollinations) with READY / NO KEY / ACTIVE. Tap one and it asks which model; the choice becomes the active provider and model. A provider with no key sends you to API PROVIDERS PLUS KEYS. The green or red dot on the button shows whether the active provider is ready. The old chip row above the chat is hidden (`#aiSelector` in the CSS) because the robot replaces it.
- **Three dots, wave and pulse.** The dots next to the AI while it answers are now three, each rising in a wave and glowing in turn. Reduced-motion still turns the animation off.
- **HORIZON VAULT (right panel, orange).** New settings page with its own description. Store AI keys and scraping keys (several per service, tap **Use** to switch the live key through the normal save-and-validate path), notes, SSH keys, tokens and links. Links show the site's icon. Filter by type, Show / Copy / Edit / Delete (delete asks twice), add with the **+ Add** button. Kept in the app's own storage on the phone and **not encrypted**.
- **AI can file notes.** With the switch on, the AI can end a reply with `[[vault.note: Title | text]]` and the note lands in the Vault (max 2 per reply, marked BY AI). The tag is always stripped from what you read. The AI sees only the titles of your notes, never keys, tokens or SSH keys, and a note that looks like it holds a key is refused. The switch is on the Vault page and as a row under **PERMISSIONS**, and it is on by default.
- **Link icons for AI searches.** Already in place, checked, nothing to add: search results in the thought process and the Sources cards under a reply show each site's icon, with a letter if the icon cannot load.
- **Bigger chat box, small icons.** The message box is a taller multi-line field (grows to about 6 lines; Enter still sends), the + and send buttons are smaller, and the red YouTube button no longer sits inside it. Anything switched on (YouTube, Image, PDF, Web, GitHub, Music, Vault notes) shows as a small chip in its own strip above the box, each with an **X** that switches it off.
- **Startup bug fixed (was in V1.10.0).** The music player's Songs / Artists / Albums tabs were treated as menu rows, which threw an error during start-up and stopped the rest of the setup (provider status, chat list, welcome screen). Only real menu rows are used now.
- *(Checked in headless Chromium at phone size with the AI and web calls mocked: picker, Vault add / edit / delete / use-state, AI note filing and secret refusal, chips and their X, box growth, 3-dot animation. Not run on a phone, and the Android Java is unchanged and untouched. Using a Vault key through Use was not tested against live Gemini, Groq or Cohere.)*
- New file `www/horizon_vault.js`.

## What was new in V1.10.0

- **Music player, own MUSIC tab in the left panel.** Full player: now-playing card with seek bar, previous / play-pause / next, shuffle, repeat (off, all, one), likes, a queue, Recent, and Songs / Artists / Albums / Liked views with search and sort (A-Z, Artist, Newest). Tap an artist or album to filter the songs. *(Implemented. Logic tested in Node with a mocked player and a mocked scan; not seen on a phone screen, and real playback is not tested.)*
- **Widget at the bottom of the left panel.** A mini player that stays pinned at the bottom: song, artist, previous / play-pause / next, the red eye, and an **expand** button that jumps straight to the MUSIC tab, so it never fights the other tabs. *(Implemented, layout not seen on a device.)*
- **Now playing under the Horizon logo.** A thin strip below the header shows the current song with an animated bar, play / pause, the red eye and a progress line. Tap it to open the player. It only shows once a song is loaded.
- **Scan your whole storage.** **Scan storage** asks Android's media index for every audio file on internal storage and the SD card (new native method `scanMusic` in `HorizonPermsPlugin.java`, uses the same audio / storage permission as the YouTube downloads). Voice recordings and other non-music audio are hidden unless you switch **All audio** on. Files inside `.nomedia` folders or that Android never indexed are not found. **Add files** loads audio for the current session (also works outside the app). The song list is cached, so no rescan is needed on every launch. *(The Java method is written but NOT compiled or run here: no Android toolchain. Treat the first build as the test.)*
- **Red eye = the AI can see.** One switch (red eye icon on the widget, the strip, the player and in the + menu as **Music (AI can see)**). On: every reply is given what is playing, how far in, up next and recently played, so you can ask "what do you think of this?". There is also an **Ask AI** button that asks it for you. Off (eye slashed): the AI sees nothing and gets no music tools.
- **AI controls.** With the eye on the AI can use `[[music.search: words]]`, `[[music.play: id or words]]`, `[[music.queue: id]]`, `[[music.pause]]`, `[[music.resume]]`, `[[music.next]]`, `[[music.prev]]`, `[[music.now]]`. It only knows song details (title, artist, album, length, position). It cannot hear the audio.
- Not built yet (planned): album art (tiles use a coloured letter), playlists you can name, sleep timer, and showing the YouTube downloads in the library automatically.
- New file `www/horizon_music.js`.

## What was new in V1.9.0

- **GitHub vault widget** at the bottom of the right panel (shown on the Settings list, hidden inside sub pages). Search GitHub by name, or paste `owner/name` or a github.com link, then tap **Pull**. *(Implemented; the GitHub calls and the vault were tested against a mocked GitHub and a mocked IndexedDB in Node, not against live GitHub and not on a device.)*
- **Termux-style terminal.** A small dark terminal shows what the pull is doing: the command, tree size, which files were kept or skipped, and a live `[####----] 45%` progress line. **Stop** aborts a pull and stores nothing for that repo. *(Implemented; layout not yet seen on a phone screen.)*
- **Pulled tab** next to the terminal lists every pulled repo with branch, file count, size and age, plus **Pull again** and **Remove** (tap twice). You never browse the files; only their size shows. They are stored as text inside the app (IndexedDB).
- **Sync** checks each pulled repo's latest commit, re-pulls the ones that changed, then the ring icon in the widget header shows the **percentage of vault space used** (green, amber from 70%, red from 90%). Budget is 100 MB for the vault, 15 MB and 1500 files per repo.
- **Uploaded to the AI.** Every chat with GitHub on gets a manifest of the pulled repos in its system prompt (layout, file types, README start) plus four tools the AI uses by itself: `[[gh.list]]`, `[[gh.tree: repo | folder]]`, `[[gh.read: repo | path | 1-200]]`, `[[gh.grep: repo | pattern]]`. Results go back to the AI marked as untrusted data. The vault is read-only: the AI cannot push to GitHub.
- **GitHub toggle in the + menu** with a cat icon (a stylised cat drawn for this app, swap in GitHub's official Octocat asset if you prefer). Per chat, green on and red off, same as Web and YouTube. Pulling a repo switches it on for the current chat.
- **Optional token** (Token section in the widget) for private repos and a higher rate limit. Stored on this phone only and sent only to GitHub. Skipped on purpose: binaries, `node_modules`, `dist`, `build`, `vendor`, lock files, files over 300 KB.
- New file `www/horizon_github.js` holds the vault, the GitHub calls, the terminal and the AI tools.

## What was new in V1.8.0

- **Cohere.** New provider chip. Add a Cohere key (a free trial key works), pick a Command model, switch it on. Uses the v2 chat API; the model list is loaded from your key. Trial-key rate limits are retried when the wait is short.
- **Pollinations (free chat, no key).** New provider chip that works with no setup. It is also the default on a fresh install. The free tier is one request at a time, about 30 seconds apart; Horizon waits for the next slot and retries instead of failing. "Refresh model list" reloads the models Pollinations offers.
- **Image toggle in the + menu.** Switch **Image** on and Pollinations takes over: whatever you type is drawn (768x768) and shown as an image card with **Save** (Documents/Horizon), **Redo** (new seed) and **Open**. A small lime dot on the + shows image mode is on. Switch it off to go back to chat. The free image tier is about one picture every 45 seconds.
- **PDF pill moved into the + menu.** The PDF switch now carries a **Make PDF** pill underneath it (shown while PDF is on). The extra button beside the + is gone, so the message bar has more room.
- **Piper voice plays.** Piper audio now plays through Web Audio that is unlocked on every tap, with the audio element as a backup, and the app allows media playback without a fresh tap. If Android still refuses, the Voice card shows why and Horizon falls back to the Android voice. Finishing the Piper download now switches Voice quality to High quality for you (before, it stayed on Standard, so Piper never spoke). Four more Piper voices were added (US, Scottish and UK English).
- **More Android voices and accents.** Voices are grouped by accent with readable names (for example "Voice AFRM · online"), your phone's own accent comes first, and a new **Accent or language** list narrows the voices. **Get more Android voices** opens Android's text-to-speech settings, where Speech Services by Google can install more. A status line shows how many voices Android reported and whether audio is unlocked.
- *(Built and checked in a headless browser with mocked Cohere, Pollinations and voice engines. The Android side (audio permission change, voice settings button) is not built or run on a device.)*

## What was new in V1.6.0

- **Code blocks.** Every fenced block gets a language label, a **Copy** button (turns into "Copied") and syntax colours for bash/Termux, JS/TS, Python, JSON, HTML, CSS, SQL, YAML, Java/Kotlin/C-style and diffs. Blocks with no language are guessed. Highlighting is built in, no network.
- **Link cards.** A pasted URL shows a small card above the message box (icon, title, site) and stays under your sent message. Bare URLs and `[text](url)` in replies become tappable links, and a link on its own line becomes a card. Titles are fetched only for links *you* paste, never for URLs inside a reply.
- **Themes.** New theme button in the header: Light, Dark and Neon cyan (black and electric cyan, matches the icon). Saved and applied before first paint.
- **Welcome screen.** Hero, provider status and four starter cards: Build a script, Search the web, Make a PDF, Plan a build. Tap one and it fills the message box.
- **Provider badge + live readout.** The reply avatar wears a ring in the provider colour (Gemini gradient, Groq orange) and pulses while working. A live chip shows provider, model, elapsed time and tokens; finished replies keep a token pill and in/out counts from the provider's own usage data.
- **Motion and empty states.** Typing dots are a wave, messages and cards fade in (respects reduced-motion), and Chats, Memories and Artifacts have proper empty states.
- *(Built and checked for syntax only. Not run on a device.)*

## What was new in V1.5.1

- **Thought process, rebuilt.** The steps now drop down vertically as a timeline (icon, title, detail, time) instead of sitting beside the dots. The steps are real: what it read in your message and what it took it for, how much chat context and how many memories went in (and which looked relevant), persona and preferences, which web tools are live, each round sent to the model, every tool it asked for with the query, what came back (service, size, time, errors), and what was tidied in the reply. It no longer vanishes: when the reply lands it stays above it as a "Thought process" chip. Tap it to expand. If you had it open while it worked, it stays open.
- **Right panel = separate pages.** API PROVIDERS PLUS KEYS, WEB SCRAPING and PERMISSIONS are rows in a list. Tap one and it opens on its own page with a Back button. The phone's Back button goes page to list first, then closes the panel.
- **Settings inside those pages are dropdowns.** Every provider, scraper and permission is a collapsed row (title, one line, chevron) that opens in place. Scraper options (JS rendering, region) now collapse with their card. Permission switches stay on the header so you can flip them without opening.
- The left panel keeps its accordion.
- **Web sources with icons.** Search and page-read steps list the pages they found as tappable rows with the site icon, and the reply ends with a "Sources" list of cards (icon, page title, site). Icons come from Google favicons and fall back to a letter badge offline.
- **App icon can no longer be skipped.** `apply-android.sh` now also runs automatically on every `cap add` and `cap sync` (package.json hooks), verifies the icon files landed, and fails the build if the default Android icon is still there.
- *(implemented; tested in a headless browser at phone width with mocked Groq and SerpAPI. Not run on a device.)*

## What was new in V1.5.0

- **Everything collapses.** Both panels are now accordions: every row and every card has a title, a one-line description and an expand/collapse chevron. Open as many as you like. Your open/closed choices are remembered.
- **+ is now the Tools menu.** Tap it for three switches: **Web**, **YouTube music**, **PDF**. Green is on, red is off. The + itself shows the overall state: green (all on), amber (some on), red (none on). It no longer sends you to set an API key; with no scraper key the Web switch just says so.
- **PDF icon** is now a red Acrobat-style badge (a recreation, not Adobe's official artwork) on the PDF button, the Artifacts row and PDF cards. The PDF button only shows while PDF is switched on.
- **Run in background** (new PERMISSIONS switch, on by default): a small foreground service keeps Horizon alive when you leave the app so Android does not restart it. The Back button now sends Horizon to the background instead of closing it. If Android still kills it, Horizon reopens on the same chat with your unsent text.
- **Permissions that actually ask.** Notifications, Microphone and storage/audio are now requested by a native plugin with the real Android prompt. If Android already blocked the prompt, Horizon opens the exact settings page. Turning one off inside the app works too. Battery optimisation falls back to the list page and Honor/Huawei power pages when the standard prompt is blocked. Failed native calls now show the real error text.
- **Groq fix**: rate-limit and size errors (the "fails after the second message" case) are retried automatically: it waits out short rate limits, and on "request too large" it resends a trimmed history. Errors now show the HTTP status and Groq's own message. GPT-OSS models run with low reasoning effort so they answer instead of coming back empty.
- *(implemented; the UI and Groq retry logic were run in a headless browser with mocked servers. The Android side has not been built or run on a device.)*

## What was new in V1.4.3

- **Long PDFs (8+ pages, or "detailed/comprehensive")**: Horizon outlines first, then writes each section in its own call (progress shows in the thought process), then builds the PDF with a contents page. Web tools are not used in this mode.
- **Auto-continue**: a PDF reply that gets cut off is continued up to 3 times and stitched together. *(implemented, not yet seen on a device)*

## What was new in V1.4.2

- **Colours and templates** for PDFs: 13 themes plus any `accent: #hex`, a colour strip on every page, and `template: cv | letter | report`. Say "make my CV in violet" and Horizon uses the CV layout (name, contact line, ruled sections, tight bullets). Numbers in tables right-align. *(implemented, not yet seen on a device)*

## What was new in V1.4.1

- **Live thought process**: while Horizon works, a rotating line with icons shows what it is doing (fast on chat, slower on PDFs). Tap it to open the full step list. Web search, page reads and YouTube steps are real and shown bold. Each reply keeps a "Thought process" chip you can tap later. *(implemented, not yet seen on a device)*

## What was new in V1.4.0

- **PDF button** (📄 PDF) beside the message box, plus "make a PDF" in plain words. Horizon writes the document and it appears in the chat as a PDF card with **View** (real PDF, page by page, zoom) and **Download** (Documents/Horizon). A4, up to 15+ pages, tables, charts, callouts, columns. Uses the Ember A4 document engine and bundled pdfmake + pdf.js, no network. *(implemented, not yet seen on a device)*
- **Artifacts (N)** box at the top of the CHATS tab lists every PDF across your chats.

## What was new in V1.3.0

- **Settings is now a list** (same layout as Ember): three full-width rows, each with a title, a one-line description and a chevron. Tap a row and it opens straight in. No dropdowns. A Back button returns to the list. *(implemented, logic tested, not yet seen on a device)*
- **PERMISSIONS panel** (third settings row): Wake lock, Notification access, File access, Battery optimisation, Microphone. Each has a logo and a switch, green when on and red when off. *(implemented; native side untested on a device)*
- **YouTube feature**: a red YouTube button beside the + button switches YouTube on for the current chat. With it on, you can ask the AI about music and tell it to download songs. *(implemented; search and download logic tested with mocked servers, not tested against live servers or on a device)*
- **Downloads drop box** above the message bar: tap it to drop it open. Every download has a progress bar, percentage, size and where it was saved. Finished and failed items stay in the list until you clear them. *(implemented)*
- New Android permissions and a small native plugin (`HorizonPerms`) are added by `scripts/apply-android.sh` during the build. *(implemented, script tested against a fake Android tree, not tested in CI)*

## Features

- **+ button** left of the message box opens the Tools menu (Web, YouTube, GitHub, Music, PDF switches, green on / red off). Web, YouTube and GitHub are per chat; PDF is global. New chats start with Web on.
- **Sources used** strip under any reply that searched or scraped, with tappable domain chips. Every reply also carries a small provider logo with its name and model.
- **Free-text replies**: Horizon types straight onto the page, no chat bubble. Tap a reply while it types to skip to the end. Each reply shows how long it took.
- **999 persona**: street-smart, empathetic, slightly dark humour, real advice, sharp wording, substantial replies. Built in, editable.
- **Right panel (Settings)**, with the Horizon name and logo in the top corner, is a list of three rows. Tap one to go straight in:
  - **API PROVIDERS PLUS KEYS**: Gemini and Groq cards. Keys are validated against the provider before they are saved and the model list is pulled live. One provider is active at a time, no fallback chains.
  - **WEB SCRAPING**: SerpAPI (search), Firecrawl (search + scrape), ScraperBee / ScrapingBee (scrape) and Browserless (scrape). Each has a key box, an on/off switch and a validate button. Horizon is told exactly which ones are live and calls them itself.
  - **PERMISSIONS**: five switches (see below) plus the **YouTube music source** box.
- **Left panel** has four tabs (the fourth, MUSIC, is the music player):
  - **CHATS**: new chat and saved history
  - **PROMPT & PREFERENCES**: the system prompt (editable, resettable) plus a preferences box that is added on top of it
  - **AI MEMORIES**: facts Horizon carries into every chat. Add your own, delete any, or let Horizon save durable facts itself (Auto-save). Keys and secrets are never stored.
- Markdown rendering for replies: bold, inline code, code blocks, lists, headings
- Fully offline UI: no CDN fonts or icon packs, everything is inlined
- Hardware Back closes panels first

## Permissions panel

| Switch | What it does | Turning it off |
| --- | --- | --- |
| Run in background | Foreground service that keeps Horizon alive when you leave the app. On by default. | Instant |
| Wake lock | Keeps the screen on while Horizon is open (Android keep-screen-on flag, Screen Wake Lock API in a browser). Remembered between launches. | Instant, inside the app |
| Notification access | Lets Horizon post a "Download complete" notification. | Opens Android app settings (Android does not let apps revoke it) |
| File access | Lets downloads be saved. Off pauses all downloads. | Instant, inside the app |
| Battery optimisation | Asks Android to exempt Horizon from battery optimisation. | Opens the Android battery list |
| Microphone | Requests microphone permission. **Voice input itself is not built yet** (planned). | Opens Android app settings |

The switches show the real Android state when you open the panel and again when you come back to the app. Battery optimisation is Android-app only and is disabled in a browser.

## YouTube music and downloads

1. Add a Gemini or Groq key and switch **File access** on under PERMISSIONS.
2. In a chat, tap the red **YouTube** button beside **+**. It lights red when on, and is per chat (new chats start with it off).
3. Ask for music: "what are the best Juice WRLD songs for gym" or "download Lucid Dreams for me". The AI searches, picks a match and queues the download.
4. Open the **Downloads** box above the message bar to watch the progress bar. Songs are saved to `Music/Horizon` on the phone. If Android refuses that folder, Horizon falls back to `Documents/Horizon`, then to app storage, and the box shows where each file went.

How it works: the AI replies with tags the app runs for it, the same way as the web tools: `[[yt.search: query]]` and `[[yt.download: VIDEO_ID | Title]]`. Search and audio links come from **Piped** or **Invidious** servers, the same idea as NewPipe, with no Google login and no API key. Public servers go down often, so the **YouTube music source** box under PERMISSIONS lets you list your own (one per line, start a line with `inv:` for Invidious) and has a **Test** button. Up to 2 downloads run at once, audio only.

Please only save music you have the right to download. Downloading from YouTube can break YouTube's terms of service.

*Status:* the search, stream picking, queue, fallback folders, progress and notification code was tested against mocked servers and a mocked Android bridge. It has **not** been tested against live servers, on a phone, or in a CI build. A true NewPipeExtractor native plugin is **planned**, not built.

## How the web tools work

When at least one scraper key is switched on, the system prompt tells Horizon which tools exist. To use one it replies with a tag such as `[[web.search: query]]` or `[[web.scrape: https://url]]`. The app runs the call with your key, hands the text back as the next message, and Horizon continues (up to 4 rounds per question). Page text is passed as untrusted data, never as instructions. Search goes SerpAPI then Firecrawl; scrape goes Firecrawl, then ScrapingBee, then Browserless, skipping anything that is off or fails.

Endpoints used: SerpAPI `search.json`, Firecrawl v2 `/search` and `/scrape`, ScrapingBee `/api/v1/`, Browserless `/content` (region selectable).

## Project layout

```
horizon/
├── .github/workflows/build-apk.yml   CI: builds the APK on GitHub Actions
├── www/
│   ├── index.html                    The whole app (HTML, CSS, JS)
│   ├── horizon_github.js             GitHub vault: search, pull, terminal, AI tools
│   ├── horizon_music.js              Music player: library, queue, now playing, AI tools
│   └── icon.png                      Favicon
├── resources/
│   ├── icon.png                      1024px master icon
│   ├── icon-foreground.png           Adaptive icon foreground
│   └── android/
│       ├── res/                      Pre-rendered launcher icons, adaptive XML, splash
│       └── java/                     HorizonPermsPlugin.java + MainActivity.java templates
├── scripts/
│   ├── apply-android.sh              Icons, splash, manifest permissions, native plugin
│   ├── set-version.sh                Stamps versionName and versionCode
│   └── make_icons.py                 Regenerates every icon (needs Pillow)
├── capacitor.config.json
├── package.json
├── LICENSE
└── README.md
```

The `android/` folder is not committed. CI generates it fresh with `npx cap add android` on every build.

## Build the APK on GitHub

1. Create an empty repo on GitHub (for example `philfesters/horizon`).
2. Push this project:

   ```bash
   git init
   git add .
   git commit -m "Horizon V1.3.0"
   git branch -M main
   git remote add origin git@github.com:philfesters/horizon.git
   git push -u origin main
   ```

3. Open the **Actions** tab. **Build Android APK** runs on every push to `main`.
4. When it finishes, download the APK from the run's **Artifacts** section. The file is named like `Horizon-V1_3_0-b1.apk`.

### Publish a release

Tag a commit and push the tag. The same workflow attaches the APK to a GitHub Release.

```bash
git tag V1.3.0
git push origin V1.3.0
```

To bump the version, change `version` in `package.json`. CI stamps it into the APK as `versionName` and uses the run number as `versionCode`.

The workflow builds a **debug-signed** APK, which installs fine on any phone with "Install unknown apps" allowed.

## Using the app

1. Open the sliders button (top right). Settings is a list of three rows. Tap **API PROVIDERS PLUS KEYS**.
2. Paste a key into the Gemini or Groq card and tap **Save & validate**.
   - Gemini: https://aistudio.google.com/apikey
   - Groq: https://console.groq.com/keys
3. Pick a model, then tap **Use** on the provider you want (or use the chips above the chat).
4. Optional: open **WEB SCRAPING** from the settings list, add any of SerpAPI, Firecrawl, ScraperBee, Browserless, and leave them On. The **Web** chip above the chat shows whether Horizon is live on the web.
   Optional: open **PERMISSIONS**, switch on what you want (green is on), then use the red YouTube button beside + to ask for music.
5. Open the menu (top left): **PROMPT & PREFERENCES** to shape how it talks, **AI MEMORIES** to see or edit what it remembers.

Keys live in the app's local storage on your device and are only ever sent to their own service.

## Local development

```bash
npm install
npx cap add android
bash scripts/apply-android.sh   # icons, splash, permissions, native plugin
npx cap sync android
npx cap open android      # opens Android Studio
```

You can also open `www/index.html` directly in a desktop browser to work on the UI.

Regenerate the icons after changing the artwork in `scripts/make_icons.py`:

```bash
pip install pillow
python3 scripts/make_icons.py
```

## Notes

- `CapacitorHttp` is enabled in `capacitor.config.json`, so API calls go through the native layer and are not affected by browser CORS rules.
- `@capacitor/filesystem` saves the downloads and reports progress; `@capacitor/local-notifications` posts the completion notice. Both are pulled in by `npm install`.
- The package id is `com.festers.horizon`. Change `appId` in `capacitor.config.json` before your first build if you want a different one.

## License

[MIT](LICENSE) © 2026 Grant "Fezzy" Festers
