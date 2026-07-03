/**
 * Switch mobile app API target: local Metro + localhost API vs Railway cloud.
 * Set API_TARGET_MODE to 'cloud' for Phase C cloud regression; 'local' for default dev.
 */
export const API_TARGET_MODE = "cloud";

export const CLOUD_API = {
  host: "cooperative-presence-production-f5d9.up.railway.app",
  useHttps: true,
};

export function applyApiTarget() {
  if (API_TARGET_MODE !== "cloud") {
    return "local";
  }
  global.__API_HOST__ = CLOUD_API.host;
  global.__API_USE_HTTPS__ = CLOUD_API.useHttps;
  global.__API_PORT__ = null;
  global.__SEARCH_RUNTIME__ = "baseline";
  return "cloud";
}

export function isCloudApiTarget() {
  return API_TARGET_MODE === "cloud";
}
