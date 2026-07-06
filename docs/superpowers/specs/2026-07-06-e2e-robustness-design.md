# E2E Simulator/Emulator Robustness Design

**Date:** 2026-07-06  
**Status:** Implemented locally (uncommitted pending verification)

## Goal

Make iOS simulator and Android emulator automation fail only on genuine product issues, with intelligent handling of infrastructure/automation failures — without regressing the F14 Maestro gate before demo.

## Approach

Surgical layering (Approach A): new shared `scripts/lib/e2e-infra.mjs` wired into existing runners. No Maestro YAML changes to `04-photo-search.yaml`.

## Components

### `scripts/lib/e2e-infra.mjs`

- **preflightE2E** — Maestro installed, device boot-complete (Android `sys.boot_completed=1`), demo APK exists, iOS sim booted
- **warmClipIfCloud** — Poll `/api/visual-search/status` before photo flows when using Railway
- **classifyE2EFailure** — Extends `gate-failure-classifier.mjs`; labels `[INFRA]` vs `[PRODUCT]`
- **runMaestroWithAndroidRetry** — Force-stop + relaunch + one retry on transient failures
- **resolveAndroidDevice** — Auto-pick sole online emulator when `ADB_DEVICE` unset

### Runner changes

| Script | Changes |
|--------|---------|
| `run-e2e-all.mjs` | Preflight, CLIP warm, iOS `withSimulatorRecovery`, Android retry wrapper, APK check |
| `run-e2e-ios.mjs` | Preflight, CLIP warm, photo seed before ML demo, classified failure notes |
| `run-e2e-android.mjs` | Preflight (no Maestro), CLIP warm |
| `e2e-api-helpers.mjs` | Auto-register demo user on cloud 401 (parity with `verify-cloud-api.mjs`) |

## Env knobs

- `E2E_CLIP_WAIT_MS` — default 120000 (local E2E vs 900000 deploy gate)
- `E2E_STRICT=1` — no retry on unknown Maestro failures
- `IOS_SIM_AUTO_RECOVER=1` — iOS sim reboot retry (existing)
- `ADB_DEVICE` — explicit Android target

## Non-changes (regression guardrails)

- `04-photo-search.yaml` F14 assertion chain unchanged
- adb photo gate remains WARN-only in `run-e2e-all`
- No new CI runners

## Verification results (2026-07-06, uncommitted)

| Check | Result |
|-------|--------|
| `npm test` | 85/85 PASS |
| `verify:secrets-policy` | PASS |
| `verify:cloud:all` | PASS |
| `verify:e2e-all:ios` (cloud) | 4/5 Maestro PASS; F14 `[INFRA]` fail (gallery coordinate) |
| `verify:e2e-all:android` (cloud) | 4/5 Maestro PASS; F14 fail; adb gate WARN |
| `verify:e2e-ios:cloud` | PASS (commerce + ML WARN optional) |
| iOS sim recovery | Observed on F14 failure (reboot + retry) |
| Android Maestro retry | Classifier routes photo timeout to transient |

## Known remaining flake

F14 (`04-photo-search.yaml`) fails when gallery coordinate tap `17%,60%` does not select a catalog photo — pre-existing, not introduced by hardening. Maestro remains authoritative gate; adb gate stays WARN.

## Post-demo backlog

- `record:demo:*` recovery + photo seed
- Replace gallery coordinate tap if picker testID available
