# E2E Test Framework Refactor Design — Phase 1: Core Automation Scripts

**Date:** 2026-07-08  
**Goal (Phase 1):** Fix automation script issues on both platforms and achieve 100% consistent pass rate with a single CLI command to run tests in parallel.

**Scope:** Phase 1 focuses on fixing the core issues occurring today. Comprehensive test expansion and dashboard/monitoring features are Phase 2+ work.

**Architecture:** 
1. **Shared test action library** (`scripts/lib/e2e-test-actions.mjs`) — abstracts field operations, interactions, verification, error recovery for both platforms
2. **Refactored Android scripts** — fix fillTestId(), keyboard management, timing issues
3. **Refactored iOS/Maestro scripts** — remove hideKeyboard, standardize selectors, fix crashes
4. **Simple CLI orchestration** (`npm run e2e:parallel`) — runs both platform tests simultaneously with basic output

**Tech Stack:** Node.js, Maestro, Android ADB

**Future Phases (Phase 2+):**
- Comprehensive test coverage expansion (ML features, edge cases)
- Real-time dashboard with video monitoring
- Advanced reporting and artifacts

---

## Global Constraints (Phase 1)

- Test scripts must use only testID-based selectors where stable IDs exist (no text-based selectors for form fields)
- iOS Maestro flows must NOT use hideKeyboard command (incompatible with React Native custom TextInput)
- Android fillTestId() must hide keyboard AFTER each field to prevent focus bleed
- All tests must include field value verification BEFORE submission
- Error messages must include UI context (screenshot or XML dump) for debugging
- CLI entry point: `npm run e2e:parallel` runs both platforms simultaneously
- Phase 1 scope: Fix existing tests (13 Android + 12 iOS) to 100% pass rate
- No app code changes — only test script improvements

---

## Part 1: Shared Test Action Library

**File:** `scripts/lib/e2e-test-actions.mjs` (NEW)

**Purpose:** Centralized helpers for field operations, interactions, verification, and recovery that work consistently across both platforms.

### Core Abstractions

**Field Operations:**
- `fillField(platform, testId, value, options)` — Fill a field robustly with keyboard management and verification
- `clearField(platform)` — Clear the current field thoroughly (CTRL+A + delete presses)
- `readFieldValue(platform, testId)` — Read current field value with fallback to hint text
- `verifyFieldValue(platform, testId, expectedValue)` — Assert field has correct value, throw detailed error if not

**Interaction Primitives:**
- `tapElement(platform, selector)` — Tap an element and wait for focus/response
- `waitForElement(platform, selector, options)` — Wait for element with timeout and retry
- `scrollToElement(platform, selector)` — Scroll until element is visible
- `dismissKeyboard(platform)` — Hide keyboard with platform-specific approach

**Verification Helpers:**
- `verifyVisible(platform, selector)` — Wait for and verify element is on screen
- `verifyText(platform, text)` — Verify text appears in UI
- `waitForState(platform, checkFn)` — Poll a condition until true or timeout

**Error Recovery:**
- `recoverFromError(platform, errorType)` — Attempt recovery based on known failure patterns
- `dismissPhotoPermissionDialog(platform)` — Handle permission dialogs
- `recoverToHomeScreen(platform)` — Navigate back to authenticated home screen

### Error Reporting

Each function includes:
- Detailed error messages with context (what was expected, what was found)
- Screenshots/UI dumps on critical failures
- Timing information (how long it waited)
- Retry attempt logging

---

## Part 2: Android Implementation (e2e-adb.mjs Refactor)

**Current Issues:**
- fillTestId() combines too many concerns (tap, select, clear, type, hide keyboard) with fragile sequencing
- Keyboard doesn't hide between email and password fields, causing password value to appear in email field
- No verification that field actually received the intended value
- Timing (150-300ms) insufficient; needs 400-600ms between field interactions

**Refactored Approach:**

### Updated fillTestId() (lines 223-257)

Replace the current complex function with cleaner orchestration:

```javascript
export function fillTestId(
  testId,
  value,
  { timeoutMs = 8000, hideKeyboardAfter = false } = {}
) {
  // Step 1: Tap and focus
  tapTestId(testId, { timeoutMs });
  sleep(500);  // Wait for focus

  // Step 2: Verify focus by re-tapping
  const xml = dumpUi();
  const node = findByTestId(xml, testId);
  if (node) {
    tap(node.center.x, node.center.y);
    sleep(200);
  }

  // Step 3: Select all existing text and clear
  selectAllInField();
  sleep(150);
  clearField();
  sleep(200);

  // Step 4: Input new value
  inputText(String(value));
  sleep(400);

  // Step 5: Hide keyboard if requested (CRITICAL for multi-field forms)
  if (hideKeyboardAfter) {
    hideKeyboard();
    sleep(600);  // Wait for keyboard to fully dismiss
  }

  // Step 6: Verify field has correct value
  const afterXml = dumpUi();
  const fieldValue = readFieldTextByTestId(afterXml, testId);
  if (fieldValue !== value) {
    throw new Error(
      `Field ${testId} verification failed: got "${fieldValue}", expected "${value}"`
    );
  }
}
```

### Updated loginIfNeeded() (lines 438-508)

Ensure email field hides keyboard before password entry:

```javascript
export async function loginIfNeeded({
  email = "test@example.com",
  password = "secret123",
} = {}) {
  let xml = dumpUi();
  if (isAuthenticatedShell(xml)) {
    return false;
  }

  // ... screen detection logic ...

  // CRITICAL: Hide keyboard after email, BEFORE password entry
  fillTestId("login-email", email, { hideKeyboardAfter: true });
  sleep(800);  // Extra wait to ensure keyboard fully dismissed

  fillTestId("login-password", password, { hideKeyboardAfter: true });
  sleep(800);

  // Verify both fields before submitting
  const beforeSubmit = dumpUi();
  const emailVal = readFieldTextByTestId(beforeSubmit, "login-email");
  if (emailVal !== email) {
    throw new Error(
      `Email field wrong before submit — got "${emailVal}", expected "${email}"`
    );
  }

  // ... submit login ...
}
```

### Timing Strategy

- Tap → 500ms wait (allow focus to settle)
- Re-tap → 200ms (confirm focus)
- Select all → 150ms
- Clear → 200ms
- Input → 400ms (text entry)
- Hide keyboard → 600ms (keyboard dismiss)
- Between fields → 800ms (full state transition)

---

## Part 3: iOS/Maestro Implementation Refactor

**Current Issues:**
- hideKeyboard command crashes iOS simulator with custom TextInput components
- Selectors mix text-based ("Full Name") and testID-based inconsistently
- Flows lack retry logic when elements aren't found
- No error recovery for flaky automation steps

**Refactored Approach:**

### Updated shared/login-only.yaml

```yaml
appId: ${APP_ID}
---
# Scroll to and find email field
- scrollUntilVisible:
    element:
      id: "login-email"
    direction: DOWN
    timeout: 12000

# Verify email field is visible
- extendedWaitUntil:
    visible:
      id: "login-email"
    timeout: 5000

# Fill email field (tap → doubleTap → erase → input)
- tapOn:
    id: "login-email"
- doubleTapOn:
    id: "login-email"
- eraseText
- inputText: "test@example.com"
# NO hideKeyboard — let it dismiss naturally

# Fill password field
- tapOn:
    id: "login-password"
- doubleTapOn:
    id: "login-password"
- eraseText
- inputText: "secret123"
# NO hideKeyboard

# Submit login
- scrollUntilVisible:
    element:
      id: "login-submit"
    direction: DOWN
    timeout: 10000
- tapOn:
    id: "login-submit"

# Dismiss save password dialog
- runFlow: dismiss-save-password.yaml

# Wait for home screen with optional first attempt
- extendedWaitUntil:
    visible: "Start with how you think"
    timeout: 5000
    optional: true

# Retry dismiss if needed
- runFlow: dismiss-save-password.yaml

# Wait for home screen (final attempt, not optional)
- extendedWaitUntil:
    visible: "Start with how you think"
    timeout: 15000
```

### Updated .maestro/demo-app-flow.yaml

**Pattern:** All form fields and buttons use testID-based selection. Text-based selection only for dynamic content (product names).

```yaml
appId: org.reactjs.native.example.EcommerceAppFullStack
---
- runFlow: shared/login.yaml

# Navigate to products tab
- tapOn:
    id: "tab-products"
- extendedWaitUntil:
    visible: "Narrow search (optional)"
    timeout: 12000

# Browse and select product
- tapOn: "Essence Mascara Lash Princess"
- extendedWaitUntil:
    visible: "Add to Cart"
    timeout: 8000
- tapOn: "Add to Cart"
- runFlow:
    when:
      visible: "OK"
    commands:
      - tapOn: "OK"

# Navigate to cart
- tapOn:
    id: "tab-cart"
- extendedWaitUntil:
    visible: "Proceed to Checkout"
    timeout: 8000
- scrollUntilVisible:
    element: "Proceed to Checkout"
    direction: DOWN
- tapOn: "Proceed to Checkout"

# Fill checkout form using testIDs (consistent pattern)
- tapOn:
    id: "checkout-field-fullname"
- doubleTapOn:
    id: "checkout-field-fullname"
- eraseText
- inputText: "Demo User"

- tapOn:
    id: "checkout-field-address"
- doubleTapOn:
    id: "checkout-field-address"
- eraseText
- inputText: "1 Demo Street"

- tapOn:
    id: "checkout-field-city"
- doubleTapOn:
    id: "checkout-field-city"
- eraseText
- inputText: "Austin"

- tapOn:
    id: "checkout-field-zipcode"
- doubleTapOn:
    id: "checkout-field-zipcode"
- eraseText
- inputText: "78701"

- tapOn:
    id: "checkout-field-phone"
- doubleTapOn:
    id: "checkout-field-phone"
- eraseText
- inputText: "5551234567"

# Select payment method (testID-based)
- scrollUntilVisible:
    element:
      id: "checkout-payment-credit-card"
    direction: DOWN
    timeout: 8000
- tapOn:
    id: "checkout-payment-credit-card"

# Place order (testID-based)
- scrollUntilVisible:
    element:
      id: "checkout-place-order"
    direction: DOWN
    timeout: 8000
- tapOn:
    id: "checkout-place-order"
- extendedWaitUntil:
    visible: "Order Summary"
    timeout: 12000

# View orders
- tapOn:
    id: "tab-orders"
- extendedWaitUntil:
    visible: "Your Orders"
    timeout: 8000
```

**Key changes:**
- Removed ALL hideKeyboard commands
- All form fields use testID selectors (checkout-field-*)
- All buttons use testID selectors (tab-*, checkout-*)
- doubleTapOn + eraseText pattern instead of hideKeyboard
- Optional waits for non-critical dialogs

---

## Part 4: Error Handling & Diagnostics

### Android Enhancements

**Better error messages:**
```javascript
throw new Error(`
  Field ${testId} verification failed
  Expected: "${value}"
  Got: "${fieldValue}"
  UI Context: [XML dump showing surrounding elements]
  Retry: Field may have auto-correct; verify manually
`);
```

**Diagnostic logging:**
```javascript
console.log(`[e2e-adb] Filling field: ${testId} = ${value}`);
console.log(`[e2e-adb] Tapped ${testId}, waiting for focus (500ms)`);
console.log(`[e2e-adb] Clearing field with CTRL+A + delete`);
console.log(`[e2e-adb] Inputting text: ${value}`);
console.log(`[e2e-adb] Hiding keyboard (600ms wait)`);
console.log(`[e2e-adb] ✓ Field ${testId} verified: ${fieldValue}`);
```

**Screenshot on critical failure:**
```javascript
if (testsFailing) {
  screenshot(`failure-${testName}-${Date.now()}`);
  console.log(`Screenshot saved to docs/e2e/failure-*.png`);
}
```

### iOS/Maestro Enhancements

**Improved wait commands:**
```yaml
- extendedWaitUntil:
    visible: "Expected text"
    timeout: 8000
    optional: true  # Don't fail if not found
```

**Error recovery in flows:**
```yaml
- tapOn:
    id: "element-id"
- extendedWaitUntil:
    visible: "expected-state"
    timeout: 5000
    optional: true  # If fails, continue (best effort)
```

---

## Part 5: Phase 1 CLI Orchestration

**File:** `scripts/e2e-parallel.mjs` (NEW entry point)

**Command:** `npm run e2e:parallel` or `npm run e2e:parallel -- --android` or `npm run e2e:parallel -- --ios`

**Workflow:**

```bash
# Run both platforms in parallel (default)
npm run e2e:parallel

# Run Android only
npm run e2e:parallel -- --android

# Run iOS only
npm run e2e:parallel -- --ios

# Run with verbose logging
npm run e2e:parallel -- --verbose
```

**What happens:**

1. **Startup (10 seconds)**
   - Kill any existing test processes
   - Verify emulator/simulator are running
   - Log starting conditions

2. **Parallel Execution (3-5 minutes)**
   - Launch Android test runner in subprocess
   - Launch iOS test runner in subprocess
   - Both run simultaneously
   - Capture output and results from each

3. **Completion (30 seconds)**
   - Wait for both to finish
   - Aggregate results
   - Print summary: PASS/FAIL counts per platform
   - Exit with status 0 (all pass) or 1 (any fail)

**Output:**
```
[e2e-parallel] Starting tests on both platforms...
[android] Running 13 tests...
[ios] Running 12 tests...
[android] ✅ Test 1/13: api-health... PASS
[ios] ✅ Test 1/12: api-health... PASS
...
[android] ✅ Completed: 13/13 PASS
[ios] ✅ Completed: 12/12 PASS
[e2e-parallel] All tests passed! ✅
```

---

## Part 6: Phase 1 Success Criteria

**Current state (Phase 1 baseline):**
- Android: 13 tests, 62% pass rate (8 passing, 5 failing)
- iOS: 12 tests, 83% pass rate (10 passing, 1 failing, 1 warning)

**Target state (Phase 1 completion):**
- Android: 13 tests, 100% pass rate (all 13 passing)
- iOS: 12 tests, 100% pass rate (all 12 passing)
- CLI: Single command runs both platforms in parallel

**Phase 1 Success Verification:**
1. Run `npm run e2e:parallel` command
2. Both Android and iOS tests start simultaneously
3. Console output shows real-time progress
4. Final summary shows:
   - ✅ Android: 13/13 PASS
   - ✅ iOS: 12/12 PASS
5. Exit code 0 (success)
6. Can run multiple times with 100% consistency

**Phase 2+ (Future work, out of Phase 1 scope):**
- Expand test coverage (ML features, edge cases, etc.)
- Add real-time dashboard with video monitoring
- Advanced reporting and artifacts

---

## Phase 1 Implementation Plan

**Task 1: Create Shared Test Library (1-2 days)**
- Create `scripts/lib/e2e-test-actions.mjs` with core abstractions
- Implement: fillField(), tapElement(), waitForElement(), verifyVisible()
- Add error handling and diagnostic logging
- Test with current Android tests

**Task 2: Refactor Android Scripts (1-2 days)**
- Update `scripts/e2e-adb.mjs` fillTestId() with improved sequencing
- Fix `loginIfNeeded()` with hideKeyboardAfter() + timing
- Verify both email and password fields get correct values
- Run Android tests → achieve 100% pass rate

**Task 3: Refactor iOS/Maestro Scripts (1 day)**
- Update `.maestro/shared/login-only.yaml` — remove hideKeyboard
- Update `.maestro/demo-app-flow.yaml` — all testID-based selectors
- Run iOS tests → achieve 100% pass rate

**Task 4: CLI Orchestration (1 day)**
- Create `scripts/e2e-parallel.mjs` entry point
- Add npm script: `npm run e2e:parallel`
- Implement parallel execution of Android + iOS tests
- Aggregate and display results

**Task 5: Verification & Hardening (1 day)**
- Run full test suite 3-5 times → confirm 100% consistency
- Fix any remaining flakes
- Document any workarounds needed

**Timeline:** ~5-7 days for Phase 1 completion

---

## Summary — Phase 1: Core Automation Scripts

This design focuses on **Phase 1: fixing the automation scripts** to achieve 100% pass rate on both platforms with a simple CLI command.

### Phase 1 Deliverables

**1. Shared Test Library** (`scripts/lib/e2e-test-actions.mjs`)
- Unified abstractions for both platforms
- Robust field operations with keyboard management
- Error handling with detailed diagnostics

**2. Fixed Android Scripts** (`scripts/e2e-adb.mjs`)
- ✅ Email/password field confusion → hideKeyboardAfter() + timing (500-600-800ms)
- ✅ Improved keyboard state management
- ✅ Field value verification before submission
- Result: 13/13 tests at 100% pass rate

**3. Fixed iOS/Maestro Scripts** (`.maestro/` flows)
- ✅ Simulator crashes → removed hideKeyboard command
- ✅ Standardized testID-based selectors
- ✅ Proper text selection (doubleTapOn + eraseText pattern)
- Result: 12/12 tests at 100% pass rate

**4. CLI Orchestration** (`scripts/e2e-parallel.mjs`)
- Single command: `npm run e2e:parallel`
- Runs both platforms in parallel
- Aggregates results
- Exit code reflects success/failure

### Phase 1 Success Criteria
- ✅ Android: 13/13 tests passing (100%)
- ✅ iOS: 12/12 tests passing (100%)
- ✅ Consistent pass rate across multiple runs
- ✅ Single CLI command to run everything
- ✅ No app code changes

### Future Phases (Phase 2+, out of scope)
- **Phase 2:** Expand test coverage (ML features, edge cases, comprehensive commerce flows)
- **Phase 3:** Real-time dashboard with video monitoring and reporting
