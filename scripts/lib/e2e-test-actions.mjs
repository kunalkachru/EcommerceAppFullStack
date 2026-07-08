/**
 * Shared E2E test action library for platform abstraction.
 * Routes all test operations to platform-specific handlers (Android/iOS).
 *
 * This is the foundation for unified E2E automation across platforms.
 * Abstracts: field operations, element interaction, verification, device info.
 */

import androidHandler from "./e2e-test-actions-android.mjs";
import iosHandler from "./e2e-test-actions-ios.mjs";

export const PLATFORMS = {
  ANDROID: "android",
  IOS: "ios",
};

/**
 * Get platform-specific handler.
 * @param {string} platform - "android" or "ios"
 * @returns {object} Platform handler with all action methods
 */
export function getPlatformHandler(platform) {
  if (platform === PLATFORMS.ANDROID) {
    return androidHandler;
  } else if (platform === PLATFORMS.IOS) {
    return iosHandler;
  }
  throw new Error(`Unknown platform: ${platform}. Use "android" or "ios".`);
}

/**
 * Fill a text field robustly with focus management and keyboard control.
 *
 * @param {string} platform - "android" or "ios"
 * @param {string} testId - Test ID of the field to fill
 * @param {string} value - Text value to input
 * @param {object} options - Optional parameters
 * @param {number} options.timeoutMs - Wait timeout in milliseconds (default: 8000)
 * @param {boolean} options.hideKeyboardAfter - Hide keyboard after filling (default: false)
 * @returns {void}
 */
export function fillField(platform, testId, value, options = {}) {
  const handler = getPlatformHandler(platform);
  handler.fillField(testId, value, options);
}

/**
 * Clear the currently focused field.
 *
 * @param {string} platform - "android" or "ios"
 * @returns {void}
 */
export function clearField(platform) {
  const handler = getPlatformHandler(platform);
  handler.clearField();
}

/**
 * Read the current value of a field.
 *
 * @param {string} platform - "android" or "ios"
 * @param {string} testId - Test ID of the field
 * @returns {string} Current field value
 */
export function readFieldValue(platform, testId) {
  const handler = getPlatformHandler(platform);
  return handler.readFieldValue(testId);
}

/**
 * Verify that a field contains the expected value.
 *
 * @param {string} platform - "android" or "ios"
 * @param {string} testId - Test ID of the field
 * @param {string} expectedValue - Expected field value
 * @returns {void} Throws if value doesn't match
 */
export function verifyFieldValue(platform, testId, expectedValue) {
  const handler = getPlatformHandler(platform);
  handler.verifyFieldValue(testId, expectedValue);
}

/**
 * Tap/click an element by testID or text.
 *
 * @param {string} platform - "android" or "ios"
 * @param {object} selector - Selector object {id: "testId"} or {text: "label"}
 * @returns {void}
 */
export function tapElement(platform, selector) {
  const handler = getPlatformHandler(platform);
  handler.tapElement(selector);
}

/**
 * Wait for an element to appear with timeout and polling.
 *
 * @param {string} platform - "android" or "ios"
 * @param {object} selector - Selector object {id: "testId"} or {text: "label"}
 * @param {object} options - Optional parameters
 * @param {number} options.timeoutMs - Wait timeout in milliseconds (default: 15000)
 * @param {number} options.intervalMs - Poll interval in milliseconds (default: 500)
 * @returns {object} Element information {id, text, visible, ...}
 */
export function waitForElement(platform, selector, options = {}) {
  const handler = getPlatformHandler(platform);
  return handler.waitForElement(selector, options);
}

/**
 * Verify that an element is visible on screen.
 *
 * @param {string} platform - "android" or "ios"
 * @param {object} selector - Selector object {id: "testId"} or {text: "label"}
 * @param {object} options - Optional parameters
 * @param {number} options.timeoutMs - Wait timeout in milliseconds (default: 15000)
 * @returns {void} Throws if element not visible
 */
export function verifyVisible(platform, selector, options = {}) {
  const handler = getPlatformHandler(platform);
  handler.verifyVisible(selector, options);
}

/**
 * Hide the keyboard from view.
 *
 * @param {string} platform - "android" or "ios"
 * @returns {void}
 */
export function dismissKeyboard(platform) {
  const handler = getPlatformHandler(platform);
  handler.dismissKeyboard();
}

/**
 * Get device information including screen size and device type.
 *
 * @param {string} platform - "android" or "ios"
 * @returns {object} Device info {screenWidth, screenHeight, deviceType, ...}
 */
export function getDeviceInfo(platform) {
  const handler = getPlatformHandler(platform);
  return handler.getDeviceInfo();
}
