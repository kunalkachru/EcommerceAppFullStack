# E2E Test Framework Refactor Design

**Date:** 2026-07-08  
**Goal:** Achieve 100% consistent pass rate on both Android and iOS test suites by building a shared test action library and refactoring test scripts to use consistent patterns.

**Architecture:** Create a shared test action library (`scripts/lib/e2e-test-actions.mjs`) that abstracts field operations, interactions, verification, and error recovery. Both Android (e2e-adb.mjs) and iOS (Maestro YAML flows) will use this library as their unified API, ensuring consistent behavior across platforms.

**Tech Stack:** Node.js (e2e-adb.mjs), Maestro (iOS automation), Android ADB, shared utility library

---

## Global Constraints

- Test scripts must use only testID-based selectors where stable IDs exist (no text-based selectors for form fields)
- iOS Maestro flows must NOT use hideKeyboard command (incompatible with React Native custom TextInput)
- Android fillTestId() must hide keyboard AFTER each field to prevent focus bleed
- All tests must include field value verification BEFORE submission
- Error messages must include UI context (screenshot or XML dump) for debugging
- Current test suite scope: maintain existing tests, improve reliability to 100% pass rate

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

## Part 5: Test Coverage & Success Criteria

**Current state:**
- Android: 8/13 tests passing (62%)
- iOS: 10/12 tests passing (83%)

**Target state:**
- Android: 13/13 tests passing (100%)
- iOS: 12/12 tests passing (100%)

**Verification steps:**
1. Run Android test suite: `npm run e2e:android` → all 13 tests PASS
2. Run iOS test suite: `npm run e2e:ios` → all 12 tests PASS
3. Run both sequentially 3 times → 100% pass rate on all runs (no flakes)
4. Review logs → no warnings or recoveries needed

---

## Migration Plan

**Phase 1: Create shared library**
- Write scripts/lib/e2e-test-actions.mjs with core abstractions
- Export helpers for Android and iOS

**Phase 2: Refactor Android scripts**
- Update e2e-adb.mjs to use new fillField() pattern
- Update loginIfNeeded() with improved timing
- Run Android tests → verify improvement

**Phase 3: Refactor iOS/Maestro flows**
- Update .maestro/shared/login-only.yaml
- Update .maestro/demo-app-flow.yaml
- Remove hideKeyboard, standardize selectors
- Run iOS tests → verify improvement

**Phase 4: Final verification**
- Run full test suite on both platforms
- Verify 100% pass rate
- Document any platform-specific quirks

---

## Summary

This design refactors the E2E test framework to achieve 100% consistent pass rate by:

1. **Creating shared abstractions** that work identically on both platforms
2. **Fixing root causes** (keyboard management, selector fragility, timing)
3. **Adding diagnostics** so failures are easy to debug
4. **Maintaining existing tests** — no changes to test scope, only implementation
5. **Following patterns** that scale — new tests can use the same helpers

The refactor directly addresses the three critical issues:
- ✅ Android email/password confusion → fixed by hideKeyboardAfter() + timing
- ✅ iOS simulator crashes → fixed by removing hideKeyboard
- ✅ Fragile selectors → fixed by testID-based selection pattern
