# ShopEase — Full-Stack E-Commerce Demo

React Native mobile app + Node/Express API with multimodal search (text, voice, image), CLIP visual search, cart/checkout, and lightweight orders.

**Stack:** React Native 0.85 · React 19 · Redux Toolkit · Express · CLIP (`@xenova/transformers`)

**Branch:** `main` · **Last updated:** 2026-07-05

---

## Try the app (browser — no install)

The latest Android build is deployed automatically from `main` to **Appetize**. Open it in your browser:

| Device | Link |
|--------|------|
| **Phone (Pixel 7)** | **[Open live demo →](https://appetize.io/app/b_syzdh2dfef37uy3fyeib33aky4?device=pixel7&osVersion=13.0&toolbar=true&scale=100)** |
| **Tablet** | [Open on Pixel Tablet →](https://appetize.io/app/b_syzdh2dfef37uy3fyeib33aky4?device=pixelTablet&osVersion=13.0&toolbar=true&scale=100) |

**Demo login:** `test@example.com` / `secret123` · API: Railway (cloud)

CI/CD, upload, and secrets: **[scripts/lib/CI_CD_QUICKSTART.md](./scripts/lib/CI_CD_QUICKSTART.md)** · Full Appetize guide: **[docs/APPETIZE_BROWSERSTACK.md](./docs/APPETIZE_BROWSERSTACK.md)**

---

## Cloud demo (Railway + Appetize)

The API runs on **Railway**; the mobile demo APK is auto-deployed to **Appetize** on push to `main`. **Start here:** [Try the app](#try-the-app-browser--no-install) above.

| Topic | Document |
|-------|----------|
| **CI/CD — how to run & trigger workflows** | **[scripts/lib/CI_CD_QUICKSTART.md](./scripts/lib/CI_CD_QUICKSTART.md)** |
| **Deploy Railway, RAM settings** | **[docs/RAILWAY_DEPLOY.md](./docs/RAILWAY_DEPLOY.md)** |
| **Run verify / E2E scripts (Android + iOS)** | **[docs/CLOUD_REGRESSION.md](./docs/CLOUD_REGRESSION.md)** |
| **Appetize / BrowserStack APK & upload** | **[docs/APPETIZE_BROWSERSTACK.md](./docs/APPETIZE_BROWSERSTACK.md)** |
| **Self-hosted OCI (optional)** | **[docs/OCI_DEPLOY.md](./docs/OCI_DEPLOY.md)** |

```bash
# Pre-push (same gate as GitHub Actions)
npm run verify:cloud:deploy-gate
npm run build:demo:apk

# Manual Appetize upload
npm run upload:appetize -- --platform android

# Trigger CI manually: GitHub → Actions → "Appetize demo deploy" → Run workflow
```

Quick cloud smoke: `npm run verify:cloud` · Full API gate: `npm run verify:cloud:all` · Deploy gate: `npm run verify:cloud:deploy-gate` · Live LLM: `npm run verify:cloud:llm` (needs local `src/.env`) · Android E2E: `npm run verify:e2e-android:cloud` · iOS: `IOS_FRESH_SIM=1 npm run verify:e2e-ios:cloud`

---

## Quick start

```bash
npm install && cd server && npm install && cd ..
cp server/.env.example server/.env   # set JWT_SECRET
cp src/.env.example src/.env           # optional: OPENAI / OPENROUTER keys for live LLM (gitignored)
npm run server                       # Terminal 1 — API :5001
npm start                            # Terminal 2 — Metro :8081
npm run android                      # Terminal 3 — Android (see below for iOS)
```

| Platform | Deploy guide |
|----------|--------------|
| **Android emulator** | [SETUP § Android](./docs/SETUP.md#android-emulator-deployment) · [DEPLOYMENT § Android](./docs/DEPLOYMENT.md#android-emulator) |
| **iOS simulator** | [SETUP § iOS](./docs/SETUP.md#ios-simulator-deployment) · [DEPLOYMENT § iOS](./docs/DEPLOYMENT.md#ios-simulator) |

Full instructions: **[docs/SETUP.md](./docs/SETUP.md)** · Local runtime: **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**

---

## Documentation index

Start here for onboarding, review, or handoff to Codex/Claude.

| Document | Description |
|----------|-------------|
| **[docs/SETUP.md](./docs/SETUP.md)** | Prerequisites, install, 3-terminal startup, verification |
| **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)** | Env vars, API host, LLM keys, catalog, auth, permissions |
| **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | How the full stack runs today (local + Railway), architecture diagram |
| **[docs/RAILWAY_DEPLOY.md](./docs/RAILWAY_DEPLOY.md)** | Railway setup, RAM limits, CLI, troubleshooting |
| **[docs/CLOUD_REGRESSION.md](./docs/CLOUD_REGRESSION.md)** | **Verification & E2E scripts** — cloud API, Android emulator, iOS simulator |
| **[docs/TESTING_STATUS.md](./docs/TESTING_STATUS.md)** | **Complete testing & implementation status** — gates, results, review checklist |
| **[docs/HYBRID_SEARCH_TEST_STEPS.md](./docs/HYBRID_SEARCH_TEST_STEPS.md)** | Manual ML + E2E validation steps with expected outcomes |

### Demo & architecture

| Document | Description |
|----------|-------------|
| **[docs/DEMO_PRESENTATION.md](./docs/DEMO_PRESENTATION.md)** | Live demo script, talking points, reviewer checklist |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | System architecture (client, API, data flow) |
| **[docs/ML_SEARCH.md](./docs/ML_SEARCH.md)** | Multimodal search pipelines (text, voice, CLIP) |
| [docs/demo/videos/README.md](./docs/demo/videos/README.md) | Two demo screen recordings (app flow + ML) |

### Planning & architecture

| Document | Description |
|----------|-------------|
| [docs/UI_REVAMP_PLAN.md](./docs/UI_REVAMP_PLAN.md) | UI revamp planning notes |
| [docs/adr/0001-client-data-unistyles-rtk.md](./docs/adr/0001-client-data-unistyles-rtk.md) | ADR: client data layer (Unistyles + RTK) |

### Test assets

| Path | Description |
|------|-------------|
| [docs/test-photos/README.md](./docs/test-photos/README.md) | Visual-search test photo guide |
| [docs/e2e/](./docs/e2e/) | Manual E2E screenshots (login, cart, checkout, search) |

---

## Project status (summary)

| Area | Status |
|------|--------|
| Cart / add-to-cart | ✅ Reliable (list + PDP, structured errors) |
| Text / voice / image search | ✅ Hybrid runtime + baseline comparison + LLM reasoning + fallbacks |
| Jumbled / conversational queries | ✅ Hybrid fixes reversed-range and price-first edge cases |
| Orders | ✅ Lightweight (`mocked_paid`, Orders tab) |
| Payment gateway | ❌ Not integrated |
| Cloud production deploy | ✅ Railway (Hobby) — see [RAILWAY_DEPLOY.md](./docs/RAILWAY_DEPLOY.md) |
| Cloud regression scripts | ✅ [CLOUD_REGRESSION.md](./docs/CLOUD_REGRESSION.md) |

**Full detail:** [docs/TESTING_STATUS.md](./docs/TESTING_STATUS.md)

---

## ML search design evolution

Before this PR, text and voice search leaned heavily on a CLIP-first semantic path. That design worked for obvious product phrases and image similarity, but it was weaker on jumbled wording, reversed price phrasing, and conversational requests like "it's a fifty dollars jacket blue please" because there was no strong lexical retrieval layer or structured constraint pass in front of ranking.

This PR evolves the design into a hybrid search runtime:

- lexical candidate generation for text and transcribed voice queries
- semantic reranking to keep CLIP-style meaning matching
- explicit price/type constraint handling for order-mismatched and budget-first phrasing
- optional LLM intent extraction with rule-based fallback instead of relying on CLIP-text alone
- unified response contracts so text, voice, and image flows can share safer fallback behavior

The result is that CLIP remains important for image search and semantic relevance, but it is no longer carrying the entire text/voice interpretation problem by itself. The refined design is more robust for modern shopping behavior, especially noisy spoken input, price-led queries, and mixed multimodal discovery.

---

## Testing status (current gates)

Run with API server up (`npm run server`) after CLIP index finishes, **or** against Railway — see **[docs/CLOUD_REGRESSION.md](./docs/CLOUD_REGRESSION.md)**.

| Command | Expected result |
|---------|-----------------|
| `npm test -- --watchman=false --runInBand --forceExit` | **83/83** tests (25 suites) |
| `npm run verify:search` | **20/20** search flow checks |
| `npm run verify:ml` | **13/13** ML + catalog checks |
| `npm run verify:cloud:all` | Cloud API + CLIP + ML + search (Railway) |
| `npm run verify:cloud:llm` | Live LLM reasoning vs Railway (`src/.env` keys, not in repo) |
| `npm run verify:secrets-policy` | Scan git-tracked files for accidental API key commits |
| `npm run build:demo:apk` | Release APK for Appetize / BrowserStack (cloud API embedded) |
| `npm run build:demo:ios-sim` | iOS simulator zip for Appetize (macOS) |
| `npm run upload:appetize` | Upload build via Appetize API (`APPETIZE_API_TOKEN` in `src/.env`) |
| `npm run upload:browserstack` | Upload APK to BrowserStack App Live |
| `npm run verify:e2e-android:cloud` | Android commerce E2E vs cloud |
| `IOS_FRESH_SIM=1 npm run verify:e2e-ios:cloud` | iOS Maestro E2E vs cloud |
| `npm run verify:search:hybrid` | Hybrid passes all hybrid fixtures; baseline-only gaps shown for comparison |
| `npm run verify:llm-local` | Optional local Ollama smoke test for the LLM path (no paid credits; model quality may vary) |
| `npm run verify:llm-live` | Live OpenAI/OpenRouter intent extraction (keys in `src/.env`; run with `API_URL=http://127.0.0.1:5002` for hybrid) |

Catalog: **>=200 products required** · current local health on 2026-07-02 reported **289 products / 285 indexed** on the baseline runtime · Demo coverage products: **6**

---

## Repository layout

```
├── src/                    # React Native app (screens, components, redux, services)
├── server/                 # Express API (auth, cart, orders, search, CLIP)
├── __tests__/              # Jest unit/integration tests
├── scripts/                # verify:search, verify:ml, snapshot-catalog, seed photos
├── docs/                   # All project documentation (see index above)
└── android/ ios/           # Native project files
```

### Key server modules

| File | Role |
|------|------|
| `server/src/index.js` | Auth, cart, orders, route wiring |
| `server/src/catalogService.js` | Merged catalog + demo coverage |
| `server/src/naturalSearch.js` | Semantic text/voice search |
| `server/src/voiceQueryLLM.js` | LLM intent extraction |
| `server/src/voiceQueryParser.js` | Rule-based intent fallback |
| `server/src/visualSearch.js` | CLIP image search |

### Key client modules

| File | Role |
|------|------|
| `src/config/api.js` | API base URL (emulator vs simulator) |
| `src/redux/cartSlice.jsx` | Cart state + errors |
| `src/services/catalogSearchService.js` | Search orchestration |
| `src/components/VoiceSearchCard.jsx` | Voice + LLM UI |
| `src/screens/OrdersScreen.jsx` | Order history |

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm start` | Metro bundler |
| `npm run android` / `ios` | Run mobile app |
| `npm run server` | Start API on port 5001 |
| `npm run server:hybrid` | Start hybrid search API on port 5002 |
| `npm test` | Jest test suite |
| `npm run verify:search` | Search flow verification (20 checks) |
| `npm run verify:ml` | ML + catalog verification (13 checks) |
| `npm run verify:search:hybrid` | Side-by-side baseline vs hybrid verification |
| `npm run verify:llm-local` | Optional local-Ollama LLM smoke verification |
| `npm run verify:llm-live` | **Live LLM reasoning** (requires keys in `src/.env`) |
| `npm run verify:cloud` | Cloud commerce smoke (Railway) |
| `npm run verify:cloud:all` | Full cloud API regression |
| `npm run verify:e2e-android:cloud` | Android E2E vs cloud |
| `npm run verify:e2e-ios:cloud` | iOS Maestro E2E vs cloud |
| `npm run snapshot-catalog` | Refresh offline catalog JSON |
| `npm run seed:emulator-photos` | Seed test photos to Android emulator |
| `npm run record:demo:android` | Record both demo videos (Android emulator → `docs/demo/videos/`) |
| `npm run record:demo:ios` | Record both demo videos (iOS simulator → same two files) |

---

## Deployment (how we run it today)

**Local:** Express API `:5001`, Metro `:8081`, Android/iOS simulators.

**Cloud (primary demo API):** Railway — [RAILWAY_DEPLOY.md](./docs/RAILWAY_DEPLOY.md). Regression scripts: [CLOUD_REGRESSION.md](./docs/CLOUD_REGRESSION.md).

Full architecture: **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**

---

## Configuration

| What | Where |
|------|-------|
| Server env | `server/.env` (from `server/.env.example`) |
| Client LLM keys | `src/.env` (gitignored, optional) |
| API host override | `src/config/api.js` or `global.__API_HOST__` |

Full reference: **[docs/CONFIGURATION.md](./docs/CONFIGURATION.md)**

---

## External review checklist (Codex / Claude)

1. Read this README, then **[docs/TESTING_STATUS.md](./docs/TESTING_STATUS.md)**
2. Run the verification commands above, starting with **`npm run verify:llm-local`** for no-cost validation and **`npm run verify:llm-live`** only when paid-provider keys are available
3. Review key files listed in TESTING_STATUS “Key Files for Code Review”
4. Confirm no secrets in git (`src/.env`, `server/.env` are gitignored)

---

## License

Private project — see repository owner for usage terms.
