#!/usr/bin/env node
/**
 * Pre-flight for demo APK/IPA builds: app must target Railway cloud API (embedded JS bundle).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readCloudApiConfig, cloudApiBaseUrl } from "./lib/read-cloud-api.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiTargetPath = join(ROOT, "src", "config", "apiTarget.js");

const content = readFileSync(apiTargetPath, "utf8");
const cfg = readCloudApiConfig();

if (!/export const API_TARGET_MODE\s*=\s*["']cloud["']/.test(content)) {
  console.error(
    "Demo build blocked: set API_TARGET_MODE = \"cloud\" in src/config/apiTarget.js"
  );
  process.exit(1);
}

const usesSharedConfig =
  content.includes("config/cloud-api.json") || content.includes(cfg.host);
if (!usesSharedConfig) {
  console.warn(
    `Warning: apiTarget.js should import config/cloud-api.json (host: ${cfg.host}).`
  );
}

console.log(`✓ Cloud API target OK → ${cloudApiBaseUrl(cfg)}`);
console.log("  Release builds embed JS; Metro is not required on Appetize/BrowserStack.");
