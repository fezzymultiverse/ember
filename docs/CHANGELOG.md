# Changelog

*For everyone.* Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [V1.3.0] - 2026-10-22

The safety release. No new chat features.

### Added
- `www/safety.js`: offline `Safety.detect` (levels 0 to 3), `wrapSystem`, `killSwitch`, `crisisCard`, and a transient level (`mark`, `lastLevel`). See [SAFETY.md](SAFETY.md).
- Wiring in `Persona.respond`: the safety check runs first. At level 2 or higher it forces the deep lane, drops directives, skips the anti-echo rewrite, and appends the crisis block to the system prompt. Level 1 appends a tone override.
- A local **crisis card** (SADAG 0800 567 567, Lifeline SA 0861 322 322, 112) shown the moment the message is sent, plus a red support dot beside Ember's name.
- `after()` skips memory learning at level 2 or higher and for 14 messages after one.
- Memory migration: `MEM_DEF` and `migrateMem`, used on load, on "Clear memory" and on import. Seven keys, five reserved for V1.4.0. Old V1.2.0 saves keep all facts and threads.
- `tests/safety-test.js` (43 checks), and these docs.

### Changed
- Version bumped to V1.3.0 in `index.html`, `package.json`, `sw.js` (cache `ember-v1.3.0`), the README and file headers. `safety.js` is added to the service-worker file list.
- The root README is now a short pointer. The old feature notes moved to [FEATURES.md](FEATURES.md).
- `.gitlab-ci.yml` gains a `lint` job (`node --check`) and an `audit` job (forbidden-pattern grep) ahead of the existing Pages deploy.

### Fixed (audit items closed)
- The crisis card could be wiped by the next re-render. It is now drawn inside the render function.
- A directive could be sent to the model before the kill switch cleared it. The check now runs before the message list is built.
- "I have a plan" or "I have a knife" alone could score level 3. Means and timing now count only next to ideation.
- An idiom anywhere in a message could cancel a real crisis phrase in the same message. Idioms are now removed before matching.
- Curly apostrophes from Android keyboards broke every `don't` / `can't` pattern. Text is normalised first.
- The first draft's support-dot style would have turned the whole name into a red dot. It is now a small `::after` dot.
- Import dropped future memory items that use `text` or `name` instead of `t`, and accepted a `__proto__` key. Both fixed.
- README feature tags for Free Mode, Voice & pacing and Memory & Context read V1.3.0 after a bulk version bump. They are back to V1.2.0.

### Not shipped (deferred to V1.4.0)
Vibe check, mood weather, pattern spotting, running bits, character modes, Thought Courtroom, Surprise button, coping deck, letters to future self, debate mode, micro-surprises, easter eggs. Open decisions: the coping deck conflicts with HARD RULE 9 and debate mode with HARD RULE 4, so both need a redesign before they are built. Also open: making crisis mode last for a few messages after a trigger.

## [V1.2.0]
The state of the code before the safety layer: Free Mode, voice and pacing settings, memory and context settings. No tag exists in this repo; see the commit history.
