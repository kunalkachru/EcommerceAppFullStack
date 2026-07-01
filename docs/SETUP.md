# Setup Guide

**Last updated:** 2026-07-01

Local development setup for the React Native client + Node/Express API + CLIP search backend.

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

Optional client LLM keys (gitignored):

```bash
# src/.env (create locally, never commit)
OPENAI_API_KEY=sk-...
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

### Terminal B — Metro bundler

```bash
npm start
```

### Terminal C — Run the app

**Android emulator:**

```bash
npm run android
```

**iOS simulator (macOS):**

```bash
bundle install
cd ios && bundle exec pod install && cd ..
npm run ios
```

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
```

Expected: **59/59** Jest tests, **20/20** search checks, **13/13** ML checks.  
Details: [TESTING_STATUS.md](./TESTING_STATUS.md)

---

## 6. Refresh offline catalog snapshot

After catalog changes:

```bash
npm run snapshot-catalog
```

Updates `src/data/catalog-fallback.json` (client offline fallback) and `server/data/catalog-snapshot.json` (gitignored runtime snapshot).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `EADDRINUSE :5001` | Kill old server: `lsof -ti:5001 \| xargs kill -9` |
| Android can't reach API | Emulator uses `10.0.2.2:5001` (see `src/config/api.js`) |
| Physical device can't reach API | Set `global.__API_HOST__ = '<your-lan-ip>'` before app loads |
| CLIP index still building | Wait for log: `[visual-search] Indexed N products` |
| Voice search Android build | Ensure `postinstall` patch ran; re-run `npm install` |

More: [DEPLOYMENT.md](./DEPLOYMENT.md) · [React Native troubleshooting](https://reactnative.dev/docs/troubleshooting)
