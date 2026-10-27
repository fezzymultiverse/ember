# Ember V1.9.29 HANDOVER
Status: tool-execution card, provider dashboard (real latency, retry countdown), pill modifier bar (V1.9.29); "Summary" thinking timeline card (V1.9.28); native tool calling, tags/covers/whole-playlist (V1.9.27); loose tool-call formats now parsed (V1.9.26); name-search fix, Web Search + YouTube defaults on, Paste/Copy bar on the message box. See docs/CHANGELOG.md.
## Open items
1. Not run on a device or APK. The DuckDuckGo web-results parser is only tested against a mock.
2. CI (.github/workflows/build.yml) has not been seen green past the V1.9.23-1 setup-android fix; downloads need an APK built with the native NewPipe patch.
3. tests/router-test.js crashes (Gemini AQ-key failure, same as V1.9.21); speaker, v198, voice-cloud had known failures; app-test stops at the #hq history search (baseline).
4. Bright Data calls untested against the live service.
## Test results
agent 75, v1928 20, v1929 12, v1924 6, scrape 74, keyscan 44, v168 25, context 63, safety 44, music 48, handoff 6, v183 18, lyrics 23, v1915 45, term 52: pass.
