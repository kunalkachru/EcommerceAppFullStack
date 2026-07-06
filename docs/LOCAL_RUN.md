# Local run & verification guide

**Last updated:** 2026-07-06

Step-by-step instructions to **run ShopEase locally** (Android emulator or iOS simulator), verify the stack, and run the full **Maestro E2E** suite. Intended for developers and reviewers cloning the repo.

> **Navigation:** [README](../README.md) · [SETUP.md](./SETUP.md) (install) · [CONFIGURATION.md](./CONFIGURATION.md) (env vars) · [E2E_TEST_MATRIX.md](./E2E_TEST_MATRIX.md) (scenario IDs) · [CLOUD_REGRESSION.md](./CLOUD_REGRESSION.md) (script reference)

---

## What runs where

| Layer | Local (your machine) | GitHub Actions (CI) |
|-------|----------------------|---------------------|
| Jest unit tests | ✅ `npm test` | ✅ on push/PR |
| API verify scripts | ✅ `verify:cloud*`, `verify:search`, etc. | ✅ API regression workflow |
| Live LLM API gate | ✅ `verify:llm-live` (needs `src/.env` keys) | ❌ no LLM keys in CI |
| Maestro UI / emulator | ✅ `verify:e2e-all` | ❌ **not in CI** (local only) |
| Appetize APK build | ✅ `build:demo:apk` | ✅ on push to `main` |

CI proves API health and ships the browser demo. **Full mobile UI automation is local** — boot an emulator/simulator and run the commands below.

---

## 1. One-time setup

```bash
git clone https://github.com/kunalkachru/EcommerceAppFullStack.git
cd EcommerceAppFullStack
npm install && cd server && npm install && cd ..

# Server (required)
cp server/.env.example server/.env
# Edit server/.env — set JWT_SECRET

# Optional: live LLM for F18 / verify:llm-live (gitignored)
cp src/.env.example src/.env
# Add OPENAI_API_KEY and/or OPENROUTER_API_KEY (see CONFIGURATION.md)
```

Platform tools: [SETUP.md § Prerequisites](./SETUP.md#prerequisites) (Android Studio, Xcode, Maestro for iOS E2E).

**Demo login (all E2E):** `test@example.com` / `secret123`

---

## 2. Run the app (3 terminals)

### Option A — Local API (recommended for first run)

| Terminal | Command | Wait for |
|----------|---------|----------|
| A | `npm run server` | `[visual-search] Indexed N products` |
| B | `npm start` | Metro ready on `:8081` |
| C | `npm run android` **or** `npm run ios` | App on home screen |

- Android emulator → API at `http://10.0.2.2:5001`
- iOS simulator → API at `http://127.0.0.1:5001`

Details: [SETUP.md § Android](./SETUP.md#android-emulator-deployment) · [SETUP.md § iOS](./SETUP.md#ios-simulator-deployment)

### Option B — Cloud API (matches Appetize / production demo)

No local server needed for the mobile app if you use the Railway API:

1. Set `API_TARGET_MODE = 'cloud'` in `src/config/api.js` / `src/config/apiTarget.js`, **or** use cloud verify scripts (`USE_CLOUD_API=1`).
2. Terminal B: `npm start` · Terminal C: `npm run android` / `npm run ios`.

Cloud URL comes from `config/cloud-api.json`. Smoke-test: `npm run verify:cloud`.

---

## 3. Verification ladder (run in order)

Run from repo root. Each step builds confidence before UI automation.

### Step 1 — Unit tests (no device)

```bash
npm test -- --watchman=false --runInBand --forceExit
```

**Expected:** **85/85** tests.

### Step 2 — API gates (no device)

**Local API** (Terminal A must be running):

```bash
npm run verify:search    # 20/20 search flows
npm run verify:ml        # 13/13 ML + catalog checks
```

**Cloud API** (Railway):

```bash
npm run verify:cloud:all          # health, CLIP, ML, search
npm run verify:secrets-policy     # no keys in git-tracked files
```

### Step 3 — Live LLM (optional; needs `src/.env`)

```bash
npm run verify:llm-live              # local API (default hybrid :5002 if running)
USE_CLOUD_API=1 npm run verify:cloud:llm   # against Railway
```

**Expected with OpenAI + OpenRouter keys:** **6/6 passed** (Groq/Gemini skipped if keys absent).

Keys are read from gitignored `src/.env` — see [CONFIGURATION.md § Client LLM keys](./CONFIGURATION.md#client-llm-keys-srcenv).

### Step 4 — Full E2E (emulator + simulator)

**Prerequisites**

| Platform | Requirement |
|----------|-------------|
| **Android** | Booted AVD (`adb devices`), [Maestro](https://maestro.mobile.dev) installed |
| **Android demo** | `npm run build:demo:apk` then install (embedded JS bundle + cloud API) |
| **iOS** | Booted simulator, Maestro, Metro running for debug builds |
| **Photos (F14)** | `npm run seed:emulator-photos` (Android) · `node scripts/seed-ios-sim-photos.mjs` (iOS) |
| **LLM UI (F18)** | Keys in `src/.env` (same as Step 3) |

**Recommended — full matrix against Railway:**

```bash
# Boot Android emulator AND/OR iOS simulator first
USE_CLOUD_API=1 npm run verify:e2e-all           # both platforms if booted
USE_CLOUD_API=1 npm run verify:e2e-all:android # Android only
USE_CLOUD_API=1 npm run verify:e2e-all:ios     # iOS only
```

**Platform-specific shortcuts:**

```bash
USE_CLOUD_API=1 npm run verify:e2e-android:cloud
USE_CLOUD_API=1 npm run verify:e2e-ios:cloud
IOS_FRESH_SIM=1 USE_CLOUD_API=1 npm run verify:e2e-ios:cloud   # if sim was open a long time
```

**What `verify:e2e-all` runs**

1. API health + login
2. CLIP warmup (cloud)
3. `verify:llm-live` when keys present (authoritative LLM gate)
4. Maestro flows `01`–`05` (auth, catalog, cart, photo, voice)
5. **F18** `.maestro/flows/06-llm-reasoning.yaml` when keys present (UI best-effort; WARN if API passed but UI flaked)

Scenario IDs: [E2E_TEST_MATRIX.md](./E2E_TEST_MATRIX.md)

---

## 4. F18 — live LLM reasoning (Maestro)

Flow file: `.maestro/flows/06-llm-reasoning.yaml`

| Approach | What it does |
|----------|--------------|
| **Option A (Maestro)** | Resilient scroll to `voice-search-card`, LLM switch + coordinate fallback, layered fallbacks to main search button |
| **Option B (product)** | `home-scroll` testID wrapper, sticky search bar (`voice-llm-sticky-search`) visible while LLM panel is open |

**Run F18 alone** (after login app state is OK):

```bash
# Keys exported from src/.env automatically by run-e2e-all; for manual Maestro:
maestro test .maestro/flows/06-llm-reasoning.yaml \
  -e APP_ID=org.reactjs.native.example.EcommerceAppFullStack   # iOS
# Android: APP_ID=com.ecommerceappfullstack, --platform android
```

**Strict mode** (fail if LLM API gate fails):

```bash
E2E_REQUIRE_LLM=1 USE_CLOUD_API=1 npm run verify:e2e-all:ios
```

**After JS/testID changes**

- **iOS debug:** Metro reload (`npm start`) + relaunch app, or `npm run ios`
- **Android demo APK:** `npm run build:demo:apk` then `adb install -r dist/demo/shopease-cloud-demo.apk`

---

## 5. Latest validation snapshot (2026-07-06)

End-to-end local run after Option A + B implementation:

| Check | Result |
|-------|--------|
| `npm run test:scripts` | 8/8 PASS |
| `npm test` | 85/85 PASS |
| `npm run verify:llm-live` | 6/6 PASS (OpenAI + OpenRouter) |
| Maestro F18 iOS | PASS (sticky bar + Enter → product list) |
| Maestro F18 Android (demo APK) | PASS |
| GitHub Actions Maestro | Not run (by design) |

Known local flake: **F14 photo search** (gallery coordinate tap) may WARN on adb gate; Maestro `04-photo-search.yaml` remains the authoritative F14 gate. See [e2e/validation-2026-07-06.md](./e2e/validation-2026-07-06.md).

---

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `adb: no devices` | Start Android emulator; `adb devices` |
| iOS Maestro fails at login | Another Maestro run may hold the sim — wait or relaunch app |
| `home-scroll` / sticky testIDs not found | Rebuild app (Metro reload iOS; rebuild demo APK on Android) |
| `verify:llm-live` skipped | Add keys to `src/.env` from `src/.env.example` |
| F18 UI fails but API passes | Expected WARN in `verify:e2e-all`; API gate is authoritative |
| CLIP not ready | Wait for server log or `npm run verify:cloud:clip` |
| SpringBoard crash (iOS beta sim) | `IOS_FRESH_SIM=1` or grant Terminal Accessibility for dialog dismiss — [CLOUD_REGRESSION.md § iOS recovery](./CLOUD_REGRESSION.md#ios-simulator-recovery-springboard-crashes) |

---

## 7. Related docs

| Doc | Use when |
|-----|----------|
| [SETUP.md](./SETUP.md) | First install, 3-terminal startup |
| [CONFIGURATION.md](./CONFIGURATION.md) | All env vars, LLM providers |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Architecture, API host modes |
| [CLOUD_REGRESSION.md](./CLOUD_REGRESSION.md) | Full script inventory |
| [E2E_TEST_MATRIX.md](./E2E_TEST_MATRIX.md) | F01–F20 scenario IDs |
| [TESTING_STATUS.md](./TESTING_STATUS.md) | Review checklist |
| [APPETIZE_BROWSERSTACK.md](./APPETIZE_BROWSERSTACK.md) | Demo APK upload |
| [scripts/lib/CI_CD_QUICKSTART.md](../scripts/lib/CI_CD_QUICKSTART.md) | GitHub Actions triggers |
