/**
 * Switch mobile app API target: local Metro + localhost API vs Railway cloud.
 * Cloud host: config/cloud-api.json (shared with verify/build scripts).
 */
import cloudApiConfig from "../../config/cloud-api.json";

export const API_TARGET_MODE = "cloud";

export const CLOUD_API = {
  host: cloudApiConfig.host,
  useHttps: cloudApiConfig.useHttps !== false,
};

export function applyApiTarget() {
  if (API_TARGET_MODE !== "cloud") {
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
