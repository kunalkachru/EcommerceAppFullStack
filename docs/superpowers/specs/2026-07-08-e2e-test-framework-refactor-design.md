# E2E Test Framework Refactor + Comprehensive Automation Dashboard Design

**Date:** 2026-07-08  
**Goal:** Build a complete E2E automation suite covering all functionality and ML features, with 100% consistent pass rate on both platforms, real-time dashboard monitoring, and parallel video recording of automation.

**Architecture:** 
1. **Shared test action library** (`scripts/lib/e2e-test-actions.mjs`) — abstracts field operations, interactions, verification, error recovery for both platforms
2. **Comprehensive test suites** — expand current tests to cover all flows, ML features (visual/voice search, LLM), and edge cases
3. **Real-time dashboard** (`scripts/e2e-dashboard/`) — web UI showing test progress, results, and metrics in real-time
4. **Parallel video recording** — simultaneous capture of Android emulator + iOS simulator during test runs
5. **CLI orchestration** (`npm run e2e:complete`) — triggers parallel test execution on both platforms with dashboard monitoring

**Tech Stack:** Node.js, Maestro, Android ADB, Express.js (dashboard), FFmpeg (video recording), Socket.io (real-time updates)

---

## Global Constraints

- Test scripts must use only testID-based selectors where stable IDs exist (no text-based selectors for form fields)
- iOS Maestro flows must NOT use hideKeyboard command (incompatible with React Native custom TextInput)
- Android fillTestId() must hide keyboard AFTER each field to prevent focus bleed
- All tests must include field value verification BEFORE submission
- Error messages must include UI context (screenshot or XML dump) for debugging
- Comprehensive test suite must cover: core flows (login, checkout), ML features (visual search, voice search, LLM), edge cases, error states
- Real-time dashboard must show: test progress, individual results, video feeds, metrics
- Parallel execution: Both platforms run simultaneously with independent video recording
- CLI must be single command: `npm run e2e:complete` with optional platform filter (--android, --ios, or both)

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

## Part 5: Comprehensive Test Coverage

**Expand test suite from 13+12 tests to comprehensive coverage:**

### Core Flows (Infrastructure)
1. API health check ✓ (existing)
2. Authentication (login/logout) ✓ (existing)
3. Credentials validation ✓ (existing)
4. Cart operations (add/remove/clear) ✓ (existing)

### ML Features (NEW)
5. **Visual Search Flow**
   - Upload photo → verify CLIP index search → verify results
   - Verify visual search category filter works
   
6. **Voice Search Flow**
   - Trigger voice input → verify voice query parser
   - Verify LLM reasoning on voice queries
   
7. **LLM Reasoning** (currently 6 tests, expand to 10+)
   - Text queries (conversational, ambiguous, technical)
   - Voice queries (natural language)
   - Photo queries (CLIP similarity)
   - Verify reasoning chain and confidence scores

### Commerce Flows (Expand existing)
8. **Product Discovery**
   - Browse all products
   - Search by text
   - Filter by category, price, rating
   - Verify consolidation UI works
   
9. **Checkout & Orders**
   - Add product to cart
   - Apply filters
   - Proceed to checkout
   - Fill all form fields
   - Select payment method
   - Place order
   - View order summary

### Edge Cases & Error States (NEW)
10. **Error Handling**
    - Invalid email on login
    - Wrong password
    - Network error recovery
    - Form validation errors
    - Empty cart checkout

11. **State Persistence**
    - Cart persists after logout/login
    - Filters persist across navigation
    - LLM context maintained across queries

### Summary
- **Current:** 13 Android + 12 iOS = 25 total tests
- **Target:** 50+ Android + 50+ iOS = 100+ total comprehensive tests
- **ML Coverage:** 15+ tests covering visual, voice, LLM features
- **Pass Rate:** 100% on all tests, all platforms, consistently

---

## Part 6: Real-Time Dashboard & Monitoring

**File:** `scripts/e2e-dashboard/` (NEW directory)

**Purpose:** Web-based UI showing test execution in real-time with video feeds, progress, and results.

### Dashboard Components

**1. Test Orchestrator (Node.js backend)**
- File: `scripts/e2e-orchestrator.mjs`
- Launches both Android and iOS test runners in parallel
- Collects results from both platforms
- Streams real-time updates to dashboard via Socket.io
- Manages video recording start/stop
- Handles test cleanup and reporting

**2. Dashboard Server (Express.js)**
- File: `scripts/e2e-dashboard/server.js`
- Serves web UI on `http://localhost:3000`
- WebSocket endpoint for real-time updates
- API endpoints for test results, metrics, logs
- Static file serving for videos after test completion

**3. Dashboard UI (React)**
- File: `scripts/e2e-dashboard/ui/`
- **Left panel:** Test progress (current test, pass/fail count, timeline)
- **Center:** Parallel video feeds (Android left, iOS right)
- **Right panel:** Real-time logs, error messages, metrics
- **Bottom:** Overall summary (pass rate, duration, coverage)

**Dashboard updates in real-time:**
```json
{
  "timestamp": "2026-07-08T14:30:45Z",
  "platform": "android",
  "test": "ml-voice-search",
  "status": "running",
  "progress": 45,
  "passCount": 18,
  "failCount": 0,
  "logs": ["Triggering voice input...", "LLM reasoning..."],
  "screenshot": "base64-encoded-or-url"
}
```

### Video Recording Integration

Both platforms record simultaneously:

**Android:**
- Tool: `adb exec-out screenrecord` or FFmpeg
- Output: `docs/e2e/videos/android-{timestamp}.mp4`
- Real-time feed to dashboard via streaming

**iOS:**
- Tool: Maestro built-in recording or FFmpeg
- Output: `docs/e2e/videos/ios-{timestamp}.mp4`
- Real-time feed to dashboard via streaming

**Parallel display:**
- Dashboard shows both videos side-by-side at 30fps
- Synced to same timeline (both start at 00:00)
- User can pause/play/seek either video

---

## Part 7: CLI Orchestration

**File:** `scripts/e2e-complete.mjs` (NEW entry point)

**Command:** `npm run e2e:complete` or `npm run e2e:complete -- --android` or `npm run e2e:complete -- --ios`

**Workflow:**

```bash
# Run on both platforms (default)
npm run e2e:complete

# Run on Android only
npm run e2e:complete -- --android

# Run on iOS only
npm run e2e:complete -- --ios

# Run with verbose logging
npm run e2e:complete -- --verbose

# Run subset of tests
npm run e2e:complete -- --tags ml-features
```

**What happens:**

1. **Startup phase (30 seconds)**
   - Kill any existing test processes
   - Launch emulator/simulator if not running
   - Start dashboard server on http://localhost:3000
   - Start video recording on both platforms

2. **Execution phase (5-10 minutes)**
   - Run comprehensive test suite in parallel
   - Dashboard updates in real-time
   - User watches both platforms executing tests simultaneously
   - Videos stream to browser

3. **Completion phase (1 minute)**
   - Finalize video files
   - Generate test report (pass/fail by category)
   - Display summary in dashboard
   - Save all artifacts to `docs/e2e/`

**Output artifacts:**
- `docs/e2e/results-{timestamp}.json` — detailed test results
- `docs/e2e/report-{timestamp}.html` — HTML report with pass rates by category
- `docs/e2e/videos/android-{timestamp}.mp4` — Android test video
- `docs/e2e/videos/ios-{timestamp}.mp4` — iOS test video
- `docs/e2e/screenshots/` — failure screenshots with annotations

---

## Part 8: Test Coverage & Success Criteria

**Current state:**
- Android: 13 tests (62% pass rate)
- iOS: 12 tests (83% pass rate)
- ML coverage: 6 basic LLM tests

**Target state after refactor:**
- Android: 50+ tests (100% pass rate)
- iOS: 50+ tests (100% pass rate)
- ML coverage: 15+ tests (visual, voice, LLM)
- Dashboard: Real-time monitoring with parallel video
- CLI: Single command orchestration

**Verification steps:**
1. Run `npm run e2e:complete` → dashboard opens at http://localhost:3000
2. Watch both platforms execute tests in real-time
3. Both video feeds display live (or near-live with 2-3s latency)
4. Dashboard shows progress: passing tests count increasing
5. Final report shows:
   - ✅ Android: 50+/50+ PASS
   - ✅ iOS: 50+/50+ PASS
   - ✅ ML Features: 15/15 PASS
   - ✅ Core Flows: 10/10 PASS
   - ✅ Edge Cases: 10/10 PASS
6. Videos available for review in docs/e2e/videos/

---

## Migration & Implementation Plan

**Phase 1: Foundation — Shared Test Library (Days 1-2)**
- Create scripts/lib/e2e-test-actions.mjs with core abstractions
- Export helpers for Android and iOS
- Add logging and error handling utilities
- Verify library works with current tests

**Phase 2: Core Test Refactoring (Days 2-4)**
- Refactor Android e2e-adb.mjs to use new fillField() + timing patterns
- Refactor iOS .maestro/ flows to remove hideKeyboard + standardize selectors
- Run core 25 tests (13 Android + 12 iOS) → verify 100% pass rate
- Document any platform-specific quirks

**Phase 3: Expand Test Coverage (Days 4-6)**
- Add ML feature tests (visual search, voice search, LLM reasoning)
- Add edge case tests (error states, validation, persistence)
- Add comprehensive commerce flow tests
- Target: 50+ tests per platform
- Run all tests → verify 100% pass rate

**Phase 4: Dashboard & Orchestration (Days 6-8)**
- Build e2e-dashboard/server.js (Express backend + Socket.io)
- Build dashboard UI (React, video feeds, progress tracking)
- Implement video recording integration (Android + iOS parallel)
- Create e2e-orchestrator.mjs (parallel test execution)
- Create CLI entry point: npm run e2e:complete

**Phase 5: Integration & Polish (Days 8-10)**
- Connect dashboard to test orchestrator
- Verify real-time updates work
- Test video recording and playback
- Run full e2e:complete flow end-to-end
- Generate comprehensive report and artifacts

**Phase 6: Documentation & Delivery (Days 10-12)**
- Write README for using e2e:complete
- Document test structure and how to add new tests
- Create example test flows
- Final verification: 100% pass rate on both platforms

---

## Summary

This design builds a **complete E2E automation suite** with three major components:

### 1. Robust Test Framework Foundation
- **Shared test library** (e2e-test-actions.mjs) with unified abstractions for both platforms
- **Fixed root causes:**
  - ✅ Android email/password confusion → hideKeyboardAfter() + timing (500-600-800ms)
  - ✅ iOS simulator crashes → removed hideKeyboard command
  - ✅ Fragile selectors → testID-based pattern
- **Result:** 25 core tests at 100% pass rate (13 Android + 12 iOS)

### 2. Comprehensive Test Coverage Expansion
- **ML Features:** 15+ tests covering visual search, voice search, LLM reasoning
- **Commerce Flows:** 10+ tests for discovery, search, filtering, checkout
- **Edge Cases:** 10+ tests for errors, validation, persistence
- **Target:** 50+ tests per platform, 100 total tests, all passing consistently

### 3. Real-Time Automation Dashboard
- **Web UI** (http://localhost:3000) showing live test progress
- **Parallel video feeds** — Android emulator + iOS simulator side-by-side
- **Real-time metrics** — pass count, fail count, test timeline
- **Single command trigger** — `npm run e2e:complete`

### Key Capabilities
1. User clicks or runs one command: `npm run e2e:complete`
2. Dashboard opens showing both emulator/simulator feeds
3. Tests run in parallel on both platforms
4. User watches ALL functionality + ML features execute automatically
5. Final report shows 100% pass rate with video artifacts for review

### Success Definition
- ✅ 100+ comprehensive E2E tests (both platforms)
- ✅ 100% pass rate consistently
- ✅ Real-time dashboard with parallel video monitoring
- ✅ Single CLI command to trigger complete automation
- ✅ User can watch end-to-end testing happen in real-time
