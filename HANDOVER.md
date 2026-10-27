# Ember V1.9.20 HANDOVER
Status: four reported bugs fixed. Not yet run on a device or APK.
## Changed in V1.9.20
1. Bojack hardcoded card removed from send() in app.js. Every message goes to the model.
2. TOOL RECEIPTS: app.js writes a line under each reply for every tool that ran (OK / warn / empty / fail + reason), built from the real tool result. The model cannot claim a download or search that the receipt contradicts. The old fake "I tried, but the add-on came back empty." is gone; failures now say what really failed.
3. Forced-tool guard: a message that asks to scrape/search/google/download or holds a URL, answered with no tool call, gets one forced retry, else an honest "no tool ran".
4. Name search: ai_agent.js now uses DuckDuckGo HTML web results first (real results, works for people), Instant Answer second. A bot-check page is reported as blocked, never "no info". Google/Bing/DDG result-page URLs given to scrape_url are turned into a real web_search.
5. Groq gpt-oss returned EMPTY replies because its reasoning ate max_tokens. providers.js now sets reasoning_effort low, raises the budget, and retries once with more room if still empty.
6. Copy/paste: Copy button on every message, Copy and Paste buttons by the input, chat text forced selectable, and the download poll no longer re-renders the chat while text is selected.
## Restored in this zip (no app code changed)
- Hidden files were missing from the V1.9.18 and V1.9.20 zips (zipped with `*`, which skips dotfiles): `.github/workflows/build.yml`, `.github/workflows/newpipe-update.yml`, `.gitlab-ci.yml`, `.gitignore`. Rebuilt from docs/ANDROID_BUILD.md, CHANGELOG, CONTRIBUTING and scripts/apply_android_patch.py. Not run on GitHub/GitLab yet; the first CI run is the real test.
- Zip with `zip -r out.zip ember-V1_9_20` (the folder itself) so dotfiles are included.

## Open items
- tests/router-test.js crashes before and after this work (needs playwright, same as the original).
- app-test crash at #hq and the speaker/v198/voice-cloud failures are unchanged from V1.9.18.
- YouTube Music download still needs a device run: the receipt and the download card will now show the real failure reason.
