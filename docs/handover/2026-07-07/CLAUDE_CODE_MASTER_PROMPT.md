# Claude Code Master Prompt

Copy-paste the prompt below into a fresh Claude Code session.

```text
You are joining an actively evolving React Native + Express full-stack e-commerce project at:

/Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack

This is not a new build. You are taking over a partially completed luxury-first redesign and verification program for ShopEase. Treat the current worktree as authoritative. Do not assume older repo state, and do not trust stale docs over current code and current verification evidence.

Your first required step is to read these repo-local handoff artifacts completely before proposing or implementing anything:

1. docs/handover/2026-07-07/CARRY_FORWARD_HANDOFF.md
2. docs/handover/2026-07-07/AGENT_HANDOFF_PROMPTS.md
3. docs/handover/2026-07-07/artifacts/ShopEase-Design-Direction-and-Roadmap.md
4. docs/handover/2026-07-07/artifacts/ui-mockup-luxury-flow-ai-comparison.png
5. docs/handover/2026-07-07/HANDOFF_CHECKLIST.md

After that, inspect the current repository and continue from the current state as it exists now.

--------------------------------------------------
PROJECT OVERVIEW
--------------------------------------------------

ShopEase is a React Native mobile commerce app with an Express backend API.

Current product shape:
- React Native mobile app
- Express backend API
- multimodal shopping/search experience:
  - text search
  - voice search
  - LLM-assisted query reasoning
  - CLIP-based visual search
- commerce flows:
  - auth
  - cart
  - checkout
  - lightweight orders
- demo/distribution flows:
  - Railway/cloud API deployment
  - Appetize/browser-based mobile preview
  - BrowserStack support
  - local emulator/simulator demo workflows
  - GitHub Actions / verification scripts / Maestro flows

--------------------------------------------------
PRODUCT NORTH STAR
--------------------------------------------------

The approved design direction is:

- Luxury leads perception
- Flow leads habit
- AI leads outcomes

Interpretation:

- The app should feel premium, calm, intuitive, and fast before it feels technical.
- Addictive behavior should come from speed, low-friction discovery, continuity, and confidence.
- AI/ML should feel powerful through outcomes, not through loud chatbot-first interaction patterns.
- The UI should stay aligned to the approved comparison mockup saved in:
  - docs/handover/2026-07-07/artifacts/ui-mockup-luxury-flow-ai-comparison.png

Visual system intent:

- palette: warm ivory, stone, graphite, espresso, muted champagne, restrained sapphire accent for AI moments
- typography: elegant high-contrast display for hero/editorial moments; clean modern sans for utility
- surfaces: layered cards, soft depth, restrained glow, generous spacing, limited hard dividers
- motion: premium, slow, confident, no gimmicks
- AI presence: ambient by default, explicit only when it shortens decision time or improves confidence

--------------------------------------------------
UMBRELLA GOAL
--------------------------------------------------

Continue the full 4-phase ShopEase roadmap until all phases are actually completed and honestly verified:

1. Core Experience Redesign
2. Ambient AI Presentation Layer
3. Secondary Flow Alignment
4. Trustworthiness + Verification Pass

Do not redefine success around partial progress. The existing handoff docs are status documents, not proof of completion.

--------------------------------------------------
CURRENT LOCAL DIRECTORY / IMPORTANT PATHS
--------------------------------------------------

Workspace root:
- /Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack

Important folders:
- src/                     React Native app
- server/src/              Express API implementation
- __tests__/               Jest tests
- scripts/                 verification + build + automation scripts
- .maestro/                mobile E2E flows
- docs/                    reviewer/developer documentation
- docs/handover/2026-07-07/ current carry-forward package
- .cursor/agents/          specialized Cursor subagents, useful as context even in Claude

Key handoff/design docs:
- docs/handover/2026-07-07/CARRY_FORWARD_HANDOFF.md
- docs/handover/2026-07-07/artifacts/ShopEase-Design-Direction-and-Roadmap.md
- docs/ROADMAP_STATUS.md
- docs/TESTING_STATUS.md
- docs/LOCAL_RUN.md
- docs/APPETIZE_BROWSERSTACK.md
- docs/RAILWAY_DEPLOY.md
- docs/AGENTIC_DEVELOPMENT.md

--------------------------------------------------
CURRENT TRUTHFUL STATUS OF WORK
--------------------------------------------------

What is materially done:

- A luxury-first token layer and shared UI primitives exist.
- Core shopper journey screens are already redesigned:
  - Home
  - Product List / Search
  - Product Detail Page
  - Cart
  - Checkout
- Secondary screens are also visually upgraded:
  - Login
  - Signup
  - Profile
  - Orders
  - Order Summary
- Ambient AI presentation is partially unified across voice, visual search, and product explanation surfaces.
- Similar items navigation was improved and made more reliably tappable.
- Home visual refine / narrow-search flow was improved.
- Product-list no-match stale-state behavior was fixed.
- PDP gallery support was added.
- Catalog realism was improved:
  - richer images[] coverage
  - tracked server/catalog-snapshot.json
  - curated demo-coverage products
- Unit and script-unit coverage are strong and currently green.

What is not fully complete yet:

- final local Android checkout proof is still pending after the latest automation fix
- final local iOS proof is pending
- cloud/Railway catalog parity is pending
- Appetize / BrowserStack / demo-path proof is pending
- some docs currently overstate success and must be re-synced after re-verification

--------------------------------------------------
PHASED ROADMAP STATUS
--------------------------------------------------

Phase 1 — Core Experience Redesign
- largely implemented
- needs final visual audit against the approved mockup
- needs final platform proof on Android + iOS

Phase 2 — Ambient AI Presentation Layer
- substantially implemented
- needs final integration audit across text + voice + image + filters + sort + narrow search

Phase 3 — Secondary Flow Alignment
- implemented visually
- needs final state audit for loading / empty / error / success parity

Phase 4 — Trustworthiness + Verification Pass
- in progress
- strong automated coverage exists
- local mobile proof incomplete
- cloud parity incomplete
- docs truth sync incomplete

--------------------------------------------------
MOST IMPORTANT FILES TO READ
--------------------------------------------------

UI / UX core:
- src/theme/tokens.js
- src/components/LuxuryPrimitives.jsx
- src/screens/HomeScreen.jsx
- src/screens/ProductListScreen.jsx
- src/screens/ProductDetailScreen.jsx
- src/screens/CartScreen.jsx
- src/screens/CheckoutScreen.jsx
- src/screens/LoginScreen.jsx
- src/screens/SignupScreen.js
- src/screens/ProfileScreen.jsx
- src/screens/OrdersScreen.jsx
- src/screens/OrderSummaryScreen.jsx

AI / search / catalog:
- src/components/VoiceSearchCard.jsx
- src/components/VisualSearchCategoryPrompt.jsx
- src/utils/ambientAiNarratives.js
- server/src/catalogService.js
- server/src/catalogMetadata.js
- server/src/demoCoverageProducts.js
- server/catalog-snapshot.json
- src/data/catalog-fallback.json

Automation / verification:
- scripts/run-e2e-android.mjs
- scripts/run-e2e-ios.mjs
- scripts/e2e-adb.mjs
- scripts/lib/android-e2e-ui-helpers.mjs
- scripts/lib/checkout-e2e-form.mjs
- .maestro/flows/07-catalog-search-continuity.yaml

High-signal tests:
- __tests__/ProductListScreen.searchState.test.js
- __tests__/ProductListScreen.discoveryControls.test.js
- __tests__/ProductDetailGallery.test.js
- __tests__/ProductDetailSimilarInteractions.test.js
- __tests__/VisualSearchCategoryPrompt.test.js
- scripts/__tests__/checkout-e2e-form.test.mjs

--------------------------------------------------
IMPLEMENTATION HISTORY / RECENT FIXES
--------------------------------------------------

Recent high-value fixes already made:

1. Similar item tap targets were made reliable.
2. Home visual-search narrowing was made to re-run against the currently selected photo.
3. Typed search no-match state no longer leaves broad stale catalog content visible.
4. Product detail now supports multi-image galleries with thumbnail switching.
5. Catalog snapshot loading now includes tracked server/catalog-snapshot.json for better cloud parity readiness.
6. Android checkout automation was debugged and partially hardened:
   - field persistence helper added
   - retry logic added
   - keyboard/focus behavior investigated
   - latest fix still needs final live emulator proof

--------------------------------------------------
TESTING STRATEGY
--------------------------------------------------

The project must be verified in layers:

Layer 1 — Unit / integration tests
- npm test -- --watchman=false --runInBand --forceExit

Layer 2 — Script-unit verification
- npm run test:scripts

Layer 3 — Local app/search/ML verification
- npm run verify:search
- npm run verify:ml
- npm run verify:emulator

Layer 4 — Local mobile E2E
- npm run verify:e2e-android
- npm run verify:e2e-ios

Layer 5 — Cloud parity
- npm run verify:cloud
- npm run verify:cloud:all

Layer 6 — Demo-path proof
- npm run build:demo:apk
- npm run build:demo:ios-sim
- Appetize / BrowserStack validation after cloud parity is restored

Important rule:

- Do not trust old success counts in docs without rerunning the corresponding gates.

--------------------------------------------------
KNOWN CURRENT TEST TRUTH
--------------------------------------------------

Trusted from the latest handoff session:

- npm test -- --watchman=false --runInBand --forceExit
  - 112/112 passed
- npm run test:scripts
  - 24/24 passed
- node --test scripts/__tests__/checkout-e2e-form.test.mjs
  - 3/3 passed

Not safe to claim without rerun in the current final state:

- npm run verify:e2e-android
- npm run verify:e2e-ios
- npm run verify:search
- npm run verify:ml
- npm run verify:cloud:all

--------------------------------------------------
BIGGEST REMAINING RISKS
--------------------------------------------------

1. Android checkout automation may still be brittle around keyboard dismissal / navigation.
2. iOS proof has not been completed in the final premium state.
3. Railway may still expose lower catalog count / no enrichment compared to local.
4. Docs may contain stale success claims that confuse reviewers or future agents.
5. Catalog realism is improved but not yet truly luxury-grade across all hero products.

--------------------------------------------------
IMMEDIATE EXECUTION ORDER
--------------------------------------------------

Do this in order:

1. Read the handoff docs and inspect the current codebase.
2. Re-run:
   - npm test -- --watchman=false --runInBand --forceExit
   - npm run test:scripts
3. Re-run local mobile proof:
   - npm run verify:e2e-android
   - npm run verify:e2e-ios
4. If Android checkout still fails:
   - continue debugging from:
     - scripts/run-e2e-android.mjs
     - scripts/e2e-adb.mjs
     - scripts/lib/checkout-e2e-form.mjs
   - capture fresh docs/e2e screenshots
   - avoid back-key-based keyboard dismissal if it still pops the screen stack
5. Re-run:
   - npm run verify:search
   - npm run verify:ml
6. Re-run cloud parity:
   - npm run verify:cloud
   - npm run verify:cloud:all
7. After truth is known, update stale docs.
8. Continue final luxury polish only after proof is stable.

--------------------------------------------------
NON-NEGOTIABLE RULES
--------------------------------------------------

- Do not redesign from scratch. Continue from the current worktree.
- Do not drift away from the approved luxury-first visual direction.
- Do not narrow the goal to a smaller “good enough” subset.
- Do not claim completion until:
  - local Android proof is complete
  - local iOS proof is complete
  - cloud parity is complete
  - docs are synchronized to reality
- Preserve working business flows at all costs.
- Treat functionality regressions as P0, even when doing UI refinement.

--------------------------------------------------
FIRST RESPONSE FORMAT
--------------------------------------------------

Your first response after reading should:

1. Confirm you reviewed the handoff docs and mockup.
2. Summarize the real current product baseline.
3. Restate the open risks and unfinished proof areas.
4. Present the exact next verification plan you will execute.

Do not start by proposing a brand new roadmap. Continue the existing one.
```

