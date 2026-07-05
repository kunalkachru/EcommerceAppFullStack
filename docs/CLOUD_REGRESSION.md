# Cloud regression & verification scripts

**Last updated:** 2026-07-03

How to run automated checks against the **Railway cloud API** and on **Android emulator / iOS simulator** with the mobile app pointed at cloud (`src/config/apiTarget.js` → `API_TARGET_MODE = "cloud"`).

Related: [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) (hosting) · [DEPLOYMENT.md](./DEPLOYMENT.md) (architecture)

---

## Prerequisites

| Requirement | Android | iOS |
|-------------|---------|-----|
| Device | AVD running (`adb devices`) | Simulator booted (`npm run ios` once) |
| App | Installed, Metro optional if bundle embedded | Same |
| Cloud API | Railway live — see [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) | Same |
| Mobile config | `API_TARGET_MODE = "cloud"` in `src/config/apiTarget.js` | Same |
| Extra (iOS Maestro) | — | [Maestro](https://maestro.mobile.dev) on PATH (`~/.maestro/bin/maestro`) |

**Test user (all E2E):** `test@example.com` / `secret123`

---

## Secrets policy (never commit keys)

| File | Purpose | In git? |
|------|---------|--------|
| `src/.env.example` | Template for client LLM keys | Yes (empty placeholders) |
| `src/.env` | Your `OPENAI_API_KEY` / `OPENROUTER_API_KEY` | **No** (gitignored) |
| `server/.env.example` | Server JWT etc. | Yes |
| `server/.env` | Production/dev server secrets | **No** (gitignored) |

**Setup for live LLM reasoning:**

```bash
cp src/.env.example src/.env
# Add keys locally — never commit src/.env
```

**How scripts use keys:**

- `scripts/load-env.mjs` reads `src/.env` and/or `process.env` — **read-only**, never logs keys.
- Live LLM tests send keys per request: header `X-LLM-Api-Key` to `/api/search/voice` with `useLlmReasoning: true`.
- Maestro ML flows receive `DEMO_LLM_API_KEY` via subprocess env only (from `load-env.mjs`).

**Commands:**

```bash
npm run verify:secrets-policy   # scan tracked files for accidental key commits
npm run verify:cloud:llm        # live LLM vs Railway (requires src/.env)
```

Railway `JWT_SECRET` is set in Railway dashboard — not in this repo.

---

**Override cloud URL:**

```bash
export API_URL=https://your-app.up.railway.app
# or
export USE_CLOUD_API=1   # uses default Railway URL in scripts/lib/cloud-api-url.mjs
```

---

## Quick reference (copy-paste)

### Cloud API only (no emulator)

```bash
npm run verify:cloud              # commerce smoke (health, catalog, login, cart)
npm run verify:cloud:clip         # wait until CLIP index ≥ 200
npm run verify:cloud:all          # cloud + clip + ML + search (API)
npm run verify:cloud:llm          # live LLM vs Railway (needs src/.env keys)
npm run verify:secrets-policy     # ensure no keys in git-tracked files
```

### Android emulator + cloud

```bash
npm run verify:e2e-android:cloud   # full commerce E2E (ADB + API checks)
npm run verify:android-nav:cloud   # navigation + session persistence
npm run verify:android-ml:cloud    # ML UI smoke (catalog, gallery, similar products)
```

### iOS simulator + cloud

```bash
# Recommended when sim was open a long time (avoids SpringBoard flakes):
IOS_FRESH_SIM=1 npm run verify:e2e-ios:cloud

# Normal run:
npm run verify:e2e-ios:cloud
```

---

## Script inventory

### Shared helpers

| File | Purpose |
|------|---------|
| `scripts/lib/cloud-api-url.mjs` | `DEFAULT_CLOUD_API`, `resolveApiUrl()` — `API_URL`, `USE_CLOUD_API=1` |
| `scripts/e2e-api-helpers.mjs` | Login, cart polling (`waitForCart`) for cloud latency |
| `scripts/ios-sim-recovery.mjs` | Dismiss SpringBoard crash dialogs, reboot sim, Maestro retry |

### Cloud HTTP verification

| npm script | Script | What it checks |
|------------|--------|----------------|
| `verify:cloud` | `verify-cloud-api.mjs` | `/health`, catalog meta, login, cart |
| `verify:cloud:clip` | `verify-cloud-clip.mjs` | Polls `/api/visual-search/status` until CLIP ready |
| `verify:cloud:ml` | `verify-ml-features.mjs` | 13 ML + catalog API checks |
| `verify:cloud:search` | `verify-search-flows.mjs` | 20 text/photo/search flows |
| `verify:cloud:llm` | `verify-llm-live.mjs` | Live LLM reasoning (`intentSource: llm`) — **requires local `src/.env`** |
| `verify:cloud:all` | (chain) | Cloud + clip + ML + search (no live LLM — use `verify:cloud:llm` separately) |
| `verify:secrets-policy` | `verify-secrets-policy.mjs` | Ensures no live keys in git-tracked files |

Env: `CLIP_WAIT_MS=900000` · `MIN_CLIP_INDEX=200` · `API_URL=...`

### Android emulator

| npm script | Script | What it checks |
|------------|--------|----------------|
| `verify:e2e-android` | `run-e2e-android.mjs` | Login, products, add-to-cart, checkout, profile, signup (local API default) |
| `verify:e2e-android:cloud` | same + `USE_CLOUD_API=1` | Same flows against Railway |
| `verify:android-nav` | `verify-nav-session.mjs` | Tab nav, cart persistence |
| `verify:android-nav:cloud` | same + cloud | Cloud API |
| `verify:android-ml` / `verify:emulator` | `verify-emulator-ml.mjs` | Catalog UI, gallery, PDP similar strip |
| `verify:android-ml:cloud` | same + cloud | Cloud catalog meta + UI |

Uses `scripts/e2e-adb.mjs` (ADB, UI dump, screenshots → `docs/e2e/`).

**Note:** E2E clears app data (`pm clear`) at login — emulator stays running; only app state resets.

Cart API checks use **polling** (up to 20s) so cloud HTTPS latency does not false-fail.

### iOS simulator

| npm script | Script | What it checks |
|------------|--------|----------------|
| `verify:e2e-ios` | `run-e2e-ios.mjs` | API pre-checks + Maestro flows + CLIP status |
| `verify:e2e-ios:cloud` | same + `USE_CLOUD_API=1` | Against Railway |

Maestro flows (`.maestro/`):

| Flow | Coverage |
|------|----------|
| `demo-app-flow.yaml` | Login → product → cart → checkout → orders |
| `demo-ml-features.yaml` | Gallery search, text search, optional LLM voice |

### iOS simulator recovery (SpringBoard crashes)

Maestro uses Xcode accessibility (`XCTAutomationSupport`). On **iOS beta simulators**, SpringBoard may show **“quit unexpectedly”** — this is **not** an app bug.

| Env var | Default | Effect |
|---------|---------|--------|
| `IOS_SIM_AUTO_RECOVER` | `1` | Reboot sim + retry Maestro once on failure |
| `IOS_DISMISS_SIM_DIALOGS` | `1` | AppleScript: click **OK** on Simulator crash sheets |
| `IOS_FRESH_SIM` | `0` | Set `1` to reboot sim **before** the run |
| `IOS_SIM_DEVICE` | — | Device name for reboot if UDID boot fails |

**macOS:** Grant **Accessibility** to Terminal/Cursor for AppleScript dismiss to work (System Settings → Privacy & Security → Accessibility).

---

## Recommended release gate (cloud demo)

Run in order after a Railway deploy:

```bash
# 1) API gates
npm run verify:cloud:all
npm run verify:cloud:llm    # requires src/.env keys; not stored in repo

# 2) Android (emulator must be booted)
npm run verify:e2e-android:cloud
npm run verify:android-ml:cloud

# 3) iOS (simulator booted, Maestro installed)
IOS_FRESH_SIM=1 npm run verify:e2e-ios:cloud
```

Expected: cloud scripts all green; Android/iOS UI exercises commerce + ML against Railway.

### Appetize / BrowserStack builds

After API gates pass:

```bash
npm run verify:demo-build-ready
npm run build:demo:apk
npm run upload:appetize -- --platform android   # optional; token in src/.env
```

Full guide: [APPETIZE_BROWSERSTACK.md](./APPETIZE_BROWSERSTACK.md)

---

## Local vs cloud scripts

| Mode | API target | How |
|------|------------|-----|
| Local dev | `http://127.0.0.1:5001` | Default for `verify:ml`, `verify:search`, `verify:e2e-android` |
| Cloud | Railway HTTPS | `USE_CLOUD_API=1` or `verify:*:cloud` npm scripts |
| Custom host | Any | `API_URL=https://...` |

Mobile app cloud routing: `src/config/apiTarget.js` (`API_TARGET_MODE = "cloud"`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `verify:cloud:clip` timeout | Redeploy Railway; check logs for `[visual-search]`; ensure enough RAM (see [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)) |
| Android login timeout after `pm clear` | Ensure Metro running; reload app; re-run |
| Android cart API fail but UI OK | Fixed via `waitForCart` — pull latest scripts |
| iOS SpringBoard popup | Dismiss OK or use `IOS_FRESH_SIM=1`; see recovery env vars above |
| Maestro not found | Install Maestro; or `export MAESTRO_PATH=$HOME/.maestro/bin/maestro` |
| Wrong API in verify output | Confirm `USE_CLOUD_API=1` or `API_URL` |

---

## Files added for Phase C (2026-07-03)

```
scripts/lib/cloud-api-url.mjs
scripts/lib/read-cloud-api.mjs
scripts/lib/demo-build-paths.mjs
scripts/build-demo-apk.mjs
scripts/build-demo-ios-sim.mjs
scripts/upload-appetize.mjs
scripts/upload-browserstack.mjs
scripts/assert-cloud-api-target.mjs
config/cloud-api.json
appetize/app-config.json
docs/APPETIZE_BROWSERSTACK.md
```
