/**
 * iOS-specific E2E test action implementation.
 * Uses Maestro YAML framework for automation.
 *
 * IMPORTANT: iOS operations are controlled at the Maestro YAML level.
 * These functions are placeholders showing [maestro-controlled] for transparency.
 * Actual field filling, tapping, etc. are defined in .maestro/ YAML flows.
 *
 * Do NOT use hideKeyboard on iOS — it causes simulator crashes.
 * Use doubleTapOn + eraseText + inputText pattern instead.
 */

/**
 * Log with iOS-specific prefix for debugging.
 */
function log(...args) {
  console.log("[ios]", ...args);
}

/**
 * Fill a text field (Maestro-controlled).
 *
 * Note: Actual implementation is in .maestro/ YAML flows.
 * This function logs for transparency during test execution.
 */
export function fillField(testId, value, options = {}) {
  const { timeoutMs = 8000, hideKeyboardAfter = false } = options;
  log(`[maestro-controlled] Filling field: ${testId} with value: "${value}"`);
  log(`  - timeoutMs: ${timeoutMs}, hideKeyboardAfter: ${hideKeyboardAfter}`);
}

/**
 * Clear the currently focused field (Maestro-controlled).
 *
 * Note: Use doubleTapOn + eraseText pattern, NOT hideKeyboard.
 */
export function clearField() {
  log(`[maestro-controlled] Clearing focused field`);
}

/**
 * Read the current value of a field (Maestro-controlled).
 *
 * Returns placeholder value since Maestro can't directly read field values.
 * Verification is done through UI inspection in YAML flows.
 */
export function readFieldValue(testId) {
  log(`[maestro-controlled] Reading field value: ${testId}`);
  log("  WARNING: Maestro cannot directly read field values.");
  log("  Verification should be done via visible text in flows.");
  return "[maestro-read-placeholder]";
}

/**
 * Verify that a field contains the expected value (Maestro-controlled).
 *
 * Note: Maestro verifies through visible UI inspection.
 * This function logs the verification intent.
 */
export function verifyFieldValue(testId, expectedValue) {
  log(`[maestro-controlled] Verifying field: ${testId} = "${expectedValue}"`);
  log("  - Maestro checks via waitFor or exists conditions in YAML");
}

/**
 * Tap/click an element by testID or text (Maestro-controlled).
 *
 * Selector format:
 * - {id: "testId"} — tap by test ID
 * - {text: "label"} — tap by visible text
 */
export function tapElement(selector) {
  if (selector.id) {
    log(`[maestro-controlled] Tapping element by ID: ${selector.id}`);
  } else if (selector.text) {
    log(`[maestro-controlled] Tapping element by text: ${selector.text}`);
  } else {
    throw new Error("Selector must have id or text property");
  }
}

/**
 * Wait for an element to appear with timeout and polling (Maestro-controlled).
 *
 * Maestro handles waiting automatically in flows.
 * This function logs the wait intent.
 *
 * Returns element info placeholder.
 */
export function waitForElement(selector, options = {}) {
  const { timeoutMs = 15000, intervalMs = 500 } = options;

  if (selector.id) {
    log(`[maestro-controlled] Waiting for element by ID: ${selector.id}`);
    log(`  - timeoutMs: ${timeoutMs}, intervalMs: ${intervalMs}`);
  } else if (selector.text) {
    log(`[maestro-controlled] Waiting for element by text: ${selector.text}`);
    log(`  - timeoutMs: ${timeoutMs}, intervalMs: ${intervalMs}`);
  } else {
    throw new Error("Selector must have id or text property");
  }

  return {
    id: selector.id || selector.text,
    visible: true,
    platform: "ios",
  };
}

/**
 * Verify that an element is visible on screen (Maestro-controlled).
 *
 * Maestro verifies through exists() and waitFor() conditions.
 * This function logs the verification intent.
 */
export function verifyVisible(selector, options = {}) {
  const { timeoutMs = 15000 } = options;

  if (selector.id) {
    log(`[maestro-controlled] Verifying visible by ID: ${selector.id}`);
  } else if (selector.text) {
    log(`[maestro-controlled] Verifying visible by text: ${selector.text}`);
  } else {
    throw new Error("Selector must have id or text property");
  }

  log(`  - timeoutMs: ${timeoutMs}`);
}

/**
 * Hide the keyboard from view (Maestro-controlled).
 *
 * IMPORTANT: Do NOT use hideKeyboard() on iOS — it causes simulator crashes.
 * Instead, use doubleTapOn + eraseText + inputText pattern in YAML flows.
 *
 * This function logs a warning if called.
 */
export function dismissKeyboard() {
  log("[maestro-controlled] Dismissing keyboard");
  log("  WARNING: Using keyboard dismissal pattern (not hideKeyboard)");
  log("  Pattern: doubleTapOn + eraseText + inputText in YAML flows");
}

/**
 * Get device information including screen size and device type.
 *
 * iPhone 17 Pro Max specs (target device for testing):
 * - Screen: 1290 x 2796 pixels (portrait)
 * - Device type: "phone"
 *
 * These values should match the Maestro simulator configuration.
 */
export function getDeviceInfo() {
  log("Getting device info");

  // iPhone 17 Pro Max dimensions (landscape: 2796 x 1290)
  const screenWidth = 1290;
  const screenHeight = 2796;

  const info = {
    screenWidth,
    screenHeight,
    deviceType: "phone",
    orientation: "portrait",
    platform: "ios",
    device: "iPhone 17 Pro Max",
  };

  log(`Device info: ${JSON.stringify(info)}`);
  return info;
}

export default {
  fillField,
  clearField,
  readFieldValue,
  verifyFieldValue,
  tapElement,
  waitForElement,
  verifyVisible,
  dismissKeyboard,
  getDeviceInfo,
};
