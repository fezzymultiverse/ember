# Repo Console UI update

This is a focused UI patch on top of Ember 1.10.17. It does not change the GitHub API wrapper, credentials, repository permissions, or the existing confirmation-gated Run & Push flow.

## What changed

- Repository discovery results render in a dedicated, bounded, scrollable **Repository Console** instead of a long sequence of tall cards.
- Selecting a result updates an in-console preview with its description, visibility, license/access details, and the available role actions.
- Search, pagination, result selection, and actions remain in `www/ember_repo_runner.js`. The visual treatment is in `www/ember_workspace.css`.
- The existing `ember_cockpit.js` capture handler remains responsible for staging an “Add whole repo” result into the review queue. Staging does not push or sync.
- Asset URLs and the service-worker cache key were refreshed so the updated script and styles can be fetched.
- The standalone HTML concept has no visible keyboard-shortcut suffix in its search box; Ember's actual SVG logo remains embedded, with the name left and mark right.

## Validation

- `node --check` passed for the changed Repo Runner JavaScript, service worker, and browser test source.
- Focused Chromium smoke test passed: console results are scroll-bounded, selection changes the in-console preview, and applying a result stages it in the existing queue.
- The archive's older full browser test fixture refers to obsolete Settings selectors (`#acc_h_features`) and does not reach the current Command Centre UI; no claim is made that that legacy suite passed.

This source patch is not a compiled APK and does not directly modify an installed app. Apply the updated `www` files to the Android project and rebuild/sync the app to use the change on-device.
