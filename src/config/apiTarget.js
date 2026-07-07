/**
 * Switch mobile app API target: local Metro + localhost API vs Railway cloud.
 * Cloud host: config/cloud-api.json (shared with verify/build scripts).
 */
import cloudApiConfig from "../../config/cloud-api.json";
import appTargetConfig from "../../config/app-target.json";

export function normalizeApiTargetMode(value) {
  return String(value || "").trim().toLowerCase() === "cloud" ? "cloud" : "local";
}

export const API_TARGET_MODE = normalizeApiTargetMode(appTargetConfig.mode);
export const LOCAL_API_PORT = 5001;

export const CLOUD_API = {
  host: cloudApiConfig.host,
  useHttps: cloudApiConfig.useHttps !== false,
};

export function applyApiTarget() {
  if (API_TARGET_MODE === "local") {
    delete global.__API_HOST__;
    delete global.__API_USE_HTTPS__;
    global.__API_PORT__ = LOCAL_API_PORT;
    global.__SEARCH_RUNTIME__ = "baseline";
    return "local";
  }
  global.__API_HOST__ = CLOUD_API.host;
  global.__API_USE_HTTPS__ = CLOUD_API.useHttps;
  global.__API_PORT__ = null;
  global.__SEARCH_RUNTIME__ = cloudApiConfig.searchRuntime || "baseline";
  return "cloud";
}

export function isCloudApiTarget() {
  return API_TARGET_MODE === "cloud";
}
