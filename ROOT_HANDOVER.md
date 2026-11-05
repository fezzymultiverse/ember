# Ember 1.10.17 — release candidate, not an all-green release

Source: the supplied `ember-V1_10_16-keyless-router.zip` (not the V1.10.15 fallback).

This archive contains the safe, verified wiring work and explicit blockers. It must not be described as fully certified or completely working: the exhaustive inherited test suite is not all green. See `docs/TESTING.md`, `docs/NEEDS_APPROVAL.md`, `docs/WIRING_MAP.md` and `tests/results/wired/suite/summary.json`.

No UI redesign or stylesheet merge was performed. All eight protected backend files are byte-identical to the supplied V1.10.16 files. No account, API key or credential was added. No real GitHub write, paid generation, live keyless endpoint certification or Android build was performed.

## Safe handover

Use the exact uploaded V1.10.16 source as the baseline. Inspect `docs/FILE_RECEIPTS.json`, `docs/FILE_MOVES.json`, `docs/WIRING_BASELINE.json` and `docs/WIRING_MAP.md` before assuming any file was removed. Protected hashes must remain unchanged. All original file content is retained either in its current file, its archive destination or a pre-rewrite documentation copy.

Do not load archived Settings controllers. Current replacement routes are `EmberCockpit.open/close`, `EmberHub` and `EmberMenu` compatibility APIs in `ember_cockpit.js`. Keep existing loaded CSS and versioned patch order. The next UI work should begin only after recording its own screenshots.

## Next implementation decisions

Resolve NEEDS_APPROVAL before changing protected migrations, platform patching or event contracts. Triage the remaining inherited test logs against today's requirements rather than changing application behavior to satisfy obsolete selectors. The new test runner must keep failing honestly until every required test is resolved; do not mark the package fully certified merely because the 12 structural checks and current keyless scenarios pass.

## Evidence

Current tests and screenshots are under `tests/results/wired/`. Historical evidence copied from the input remains identifiable in its original locations or docs/history. The current integrity manifest is regenerated after all final files and reports. No protected manifest is silently rebaselined to a modified backend.
