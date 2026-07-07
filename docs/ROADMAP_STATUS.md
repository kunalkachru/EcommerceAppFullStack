# ShopEase Roadmap Status

**Last updated:** 2026-07-07  
**Purpose:** Track the 4-phase luxury-first roadmap against current repo truth and fresh local verification evidence.

---

## Umbrella status

The premium redesign is **not fully complete yet**, but the local baseline is now materially stronger and more trustworthy:

- Local app target and local verification scripts are aligned again on baseline API `:5001`
- Core Android commerce flow passes end to end on the redesigned shell
- Core Android ML flow passes on the redesigned shell
- Reported stitching gaps on the premium shell are now guarded: Home visual refine reruns on the current photo, PDP similar items open reliably, and product-list typed search no longer leaves broad stale catalog content visible during a no-match state
- Product detail now supports premium multi-image galleries, and the bundled fallback catalog now carries `images[]` arrays for all products with gallery depth across a large share of the assortment
- Reviewer-facing docs now reflect current test counts, catalog totals, and local verification commands

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
- Local Android commerce verification passed on 2026-07-06:
  - `npm run verify:e2e-android` → `19 pass / 0 fail`

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
- Local search and ML verification passed on 2026-07-06:
  - `npm run verify:search` → `27/27 passed`
  - `npm run verify:ml` → `16 passed / 0 failed`
  - `npm run verify:emulator` → `7/7 passed`

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
  - `npm run test:scripts` → `21/21 passed`
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

**Still open**

- Cloud parity is still below the local premium baseline:
  - `npm run verify:cloud:all` now fails fast and truthfully because Railway currently exposes `252` products and `0` enriched products, which is below the local realism target
- Audit remaining historical docs for stale narrative that is no longer reviewer-critical but still outdated
- Final umbrella completion should include explicit evidence that local, cloud, and reviewer/demo paths all agree

---

## Next recommended focus

1. Re-run the cloud/Appetize-facing verification ladder after the next build or deploy.
2. Expand automation from happy-path demo coverage into stronger refinement/state-regression coverage on the product list and ML entry points.
3. Finish the remaining documentation drift sweep outside the core reviewer path.
