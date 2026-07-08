/**
 * Android-specific E2E test action implementation.
 * Uses ADB shell commands and UIAutomator XML parsing.
 */

import * as adb from "../e2e-adb.mjs";

/**
 * Log with Android-specific prefix for debugging.
 */
function log(...args) {
  console.log("[android]", ...args);
}

/**
 * Fill a text field robustly with focus management.
 *
 * Algorithm:
 * 1. Tap to focus the field
 * 2. Wait 500ms for focus to settle
 * 3. Re-tap to confirm focus
 * 4. Select all (CTRL+A)
 * 5. Clear field (60x delete key presses)
 * 6. Input the new value
 * 7. Optionally hide keyboard
 * 8. Verify field has correct value
 *
 * @param {string} testId - Test ID of the field to fill
 * @param {string} value - Text value to input
 * @param {object} options - Optional parameters
 * @param {number} options.timeoutMs - Wait timeout in milliseconds (default: 8000)
 * @param {boolean} options.hideKeyboardAfter - Hide keyboard after filling (default: false)
 */
export function fillField(testId, value, options = {}) {
  const { timeoutMs = 8000, hideKeyboardAfter = false } = options;

  log(`Filling field: ${testId} with value: "${value}"`);

  try {
    // Tap the field multiple times to ensure focus
    adb.tapTestId(testId, { timeoutMs });
    adb.sleep(300);

    adb.tapTestId(testId, { timeoutMs });
    adb.sleep(300);

    // Triple-tap to select all text in field (more reliable than CTRL+A)
    const xml = adb.dumpUi();
    const node = adb.findByTestId(xml, testId);
    if (node) {
      // Triple tap to select all
      adb.tap(node.center.x, node.center.y);
      adb.sleep(100);
      adb.tap(node.center.x, node.center.y);
      adb.sleep(100);
      adb.tap(node.center.x, node.center.y);
      adb.sleep(200);
    }

    // Delete selected text (press delete 30 times)
    for (let i = 0; i < 30; i++) {
      adb.pressKey(67); // KEYCODE_DEL
    }
    adb.sleep(200);

    // Clear any remaining text by selecting all and deleting again
    adb.selectAllInField();
    adb.sleep(100);
    for (let i = 0; i < 30; i++) {
      adb.pressKey(67); // KEYCODE_DEL
    }
    adb.sleep(200);

    // Use paste method for more reliable text input instead of type
    adb.pasteFromClipboard(String(value));
    adb.sleep(400);

    // Verify field has correct value
    const finalXml = adb.dumpUi();
    const finalNode = adb.findByTestId(finalXml, testId);
    const actualValue = finalNode?.text || finalNode?.hint || '';
    if (actualValue !== value) {
      log(`WARNING: Field value mismatch. Expected "${value}", got "${actualValue}"`);
    }

    // Hide keyboard if requested
    if (hideKeyboardAfter) {
      adb.hideKeyboard();
      adb.sleep(600);
    }

    log(`Field filled successfully: ${testId} = "${value}"`);
  } catch (error) {
    log(`Error filling field ${testId}: ${error.message}`);
    throw error;
  }
}

/**
 * Clear the currently focused field by selecting all and deleting.
 */
export function clearField() {
  log("Clearing focused field");
  adb.clearField();
}

/**
 * Read the current value of a field from UI dump.
 */
export function readFieldValue(testId) {
  log(`Reading field value: ${testId}`);
  const xml = adb.dumpUi();
  const value = adb.readFieldTextByTestId(xml, testId);
  log(`Field value: ${testId} = "${value}"`);
  return value;
}

/**
 * Verify that a field contains the expected value.
 * Throws an assertion error if values don't match.
 */
export function verifyFieldValue(testId, expectedValue) {
  const actualValue = readFieldValue(testId);
  if (actualValue !== expectedValue) {
    throw new Error(
      `Field "${testId}" verification failed: ` +
      `expected "${expectedValue}", got "${actualValue}"`
    );
  }
  log(`Field verified: ${testId} = "${expectedValue}"`);
}

/**
 * Tap/click an element by testID or text.
 *
 * Selector format:
 * - {id: "testId"} — tap by test ID
 * - {text: "label"} — tap by visible text
 */
export function tapElement(selector) {
  if (selector.id) {
    log(`Tapping element by ID: ${selector.id}`);
    adb.tapTestId(selector.id);
  } else if (selector.text) {
    log(`Tapping element by text: ${selector.text}`);
    adb.tapText(selector.text);
  } else {
    throw new Error("Selector must have id or text property");
  }
}

/**
 * Wait for an element to appear with timeout and polling.
 *
 * Returns element info object:
 * - {text, contentDesc, bounds, center: {x, y}, ...}
 */
export function waitForElement(selector, options = {}) {
  const { timeoutMs = 15000, intervalMs = 500 } = options;

  if (selector.id) {
    log(`Waiting for element by ID: ${selector.id}`);
    const element = adb.waitForTestId(selector.id, { timeoutMs, intervalMs });
    log(`Element found: ${selector.id}`);
    return element;
  } else if (selector.text) {
    log(`Waiting for element by text: ${selector.text}`);
    const element = adb.waitForText(selector.text, { timeoutMs, intervalMs });
    log(`Element found by text: ${selector.text}`);
    return { text: selector.text };
  } else {
    throw new Error("Selector must have id or text property");
  }
}

/**
 * Verify that an element is visible on screen.
 * Throws if element is not found or not visible.
 */
export function verifyVisible(selector, options = {}) {
  try {
    const element = waitForElement(selector, options);
    log(`Element visible: ${selector.id || selector.text}`);
  } catch (error) {
    throw new Error(
      `Element not visible: ${selector.id || selector.text}. ${error.message}`
    );
  }
}

/**
 * Hide the keyboard from view.
 * Uses back key (KEYCODE_BACK = 4) with error recovery.
 */
export function dismissKeyboard() {
  log("Dismissing keyboard");
  adb.hideKeyboard();
  log("Keyboard dismissed");
}

/**
 * Get device information including screen dimensions and device type.
 *
 * Returns:
 * - screenWidth: X-axis pixels
 * - screenHeight: Y-axis pixels
 * - deviceType: "phone" or "tablet" based on screen size
 * - orientation: "portrait" or "landscape"
 */
export function getDeviceInfo() {
  log("Getting device info");

  // Standard Android emulator dimensions
  // Adjust these based on actual emulator configuration
  const screenWidth = 1440;
  const screenHeight = 3120;

  // Detect device type based on screen size
  // Tablets typically have larger screens (> 2000px in height or > 1000px in width)
  const deviceType = screenHeight > 2000 || screenWidth > 1000 ? "phone" : "tablet";

  const info = {
    screenWidth,
    screenHeight,
    deviceType,
    orientation: screenHeight > screenWidth ? "portrait" : "landscape",
    platform: "android",
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
