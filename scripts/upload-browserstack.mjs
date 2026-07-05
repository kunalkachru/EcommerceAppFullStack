#!/usr/bin/env node
/**
 * Upload demo APK to BrowserStack App Live.
 *
 * Requires local env (never committed):
 *   BROWSERSTACK_USERNAME=...
 *   BROWSERSTACK_ACCESS_KEY=...
 *
 * Usage: npm run upload:browserstack
 */
import { readFileSync, existsSync } from "node:fs";
import { ANDROID_APK } from "./lib/demo-build-paths.mjs";
import { loadEnvFile, CLIENT_ENV_PATH } from "./load-env.mjs";

const envFile = loadEnvFile(CLIENT_ENV_PATH);
const user =
  process.env.BROWSERSTACK_USERNAME?.trim() ||
  envFile.BROWSERSTACK_USERNAME?.trim() ||
  "";
const key =
  process.env.BROWSERSTACK_ACCESS_KEY?.trim() ||
  envFile.BROWSERSTACK_ACCESS_KEY?.trim() ||
  "";

if (!user || !key) {
  console.error(
    "Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY in src/.env or process env."
  );
  process.exit(1);
}

if (!existsSync(ANDROID_APK)) {
  console.error(`Missing ${ANDROID_APK} — run npm run build:demo:apk first`);
  process.exit(1);
}

const auth = Buffer.from(`${user}:${key}`).toString("base64");
const body = new FormData();
body.append("file", new Blob([readFileSync(ANDROID_APK)]), "shopease-cloud-demo.apk");

console.log("Uploading APK to BrowserStack App Live…");

const res = await fetch("https://api-cloud.browserstack.com/app-live/upload", {
  method: "POST",
  headers: { Authorization: `Basic ${auth}` },
  body,
});

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("Upload failed:", res.status, data);
  process.exit(1);
}

console.log("\n✓ Upload complete");
console.log(`  app_url: ${data.app_url}`);
console.log("  Open App Live → select uploaded app → test on real devices");
