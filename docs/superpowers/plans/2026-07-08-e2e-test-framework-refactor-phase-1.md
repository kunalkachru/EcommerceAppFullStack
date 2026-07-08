# E2E Test Framework Refactor (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix E2E test automation scripts to achieve 100% consistent pass rate (13/13 Android, 12/12 iOS) with a unified CLI command supporting platform-selective execution.

**Architecture:** Build a shared test action library abstracting common operations (field filling, element interaction, verification, error recovery) that both Android and iOS test runners use. Refactor existing test scripts to use this library and fix root causes (keyboard management, hideKeyboard crashes, selector fragility). Add a simple CLI orchestrator that runs both platforms in parallel with optional platform filtering.

**Tech Stack:** Node.js (e2e-adb.mjs, e2e-parallel.mjs), Maestro (iOS automation), Android ADB, YAML (Maestro flows)

## Global Constraints

- No app code changes — only test script improvements
- Shared library must work identically on both Android and iOS
- Selectors must be device-agnostic (support different screen sizes, device types via adaptive logic)
- CLI supports --android, --ios flags in addition to default (run both)
- Phase 1 scope: Fix existing 25 tests to 100% pass rate (no expansion)
- Target pass rate: 13/13 Android, 12/12 iOS, consistently

---

## File Structure

**New Files:**
- `scripts/lib/e2e-test-actions.mjs` — Shared test action library (field ops, interaction, verification)
- `scripts/e2e-parallel.mjs` — CLI orchestrator with platform-selective execution

**Modified Files:**
- `scripts/e2e-adb.mjs` — Refactor to use shared library, fix keyboard/timing issues
- `.maestro/shared/login-only.yaml` — Remove hideKeyboard, fix selectors
- `.maestro/demo-app-flow.yaml` — Standardize testID-based selectors
- `scripts/package.json` — Add "e2e:parallel" npm script

**Test Files:**
- All test execution via existing runners (no new test files, only fixes)

---

## Task 1: Create Shared Test Action Library

**Files:**
- Create: `scripts/lib/e2e-test-actions.mjs`
- Create: `scripts/lib/e2e-test-actions-android.mjs`
- Create: `scripts/lib/e2e-test-actions-ios.mjs`

**Interfaces:**
- Consumes: (none — foundation library)
- Produces: 
  - `fillField(platform, testId, value, options)` → void
  - `clearField(platform)` → void
  - `readFieldValue(platform, testId)` → string
  - `verifyFieldValue(platform, testId, expectedValue)` → void
  - `tapElement(platform, selector)` → void
  - `waitForElement(platform, selector, options)` → object
  - `verifyVisible(platform, selector, options)` → void
  - `dismissKeyboard(platform)` → void
  - `getDeviceInfo(platform)` → {screenWidth, screenHeight, deviceType, ...}

---

- [ ] **Step 1: Create base shared library structure**

Create `scripts/lib/e2e-test-actions.mjs` with exports and platform routing.

- [ ] **Step 2: Implement Android-specific handlers**

Create `scripts/lib/e2e-test-actions-android.mjs` with UIAutomator parsing and ADB command execution.

- [ ] **Step 3: Implement iOS-specific handlers**

Create `scripts/lib/e2e-test-actions-ios.mjs` with Maestro YAML-controlled operations.

- [ ] **Step 4: Run unit tests for library**

Verify library loads correctly with all exports.

- [ ] **Step 5: Commit**

Commit with message: "feat: create shared E2E test action library"

---

## Task 2: Refactor Android Scripts to Use Shared Library

**Files:**
- Modify: `scripts/e2e-adb.mjs` (lines 223-508)

**Interfaces:**
- Consumes: `e2e-test-actions.mjs` exports (fillField, clearField, readFieldValue, verifyFieldValue, etc.)
- Produces: Improved `fillTestId()`, `loginIfNeeded()` with 100% pass rate

---

- [ ] **Step 1: Import shared library and update fillTestId**

Update fillTestId function to delegate to shared library.

- [ ] **Step 2: Update loginIfNeeded to use hideKeyboardAfter parameter**

Fix email/password field separation with keyboard hide after email.

- [ ] **Step 3: Run Android test suite**

Execute `npm run e2e:android` and verify improvements.

- [ ] **Step 4: Verify email/password field fix**

Confirm login test passes without field value confusion.

- [ ] **Step 5: Commit**

Commit with message: "refactor: android scripts to use shared test action library"

---

## Task 3: Refactor iOS/Maestro Scripts

**Files:**
- Modify: `.maestro/shared/login-only.yaml`
- Modify: `.maestro/demo-app-flow.yaml`

**Interfaces:**
- Consumes: (Maestro framework)
- Produces: Standardized, testID-based Maestro flows without hideKeyboard

---

- [ ] **Step 1: Update login-only.yaml to remove hideKeyboard**

Remove hideKeyboard command, use doubleTapOn + eraseText pattern instead.

- [ ] **Step 2: Update demo-app-flow.yaml to use all testID-based selectors**

Standardize all form fields and buttons to testID-based selection.

- [ ] **Step 3: Run iOS test suite**

Execute `npm run e2e:ios` and verify zero crashes.

- [ ] **Step 4: Verify no hideKeyboard crashes**

Confirm app doesn't crash during Maestro automation.

- [ ] **Step 5: Commit**

Commit with message: "refactor: iOS Maestro flows to fix simulator crashes"

---

## Task 4: CLI Orchestration with Platform-Selective Flags

**Files:**
- Create: `scripts/e2e-parallel.mjs`
- Modify: `package.json` (add e2e:parallel script)

**Interfaces:**
- Consumes: `scripts/e2e-adb.mjs`, `.maestro/` flows, underlying test runners
- Produces: CLI command `npm run e2e:parallel [--android | --ios]` with aggregated results

---

- [ ] **Step 1: Create e2e-parallel.mjs orchestrator**

Create orchestrator that runs both platforms in parallel with platform-selective flag support.

- [ ] **Step 2: Make script executable and add to package.json**

Make script executable and add npm script entry.

- [ ] **Step 3: Test CLI with platform flags**

Verify: both, --android only, --ios only, --verbose flags all work.

- [ ] **Step 4: Commit**

Commit with message: "feat: add CLI orchestration with platform-selective flags"

---

## Task 5: Verification, Device-Adaptive Logic, and Hardening

**Files:**
- Modify: `scripts/lib/e2e-test-actions-android.mjs` (add device-adaptive selectors)
- Verify: All tests pass on both platforms
- No new files, integration work

**Interfaces:**
- Consumes: Existing test suites
- Produces: 100% pass rate on 13 Android + 12 iOS tests, robust across device types

---

- [ ] **Step 1: Add device-adaptive selector logic to Android**

Enhance `tapElement()` to handle different device types (phone vs tablet).

- [ ] **Step 2: Verify device info detection works**

Test device detection returns correct screen size, device type.

- [ ] **Step 3: Run full test suite 3 times to verify consistency**

Execute `npm run e2e:parallel` three times, verify 100% pass rate each time.

- [ ] **Step 4: Verify platform-selective flags work**

Test both --android and --ios flags independently.

- [ ] **Step 5: Check logs for any warnings or flakes**

Grep logs for errors, warnings, retries, timeouts.

- [ ] **Step 6: Document test coverage**

Create/update E2E_TESTING_STATUS.md with results and CLI usage.

- [ ] **Step 7: Commit Phase 1 completion**

Commit with message marking Phase 1 complete.

---

## Phase 1 Completion Checklist

- ✅ Task 1: Shared test library created (e2e-test-actions.mjs)
- ✅ Task 2: Android scripts refactored (keyboard management fixed)
- ✅ Task 3: iOS/Maestro scripts refactored (hideKeyboard removed)
- ✅ Task 4: CLI orchestration implemented (platform-selective flags)
- ✅ Task 5: Device-adaptive logic and hardening (100% consistency)

**Result:** Single CLI command (`npm run e2e:parallel`) runs all tests on both platforms with 100% pass rate
