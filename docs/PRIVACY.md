# Privacy · V1.4.0

*For users and reviewers.*

Ember has no server and no account. Everything it stores stays on the person's device. The person is the controller of their own data. Under POPIA (South Africa) and GDPR terms, the maintainer does not receive, hold or process the person's data. The third-party AI services the person chooses do (see below).

## Stored on the device

**localStorage**

| Key | Contents |
|---|---|
| `ember_set` | Settings: their name, the "About you" text, Ember's name and curiosities, style choices, the Persona box text, mode, context size, accent colour, Free Mode choice |
| `ember_keys` | API keys for Groq, Mistral and Gemini, with the last health-check result. Stored in plain text on the device |
| `ember_models` | Cached lists of model names from each provider (12 hours) |

**IndexedDB** (database `ember`, version 1)

| Store | Contents |
|---|---|
| `convs` | Every chat: messages, title, short summary, rolling summary, private flag |
| `kv` | One record, key `mem`: Core Memory (see [MEMORY.md](MEMORY.md)) |

**Cache Storage**: `ember-v1.4.0` holds the app's own files for offline use. No chat content.

If the browser blocks IndexedDB, chats and memory live in memory only and are lost on reload.

## What leaves the device

Nothing leaves except calls to the AI provider that answers.

| Call | What is sent | To |
|---|---|---|
| Every reply | The system prompt (character rules, the "About you" text, Core Memory facts and threads, the Persona box, the rolling summary) plus the recent messages, up to 5, 15 or 50 depending on the setting | The engine that answers (Groq, Mistral, Gemini or Pollinations) |
| Memory learning, titles, rolling summaries | The last 14 messages (memory) or older messages (summary) | A key-based engine only. Never Pollinations |
| Key checks and model lists | The key itself, as the provider's own credential | That key's own provider |
| Key extraction from pasted notes | Nothing, except: each unlabeled 32-character string that passes the filters is tried as a Mistral key, so it is sent to `api.mistral.ai` as a credential | Mistral |

The pasted notes themselves are never sent anywhere and never saved. They are parsed locally.

### Free Mode

Free Mode sends the chat to **Pollinations.ai** (`text.pollinations.ai`), a free third-party service with no uptime promise, no privacy commitment this project can vouch for, and anonymous rate limits. It is on by default while there are no keys. In its fallback route the app builds a short URL from the last four messages (400 characters each) plus a fixed line of safety wording, so message text appears in the request URL. Free Mode is never used for background memory work, so Free Mode chats are not learned from.

## Never stored, by design

- **A crisis flag.** The safety level is a JS variable. It is not in any chat, memory, setting or backup. See [SAFETY.md](SAFETY.md).
- **Health details, how the person copes, crises, secrets, passwords and API keys in Core Memory.** The memory extractor is told never to record them, and a filter drops lines that look like secrets. The model can still get this wrong, so the filter is a net, not a guarantee.
- **Learning from private chats.** A chat marked 🔒 Private is never learned from.
- **Learning from a crisis.** Learning stops while any of the last 14 messages is level 2 or higher.

## Stored anyway, and worth knowing

- The **text of every message** is saved in the chat, including a message that triggered the crisis card.
- The **first message of a chat becomes its title** (cut to 38 characters), which shows in the history list and is searchable. The memory extractor may rename it, but a crisis chat is not learned from, so the first-message title stays.
- The **rolling summary** is written by a model that is told to leave out health details. Nothing enforces that.
- Anyone with the unlocked phone can open the app and read it. There is no app lock in V1.3.0.

## Export, import and delete

**Export** writes one JSON file: the settings (`ember_set`, including the About text and Persona box), Core Memory, every chat, and, only if the person ticks "Include keys in backup", the API keys. A backup without keys still holds the person's whole chat history. Treat it as private. It contains no crisis flag.

**Import** adds chats (same id: replaced), merges memory lines without duplicates, and **replaces the settings** with the backup's. Imported memory lines are not run through the secret filter.

**Delete everything** (Settings > Your data) clears every chat and memory record, removes `ember_set`, `ember_keys` and `ember_models`, and reloads. It does not delete files the person already exported, or anything a provider kept.

## Third parties

Each provider has its own terms and retention. This project controls none of them. See [LICENSE_NOTES.md](LICENSE_NOTES.md) and [LIMITATIONS.md](LIMITATIONS.md).
