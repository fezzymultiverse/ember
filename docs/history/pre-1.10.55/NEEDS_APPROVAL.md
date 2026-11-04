# NEEDS APPROVAL

No protected backend file was changed. This section describes exact proposed decisions; it is not a claim that any of them has been approved or applied.

## A. Literal zero-reference policy versus protected legacy credential cleanup

`www/providers.js` lines 35–40 contain an existing migration that removes legacy removed-service credentials and pins (`puter`, `ember_puter_on`, and associated values). The prompt both forbids that name anywhere and forbids changing this protected file. Those constraints cannot both be met while preserving all files verbatim.

**Exact proposed backend change if literal removal is required:** remove the migration comment and the five cleanup statements on supplied-source lines 35–40. **Why approval is needed:** this edits protected `providers.js` and changes behavior by no longer deleting old saved credentials. Recommendation: approve retaining the safe cleanup and interpret the ban as no SDK, provider integration, calls or new credentials. Active web integration checks find no removed-service SDK/auth endpoint. The stale visible `ember_plus.js` service hint was corrected without changing the router. Archived test/release history also preserves the historical name, per the no-deletion rule.

## B. Inherited failures and unsatisfied blanket acceptance

`npm test` executes every discovered test and reports real nonzero failure/timeout status. Existing historical assertions conflict with the current cockpit, newer provider contracts and protected same-brain/output support; some browser harnesses wait for removed/hidden controls. The full suite is not all green. Per-file logs and summaries are delivered. Do not approve this package as a completely verified release until remaining failures are triaged and repaired against explicit current requirements.

No backend change is proposed merely to satisfy an old test. Where a real backend defect is established, supply a narrow patch for approval first. The three explicitly requested legacy tests were corrected in their harness/contracts, not by weakening protected implementations.

## C. Four inbound-only legacy events

`ember-duty` (optional timeline integration), document `ember-termux-changed`, document `ember-track-changed`, and document `ember-player-state` have consumers but no bundled producers. Drawer UI also polls state; Termux mode also refreshes via the existing storage/poll path. Do not manufacture dummy producers or remove listeners solely to make an audit look green.

Approval is required before deciding to remove the obsolete listeners or introduce a new event-production contract. They remain explicitly flagged. The structural gate rejects emitted events without consumers; this separate incoming-only gap is not mislabeled as a passed bidirectional integration.

## D. Unsafe or unproven consolidation

All loaded versioned JavaScript/CSS patches remain separate in their original order. No merge was attempted because inherited behavioral regressions prevent an all-green before/after baseline, and visual snapshots cover only seven surfaces. The old unloaded controllers were archived, not folded into active modules. Their UI-only/legacy features are not reintroduced: doing so would violate the instruction to retain a flat cockpit and current appearance.

## E. Existing Android project preservation

`scripts/apply_android_patch.py` lines 31–32 delete every found MainActivity.java/.kt before copying the supplied template. `MainActivity.kt` itself describes this as a replacement guess. **Proposed future change:** refuse replacement when a customized activity exists and require an explicit merge/backup flag instead. This would change the Android build workflow and has not been applied. No Android project was overwritten or real APK built here.

## Not tested / not certified

Live GitHub push or workflow dispatch, actual keyless endpoint availability, real provider calls or billing, Android compilation/device behavior, physical microphone/speech engines, real media downloads and the external Termux/download bridge host installation. No new paid media generation was run. Static inventory and mocked tests do not certify all dynamic routes or hidden UI states.
