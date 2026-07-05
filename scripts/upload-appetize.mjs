#!/usr/bin/env node
/**
 * Upload demo build to Appetize.io via REST API.
 *
 * Requires local env (never committed) in src/.env or process env:
 *   APPETIZE_API_TOKEN
 *   APPETIZE_PUBLIC_KEY_ANDROID  (optional — stable URL)
 *   APPETIZE_PUBLIC_KEY_IOS      (optional)
 *
 * Usage:
 *   npm run upload:appetize -- --platform android
 *   npm run upload:appetize -- --platform ios
 *   npm run upload:appetize -- --platform android --note "Railway demo v1"
 *   npm run upload:appetize -- --platform android --public-key abc123  # update in place (CI)
 */
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { ANDROID_APK, IOS_SIM_ZIP } from "./lib/demo-build-paths.mjs";
import { loadAppetizeEnv } from "./load-env.mjs";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const platform = arg("platform");
const note = arg("note") || "ShopEase cloud demo (Railway API)";
const publicKeyArg = arg("public-key");

const envFile = loadAppetizeEnv();
const token = envFile.APPETIZE_API_TOKEN;

if (!token) {
  console.error(
    "Set APPETIZE_API_TOKEN in src/.env or process env (see src/.env.example)."
  );
  console.error("Get token: https://appetize.io/app/settings/api");
  process.exit(1);
}

if (platform !== "android" && platform !== "ios") {
  console.error("Usage: --platform android|ios [--public-key KEY] [--note text]");
  process.exit(1);
}

const publicKey =
  publicKeyArg?.trim() ||
  (platform === "android"
    ? envFile.APPETIZE_PUBLIC_KEY_ANDROID
    : envFile.APPETIZE_PUBLIC_KEY_IOS) ||
  "";

const filePath = platform === "android" ? ANDROID_APK : IOS_SIM_ZIP;
if (!existsSync(filePath)) {
  console.error(`Missing artifact: ${filePath}`);
  console.error(
    platform === "android"
      ? "Run: npm run build:demo:apk"
      : "Run: npm run build:demo:ios-sim"
  );
  process.exit(1);
}

const body = new FormData();
body.append("platform", platform);
body.append("note", note);
body.append("file", new Blob([readFileSync(filePath)]), basename(filePath));

console.log(
  `Uploading ${basename(filePath)} to Appetize (${platform})${publicKey ? ` → update ${publicKey}` : " → new app"}…`
);

const endpoint = publicKey
  ? `https://api.appetize.io/v1/apps/${publicKey}`
  : "https://api.appetize.io/v1/apps";

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "X-API-KEY": token },
  body,
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error("Upload failed:", res.status, text.slice(0, 500));
  process.exit(1);
}

if (!res.ok) {
  console.error("Upload failed:", res.status, data);
  process.exit(1);
}

const returnedKey = data.publicKey || data.public_key || publicKey;
const url = returnedKey ? `https://appetize.io/app/${returnedKey}` : null;

console.log("\n✓ Upload complete");
if (url) console.log(`  Public URL: ${url}`);
if (data.appKey || data.app_key) console.log(`  App key: ${data.appKey || data.app_key}`);
if (!publicKey && returnedKey) {
  console.log(`\n  CI tip: add GitHub secret APPETIZE_PUBLIC_KEY_${platform === "android" ? "ANDROID" : "IOS"}=${returnedKey}`);
}
console.log("\nEmbed (replace PUBLIC_KEY):");
console.log(`  https://appetize.io/embed/${returnedKey || "PUBLIC_KEY"}?device=pixel7&scale=75&autoplay=true`);
console.log("\nSave publicKey in appetize/app-config.json → publicKeys (optional team reference).");
