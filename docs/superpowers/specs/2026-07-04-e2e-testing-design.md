# E2E Testing Design (local-first)

**Date:** 2026-07-04  
**Status:** Implemented (Phase 1)

## Problem

Photo search showed match cards but taps did not open PDP on Android. Existing automation only asserted visibility of "Best matches", not navigation.

## Approach

1. **Fix product bug** — replace nested horizontal `ScrollView` with flex row on HomeScreen.
2. **testID instrumentation** — `{screen}-{element}-{qualifier}` across auth, catalog, cart, checkout, photo.
3. **Maestro flows** — `.maestro/flows/01–05.yaml` with shared login.
4. **Platform helpers** — Android: `e2e-adb.mjs`, `verify-photo-tap.mjs`; iOS: `seed-ios-sim-photos.mjs`, Maestro.
5. **Unified runner** — `npm run verify:e2e-all` with `--android-only` / `--ios-only`.

## Out of scope (Phase 2)

- Maestro Cloud / paid device farms
- macOS GitHub Actions for simulators
- Free GHA: API-only `verify:cloud:all` (see `.github/workflows/api-regression.yml`)

## Critical gate

**F14:** Gallery photo → `photo-match-card-*` or `photo-closest-match` → `pdp-add-to-cart`.

## Multi-simulator

Set `IOS_SIM_UDID` when multiple simulators are booted (e.g. iPhone 17 Pro Max iOS 26.5).
