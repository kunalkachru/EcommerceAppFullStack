/**
 * Single source for Railway cloud API host — used by verify scripts and build checks.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "..", "..", "config", "cloud-api.json");

export function readCloudApiConfig() {
  const raw = readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

export function cloudApiBaseUrl(cfg = readCloudApiConfig()) {
  const scheme = cfg.useHttps !== false ? "https" : "http";
  return `${scheme}://${cfg.host}`;
}
