# Testing & Implementation Status

**Last updated:** 2026-07-07  
**Branch target:** `main`  
**Purpose:** Handoff document for external review agents (Codex, Claude, etc.)

> **Navigation:** Start from the [README](../README.md) for the full documentation index. **Local deploy + E2E:** [LOCAL_RUN.md](./LOCAL_RUN.md)

---

## Executive Summary

This branch completes a premium, demo-ready e-commerce app with:

1. **Reliable cart/add-to-cart flow** (list + PDP, truthful async feedback, structured errors)
2. **Hybrid multimodal search** (text, voice, image) with baseline-vs-hybrid runtime split, LLM reasoning, and rule-based fallback
3. **Lightweight orders lifecycle** (`mocked_paid` checkout → Orders tab → order detail)
4. **Catalog coverage products** for common demo price/type gaps (laptops $500–900, gaming monitors under $240)
5. **Richer premium product presentation** via bundled `images[]` galleries, PDP thumbnail switching, and stronger product-list stale-state guards

**Current automated gate status (verified 2026-07-07 afternoon):**

| Gate | Command | Result | Status |
|------|---------|--------|--------|
| Unit/integration (Jest) | `npm test -- --watchman=false --runInBand --forceExit` | **112/112 passed** (39 suites) | ✓ GREEN |
| Script-unit tests | `npm run test:scripts` | **24/24 passed** | ✓ GREEN |
| Local search flows | `npm run verify:search` | **27/27 passed** on baseline `:5001` | ✓ GREEN |
| Local ML + catalog | `npm run verify:ml` | **15/16 passed** — similar products endpoint failing | ⚠ PARTIAL |
| Live LLM reasoning | `npm run verify:llm-live` | **6/6 passed** (OpenAI + OpenRouter; Groq/Gemini skipped without keys) | ✓ GREEN |
| Android emulator ML smoke | `npm run verify:emulator` | ⛔ BLOCKED — app does not render home screen after login | ✗ BLOCKED |
| Android commerce E2E | `npm run verify:e2e-android` | ⛔ BLOCKED — home screen text not appearing after successful login | ✗ BLOCKED |
| Cloud basic checks | `npm run verify:cloud` | **4/4 passed** | ✓ GREEN |
| Cloud ML + parity | `npm run verify:cloud:ml` | **12/16 passed** — catalog size (323 vs 350), enriched metadata missing | ✗ FAIL |

**Current cloud truth (2026-07-07):**

- `npm run verify:cloud` → ✓ PASS (4/4 basic checks)
- `npm run verify:cloud:clip` → ✓ PASS (252/252 indexed)
- `npm run verify:cloud:ml` → ✗ FAIL (12/16) — Railway catalog parity issue: 323 products vs 350 local, 0 enriched vs 390 local enriched
- `npm run verify:cloud:search` → (not completed, blocked by ML failures)
- **Blocker:** Railway deployment missing demo-coverage product enrichment and has smaller catalog

---

## Implementation Completed

### Day 1 — Cart / Add-to-Cart Reliability

| Item | Status | Key files |
|------|--------|-----------|
| Visible "Add" CTA on product cards | Done | `src/screens/ProductListScreen.jsx` |
| PDP add-to-cart uses `unwrap()` for truthful feedback | Done | `src/screens/ProductDetailScreen.jsx` |
| Per-product pending state (`pendingByProduct`) | Done | `src/redux/cartSlice.jsx` |
| Structured cart errors (`mapCartError`, auth/network/validation) | Done | `src/redux/cartSlice.jsx` |
| Cart screen retry + auth remediation hints | Done | `src/screens/CartScreen.jsx` |
| Server cart validation + error codes | Done | `server/src/index.js` |
| Cart unit tests | Done | `__tests__/cartSlice.test.js` |

### Day 2 — Search Demo Reliability (Text + Voice + Image)

| Item | Status | Key files |
|------|--------|-----------|
| Unified search orchestration (API → local fallback) | Done | `src/services/catalogSearchService.js` |
| Query normalization (spelled numbers, comparators) | Done | `server/src/queryNormalize.js` |
| Rule-based intent parser (reversed word order) | Done | `server/src/voiceQueryParser.js` |
| LLM intent + keyword sanitization + conversational price | Done | `server/src/voiceQueryLLM.js` |
| Hybrid lexical→semantic rerank + baseline compatibility | Done | `server/src/naturalSearch.js`, `server/src/search/text/` |
| Visual search + similar products | Done | `server/src/visualSearch.js` |
| Unified search response contract + legacy adapters | Done | `server/src/search/contracts/` |
| Runtime split (`5001` baseline vs `5002` hybrid) | Done | `server/src/runtime/searchRuntimeConfig.js`, `src/config/searchRuntime.js` |
| Voice search UI + LLM provider config | Done | `src/components/VoiceSearchCard.jsx` |
| Dev-only in-app runtime switch | Done | `src/components/VoiceSearchCard.jsx` |
| Search/parser/LLM unit tests | Done | `__tests__/voiceQueryParser.test.js`, `__tests__/voiceQueryLLM.test.js`, `__tests__/naturalSearch.test.js`, etc. |
| Search verification script | Done | `scripts/verify-search-flows.mjs` |
| Golden fixtures + A/B eval | Done | `scripts/fixtures/`, `scripts/eval-hybrid-search.mjs`, `scripts/verify-search-ab.mjs` |

### Day 3 — Lightweight Orders

| Item | Status | Key files |
|------|--------|-----------|
| Orders API (`POST/GET /api/orders`) | Done | `server/src/index.js` |
| Checkout creates order before clearing cart | Done | `src/screens/CheckoutScreen.jsx` |
| Orders tab + list screen | Done | `src/screens/OrdersScreen.jsx`, `src/navigation/BottomTabNavigator.jsx` |
| Order summary from persisted order object | Done | `src/screens/OrderSummaryScreen.jsx` |
| Orders client service + tests | Done | `src/services/ordersService.js`, `__tests__/ordersService.test.js` |

### Catalog Coverage Fix (Post-testing gap)

Public API catalogs lacked inventory for common demo queries. The repo now adds **20 curated demo-coverage products** merged at catalog load time across laptops, gaming monitors, headphones, blue jackets, women's shoes, fragrances, lipsticks, and backpacks. The bundled snapshot now also preserves `images[]` for all products and carries multi-image gallery depth on **193** fallback items, including **13** curated hero products.

Files: `server/src/demoCoverageProducts.js`, `server/src/catalogService.js`, `__tests__/demoCoverageProducts.test.js`

Current catalog baseline verified on 2026-07-06:

- `src/data/catalog-fallback.json` snapshot seed: **384** products
- merged local baseline API (`npm run server`): **394** products
- CLIP index on refreshed local baseline: **377** products

---

## Test Layer Breakdown

### Layer 1 — Unit Tests (Jest)

**Command:** `npm test -- --runInBand --forceExit`

| Test file | Area |
|-----------|------|
| `cartSlice.test.js` | Cart errors, `pendingByProduct`, auth mapping |
| `ordersService.test.js` | Order API client calls |
| `voiceQueryParser.test.js` | Price parsing, gender/category, reversed phrasing |
| `voiceQueryLLM.test.js` | LLM on/off, keyword filter, conversational price |
| `naturalSearch.test.js` | Type matching, price fallback ranking |
| `demoCoverageProducts.test.js` | Catalog gap-fill products |
| `catalogSearchService.test.js` | Client search + local fallback |
| `catalogTextFilter.test.js` | Local text filter |
| `catalogApi.test.js` | Category helpers |
| `visualSearchMessages.test.js` | Image search UX messages |
| `speechRecognition.test.js` | Voice input helpers |
| `matchProductsByLabels.test.js` | Label matching |
| `App.test.tsx` | App boot smoke |

**Result:** 39 suites, 112 tests — all passing.

**Non-blocking warnings:**
- Jest may report open handles; use `--forceExit` for CI-style runs

### Layer 2 — Integration / API Scripts

#### Local search regression (`npm run verify:search`)

- Server health + CLIP index
- Text queries: `below 45`, `Below 45`, `under $50`, `shoes women`, `blue jacket under 50 dollars`, `wireless headphones below 100`, `between 20 and 40`, `lipstick under 20`
- Empty query rejection
- LLM key required when reasoning enabled
- Bad LLM key handled without crash
- Local fallback filters
- Photo search (jacket, category filter, off-catalog pizza)
- Voice config (5 LLM providers)

#### Local ML verification (`npm run verify:ml`)

- Server health
- Catalog size ≥350 (current local baseline: **394**)
- Catalog API + categories
- **Catalog coverage:** laptops $500–900 (4), gaming monitors under $240 (2), fragrances under $90 (7), backpacks under $120 (10)
- CLIP index ≥200 (current local baseline health on 2026-07-06: **377** indexed)
- Visual search, attributes, similar products, category groups
- Voice search + `shoes women`

### Layer 3 — Baseline vs Hybrid Search Validation

Automated A/B fixture comparison now covers:

| Query | Baseline | Hybrid |
|------|----------|--------|
| `100 under headphones wireless` | Pass | Pass |
| `900 and 500 laptop between` | Known comparison gap | Pass |
| `it's a fifty dollars jacket blue please` | Pass | Pass |
| catalog jacket image | Pass | Pass |
| off-catalog pizza image | Pass | Pass |

### Layer 4 — LLM-Enabled Live Query Validation (Manual/API)

Fresh paid-provider verification on 2026-07-02:

- OpenAI provider passed:
  - conversational jacket query
  - jumbled headphones query
  - price-first gaming monitor query
- OpenRouter provider passed:
  - headphone budget query
- Result: **7/7 passed** including health and key-load checks

Historical/manual coverage also included `useLlmReasoning=true`, OpenAI `gpt-4o-mini`, strict LLM mode.

**Jumbled vs normal pairs (intent consistency):**

| Normal | Jumbled | Result |
|--------|---------|--------|
| `wireless headphones below 100` | `100 under headphones wireless` | Same intent + overlapping results |
| `blue jacket under 50` | `jacket blue 50 under` | Same intent + overlapping results |
| `laptop between 500 and 900` | `900 and 500 laptop between` | Same intent; now returns in-range laptops |
| `women shoes around 40` | `forty around shoes women` | Same intent + overlapping results |
| `mens shirt above 30 black` | `30 above black mens shirt` | Same intent + overlapping results |

**Conversational / price-first phrasing:**

| Query | Parsed intent | Top results |
|-------|---------------|-------------|
| `it's a fifty dollars jacket blue please` | max $50, jacket | Rain jacket, faux leather jacket |
| `its a twenty dollars lipstick red please` | max $20, lipstick | Red Lipstick |
| `it's a forty dollars please anything shoes women` | max $40, shoes | Pampi Shoes, slippers |
| `its a 240 dollars gaming monitor please` | max $240, monitor | LG UltraGear, Acer Nitro, Dell Office Monitor |
| `under 240 gaming monitor` | max $240, monitor | Same gaming/office monitors |

**Broad sweep (~16 query variants):** ~14–16 pass, 0 errors, LLM used in 100% of successful cases.

### Layer 5 — E2E / Manual Smoke

- Emulator screenshots captured under `docs/e2e/` (login, product list, PDP, cart, checkout, profile, signup)
- **Android automation (2026-07-02 hardening):** `scripts/e2e-adb.mjs` uses testIDs, fixed clipboard text entry, tab navigation via `tab-*` IDs — see [2026-07-02-android-automation-design.md](./superpowers/specs/2026-07-02-android-automation-design.md)
- **npm gates:** `verify:emulator`, `verify:e2e-android`, `verify:android-nav`
- Test photos for visual search under `docs/test-photos/` (README included; binary images gitignored)
- **Manual ML matrix:** [MANUAL_ML_VALIDATION.md](./MANUAL_ML_VALIDATION.md) (mic + camera realism)
- **Manual guide:** [HYBRID_SEARCH_TEST_STEPS.md](./HYBRID_SEARCH_TEST_STEPS.md)
- **Fresh iOS branch launch verified on 2026-07-02:** isolated worktree build launched on booted `iPhone 17 Pro Max` (`iOS 26.5`) via Metro `:8088`
- **Not automated:** full Detox/Appium E2E suite in CI; true microphone and camera capture flows (manual matrix)

---

## How to Reproduce Verification

```bash
# Terminal 1 — API server
npm run server

# Terminal 2 — after CLIP index finishes (~30s first run)
npm test -- --watchman=false --runInBand --forceExit
npm run test:scripts
npm run verify:search
npm run verify:ml
npm run verify:emulator
npm run verify:e2e-android
npm run verify:search:hybrid

# Optional — refresh offline catalog snapshot
npm run snapshot-catalog
```

**LLM live tests:**

- `npm run verify:llm-local` uses Ollama at `http://127.0.0.1:11434/v1` and is the preferred no-cost verification path
- `npm run verify:llm-live` requires `OPENAI_API_KEY` in local `src/.env` (gitignored) or an equivalent session key passed to `/api/search/voice`

---

## Known Limitations (For Reviewers)

| Area | Status |
|------|--------|
| Payment gateway | Not integrated; orders use `mocked_paid` |
| Automated E2E in CI | Scripts + manual smoke only |
| Server cart integration tests | Client unit tests cover slice; no dedicated server cart test file |
| Paid-provider live LLM verification | Needs real key in `src/.env` or session key pasted in app |
| Simulator smoke on this machine | Requires local Metro/xcodebuild bind permissions and healthy CoreSimulator service |
| Catalog false positives | Some products match type keywords in descriptions (e.g. pot with "monitor cooking progress"); mitigated by type-strength ranking + demo coverage products |
| `server/data/catalog-snapshot.json` | Gitignored; regenerated via `npm run snapshot-catalog` |

---

## Key Files for Code Review

### Server
- `server/src/index.js` — auth, cart, orders, search routes
- `server/src/catalogService.js` — merged catalog + demo coverage
- `server/src/demoCoverageProducts.js` — gap-fill products
- `server/src/naturalSearch.js` — semantic search + constraints
- `server/src/runtime/searchRuntimeConfig.js` — baseline vs hybrid runtime matrix
- `server/src/search/` — contracts, intent, text rerank, visual fusion modules
- `server/src/voiceQueryParser.js` — rule-based intent
- `server/src/voiceQueryLLM.js` — LLM intent + normalization
- `server/src/visualSearch.js` — CLIP image search
- `server/src/queryNormalize.js` — query text normalization

### Client
- `src/redux/cartSlice.jsx` — cart state + errors
- `src/services/catalogSearchService.js` — search orchestration
- `src/config/searchRuntime.js` — search-only runtime routing
- `src/services/ordersService.js` — orders API client
- `src/screens/ProductListScreen.jsx`, `ProductDetailScreen.jsx`, `CartScreen.jsx`, `CheckoutScreen.jsx`, `OrdersScreen.jsx`
- `src/components/VoiceSearchCard.jsx` — voice + LLM UI

### Tests & Scripts
- `__tests__/` — all Jest suites
- `scripts/verify-search-flows.mjs`
- `scripts/verify-ml-features.mjs`
- `scripts/verify-search-ab.mjs`
- `scripts/eval-hybrid-search.mjs`
- `scripts/record-demo-android.mjs` · `scripts/record-demo-ios.sh` — demo video capture

### Demo & architecture docs
- [DEMO_PRESENTATION.md](./DEMO_PRESENTATION.md) — live demo script
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system diagram
- [ML_SEARCH.md](./ML_SEARCH.md) — search pipelines
- [demo/videos/README.md](./demo/videos/README.md) — recorded demos

---

## Architecture Plan Reference

Detailed design and 3-day execution board: `.cursor/plans/robust_hybrid_search_architecture_0c4b0e5b.plan.md` (local Cursor plan; may not be in repo unless copied).

---

## Review Checklist for External Agents

- [ ] Run `npm test -- --watchman=false --runInBand --forceExit` — expect 107/107
- [ ] Run `npm run test:scripts` — expect 21/21
- [ ] Run `npm run verify:search` — expect 27/27
- [ ] Run `npm run verify:ml` — expect 16/16
- [ ] Run `npm run verify:emulator` — expect 7/7
- [ ] Run `npm run verify:e2e-android` — expect 19/19
- [ ] Run `npm run verify:search:hybrid` — expect hybrid pass, baseline comparison note allowed
- [ ] Run `npm run verify:llm-local` — expect `intentSource=llm` on the successful cases with the installed Ollama model
- [ ] Run `npm run verify:llm-live` when paid-provider keys are available
- [ ] Confirm cart add from list + PDP with logged-in user
- [ ] Confirm checkout → order appears in Orders tab
- [ ] Follow [MANUAL_ML_VALIDATION.md](./MANUAL_ML_VALIDATION.md) for mic/camera realism
- [ ] Run `npm run verify:emulator` with Android emulator + API (expect catalog/gallery/PDP checks)
- [ ] Run `npm run verify:e2e-android` for full commerce smoke (optional but recommended)
- [ ] Watch demo videos or follow [DEMO_PRESENTATION.md](./DEMO_PRESENTATION.md)
- [ ] Confirm no secrets committed (`src/.env`, `server/.env` are gitignored)
