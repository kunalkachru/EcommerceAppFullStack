# Setup Guide

**Last updated:** 2026-07-01

Local development setup for the React Native client + Node/Express API + CLIP search backend.

> **Navigation:** [README](../README.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [CONFIGURATION.md](./CONFIGURATION.md)

---

## Prerequisites

| Requirement | Version / notes |
|-------------|-----------------|
| Node.js | ≥ 22.11.0 (root `package.json`) |
| npm | Comes with Node |
| Android Studio | For Android emulator (recommended demo target) |
| Xcode + CocoaPods | For iOS simulator (macOS only) |
| Watchman | Recommended on macOS (`brew install watchman`) |

Official React Native environment guide: [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment)

---

## 1. Clone and install

```bash
git clone https://github.com/kunalkachru/EcommerceAppFullStack.git
cd EcommerceAppFullStack

npm install
cd server && npm install && cd ..
```

`postinstall` runs `scripts/patch-voice-gradle.mjs` for Android voice-search compatibility.

---

## 2. Configure environment

See [CONFIGURATION.md](./CONFIGURATION.md) for all env vars and LLM keys.

Minimum for local API:

```bash
cp server/.env.example server/.env
# Edit server/.env — set JWT_SECRET at minimum
```

Optional client LLM keys for live AI reasoning (gitignored):

```bash
# src/.env (create locally, never commit)
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...   # optional second provider
```

Verify live LLM after API is running:

```bash
npm run verify:llm-live
```

---

## 3. Start the full stack (3 terminals)

### Terminal A — API server (port 5001)

```bash
npm run server
```

First run downloads the CLIP model (~150 MB) and builds the product index (~30–60 s).

Health check:

```bash
curl http://127.0.0.1:5001/health
```

Wait for log line: `[visual-search] Indexed N products`

### Terminal B — Metro bundler

```bash
npm start
```

### Terminal C — Run the app

See platform sections below.

---

## Android emulator deployment

### One-time setup

1. Install [Android Studio](https://developer.android.com/studio)
2. **SDK Manager** → install Android SDK Platform 34+, Android SDK Build-Tools, Android Emulator
3. **Virtual Device Manager** → Create Device → Pixel 6 (or similar) → API 34 system image
4. Ensure `adb` is on PATH (`export ANDROID_HOME=...` per RN docs)

### Every run

| Step | Command / action |
|------|------------------|
| 1 | Start emulator from Android Studio **or** `emulator -avd <AVD_NAME>` |
| 2 | Confirm device: `adb devices` → `emulator-5554 device` |
| 3 | Terminal A: `npm run server` (wait for CLIP index) |
| 4 | Terminal B: `npm start` |
| 5 | Terminal C: `npm run android` |

The app reaches the API at **`http://10.0.2.2:5001`** (host loopback from emulator). Configured in `src/config/api.js`.

### Optional Android extras

```bash
npm run seed:emulator-photos    # Visual-search demo photos → /sdcard/Pictures/ShopEaseTest
npm run verify:emulator         # ML smoke checks on running emulator
npm run record:demo:android     # Record demo videos
```

### Android troubleshooting

| Issue | Fix |
|-------|-----|
| `adb: no devices` | Start AVD; run `adb kill-server && adb start-server` |
| Red screen / can't reach API | Confirm server on `:5001`; emulator uses `10.0.2.2`, not `localhost` |
| Voice build errors | Re-run `npm install` (voice gradle patch) |
| Gradle sync fails | Open `android/` in Android Studio once; accept SDK licenses |

More: [DEPLOYMENT.md § Android](./DEPLOYMENT.md#android-emulator)

---

## iOS simulator deployment

### One-time setup (macOS only)

1. Install Xcode from App Store
2. Open Xcode once; accept license; install iOS simulator runtime
3. Install CocoaPods: `sudo gem install cocoapods` or `brew install cocoapods`
4. Install pods:

```bash
bundle install
cd ios && bundle exec pod install && cd ..
```

### Every run

| Step | Command / action |
|------|------------------|
| 1 | Boot simulator: `open -a Simulator` or Xcode → Window → Devices |
| 2 | Confirm booted: `xcrun simctl list devices booted` |
| 3 | Terminal A: `npm run server` |
| 4 | Terminal B: `npm start` |
| 5 | Terminal C: `npm run ios` |

The app reaches the API at **`http://127.0.0.1:5001`**. Configured in `src/config/api.js`.

### Optional iOS extras

```bash
npm run record:demo:ios         # Record demo videos on booted simulator
```

### iOS troubleshooting

| Issue | Fix |
|-------|-----|
| Pod install fails | `cd ios && bundle exec pod install --repo-update` |
| Simulator not found | `xcrun simctl list devices`; pick a booted device |
| Metro connection | Shake device → Dev Settings → ensure bundler host is localhost |
| Microphone for voice | Simulator → I/O → Microphone (enable for voice demo) |

More: [DEPLOYMENT.md § iOS](./DEPLOYMENT.md#ios-simulator)

---

## 4. Optional: seed emulator test photos

For visual-search demo photos on Android emulator:

```bash
npm run seed:emulator-photos
```

Photos land in `/sdcard/Pictures/ShopEaseTest`. See [test-photos/README.md](./test-photos/README.md).

---

## 5. Verify installation

With API running and CLIP index ready:

```bash
npm test -- --runInBand --forceExit
npm run verify:search
npm run verify:ml
npm run verify:llm-local   # optional no-cost Ollama smoke
npm run verify:llm-live    # requires OPENAI_API_KEY in src/.env
```

Expected: **77/77** Jest tests, **20/20** search checks, **13/13** ML checks, optional local LLM smoke returns no hard failures, live paid-provider LLM passes with valid keys.  
Details: [TESTING_STATUS.md](./TESTING_STATUS.md)

---

## 6. Refresh offline catalog snapshot

After catalog changes:

```bash
npm run snapshot-catalog
```

Updates `src/data/catalog-fallback.json` (client offline fallback) and `server/data/catalog-snapshot.json` (gitignored runtime snapshot).

---

## Troubleshooting (general)

| Issue | Fix |
|-------|-----|
| `EADDRINUSE :5001` | Kill old server: `lsof -ti:5001 \| xargs kill -9` |
| Physical device can't reach API | Set `global.__API_HOST__ = '<your-lan-ip>'` before app loads |
| CLIP index still building | Wait for log: `[visual-search] Indexed N products` |
| LLM live test fails | Check `src/.env` keys; ensure billing/quota on provider |

More: [DEPLOYMENT.md](./DEPLOYMENT.md) · [React Native troubleshooting](https://reactnative.dev/docs/troubleshooting)
