# Ember 1.10.17 — release candidate handoff

The safe wiring changes are packaged, but this is **not an all-green or fully certified release**.

| Item | Result |
|---|---|
| Input | Supplied V1.10.16 Keyless Router ZIP |
| Version / offline cache | 1.10.17 / ember-v1.10.17-wired |
| Original files accounted for | 370 / 370, each with state, destination and checksum |
| Protected backends / CSS / vendor | 8 backends, 25 CSS files and vendor assets unchanged |
| Retired unloaded Settings controllers | 6, preserved in archive/www |
| Three requested legacy tests | PASS: 48 Termux, 30 runner and 35 Knowledge Brain checks |
| Current keyless browser regression | 47/47 checks PASS |
| Structural wiring gates | 12/12 PASS; four mutation rejection proofs PASS |
| Exhaustive suite | 68/68 scripts; 28 PASS, 28 FAIL, 11 TIMEOUT, 1 SKIP; exit 1 |
| Visual coverage | 14 pairs at both requested sizes, zero page errors/overflow; tiny rasterization diffs explicitly reported |
| Android | Registration/permission source audit and disposable patcher fixture only; no device/build certification |

## Approval / unresolved items

Protected providers.js retains a legacy removed-service credential-cleanup migration. Deleting those references would violate the protected-file rule and change cleanup behavior, so it was not done. The exact proposed decision and source lines are in docs/NEEDS_APPROVAL.md. Historical sources also retain historical references under the no-deletion rule.

The full inherited suite still contains failures, deadlines and a skip; it is not masked as green. Four old incoming-only events lack bundled producers. No loaded patch/CSS consolidation was claimed or attempted without a passing behavior baseline. Live GitHub writes, live endpoint availability and real Android/device behavior are unverified.

## Review locations inside the ZIP

Start with docs/WIRING_MAP.md (complete inventory and three registries), docs/NEEDS_APPROVAL.md, docs/TESTING.md, docs/FILE_RECEIPTS.json, FILE_INTEGRITY_1_10_17.json and tests/results/wired/VERIFICATION_SUMMARY.json. Screenshots, raw differences, baseline repeats and per-test logs are included. All code files are complete, with no omitted-file placeholders.
