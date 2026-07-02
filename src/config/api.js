import { Platform } from "react-native";

const API_PORT = 5001;

/**
 * Optional override for physical devices or deployed API (set before app loads).
 * Example: global.__API_HOST__ = '192.168.1.10';
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

/**
 * Host that reaches the machine running Metro + API from the simulator/emulator.
 * - Android emulator: 10.0.2.2 maps to host loopback
 * - iOS simulator: localhost on the Mac
 */
export function getApiBaseUrl() {
  return `${resolveApiScheme()}://${resolveApiHost()}:${API_PORT}`;
}
