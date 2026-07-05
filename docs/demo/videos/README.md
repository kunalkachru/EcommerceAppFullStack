# Demo Videos

Two short screen recordings (<60s each) for presentation and reviewer onboarding.

**Last updated:** 2026-07-05

---

## Files (primary — Android recordings)

| Video | Content |
|-------|---------|
| [app-flow-demo.mp4](./app-flow-demo.mp4) | Login → browse → cart → checkout → orders |
| [ml-features-demo.mp4](./ml-features-demo.mp4) | Text search → LLM + key → voice/photo search |

Embedded on the [README](../../README.md#watch-it) with screenshot posters.

---

## iOS simulator recordings

| Video | Content | Status |
|-------|---------|--------|
| [ios/app-flow-demo-short.mp4](./ios/app-flow-demo-short.mp4) | App flow (<60s reviewer cut) | ✅ Recorded |
| [ios/ml-features-demo-short.mp4](./ios/ml-features-demo-short.mp4) | ML demo (<60s reviewer cut) | ✅ Recorded |
| [ios/app-flow-demo.mp4](./ios/app-flow-demo.mp4) | Full raw capture | ✅ Recorded |
| [ios/ml-features-demo.mp4](./ios/ml-features-demo.mp4) | Full raw capture | ✅ Recorded |

Re-record iOS: `npm run record:demo:ios` · Android: `npm run record:demo:android`

Screenshot fallbacks: [docs/e2e/](../e2e/)

These MP4s are **committed for repo consumers** but **not packaged** into Android/iOS release builds (see [DEPLOYMENT.md](../DEPLOYMENT.md#demo-assets-repo-only--not-in-app-builds)).

---

## Secrets (consumers — not in scripts)

Scripts **never** contain API keys. Each developer creates a local gitignored file:

```bash
# src/.env (never commit)
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
```

| Script | Purpose |
|--------|---------|
| `npm run verify:llm-live` | Server-side live LLM verification |
| `npm run record:demo:ios` | Passes key to Maestro as `DEMO_LLM_API_KEY` |
| `npm run record:demo:android` | Reads key for LLM toggle during ML demo |

Demo login (`test@example.com` / `secret123`) is a public demo account, not a secret.

See [CONFIGURATION.md](../CONFIGURATION.md).

---

## Re-record (live on-screen)

### Android (recommended — adb automation)

1. Start **Pixel** emulator (visible window)
2. `npm run server` + `npm start`
3. Optional: `npm run seed:emulator-photos`
4. ```bash
   npm run record:demo:android
   RECORD_ONLY=app-flow npm run record:demo:android
   RECORD_ONLY=ml-features npm run record:demo:android
   ```

### iOS (Maestro automation)

1. Boot **iPhone** simulator
2. `npm run server` + `npm start`
3. Install app: `npx react-native run-ios --udid <booted-udid>`
4. Install [Maestro](https://maestro.mobile.dev) (first time)
5. ```bash
   npm run record:demo:ios
   RECORD_ONLY=app-flow npm run record:demo:ios
   ```

---

## Fallback (no device)

```bash
npm run build:demo:videos
```

Builds both MP4s from e2e screenshots (slideshow, not interactive). Prefer live recordings.

---

## Related

- [DEMO_PRESENTATION.md](../DEMO_PRESENTATION.md)
- [ML_SEARCH.md](../ML_SEARCH.md)
- [README — Watch it](../../README.md#watch-it)
