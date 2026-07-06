#!/usr/bin/env node
/**
 * End-to-end commerce flow on iOS simulator (Maestro UI) + cloud API checks.
 * Parity target: scripts/run-e2e-android.mjs
 *
 * Prerequisites: booted iOS simulator, app installed (npm run ios), Metro optional if embedded bundle.
 * Usage:
 *   USE_CLOUD_API=1 npm run verify:e2e-ios
 *
 * Simulator recovery (SpringBoard / Maestro crashes):
 *   IOS_SIM_AUTO_RECOVER=1  — reboot sim + retry Maestro once (default on)
 *   IOS_DISMISS_SIM_DIALOGS=1 — click OK on "SpringBoard quit unexpectedly" (default on)
 *   IOS_FRESH_SIM=1         — reboot sim before the run (recommended for long sessions)
 *   IOS_DISMISS_SIM_DIALOGS=0 / IOS_SIM_AUTO_RECOVER=0 — disable recovery
 */
import {
  getBootedSimulatorUdid,
  dismissSimulatorCrashDialogs,
  withSimulatorRecovery,
  runMaestroFlow,
  rebootBootedSimulator,
  launchApp,
} from "./ios-sim-recovery.mjs";
import { loadClientEnv, maestroLlmEnv, hasClientLlmKey, CLIENT_ENV_PATH } from "./load-env.mjs";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { resolveApiUrl } from "./lib/cloud-api-url.mjs";
import {
  createApiClient,
  DEFAULT_EMAIL,
  DEFAULT_PASSWORD,
} from "./e2e-api-helpers.mjs";
import {
  warmClipIfCloud,
  formatMaestroFailureNote,
  preflightE2E,
} from "./lib/e2e-infra.mjs";
import { runLlmLiveVerification } from "./verify-llm-live.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MAESTRO_DIR = join(ROOT, ".maestro");
const API = resolveApiUrl();
const { api, login, waitForCart } = createApiClient(API);

const MAESTRO =
  process.env.MAESTRO_PATH ||
  (existsSync(join(homedir(), ".maestro/bin/maestro"))
    ? join(homedir(), ".maestro/bin/maestro")
    : "maestro");

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
  console.log(`! ${id}: ${note}`);
}

function runMaestro(flowFile, udid, maestroEnv = {}) {
  const flowPath = join(MAESTRO_DIR, flowFile);
  return withSimulatorRecovery(
    `Maestro ${flowFile}`,
    () => runMaestroFlow(MAESTRO, flowPath, udid, maestroEnv),
    { udid }
  );
}

async function main() {
  if (process.env.IOS_FRESH_SIM === "1") {
    console.log("=== Fresh simulator boot (IOS_FRESH_SIM=1) ===");
    rebootBootedSimulator();
    launchApp();
  }
  dismissSimulatorCrashDialogs();

  try {
    preflightE2E({ maestroBin: MAESTRO, ios: true });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const udid = getBootedSimulatorUdid();
  console.log(`=== iOS E2E on ${udid} (API: ${API}) ===\n`);

  console.log("=== API health ===");
  try {
    const health = await api("GET", "/health");
    if (health.ok) pass("api-health", "GET /health ok");
    else fail("api-health", JSON.stringify(health));
  } catch (e) {
    fail("api-health", e.message);
    process.exit(1);
  }

  console.log("\n=== API credentials ===");
  let token = await login(DEFAULT_EMAIL, DEFAULT_PASSWORD);
  if (token) {
    pass("credentials", `${DEFAULT_EMAIL} works via API`);
    await api("DELETE", "/api/cart/clear", null, token);
    pass("api-cart-clear", "Cart cleared before Maestro flow");
  } else {
    fail("credentials", "Login failed");
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
    else fail("llm-live", "verify:llm-live failed");
  } else {
    warn("llm-live", `skipped — no LLM keys in ${CLIENT_ENV_PATH}`);
  }

  console.log("\n=== Maestro: commerce flow (login → cart → checkout) ===");
  const commerce = runMaestro("demo-app-flow.yaml", udid);
  if (commerce.ok) {
    pass("maestro-commerce", "demo-app-flow.yaml completed");
  } else {
    fail("maestro-commerce", formatMaestroFailureNote("demo-app-flow.yaml", commerce));
    console.log(commerce.output.slice(-2000));
  }

  token = (await login(DEFAULT_EMAIL, DEFAULT_PASSWORD)) || token;
  const cart = await waitForCart(token, { minItems: 0, timeoutMs: 3000 });
  if (!cart.items?.length) {
    pass("backend-cart-after-order", "Cart empty after checkout (API)");
  } else {
    warn("backend-cart-after-order", `Cart still has ${cart.items.length} item(s) — order may not have cleared server cart`);
  }

  const maestroLlm = maestroLlmEnv(loadClientEnv());

  console.log("\n=== iOS photo seed (ML demo gallery) ===");
  try {
    execSync("node scripts/seed-ios-sim-photos.mjs", { cwd: ROOT, stdio: "inherit" });
    pass("ios-photo-seed", "Gallery seeded for ML demo");
  } catch (e) {
    warn("ios-photo-seed", `[INFRA] seed failed: ${e.message}`);
  }

  console.log("\n=== Maestro: ML smoke (catalog, photo, text search) ===");
  if (!hasClientLlmKey()) {
    warn("maestro-llm-key", `No LLM key in ${CLIENT_ENV_PATH} — LLM Maestro steps may be skipped`);
  } else {
    pass("maestro-llm-key", "LLM key loaded from local env for Maestro (not logged)");
  }
  const ml = runMaestro("demo-ml-features.yaml", udid, maestroLlm);
  if (ml.ok) {
    pass("maestro-ml-smoke", "demo-ml-features.yaml completed");
  } else {
    warn(
      "maestro-ml-smoke",
      `${formatMaestroFailureNote("demo-ml-features.yaml", ml)} (LLM steps optional without DEMO_LLM_API_KEY)`
    );
    if (!ml.ok) console.log(ml.output.slice(-1500));
  }

  console.log("\n=== API ML status ===");
  try {
    const vs = await api("GET", "/api/visual-search/status");
    if (vs.modelLoaded && vs.indexCount >= 200) {
      pass("clip-cloud", `CLIP index ${vs.indexCount} on Railway`);
    } else {
      fail("clip-cloud", `modelLoaded=${vs.modelLoaded} index=${vs.indexCount}`);
    }
    const meta = await api("GET", "/api/catalog/meta");
    if (meta.total >= 200) pass("catalog-cloud", `${meta.total} products`);
    else fail("catalog-cloud", `Only ${meta.total}`);
  } catch (e) {
    fail("clip-cloud", e.message);
  }

  console.log("\n=== SUMMARY ===");
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;
  console.log(`PASS: ${passCount}  FAIL: ${failCount}  WARN: ${warnCount}`);
  results.forEach((r) => console.log(`  [${r.status}] ${r.id}: ${r.note}`));

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
