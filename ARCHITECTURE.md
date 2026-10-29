# Architecture — actual 1.10.17 code

The entrypoint is `www/index.html`. Its original synchronous script and stylesheet order is preserved, with only `ember_wiring.js` appended after cockpit and keyless. The complete ordered list is in WIRING_MAP and ASSET_MANIFEST.json. Earlier modules export browser globals; later patches wrap selected methods rather than ES-module imports. These intentional wrappers are inventoried, not silently merged.

`store.js` owns `window.U` and `window.Store`. IndexedDB database `ember` v1 contains `convs` and `kv`; settings and optional provider configurations use localStorage. `providers.js` supplies `Prov`; `safety.js` and `persona.js` prepare safe next-turn context before `app.js` invokes the model path.

`ember_cockpit.js` moves original controls and retains their listeners in a flat settings scroll. It owns compatibility APIs `EmberHub` and `EmberMenu`; the obsolete controllers with those roles are archived, never loaded. The Command Centre uses the protected `ember_command_center.js`, GitHub and Repo Runner modules. The iframe/native browser, local ttyd bridge and optional download bridge are separate platform components, not services bundled by a browser-only ZIP.

`ember_keyless.js` adds local document export and enabled public adapters using existing APIs, a chooser and artifact cards. `EmberPlus.stateLine` is wrapped to include its current capabilities. `ember_wiring.js` is an additive subscriber with fixed non-sensitive messages, health booleans and counters only. No protected method implementation is changed.

## Security and offline boundaries

The service worker handles same-origin bundled GET assets only, with network-first/offline-fallback behavior unchanged. Version query strings are allowed for static assets; API/proxy and credential query paths are not newly cached. `repo-runner-template.cjs` and vendor files are intentional lazy dependencies and must not be added as executable browser script tags. No vendor library is merged or modified. A cold-start offline install before any successful service-worker installation remains impossible by design.

## Native components

Custom Capacitor plugins and their worker/service dependencies are mapped in ANDROID_PERMISSIONS.md. The supplied patch tree is not a built APK. `MainActivity.kt` explicitly calls itself a template guess; merging it into an existing Android app requires review because the patcher replaces MainActivity files.

## Unfinished acceptance

No versioned patch consolidation was attempted because an all-green behavioral baseline was not available. No assertion is made that static inventory proves every dynamic property, every platform-only listener or every chat tool invocation is reachable. Remaining evidence gaps and inherited failing tests are release blockers, listed in TESTING and NEEDS_APPROVAL.
