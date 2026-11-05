# dev/ — everything that is not the app

Nothing in here is loaded by the app, the APK build, the GitLab pipeline or `npm test`. It was moved out of the repo root so the root only holds real project files. Nothing was deleted from here; if a file is not where you expect it, look in this folder.

- `evidence/` — old verification runs, test logs, screenshots, receipts and integrity manifests (results94, release95, cockpit-results, verification-1.10.48, verification-1.10.51, local-pdf-boot-verification, the 1.10.17 / 1.10.48 / 1.10.51 receipts, the full-log and full-output captures).
- `unshipped-source/` — files that sat in the root but were never in `www/`, so they were never packaged: ember_cohere_lock.js, ember_gitflow.js/.css, ember_puter.js, and an older EmberDevicePlugin.kt (the build uses the newer one under android_patch/).
- `sandbox-leftovers/` — hosting/sandbox files unrelated to the app (nitro/vercel configs, startup.sh, the Grok PWA install-page bundle, the three.js docs dump, icons for that bundle).
- `tools/` — one-off Python helpers for sprites and layout guides.
- `reference/` — ember-right-panel-concept.html.

Kept where they were because tests or scripts read them: `tests/`, `scripts/`, `tools/`, `docs/`, `vendor/`, `results/`, `shots/`, `archive/`, `app/`, `handler/`, `verification-1.10.40/`, `verification-visuals/`.

Old status notes (PROVIDER_GUIDE_1_10_51.txt, RELEASE_STATUS.md, REPO_CONSOLE_UPDATE.md, WORK_IN_PROGRESS.txt) moved to `docs/history/`. All individual release-note files are merged, verbatim, into the "Release notes archive" at the bottom of `CHANGELOG.md`.
