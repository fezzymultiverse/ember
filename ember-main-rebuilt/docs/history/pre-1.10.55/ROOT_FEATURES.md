# Features and real entry points

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
