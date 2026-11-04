# Storage and memory — actual code

`www/store.js` owns IndexedDB `ember` version 1 with object stores `convs` (keyPath `id`) and `kv` (keyPath `k`). If IndexedDB fails or is blocked, it falls back to in-memory Maps, which are not durable. `Store.all/get/put/del` operate on conversations; `Store.getKV/setKV/delKV` store module data by key. `ember_context.js`, `persona.js`, the document library, learning modules and GitHub use this shared API.

`U.LS` is the common guarded JSON localStorage adapter; individual modules also have guarded adapters. The STORAGE KEYS registry in WIRING_MAP records literal keys, dynamic key expressions, operations and ownership evidence. It does not collect actual browser storage values.

Existing optional credentials are present in the application design (provider keys, scraper keys, music service tokens and GitHub configuration). localStorage is not a secure credential vault; origin scripts can read it. Chat, notes, custom persona and imported documents can also contain user-pasted secrets. No new credential store was added and no user credentials were supplied during this work.

`EmberWiring.snapshot()` is volatile diagnostics only: event counts, validated keyless tool-id/health booleans and a project revision number. It contains no event payload or project text. Closing/reloading a page resets these diagnostics.

GitHub cached content and previous Last Read proof do not replace current protected Read-First checks. A code answer must meet the live evidence gate for its current turn. The runner's deliberate brain==output case avoids copying a repository into itself; non-brain source/output identity remains rejected.

Entry points: Settings → Memory and Settings; Browser → Documents/Notes; drawer → Projects; Settings → Command Centre → Connect. Relevant code is linked in FEATURES.md. Data export, clearing memory and existing privacy modes retain their original handlers.
