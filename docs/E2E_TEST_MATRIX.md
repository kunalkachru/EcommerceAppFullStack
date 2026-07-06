# E2E Test Matrix

**Last updated:** 2026-07-06

Local-only E2E (Android emulator + iOS simulator). Primary run guide: **[LOCAL_RUN.md](./LOCAL_RUN.md)**.

Navigation uses **testID** / Maestro `id:` where possible. F14 gallery pick still uses a coordinate fallback (known flake).

---

## Quick start

```bash
# 1. Boot emulator and/or simulator
# 2. Optional LLM keys: cp src/.env.example src/.env

npm run build:demo:apk          # Android — embedded bundle + cloud API
npm run seed:emulator-photos    # Android gallery seed (F14)
node scripts/seed-ios-sim-photos.mjs   # iOS photos (F14)

# Full suite (recommended)
USE_CLOUD_API=1 npm run verify:e2e-all
USE_CLOUD_API=1 npm run verify:e2e-all:android
USE_CLOUD_API=1 npm run verify:e2e-all:ios
```

**Credentials:** `test@example.com` / `secret123`

**LLM (F18):** requires `OPENAI_API_KEY` and/or `OPENROUTER_API_KEY` in gitignored `src/.env`. API gate `verify:llm-live` is authoritative; F18 UI is best-effort (WARN if API passes).

---

## Scenario matrix

| ID | Feature | Assert (testID / screen) |
|----|---------|--------------------------|
| F01 | Login | `screen-home` |
| F02 | Signup link | `screen-signup` |
| F03 | Tab navigation | `tab-*` → `screen-*` |
| F04 | Browse catalog | `screen-product-list` |
| F05 | Text search | `product-search-input` → results |
| F06 | Category filter | `filter-category-*` |
| F07 | PDP | `pdp-add-to-cart`, `pdp-similar-section` |
| F08 | Add to cart | API cart ≥ 1 |
| F09 | Cart qty + | `cart-qty-plus` → API qty 2 |
| F10 | Checkout | `screen-order-summary` |
| F11 | Orders | `screen-orders` |
| F12 | Logout | `login-email` |
| F13 | Photo → results | `photo-results-section` |
| F14 | **Photo match → PDP** | `photo-match-card-*` → `pdp-add-to-cart` |
| F15 | Closest match → PDP | `photo-closest-match` → `pdp-add-to-cart` |
| F16 | See all photo results | `photo-see-all-results` |
| F17 | Voice typed search (rules) | `voice-search-button` → products |
| F18 | **Live LLM reasoning** | `llm-reasoning-switch` + sticky bar + results |
| F19 | Products tab photo | same as F14 |
| F20 | Off-catalog photo | outcome banner + tappable matches |

### F18 detail (Option A + B)

| Layer | Implementation |
|-------|----------------|
| **Maestro (A)** | `06-llm-reasoning.yaml` — scroll to `voice-search-card`, switch fallback, 90s wait, fallbacks to main search |
| **Product (B)** | `home-scroll`, `voice-llm-sticky-search`, `voice-typed-query-sticky`, `voice-search-button-sticky` |

---

## Maestro flows

| File | Covers |
|------|--------|
| `.maestro/flows/01-auth.yaml` | F01, F02, F12 |
| `.maestro/flows/02-catalog.yaml` | F04, F05, F07 |
| `.maestro/flows/03-cart-checkout.yaml` | F08–F11 |
| `.maestro/flows/04-photo-search.yaml` | F13–F15 |
| `.maestro/flows/05-voice-llm.yaml` | F17 (rules-only, no live LLM key) |
| `.maestro/flows/06-llm-reasoning.yaml` | **F18** (live LLM + sticky search bar) |

Legacy / demo recordings: `demo-app-flow.yaml`, `demo-ml-features.yaml`

---

## testID convention

`{screen|element}-{qualifier}` — e.g. `photo-match-card-{productId}`, `checkout-field-fullname`, `voice-llm-sticky-search`.

---

## Validation log

| Date | Doc |
|------|-----|
| 2026-07-06 | [e2e/validation-2026-07-06.md](./e2e/validation-2026-07-06.md) — F18 PASS iOS + Android |
| 2026-07-05 | [e2e/validation-2026-07-05.md](./e2e/validation-2026-07-05.md) |

See also: [LOCAL_RUN.md](./LOCAL_RUN.md) · [CLOUD_REGRESSION.md](./CLOUD_REGRESSION.md)
