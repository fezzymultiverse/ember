# Changelog

## 1.10.17 — 2026-10-29 — safe wiring release candidate

Source was the supplied V1.10.16 Keyless Router archive. Added AST-backed inventory, event/storage/global registries, complete original-file receipts, explicit load-order and static/lazy precache closure. Archived six unloaded nested-Settings controllers without deleting them. Preserved all active stylesheet and patch ordering. Added small no-payload event adapters and documented unmatched incoming legacy events. Bumped package version and service-worker cache. Corrected three specified legacy tests to the current contracts and replaced nonportable test dependency paths. Added whole-suite discovery with non-short-circuiting real failure/timeout reporting and new structural/browser gates. Reconciled the Android manifest reference with the existing patcher. Rewrote current documents and retained earlier originals/history. Protected backend and vendor file hashes remain unchanged.

Not a completely verified release: inherited suite failures remain, a literal removed-service reference ban conflicts with protected credential-cleanup code, native/live operations are untested, and patch consolidation was deliberately deferred. See NEEDS_APPROVAL and TESTING.

## Previous releases

See docs/history/INDEX.md. Per-version changelogs are historical source evidence, not competing current changelogs.

## 1.10.18 Part 1 - one Settings
- Removed the header gear (bSetTop); Settings opens only from the right panel (Settings & connections).
- "App settings" now opens the top of the Settings sheet; "Memory & persona" opens its own section (renamed from "Memory and Settings").
- Tests updated to open Settings through the panel.

## 1.10.18 Part 2 - panel drill-down, one scroller
- Right panel opens on the main menu: the seven category rows only. Tapping a category opens its tools as their own screen (no inline expanding); tap the header arrow or press Back/Escape to return. Reopening the panel always starts on the main menu.
- Searching still lists matching tools straight away; clearing the box returns to the main menu.
- Command Centre no longer sits in a capped box with its own scrollbar; when expanded it takes over the panel body and is the only scroll area.
- Compact spacing on phones so every screen fits without scrolling, including short screens with browser toolbars showing (360x605).
- Assets re-versioned (?v=1.10.18-p1) and service-worker cache renamed ember-v1.10.18-panel-p1.
