# License notes · V1.4.0

*For maintainers.*

## License

**TBD — awaiting owner decision.** There is no LICENSE file in the repo. `package.json` declares `"license": "UNLICENSED"`, which means all rights reserved. Until the owner picks a license, nobody else has the right to copy or reuse the code. Decide before the repo is made public.

## Third-party services

Ember calls these services from the person's device. Each has its own terms and data handling, which this project does not control. The terms links are **TBD — owner to add after checking each provider's current terms**.

| Service | Host the app calls | Used for | Terms link |
|---|---|---|---|
| Pollinations.ai | `text.pollinations.ai` | Free Mode chat, no key | TBD |
| Groq | `api.groq.com` | Chat and background jobs, with the person's key | TBD |
| Mistral | `api.mistral.ai` | Chat and background jobs, with the person's key | TBD |
| Google Gemini | `generativelanguage.googleapis.com` | Chat and background jobs, with the person's key | TBD |

Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) is used only for the optional APK build, under its own license.

## Provenance

The code was written for this project. No code was copied from any therapeutic app or clinical source. The helpline numbers are public numbers of SADAG and Lifeline South Africa.
