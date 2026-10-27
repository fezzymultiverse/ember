# Ember V1.9.42 HANDOVER
Status: thinking-card repair. Title clipping fixed (no background-clip text), ReAct now feeds the single live card via EmberTimeline.upsert(), card collapses as a dropdown when the run/reply ends. README not touched.

## Previous (V1.9.41)
Status: added a third, optional Claude-like animated status-line thinking display. The existing Summary timeline and compact dropdown remain available and are cycled through using the switch icon. The new style shows observable progress/status updates already emitted by Ember, not private internal chain-of-thought. Existing tool actions and saved summaries remain wired to the same timeline data.

## Verification
- `node --check www/ember_timeline.js`: passed.
- `node tests/v1941-thought-test.js`: passed.
- Android APK/device verification: not performed in this environment.
- Full test suite: not claimed; several existing tests require Playwright and live provider services.

## Notes
- The display switch cycles Summary → compact dropdown → animated status line → Summary and persists the selection.
- The animation respects `prefers-reduced-motion`.
- Web search / download rows still come from actual tool events; no fake download completion is generated.
