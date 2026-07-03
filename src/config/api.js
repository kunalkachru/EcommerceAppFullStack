import { Platform } from "react-native";

const DEFAULT_API_PORT = 5001;

/**
 * Optional overrides (set before app loads), e.g. cloud deploy:
 *   global.__API_HOST__ = 'your-app.up.railway.app';
 *   global.__API_USE_HTTPS__ = true;
 *   global.__API_PORT__ = null;  // omit port (HTTPS :443)
 */
export function resolveApiHost() {
  if (typeof global !== "undefined" && global.__API_HOST__) {
    return global.__API_HOST__;
  }
  return Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
}

export function resolveApiScheme() {
  return typeof global !== "undefined" && global.__API_USE_HTTPS__ ? "https" : "http";
}

export function resolveApiPort() {
  if (typeof global !== "undefined" && global.__API_PORT__ !== undefined) {
    return global.__API_PORT__;
  }
  return DEFAULT_API_PORT;
}

/**
 * Host that reaches the machine running Metro + API from the simulator/emulator.
 * - Android emulator: 10.0.2.2 maps to host loopback
 * - iOS simulator: localhost on the Mac
 * - Cloud (Railway/OCI): set __API_HOST__, __API_USE_HTTPS__, __API_PORT__ = null
 */
export function getApiBaseUrl() {
  const scheme = resolveApiScheme();
  const host = resolveApiHost();
  const port = resolveApiPort();
  if (port === null || port === "" || port === 443) {
    return `${scheme}://${host}`;
  }
  return `${scheme}://${host}:${port}`;
}
