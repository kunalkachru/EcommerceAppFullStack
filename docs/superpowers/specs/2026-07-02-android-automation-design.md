# Android Automation Hardening Design

**Date:** 2026-07-02  
**Status:** Implemented  
**Baseline:** `f2b2b859` on `main`

## Goal

Make Android ADB automation trustworthy enough to use as a regression signal, without changing ML/backend product behavior.

## Approach

**testID-first hardening** on the existing ADB/uiautomator stack. Maestro-on-Android evaluation deferred until `verify:emulator` passes reliably.

## App testIDs added

| testID | Component |
|--------|-----------|
| `voice-search-card` | Voice search card container |
| `llm-reasoning-switch` | LLM toggle (Maestro + ADB) |
| `voice-provider-{id}` | Provider chips |
| `voice-api-key-input` | API key field |
| `voice-typed-query-input` | Typed query field |
| `voice-search-button` | Find products button |
| `photo-search-section` | Home photo search card |
| `photo-gallery-button` | Gallery picker |
| `photo-camera-button` | Camera picker |
| `browse-all-products` | Home catalog CTA |
| `tab-home`, `tab-products`, `tab-cart`, `tab-orders`, `tab-profile` | Bottom tabs (existing) |
| `login-email`, `login-password`, `login-submit` | Login (existing) |

## e2e-adb.mjs changes

- Removed unsafe `KEYCODE_PASTE` without clipboard setup from field clear
- Added `clearField`, `setClipboardText`, `pasteFromClipboard` for long/special values
- Added `findByTestId`, `tapTestId`, `waitForTestId`, `waitForText`, `waitForAnyText`
- Added `tapTab(name)` using tab testIDs
- Added shared `loginIfNeeded()` using login testIDs
- Centralized `DEVICE`, `PACKAGE`, `ADB` exports

## Script updates

| Script | npm script | Changes |
|--------|------------|---------|
| `verify-emulator-ml.mjs` | `verify:emulator`, `verify:android-ml` | Tab testIDs, gallery testID, shared login |
| `run-e2e-android.mjs` | `verify:e2e-android` | Current home copy, browse CTA, profile tab fix |
| `verify-nav-session.mjs` | `verify:android-nav` | Browse CTA, home assertion, tab testIDs |
| `record-demo-android.mjs` | `record:demo:android` | LLM/gallery testIDs, clipboard key entry |
| `e2e-cart-flow.mjs` | manual | Browse CTA + tab testIDs |
| `e2e-cart-checkout.mjs` | manual | Tab testIDs |

## Gallery strategy

1. Run `npm run seed:emulator-photos` before ML UI tests
2. Tap `photo-gallery-button` testID
3. Select `ShopEaseTest` / `Pictures` folder in picker hierarchy
4. Assert `Closest match` or `Best matches` with tolerant wait

## Success criteria

- [x] `clearAndType` no longer sends paste without explicit clipboard set
- [x] Stale strings (`Welcome to the E-Commerce App`, `Go to Product List`) removed from scripts
- [x] Tab navigation uses testIDs instead of coordinate math
- [x] npm scripts wired for Android E2E and nav verification
- [x] `verify:emulator` passes 3 consecutive runs on Pixel 7 Pro emulator (2026-07-02, 7/7 each)

## Deferred

Maestro flows for Android (`appId: com.ecommerceappfullstack`) — evaluate after ADB gate is green.
