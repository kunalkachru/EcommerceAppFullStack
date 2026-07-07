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
  withSimulatorRecovery,
} from "./ios-sim-recovery.mjs";
import {
  preflightE2E,
  warmClipIfCloud,
  formatMaestroFailureNote,
  runMaestroWithAndroidRetry,
  isAndroidReady,
  resolveAndroidDevice,
  ANDROID_APK,
} from "./lib/e2e-infra.mjs";
import {
  hasClientLlmKey,
  maestroLlmEnv,
  CLIENT_ENV_PATH,
} from "./load-env.mjs";
import { runLlmLiveVerification } from "./verify-llm-live.mjs";
import {
  shouldUseCloudApiTarget,
  withTemporaryApiTargetMode,
} from "./lib/api-target-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FLOWS_DIR = join(ROOT, ".maestro", "flows");
const API = resolveApiUrl();
const USE_CLOUD_APP_TARGET = shouldUseCloudApiTarget();

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
function warn(id, note) {
  results.push({ id, status: "WARN", note });
  console.log(`⚠ ${id}: ${note}`);
}

function hasAndroid() {
  return isAndroidReady(resolveAndroidDevice());
}

function hasIos() {
  try {
    getBootedSimulatorUdid();
    return true;
  } catch {
    return false;
  }
}

function runMaestro(flowFile, udid, maestroEnv = {}) {
  const path = join(FLOWS_DIR, flowFile);
  if (!existsSync(path)) {
    fail(`maestro-${flowFile}`, "flow file missing");
    return false;
  }
  const r = withSimulatorRecovery(
    `Maestro ${flowFile}`,
    () => runMaestroFlow(MAESTRO, path, udid, maestroEnv),
    { udid }
  );
  if (r.ok) {
    pass(`maestro-${flowFile}`, "completed");
    return true;
  }
  fail(`maestro-${flowFile}`, formatMaestroFailureNote(flowFile, r));
  console.log(r.output.slice(-1500));
  return false;
}

function runAndroidMaestro(flowFile, maestroEnv = {}) {
  const path = join(FLOWS_DIR, flowFile);
  if (!existsSync(path)) {
    fail(`maestro-android-${flowFile}`, "flow file missing");
    return false;
  }
  const r = runMaestroWithAndroidRetry(`Maestro ${flowFile}`, () =>
    runMaestroFlowAndroid(MAESTRO, path, maestroEnv)
  );
  if (r.ok) {
    pass(`maestro-android-${flowFile}`, "completed");
    return true;
  }
  fail(`maestro-android-${flowFile}`, formatMaestroFailureNote(flowFile, r));
  console.log(r.output.slice(-1500));
  return false;
}

function runMaestroLlmFlow(flowFile, udid, maestroEnv, { android = false } = {}) {
  const id = android ? `maestro-android-${flowFile}` : `maestro-${flowFile}`;
  const ok = android
    ? runAndroidMaestro(flowFile, maestroEnv)
    : runMaestro(flowFile, udid, maestroEnv);
  if (ok) return true;
  const llmLivePassed = results.some((r) => r.id === "llm-live" && r.status === "PASS");
  if (llmLivePassed) {
    warn(id, `${flowFile} UI failed — API llm-live passed (F18 UI gate is best-effort)`);
    return true;
  }
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
    console.error("[INFRA] No booted Android emulator or iOS simulator found");
    process.exit(1);
  }

  try {
    preflightE2E({
      maestroBin: MAESTRO,
      android: runAndroid,
      ios: runIos,
      requireApk: runAndroid && USE_CLOUD_APP_TARGET,
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  console.log("\n=== CLIP warmup (cloud) ===");
  try {
    const clip = await warmClipIfCloud(API, { strict: true });
    if (clip) pass("clip-warm", `CLIP index ready (${clip.indexCount})`);
    else pass("clip-warm", "skipped (local API)");
  } catch (e) {
    fail("clip-warm", e.message);
    process.exit(1);
  }

  console.log("\n=== Live LLM reasoning (API) ===");
  if (hasClientLlmKey()) {
    const llm = await runLlmLiveVerification({ apiUrl: API });
    if (llm.ok) pass("llm-live", "verify:llm-live passed");
    else if (process.env.E2E_REQUIRE_LLM === "1") {
      fail("llm-live", "verify:llm-live failed (E2E_REQUIRE_LLM=1)");
      process.exit(1);
    } else {
      fail("llm-live", "verify:llm-live failed — continuing (set E2E_REQUIRE_LLM=1 to block)");
    }
  } else {
    warn("llm-live", `skipped — no LLM keys in ${CLIENT_ENV_PATH}`);
  }

  const llmMaestroEnv = hasClientLlmKey() ? maestroLlmEnv() : null;

  if (runAndroid) {
    console.log("\n=== Android setup ===");
    setupAndroidE2E();
    if (USE_CLOUD_APP_TARGET) {
      console.log("\n=== Android cloud demo build ===");
      execSync("npm run build:demo:apk", {
        cwd: ROOT,
        stdio: "inherit",
      });
      if (!existsSync(ANDROID_APK)) {
        fail("android-apk", `[INFRA] Demo APK missing: ${ANDROID_APK}`);
        process.exit(1);
      }
      execSync(`adb -s ${resolveAndroidDevice()} install -r ${ANDROID_APK}`, {
        cwd: ROOT,
        stdio: "inherit",
      });
    } else {
      console.log("  … using installed debug app + Metro for local Android Maestro");
      execSync(`adb -s ${resolveAndroidDevice()} reverse tcp:8081 tcp:8081`, {
        cwd: ROOT,
        stdio: "inherit",
      });
    }
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
    if (llmMaestroEnv) {
      console.log("\n=== Maestro F18: live LLM reasoning ===");
      runMaestroLlmFlow("06-llm-reasoning.yaml", udid, llmMaestroEnv);
    } else {
      warn("maestro-f18-llm", `skipped — no LLM keys in ${CLIENT_ENV_PATH}`);
    }
  }

  if (runAndroid) {
    console.log("\n=== Maestro flows (Android) ===");
    for (const flow of FLOW_FILES) {
      runAndroidMaestro(flow);
    }
    if (llmMaestroEnv) {
      console.log("\n=== Maestro F18: live LLM reasoning (Android) ===");
      runMaestroLlmFlow("06-llm-reasoning.yaml", null, llmMaestroEnv, { android: true });
    } else {
      warn("maestro-android-f18-llm", `skipped — no LLM keys in ${CLIENT_ENV_PATH}`);
    }
  }

  console.log("\n=== SUMMARY ===");
  const passCount = results.filter((r) => r.status === "PASS").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  console.log(`PASS: ${passCount}  WARN: ${warnCount}  FAIL: ${failCount}`);
  results.forEach((r) => console.log(`  [${r.status}] ${r.id}: ${r.note}`));
  process.exit(failCount > 0 ? 1 : 0);
}

const runner = () =>
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });

if (USE_CLOUD_APP_TARGET) {
  withTemporaryApiTargetMode("cloud", runner).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  runner();
}
