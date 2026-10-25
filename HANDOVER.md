# Ember V1.9.18 HANDOVER
Status: key-extraction fix wired in. The app-test wording check is fixed; app-test now reaches the same #hq crash as the original baseline.
## Open items
1. tests/app-test.js: ONE check fails ("unlabeled junk string rejected"): it expects the old wording "1 unlabeled 32-character string(s) were not a valid Mistral key". Fix prepared, NOT applied: add `rejectedBy:{mistral,cohere}` to Prov.ingest's report and make EmberKeyScan.describe print "N unlabeled 32-character string(s) were not a valid Mistral key and were ignored" (and a 40-character Cohere variant).
2. app-test then crashes at the `#hq` history search, exactly as it did before this work (baseline: 44 checks then crash).
3. Bright Data SERP / Web Unlocker calls untested against the live service.
4. Not run on a device or APK.
## Test results
scrape 74, keyscan 44, v168 25, agent 67, context 63, term 52, safety 44, music 48, handoff 6, v183 18, router 16, lyrics 23: pass. speaker 1, v198 1, voice-cloud 2 failures are the same as before.
