/**
 * Shared cloud API base URL for verify/e2e scripts.
 * Host source: config/cloud-api.json (same as mobile apiTarget.js).
 * Override: API_URL=https://your-app.up.railway.app
 */
import { cloudApiBaseUrl, readCloudApiConfig } from "./read-cloud-api.mjs";

export const DEFAULT_CLOUD_API = cloudApiBaseUrl();

export function resolveApiUrl(fallback = "http://127.0.0.1:5001") {
  return (
    process.env.API_URL ||
    process.env.CLOUD_API_URL ||
    (process.env.USE_CLOUD_API === "1" ? DEFAULT_CLOUD_API : fallback)
  );
}

export { readCloudApiConfig, cloudApiBaseUrl };
