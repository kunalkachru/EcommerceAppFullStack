#!/usr/bin/env node
/**
 * Pre-flight for demo APK/IPA builds: app must target Railway cloud API (embedded JS bundle).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readCloudApiConfig, cloudApiBaseUrl } from "./lib/read-cloud-api.mjs";
import { readApiTargetMode } from "./lib/api-target-config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiTargetPath = join(ROOT, "src", "config", "apiTarget.js");

const content = readFileSync(apiTargetPath, "utf8");
const cfg = readCloudApiConfig();
const mode = readApiTargetMode();

if (mode !== "cloud") {
  console.error(
    "Demo build blocked: set config/app-target.json mode to \"cloud\" (or use the temporary cloud wrapper)."
  );
  process.exit(1);
}

const usesSharedConfig =
  content.includes("config/cloud-api.json") &&
  content.includes("config/app-target.json");
if (!usesSharedConfig) {
  console.warn(
    `Warning: apiTarget.js should import config/cloud-api.json and config/app-target.json (host: ${cfg.host}).`
  );
}

console.log(`✓ Cloud API target OK → ${cloudApiBaseUrl(cfg)}`);
console.log("  Release builds embed JS; Metro is not required on Appetize/BrowserStack.");
