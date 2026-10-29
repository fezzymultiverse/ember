# Data flow — 1.10.17

## Chat and routing

The message box in `index.html` calls handlers in `app.js`. Existing safety/persona gates, memory and optional Read-First GitHub prefetch run through `safety.js`, `persona.js`, `ember_context.js` and protected `ember_github.js`. The provider backend `providers.js` remains authoritative for ordinary model calls. Tool dispatch lives in `ai_agent.js`/`app.js`; the keyless adapter in `ember_keyless.js` intercepts supported intents and calls existing artifact/document interfaces rather than replacing the backend.

`ember-keyless` line reporting writes the same bounded safe status into `ember-terminal`, `EmberTimeline.step`/`.note` and `ember-agent-note`. `ember_command_center.js` listens to terminal, runner, download and routing events using its `on()` helper. `ember_v104.js` logs existing tools and routes. Existing timeline listeners handle tries, switches and notes. New wiring does not replay these streams or duplicate their artifact creation.

## Results and artifacts

Keyless results use artifact-card markup from `ember_artifacts.js`; local PDF/DOCX conversion uses `ember_deliverables.js` and lazy vendor loaders. Generated result blobs remain session-scoped; saving a PDF is an explicit action. GitHub exports use the existing artifact contract. Do not treat progress counters, endpoint-health booleans or cached repository blobs as a new answer artifact.

## New event adapters

`ember-apis-change` → Plugins menu summary refresh; `ember-keyless-health` → only a validated tool-id/boolean readiness snapshot; `ember-brain-pushed` → existing `ember-git-state` refresh and fixed timeline status; `ember-download-status` → fixed terminal and timeline failure status; document `ember-project-changed` → content-free revision count.

No new adapter persists or logs event.detail, arbitrary error strings, args, endpoint URLs, project content, commit identifiers or credentials. Synthetic sentinel tests prove that the new observer does not retain the supplied payload. This is not a blanket security certification of inherited backend logging paths.

## Native and local boundaries

Android events `ember-bg-reply`, `ember-bg-ready` and `ember-media-cmd` are produced by Kotlin WebView bridges and consumed by `app.js`. They are not missing web dispatchers. Termux uses local ttyd WebSocket, and the download bridge is an optional Node host service. Native permission prompts and actual endpoint uptime are outside the mocked browser evidence.

The full event registry records literal static sites and helper call sites. Computed names/arrays and external emitters are listed separately rather than invented. Four legacy inbound-only events currently have no bundled producer; see WIRING_MAP and NEEDS_APPROVAL.
