# Agent Handoff Prompts

Use this file to transfer the ShopEase work to **Cursor** or **Claude Code** without losing context.

Workspace root:

- `/Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack`

Read these first:

1. [CARRY_FORWARD_HANDOFF.md](/Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack/docs/handover/2026-07-07/CARRY_FORWARD_HANDOFF.md)
2. [artifacts/ShopEase-Design-Direction-and-Roadmap.md](/Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack/docs/handover/2026-07-07/artifacts/ShopEase-Design-Direction-and-Roadmap.md)
3. [artifacts/ui-mockup-luxury-flow-ai-comparison.png](/Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack/docs/handover/2026-07-07/artifacts/ui-mockup-luxury-flow-ai-comparison.png)

---

## Universal Prompt

```text
You are taking over an actively evolving React Native + Express full-stack e-commerce project at:

/Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack

This is a local-first continuation of an already-advanced redesign and verification effort. Do not restart from older assumptions, and do not trust stale docs over current repo truth.

Your first required step is to read these repo-local handoff artifacts completely:

1. docs/handover/2026-07-07/CARRY_FORWARD_HANDOFF.md
2. docs/handover/2026-07-07/artifacts/ShopEase-Design-Direction-and-Roadmap.md
3. docs/handover/2026-07-07/artifacts/ui-mockup-luxury-flow-ai-comparison.png

Then inspect the current codebase and continue from the current worktree exactly as it exists.

## Product north star

The approved design direction is:
- Luxury leads perception
- Flow leads habit
- AI leads outcomes

The app should feel premium, calm, intuitive, and fast before it feels technical. AI/ML should feel powerful through relevance, refinement, confidence, and visual/voice shortcuts, not through a chat-first wrapper.

## Umbrella objective

Continue the full 4-phase ShopEase roadmap until all phases are actually complete and honestly verified:

1. Core Experience Redesign
2. Ambient AI Presentation Layer
3. Secondary Flow Alignment
4. Trustworthiness + Verification Pass

Do not redefine success around partial progress. Treat the current handoff doc as the latest truthful status, not the finish line.

## Important constraints

- Preserve working business flows: auth, browse, text search, voice search, image search, filters, sort, narrow search, PDP, similar items, cart, checkout, orders.
- UI refinement is primary, but product functionality regressions are P0.
- Prefer repo truth over README/doc claims.
- Distinguish clearly between production-ready, demo-only, local-only, cloud-ready-but-unproven, trustworthy automation, and brittle automation.
- Local-first proof is required before claiming completion.
- Do not remove the luxury-first direction or drift toward generic UI.

## Current truthful status at handoff

- The premium redesign is materially implemented across the core shopping journey.
- Similar item taps, photo-based refinement continuity, stale no-match search state, and PDP gallery support have all been improved.
- Catalog realism is materially better, with richer `images[]` coverage and tracked `server/catalog-snapshot.json`.
- Jest and script-unit coverage are currently green.
- Final Android checkout proof is still pending after recent automation fixes.
- iOS local proof is still pending.
- Cloud/Railway parity is still pending.
- Several docs overstate success and need updating after re-verification.

## Your first execution order

1. Read the handoff docs and inspect the current worktree.
2. Re-run the highest-value local proof gates first:
   - npm test -- --watchman=false --runInBand --forceExit
   - npm run test:scripts
   - npm run verify:e2e-android
   - npm run verify:e2e-ios
3. If Android checkout still fails, continue root-cause debugging from:
   - scripts/run-e2e-android.mjs
   - scripts/e2e-adb.mjs
   - scripts/lib/checkout-e2e-form.mjs
4. After local proof stabilizes, re-run cloud parity:
   - npm run verify:cloud
   - npm run verify:cloud:all
5. Then refresh docs to match actual truth.

## Files you must pay attention to

UI / UX:
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

Automation / E2E:
- scripts/run-e2e-android.mjs
- scripts/run-e2e-ios.mjs
- scripts/e2e-adb.mjs
- scripts/lib/android-e2e-ui-helpers.mjs
- scripts/lib/checkout-e2e-form.mjs
- .maestro/flows/07-catalog-search-continuity.yaml

Tests:
- __tests__/ProductListScreen.searchState.test.js
- __tests__/ProductListScreen.discoveryControls.test.js
- __tests__/ProductDetailGallery.test.js
- __tests__/ProductDetailSimilarInteractions.test.js
- __tests__/VisualSearchCategoryPrompt.test.js
- scripts/__tests__/checkout-e2e-form.test.mjs

## Non-negotiable behavior

- Do not claim the 4-phase goal is complete unless local mobile proof, cloud parity, and doc sync are all actually verified.
- Do not trust stale success counts in docs without rerunning the gates.
- Keep the copied mockup image and roadmap brief as the design anchor.
- Keep working until either the umbrella goal is completed or a concrete external blocker is reached.
```

---

## Cursor Prompt

```text
Use this repository:

/Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack

Take over the ShopEase luxury-first redesign + verification program from a prior agent that is out of credits.

Before doing anything else, read:

- docs/handover/2026-07-07/CARRY_FORWARD_HANDOFF.md
- docs/handover/2026-07-07/AGENT_HANDOFF_PROMPTS.md
- docs/handover/2026-07-07/artifacts/ShopEase-Design-Direction-and-Roadmap.md
- docs/handover/2026-07-07/artifacts/ui-mockup-luxury-flow-ai-comparison.png

Also read:

- AGENTS.md
- docs/AGENTIC_DEVELOPMENT.md
- .cursor/agents/e2e-testing.md
- .cursor/agents/railway-ops.md
- .cursor/agents/appetize-cicd.md
- .cursor/agents/docs-showcase.md

Your role:

- Continue the 4-phase roadmap to completion.
- Prioritize real product proof over documentation claims.
- Keep the luxury-first visual direction aligned to the approved mockup blend:
  - luxury leads perception
  - flow leads habit
  - AI leads outcomes

Immediate priorities:

1. Run the local verification ladder and re-establish truth.
2. Finish the Android checkout E2E proof.
3. Finish iOS local proof.
4. Reconcile Railway catalog parity.
5. Refresh Appetize / BrowserStack demo confidence.
6. Update stale docs after reruns.

Strong recommendation:

- Use the `e2e-testing` subagent for Android/iOS proof and Maestro coverage.
- Use the `railway-ops` subagent for Railway parity and deploy checks.
- Use the `appetize-cicd` subagent for demo pipeline verification.
- Use the `docs-showcase` subagent after the product truth is known.

Important notes:

- The latest trustworthy repo-local truth is in docs/handover/2026-07-07/CARRY_FORWARD_HANDOFF.md.
- Some docs currently overclaim success, especially around Android E2E and script test counts.
- Do not revert unrelated changes in the dirty worktree.
- Keep moving until the 4-phase goal is actually complete, not just aesthetically improved.
```

---

## Claude Code Prompt

```text
You are taking over a React Native + Express e-commerce project at:

/Users/kunalkachru/Documents/Codex/2026-06-30/i-want-to-set-up-a/work/EcommerceAppFullStack

This is not a greenfield task. A prior agent already implemented a large part of a luxury-first redesign and partial verification pass, but could not finish because of credit limits.

Read these files first and treat them as your handoff package:

1. docs/handover/2026-07-07/CARRY_FORWARD_HANDOFF.md
2. docs/handover/2026-07-07/AGENT_HANDOFF_PROMPTS.md
3. docs/handover/2026-07-07/artifacts/ShopEase-Design-Direction-and-Roadmap.md
4. docs/handover/2026-07-07/artifacts/ui-mockup-luxury-flow-ai-comparison.png

Then inspect the repo and continue execution.

Mission:

Complete the entire 4-phase ShopEase roadmap truthfully:

1. Core Experience Redesign
2. Ambient AI Presentation Layer
3. Secondary Flow Alignment
4. Trustworthiness + Verification Pass

North star:

- Luxury leads perception
- Flow leads habit
- AI leads outcomes

This means:

- the app must feel premium first
- shopper operations must feel easier and more intuitive
- AI/ML must be visible through superior outcomes, not noisy bot UI

Current reality you should assume unless current repo evidence disproves it:

- premium UI direction is substantially implemented
- AI/ML stitching is improved
- catalog realism is improved
- Jest and script-unit tests are green
- Android checkout proof is still the main unfinished local verification issue
- iOS local proof is still pending
- cloud parity is still pending
- docs are partially stale

Your first job after reading is not to redesign from scratch. It is to:

1. verify the current state honestly
2. fix the remaining integration and proof gaps
3. keep the design aligned to the approved mockup
4. update documentation only after the truth is known

Key commands to run first:

- npm test -- --watchman=false --runInBand --forceExit
- npm run test:scripts
- npm run verify:e2e-android
- npm run verify:e2e-ios
- npm run verify:cloud
- npm run verify:cloud:all

Focus especially on:

- scripts/run-e2e-android.mjs
- scripts/e2e-adb.mjs
- scripts/lib/checkout-e2e-form.mjs
- src/screens/HomeScreen.jsx
- src/screens/ProductListScreen.jsx
- src/screens/ProductDetailScreen.jsx
- src/screens/CheckoutScreen.jsx
- src/components/VoiceSearchCard.jsx
- src/components/VisualSearchCategoryPrompt.jsx
- server/src/catalogService.js
- server/catalog-snapshot.json

Rules:

- Do not treat the handoff doc as proof of completion.
- Do not trust stale doc success counts without rerunning them.
- Do not drift away from the approved luxury-first mockup direction.
- Do not narrow the goal to “good enough”.
- Continue until the 4-phase umbrella goal is actually complete and verified.
```

