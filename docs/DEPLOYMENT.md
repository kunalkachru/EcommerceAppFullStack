# Deployment Guide

**Last updated:** 2026-07-03

> **Cloud deployment: Railway (live).** The Express API runs on Railway with commerce + CLIP search. See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md). Self-hosted OCI: [OCI_DEPLOY.md](./OCI_DEPLOY.md). Local dev remains the default workflow below.

How the full-stack application is deployed and run **today**.

---

## Current deployment model

This project is deployed as a **local development full-stack demo**, not a production cloud deployment.

```
┌─────────────────────┐     HTTP :5001      ┌──────────────────────────────┐
│  React Native App   │ ◄──────────────────►│  Express API (baseline :5001)│
│  (Metro bundler)    │                     │  - Auth, cart, orders        │
│  Android / iOS      │                     │  - Catalog merge             │
└─────────────────────┘                     │  - CLIP visual + voice search│
        ▲                                   └──────────────────────────────┘
        │                                              │
        │ JS bundle                                    │ Fetches catalog from
        │                                              │ public APIs + indexes
┌───────┴────────┐                                     ▼
│ Metro :8081    │                          DummyJSON, FakeStore, EscuelaJS
└────────────────┘                          + demoCoverageProducts (6 items)

                                          ┌──────────────────────────────┐
                                          │  Express API (hybrid :5002)  │
                                          │  - Lexical + semantic rerank │
                                          │  - Same legacy response shape│
                                          └──────────────────────────────┘
```

There is **no** current CI/CD pipeline, Docker compose, or cloud host (Heroku, AWS, etc.) checked into this repo.

---

## Standard local deployment (recommended)

Run these three processes on the developer machine:

| # | Process | Command | Port |
|---|---------|---------|------|
| 1 | API + CLIP search | `npm run server` | **5001** |
| 2 | Hybrid API + CLIP search | `npm run server:hybrid` | **5002** |
| 3 | Metro bundler | `npm start` | **8081** |
| 4 | Mobile app | `npm run android` or `npm run ios` | — |

### Network routing

| Client | Reaches API at |
|--------|----------------|
| Android emulator | `http://10.0.2.2:5001` |
| iOS simulator | `http://127.0.0.1:5001` |
| Physical phone | `http://<host-lan-ip>:5001` (manual override) |

Search-only runtime routing is handled separately in `src/config/searchRuntime.js`.

### Startup sequence

1. `npm run server` — baseline API (`5001`)
2. `npm run server:hybrid` — hybrid API (`5002`)
3. `npm start` — Metro ready
4. `npm run android` or `npm run ios`

First API start may take 1–2 minutes (CLIP model download + index build).

---

## Android emulator

Deploy the React Native app to a local Android Virtual Device (AVD).

### Prerequisites

- Android Studio with SDK Platform 34+, Build-Tools, Emulator
- `adb` on PATH (`adb devices` works)
- Node ≥ 22.11, project dependencies installed

### Step-by-step

```bash
# 1. Start emulator (Android Studio AVD Manager or CLI)
emulator -list-avds
emulator -avd Pixel_6_API_34 &

# 2. Verify device
adb devices
# → emulator-5554    device

# 3. Three terminals (from repo root)
npm run server          # wait for [visual-search] Indexed N products
npm start               # Metro :8081
npm run android         # build, install, launch
```

### Network

| Setting | Value |
|---------|-------|
| API URL (emulator) | `http://10.0.2.2:5001` |
| Config file | `src/config/api.js` |
| Why not localhost? | Emulator `localhost` is the emulator itself, not your Mac |

### Post-deploy checks

```bash
curl http://127.0.0.1:5001/health
npm run verify:emulator
npm run seed:emulator-photos   # optional visual-search photos
```

Register or login with `test@example.com` / `secret123` after first API start. Local users, carts, and orders persist in `server/data/store.json`.

---

## iOS simulator

Deploy to Xcode iOS Simulator (macOS only).

### Prerequisites

- Xcode + iOS simulator runtime
- CocoaPods: `bundle install && cd ios && bundle exec pod install && cd ..`

### Step-by-step

```bash
# 1. Boot simulator
open -a Simulator

# 2. Verify booted device
xcrun simctl list devices booted

# 3. Three terminals (from repo root)
npm run server
npm start
npm run ios
```

### Network

| Setting | Value |
|---------|-------|
| API URL (simulator) | `http://127.0.0.1:5001` |
| Config file | `src/config/api.js` |
| Ollama (local LLM) | `http://127.0.0.1:11434/v1` |

### Post-deploy checks

```bash
curl http://127.0.0.1:5001/health
npm run verify:search
```

Enable simulator microphone (I/O → Microphone) for voice-search demos.

---

## Data persistence (local demo)

| Data | Storage | Survives restart? |
|------|---------|-------------------|
| Users, carts, orders | Local JSON store (`server/data/store.json` via `server/src/index.js`) | **Yes** — persists across local server restarts |
| Catalog | Fetched from public APIs + merged | Refetched on server start |
| Client auth/cart | AsyncStorage via Redux Persist | Yes (on device) |
| CLIP vectors | Built in memory on server start | Rebuilt each restart |

For production, replace the local JSON store with a real database and shared object storage.

---

## Recommended low-cost public deployment path

For a shareable public demo endpoint, the most practical next step is:

1. Deploy **only the Express API** first
2. Keep the mobile app local/TestFlight/internal for demo use
3. Freeze the catalog snapshot and prebuild embeddings before production hosting

### Why this order

The current search runtime:

- downloads or loads CLIP at startup
- builds a product index in-process
- fetches from multiple public catalog sources

That is acceptable locally, but expensive or fragile for a very cheap public deployment.

### Recommended optimization before public launch

1. Replace live catalog fetch with a checked-in or stored snapshot
2. Precompute and persist CLIP embeddings
3. Start the production API from the persisted snapshot instead of rebuilding on every cold boot
4. Add a simple health/readiness gate for search warmup

### Best-cost hosting recommendation

For the current architecture, the safest low-cost option is a **single Dockerized API service** on a modest always-on host.

Practical choices:

- **Render**
  - Good ergonomics for Docker + persistent disk
  - Cheapest paid web service starts below Standard plans, but the CLIP runtime likely needs more than the smallest free/prototype footprint
- **Railway**
  - Easy Docker deploy, but pricing starts from a paid usage floor
- **Fly.io**
  - Pay-as-you-go style is attractive, but requires a bit more operational setup

### Current recommendation

Until embeddings are prebuilt, prefer:

1. **Render** or **Fly.io** for the API
2. Start with one small paid instance
3. Add persistent disk or object-backed snapshot for embeddings/catalog artifacts

If the goal is **minimum spend**, do this first:

1. snapshot catalog
2. persist embeddings
3. reduce cold-start and memory pressure
4. then deploy

That optimization work will make the public endpoint cheaper and more stable than deploying the current dynamic-index build as-is.

### Browser-based demo platforms

These are complementary to API hosting, not replacements for it:

- **Appetize**
  - Best fit when you want a browser-shareable interactive mobile demo
  - Streams an uploaded app build in the browser, which is useful for sales/demo review
  - Best used after we have one stable demo build pointed at a public API
- **BrowserStack App Live**
  - Better fit for QA and stakeholder testing on managed real devices
  - Strong choice for cross-device validation, but less ideal as a simple public demo link
  - Use this after merge to validate iOS/Android parity on additional device shapes

### Suggested rollout order

1. Deploy the API on a low-cost host with persistent storage
2. Point one Android/iOS demo build at that public API
3. Use **Appetize** for browser-shareable demos
4. Use **BrowserStack App Live** for broader QA regression on real devices

Build and upload scripts: **[APPETIZE_BROWSERSTACK.md](./APPETIZE_BROWSERSTACK.md)** (`npm run build:demo:apk`, `upload:appetize`).

---

## Deployment planning (2026-07-02)

Recommended path for a **low-cost public demo** after Android automation is trustworthy (`npm run verify:emulator` green).

### Phase A — Backend API (priority)

| Option | Pros | Cons | Est. cost |
|--------|------|------|-----------|
| **Railway** | Simple Node deploy, env vars, HTTPS | CLIP cold start; memory for index | ~$5–20/mo |
| **Render** | Free tier for smoke; easy Docker | Free tier sleeps; slow CLIP warm-up | $0–25/mo |
| **Fly.io** | Global regions, volumes for model cache | More ops setup | ~$5–15/mo |

**Recommendation:** Start with **Railway** or **Render** Web Service for `server/` only. Use a persistent volume or warm-up health check for CLIP index.

**Env matrix (server):**

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | Yes | Platform-assigned |
| `JWT_SECRET` | Yes | Generate for production |
| `NODE_ENV` | Yes | `production` |
| LLM keys | No | User-supplied in app session; server accepts per-request keys |

### Phase B — Mobile demo surface

| Option | When | Notes |
|--------|------|-------|
| **Internal APK / adb install** | First | Fastest; share build artifact |
| **TestFlight (iOS)** | After API HTTPS URL stable | Update `src/config/api.js` or build-time env |
| **Play internal track** | After API HTTPS URL stable | Same API host override |
| **BrowserStack App Live** | Optional | After backend stable; good for reviewer demos |

**Client API host:** Override default in `src/config/api.js` or inject at build time — emulator uses `10.0.2.2`, production needs `https://api.yourdomain.com`.

### Phase C — LLM key model (unchanged)

- `src/.env` stays **gitignored** for developer keys
- App stores session keys **in memory only** (`llmSessionStore`)
- Reviewers paste their own OpenRouter/OpenAI keys in the Voice Search card

### Phase D — CI gates before public demo

1. `npm test -- --runInBand --forceExit`
2. `npm run verify:search` + `npm run verify:ml`
3. `npm run verify:emulator` (Android smoke)
4. Manual sign-off: [MANUAL_ML_VALIDATION.md](./MANUAL_ML_VALIDATION.md)

### Maestro-on-Android (deferred)

Evaluate porting `.maestro/demo-ml-features.yaml` with `appId: com.ecommerceappfullstack` only after ADB scripts pass three consecutive runs — see [2026-07-02-android-automation-design.md](./superpowers/specs/2026-07-02-android-automation-design.md).

---

## Production deployment (not implemented)

To deploy beyond local demo, you would need:

1. **API host** — Node server on VPS/container (Render, Railway, AWS ECS, etc.)
2. **HTTPS + domain** — reverse proxy (nginx) with TLS
3. **Database** — PostgreSQL/MongoDB for users, carts, orders
4. **Persistent catalog** — snapshot DB or scheduled `snapshot-catalog` job
5. **CLIP model cache** — warm index on deploy or object storage for vectors
6. **Mobile release builds** — `npm run build:demo:apk` / `build:demo:ios-sim` (see [APPETIZE_BROWSERSTACK.md](./APPETIZE_BROWSERSTACK.md))
7. **Secrets** — JWT_SECRET, LLM keys via platform secret manager (not `.env` in repo)

Store/CI automation (TestFlight, Play internal track) is not configured yet.

### Demo assets (repo only — not in app builds)

Short demo videos under `docs/demo/videos/` are **documentation for reviewers**. They are **not** imported by app code and are excluded from production packaging:

| Layer | How they stay out |
|-------|-------------------|
| Metro JS bundle | `metro.config.js` `blockList` for `docs/demo/videos/` and `docs/e2e/` |
| Android / iOS release | Native builds only ship `android/app/src/main/assets` and Xcode Resources — `docs/` is never copied |
| Future Docker / cloud API | `.dockerignore` excludes `docs/demo/videos/`, e2e screenshots, and test photos |

Re-record locally with `npm run record:demo:android` or `npm run record:demo:ios`. LLM keys for ML demos come from your gitignored `src/.env`, not from scripts.

---

## Verification after deploy

```bash
curl http://127.0.0.1:5001/health
npm run verify:search
npm run verify:ml
```

See [TESTING_STATUS.md](./TESTING_STATUS.md) for full test matrix.

---

## Related scripts

| Script | Purpose |
|--------|---------|
| `npm run server` | Start API |
| `npm run snapshot-catalog` | Refresh offline catalog JSON |
| `npm run seed:emulator-photos` | Push test images to Android emulator |
| `npm run verify:emulator` | Android emulator ML/catalog smoke |
| `npm run verify:e2e-android` | Android commerce E2E smoke |
| `npm run verify:android-nav` | Android nav + session persistence |
