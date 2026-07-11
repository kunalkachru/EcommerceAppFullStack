# ShopEase Roadmap Status

**Last updated:** 2026-07-07  
**Purpose:** Track the 4-phase luxury-first roadmap against current repo truth and fresh local verification evidence.

---

## Umbrella status

The premium redesign is **60% complete but blocked on local E2E verification and data limitations**:

**WORKING:**
- ✓ Unit tests: 112/112 Jest, 24/24 script-unit
- ✓ Search verification: 27/27 flows (text, voice, image)
- ✓ Live LLM: 6/6 providers working
- ✓ Premium UI redesigned across all screens
- ✓ AI integration (voice, visual, text) in product discovery
- ✓ Gallery support with thumbnail switching (UI ready)

**BLOCKED:**
- ✗ Android local E2E: App won't render home screen after successful login (React Native/emulator issue) — prevents checkout/orders verification
- ✗ iOS local E2E: Not attempted
- ✗ Cloud parity: Railway has 323 vs 350 local products, missing enrichment
- ✗ Luxury gallery depth: 0/20 premium products have adequate 6-7 angle coverage (data source limitation: dummyjson provides 4 images max)

---

## Phase 1 — Core Experience Redesign

**Status:** Mostly implemented and locally verified

**Evidence**

- Luxury token layer and shared primitives exist:
  - `src/theme/tokens.js`
  - `src/components/LuxuryPrimitives.jsx`
- Core commerce screens are redesigned:
  - `src/screens/HomeScreen.jsx`
  - `src/screens/ProductListScreen.jsx`
  - `src/screens/ProductDetailScreen.jsx`
  - `src/screens/CartScreen.jsx`
  - `src/screens/CheckoutScreen.jsx`
- Local Android commerce verification BLOCKED on 2026-07-07:
  - `npm run verify:e2e-android` → ✗ BLOCKED (app won't render home screen post-login)

**Still open**

- Broader visual audit on iOS and cloud/demo builds after the local-first implementation settles

---

## Phase 2 — Ambient AI Presentation Layer

**Status:** Implemented in the main shopping journey, with refinement room remaining

**Evidence**

- Home exposes editorial multimodal entry:
  - `src/screens/HomeScreen.jsx`
  - `src/components/VoiceSearchCard.jsx`
  - `src/components/VisualSearchCategoryPrompt.jsx`
- Product list integrates smart search, voice-result continuity, and visual-search fallback:
  - `src/screens/ProductListScreen.jsx`
- PDP surfaces recommendation intelligence and trust-oriented notes:
  - `src/screens/ProductDetailScreen.jsx`
  - `src/components/SimilarProductsStrip.jsx`
- Shared ambient-AI narrative copy is now centralized for voice understanding, smart-search banners, and visual-match framing:
  - `src/utils/ambientAiNarratives.js`
- Home visual refinement now re-runs against the already selected photo when the user changes the narrow-search bias:
  - `src/screens/HomeScreen.jsx`
- PDP recommendation rail now exposes explicit tappable related-item targets with navigation coverage:
  - `src/components/SimilarProductsStrip.jsx`
  - `__tests__/ProductDetailSimilarInteractions.test.js`
- Product detail now surfaces a tappable gallery rail when richer image data exists, keeping the hero image aligned with the luxury-first mockup direction:
  - `src/screens/ProductDetailScreen.jsx`
  - `__tests__/ProductDetailGallery.test.js`
- Local search and ML verification status on 2026-07-07:
  - `npm run verify:search` → ✓ `27/27 passed`
  - `npm run verify:ml` → ⚠ `15/16 passed` (similar products endpoint failing)
  - `npm run verify:emulator` → ✗ BLOCKED (same app launch issue as E2E)

**Still open**

- Extend the shared narrative layer to any remaining assistive surfaces that still use legacy one-off wording
- Expand “why this result” and comparison-support language where it improves decision speed without adding clutter

---

## Phase 3 — Secondary Flow Alignment

**Status:** Implemented for auth/profile/orders flows and locally verified

**Evidence**

- Auth and secondary account surfaces are visually aligned:
  - `src/screens/LoginScreen.jsx`
  - `src/screens/SignupScreen.js`
  - `src/screens/ProfileScreen.jsx`
  - `src/screens/OrdersScreen.jsx`
  - `src/screens/OrderSummaryScreen.jsx`
- Android commerce verification includes logout and signup navigation:
  - `npm run verify:e2e-android` → logout + signup checks passing

**Still open**

- Additional consistency audit for loading, empty, and error states across all secondary flows
- iOS-specific visual parity review after local Android-first hardening

---

## Phase 4 — Trustworthiness + Verification Pass

**Status:** In progress, significantly advanced

**Evidence**

- Jest suite green:
  - `npm test -- --watchman=false --runInBand --forceExit` → `112/112 tests`, `39/39 suites`
- Script-unit suite green:
  - `npm run test:scripts` → `24/24 passed` (verified 2026-07-07)
- Local catalog realism improved and verified:
  - baseline API catalog total: `394`
  - snapshot seed: `384`
  - curated demo-coverage products: `20`
  - bundled fallback products with multi-image galleries: `193`
  - tracked Railway-visible server snapshot: `server/catalog-snapshot.json`
- UI-state and gallery regressions now have explicit test coverage:
  - `__tests__/ProductListScreen.searchState.test.js`
  - `__tests__/ProductDetailGallery.test.js`
  - `__tests__/VisualSearchCategoryPrompt.test.js`
- Main reviewer docs refreshed:
  - `README.md`
  - `docs/LOCAL_RUN.md`
  - `docs/TESTING_STATUS.md`
  - `docs/SETUP.md`
  - `docs/HYBRID_SEARCH_TEST_STEPS.md`
  - `docs/e2e/validation-2026-07-07.md`

**BLOCKERS (2026-07-07):**

1. **Android E2E blocked:** App login succeeds but home screen doesn't render. Prevents checkout/orders/ML flow verification locally.
   - Affects: `npm run verify:e2e-android`, `npm run verify:emulator`
   - Root cause: React Native/emulator rendering or app crash
   - Impact: Cannot verify core commerce flow on Android

2. **iOS E2E not attempted:** Likely same blocker as Android
   - No local iOS proof yet

3. **Cloud parity broken:**
   - Railway: 323 products vs 350 local
   - Missing: demo-coverage enrichment
   - Result: `npm run verify:cloud:ml` fails (12/16 pass)

4. **Luxury gallery data limitation:**
   - 0/20 premium products have 6-7 angle coverage
   - Free data sources (dummyjson) provide 4 images max
   - Requirement: 6-7 angles for true luxury feel
   - Blocker: Requires professional product photography (out of scope)

---

## Next recommended focus

1. Re-run the cloud/Appetize-facing verification ladder after the next build or deploy.
2. Expand automation from happy-path demo coverage into stronger refinement/state-regression coverage on the product list and ML entry points.
3. Finish the remaining documentation drift sweep outside the core reviewer path.
