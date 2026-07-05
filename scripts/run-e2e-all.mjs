#!/usr/bin/env node
/**
 * Unified local E2E: API preflight + Android setup + Maestro flows (iOS/Android).
 *
 * Usage:
 *   npm run verify:e2e-all              # both if devices booted
 *   npm run verify:e2e-all -- --android-only
 *   npm run verify:e2e-all -- --ios-only
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveApiUrl } from "./lib/cloud-api-url.mjs";
import { createApiClient, DEFAULT_EMAIL, DEFAULT_PASSWORD } from "./e2e-api-helpers.mjs";
import { setupAndroidE2E } from "./e2e-setup-android.mjs";
import {
  getBootedSimulatorUdid,
  runMaestroFlow,
  runMaestroFlowAndroid,
  dismissSimulatorCrashDialogs,
} from "./ios-sim-recovery.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FLOWS_DIR = join(ROOT, ".maestro", "flows");
const API = resolveApiUrl();

const MAESTRO =
  process.env.MAESTRO_PATH ||
  (existsSync(join(process.env.HOME || "", ".maestro/bin/maestro"))
    ? join(process.env.HOME, ".maestro/bin/maestro")
    : "maestro");

const args = process.argv.slice(2);
const androidOnly = args.includes("--android-only");
const iosOnly = args.includes("--ios-only");

const FLOW_FILES = [
  "01-auth.yaml",
  "02-catalog.yaml",
  "03-cart-checkout.yaml",
  "04-photo-search.yaml",
  "05-voice-llm.yaml",
];

const results = [];

function pass(id, note) {
  results.push({ id, status: "PASS", note });
  console.log(`✓ ${id}: ${note}`);
}
function fail(id, note) {
  results.push({ id, status: "FAIL", note });
  console.log(`✗ ${id}: ${note}`);
}

function hasAndroid() {
  try {
    const out = execSync("adb devices", { encoding: "utf8" });
    return out.split("\n").some((l) => l.includes("device") && !l.includes("List"));
  } catch {
    return false;
  }
}

function hasIos() {
  try {
    getBootedSimulatorUdid();
    return true;
  } catch {
    return false;
  }
}

function runMaestro(flowFile, udid) {
  const path = join(FLOWS_DIR, flowFile);
  if (!existsSync(path)) {
    fail(`maestro-${flowFile}`, "flow file missing");
    return false;
  }
  const r = runMaestroFlow(MAESTRO, path, udid);
  if (r.ok) {
    pass(`maestro-${flowFile}`, "completed");
    return true;
  }
  fail(`maestro-${flowFile}`, `exit ${r.status}`);
  console.log(r.output.slice(-1500));
  return false;
}

function runAndroidPhotoGate() {
  console.log("\n=== Android photo tap gate (adb) ===");
  const r = spawnSync("node", ["scripts/verify-photo-tap.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status === 0) pass("android-photo-tap", "testID tap → PDP");
  else {
    warn(
      "android-photo-tap",
      "verify-photo-tap.mjs failed — Maestro 04-photo-search.yaml is the authoritative F14 gate"
    );
  }
}

async function main() {
  console.log(`=== verify:e2e-all (API: ${API}) ===\n`);

  const { api, login } = createApiClient(API);
  try {
    const health = await api("GET", "/health");
    if (health.ok) pass("api-health", "GET /health");
    else fail("api-health", JSON.stringify(health));
  } catch (e) {
    fail("api-health", e.message);
    process.exit(1);
  }

  const token = await login(DEFAULT_EMAIL, DEFAULT_PASSWORD);
  if (token) pass("credentials", DEFAULT_EMAIL);
  else {
    fail("credentials", "login failed");
    process.exit(1);
  }

  const runAndroid = !iosOnly && hasAndroid();
  const runIos = !androidOnly && hasIos();

  if (!runAndroid && !runIos) {
    console.error("No booted Android emulator or iOS simulator found");
    process.exit(1);
  }

  if (runAndroid) {
    console.log("\n=== Android setup ===");
    setupAndroidE2E();
    execSync(`adb install -r dist/demo/shopease-cloud-demo.apk`, {
      cwd: ROOT,
      stdio: "inherit",
    });
    runAndroidPhotoGate();
  }

  if (runIos) {
    console.log("\n=== iOS setup ===");
    dismissSimulatorCrashDialogs();
    const udid = getBootedSimulatorUdid();
    execSync("node scripts/seed-ios-sim-photos.mjs", { cwd: ROOT, stdio: "inherit" });
    console.log("\n=== Maestro flows (iOS) ===");
    for (const flow of FLOW_FILES) {
      runMaestro(flow, udid);
    }
  }

  if (runAndroid) {
    console.log("\n=== Maestro flows (Android) ===");
    for (const flow of FLOW_FILES) {
      const r = runMaestroFlowAndroid(MAESTRO, join(FLOWS_DIR, flow));
      if (r.ok) pass(`maestro-android-${flow}`, "completed");
      else {
        fail(`maestro-android-${flow}`, `exit ${r.status}`);
        console.log(r.output.slice(-1500));
      }
    }
  }

  console.log("\n=== SUMMARY ===");
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  console.log(`PASS: ${passCount}  FAIL: ${failCount}`);
  results.forEach((r) => console.log(`  [${r.status}] ${r.id}: ${r.note}`));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
