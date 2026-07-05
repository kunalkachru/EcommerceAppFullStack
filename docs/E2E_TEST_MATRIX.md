# E2E Test Matrix

**Last updated:** 2026-07-04

Local-only E2E (Android emulator + iOS simulator). All navigation uses **testID** / Maestro `id:` — no coordinate taps.

## Run commands

```bash
npm run build:demo:apk          # Android demo with embedded bundle
npm run seed:emulator-photos    # Android gallery seed
npm run seed:ios-sim-photos     # iOS simulator photos (macOS)
npm run verify:photo-tap        # Android photo → PDP gate
npm run verify:e2e-all          # Full suite (both platforms if booted)
npm run verify:e2e-all:android
npm run verify:e2e-all:ios
```

**Credentials:** `test@example.com` / `secret123`

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
| F17 | Voice typed search | `voice-search-button` → products |
| F18 | LLM (optional) | `llm-reasoning-switch` + local key |
| F19 | Products tab photo | same as F14 |
| F20 | Off-catalog photo | outcome banner + tappable matches |

## Maestro flows

| File | Covers |
|------|--------|
| `.maestro/flows/01-auth.yaml` | F01, F02, F12 |
| `.maestro/flows/02-catalog.yaml` | F04, F05, F07 |
| `.maestro/flows/03-cart-checkout.yaml` | F08–F11 |
| `.maestro/flows/04-photo-search.yaml` | F13–F15 |
| `.maestro/flows/05-voice-llm.yaml` | F17 |

## testID convention

`{screen\|element}-{qualifier}` — e.g. `photo-match-card-{productId}`, `checkout-field-fullname`.
