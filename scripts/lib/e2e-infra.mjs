/**
 * Local E2E preflight, CLIP warmup, and failure classification (infra vs product).
 * Reuses gate-failure-classifier patterns; used by run-e2e-all / verify:e2e-* runners.
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { classifyGateFailure, shouldRetry } from "./gate-failure-classifier.mjs";
import { ANDROID_APK } from "./demo-build-paths.mjs";
import { resolveApiUrl } from "./cloud-api-url.mjs";

const MIN_CLIP_INDEX = Number(process.env.MIN_CLIP_INDEX || 200);
const E2E_CLIP_WAIT_MS = Number(process.env.E2E_CLIP_WAIT_MS || 120000);
const E2E_CLIP_POLL_MS = Number(process.env.E2E_CLIP_POLL_MS || 5000);
const E2E_STRICT = process.env.E2E_STRICT === "1";
const ANDROID_PACKAGE = "com.ecommerceappfullstack";

/** Maestro / adb / simulator signals not covered by deploy gate classifier. */
const E2E_TRANSIENT_PATTERNS = [
  /SpringBoard quit unexpectedly/i,
  /Simulator quit unexpectedly/i,
  /Unable to launch/i,
  /device offline/i,
  /device not found/i,
  /uiautomator dump/i,
  /Connection refused/i,
  /Search unavailable/i,
  /Analyzing/i,
  /CLIP analysis/i,
  /photo-results-section/i,
  /photo-closest-match/i,
  /Timed out waiting for photo results/i,
];

const E2E_INFRA_BLOCKING_PATTERNS = [
  /\[INFRA\]/i,
  /No booted iOS simulator/i,
  /No Android device/i,
  /Demo APK missing/i,
  /Maestro not found/i,
  /Maestro not installed/i,
  /emulator not booted/i,
  /sys\.boot_completed/i,
];

const E2E_PRODUCT_PATTERNS = [
  /Order Failed/i,
  /pdp-add-to-cart/i,
  /screen-home/i,
  /screen-signup/i,
];

/**
 * @param {string} output
 * @returns {'transient' | 'infra_blocking' | 'product' | 'unknown'}
 */
export function classifyE2EFailure(output) {
  const text = output || "";
  for (const re of E2E_PRODUCT_PATTERNS) {
    if (re.test(text)) return "product";
  }
  for (const re of E2E_INFRA_BLOCKING_PATTERNS) {
    if (re.test(text)) return "infra_blocking";
  }
  const gateKind = classifyGateFailure(text);
  if (gateKind === "blocking") return "product";
  if (gateKind === "transient") return "transient";
  for (const re of E2E_TRANSIENT_PATTERNS) {
    if (re.test(text)) return "transient";
  }
  return "unknown";
}

/**
 * @param {'transient' | 'infra_blocking' | 'product' | 'unknown'} kind
 */
export function shouldRetryE2E(kind, attempt, maxAttempts) {
  if (kind === "product" || kind === "infra_blocking") return false;
  if (E2E_STRICT && kind === "unknown") return false;
  return shouldRetry(kind === "transient" ? "transient" : "unknown", attempt, maxAttempts);
}

/** @returns {'INFRA' | 'PRODUCT' | 'UNKNOWN'} */
export function failureCategoryLabel(kind) {
  if (kind === "transient" || kind === "infra_blocking") return "INFRA";
  if (kind === "product") return "PRODUCT";
  return "UNKNOWN";
}

export function formatMaestroFailureNote(flowFile, result) {
  const kind = classifyE2EFailure(result.output || "");
  const label = failureCategoryLabel(kind);
  return `[${label}] Maestro ${flowFile} exit ${result.status}`;
}

/** Resolve adb serial: ADB_DEVICE or sole online emulator. */
export function resolveAndroidDevice() {
  if (process.env.ADB_DEVICE) return process.env.ADB_DEVICE;
  try {
    const out = execSync("adb devices", { encoding: "utf8" });
    const lines = out
      .split("\n")
      .slice(1)
      .map((l) => l.trim())
      .filter(Boolean);
    const online = lines
      .filter((l) => l.endsWith("\tdevice"))
      .map((l) => l.split("\t")[0]);
    if (online.length === 1) return online[0];
    if (online.length > 1) {
      const preferred = online.find((s) => s.startsWith("emulator-"));
      return preferred || online[0];
    }
  } catch {
    // fall through
  }
  return "emulator-5554";
}

/** True when adb reports device + boot_completed=1. */
export function isAndroidReady(device = resolveAndroidDevice()) {
  try {
    const state = execSync(`adb -s ${device} get-state`, { encoding: "utf8" }).trim();
    if (state !== "device") return false;
    const boot = execSync(`adb -s ${device} shell getprop sys.boot_completed`, {
      encoding: "utf8",
    }).trim();
    return boot === "1";
  } catch {
    return false;
  }
}

export function checkMaestroInstalled(maestroBin) {
  const r = spawnSync(maestroBin, ["--version"], { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(
      `[INFRA] Maestro not found (${maestroBin}). Install: curl -Ls https://get.maestro.mobile.dev | bash`
    );
  }
}

/**
 * @param {{ android?: boolean, ios?: boolean, maestroBin?: string, requireApk?: boolean }} opts
 */
export function preflightE2E(opts = {}) {
  const { android = false, ios = false, maestroBin = "maestro", requireApk = false } = opts;
  if (maestroBin) checkMaestroInstalled(maestroBin);
  if (android) {
    const device = resolveAndroidDevice();
    if (!isAndroidReady(device)) {
      throw new Error(
        `[INFRA] Android emulator not ready (${device}). Boot emulator and wait for sys.boot_completed=1.`
      );
    }
    if (requireApk && !existsSync(ANDROID_APK)) {
      throw new Error(`[INFRA] Demo APK missing: ${ANDROID_APK}. Run: npm run build:demo:apk`);
    }
    process.env.ADB_DEVICE = device;
  }
  if (ios) {
    const out = execSync("xcrun simctl list devices booted", { encoding: "utf8" });
    const matches = [...out.matchAll(/\(([-A-F0-9]{8,})\)\s+\(Booted\)/gi)];
    if (!matches.length) {
      throw new Error("[INFRA] No booted iOS simulator. Start with: npm run ios");
    }
    if (matches.length > 1 && !process.env.IOS_SIM_UDID) {
      console.warn(
        `[INFRA] Multiple booted simulators (${matches.length}); set IOS_SIM_UDID to avoid ambiguity.`
      );
    }
  }
}

/**
 * Poll /api/visual-search/status until CLIP ready or timeout.
 * @returns {Promise<{ modelLoaded: boolean, indexCount: number }>}
 */
export async function waitForClipReady(baseUrl = resolveApiUrl(), options = {}) {
  const maxWaitMs = options.maxWaitMs ?? E2E_CLIP_WAIT_MS;
  const minIndex = options.minIndex ?? MIN_CLIP_INDEX;
  const pollMs = options.pollMs ?? E2E_CLIP_POLL_MS;
  const start = Date.now();
  let last = null;

  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${baseUrl}/api/visual-search/status`);
      if (res.ok) {
        last = await res.json();
        const { modelLoaded, indexCount, indexing } = last;
        process.stdout.write(
          `  … CLIP modelLoaded=${modelLoaded} index=${indexCount} indexing=${indexing}\r`
        );
        if (modelLoaded && indexCount >= minIndex) {
          console.log(`\n✓ CLIP ready (${indexCount} indexed)`);
          return last;
        }
      }
    } catch {
      // transient network — keep polling
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error(
    `[INFRA] CLIP not ready after ${maxWaitMs / 1000}s (last: ${JSON.stringify(last)})`
  );
}

/** CLIP warm when using cloud API — throws on timeout (callers may catch). */
export async function warmClipIfCloud(apiUrl, { strict = true } = {}) {
  const useCloud =
    process.env.USE_CLOUD_API === "1" ||
    process.env.USE_CLOUD_API === "true" ||
    (!apiUrl.includes("127.0.0.1") && !apiUrl.includes("localhost"));
  if (!useCloud) return null;
  try {
    return await waitForClipReady(apiUrl);
  } catch (e) {
    if (strict) throw e;
    console.warn(`⚠ CLIP warmup: ${e.message}`);
    return null;
  }
}

/** Force-stop app, relaunch, brief settle — between Android Maestro retries. */
export function recoverAndroidApp(device = resolveAndroidDevice()) {
  const adb = (cmd) =>
    execSync(`adb -s ${device} ${cmd}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  try {
    adb(`shell am force-stop ${ANDROID_PACKAGE}`);
  } catch {
    // ignore
  }
  execSync("sleep 2");
  try {
    adb(`shell monkey -p ${ANDROID_PACKAGE} -c android.intent.category.LAUNCHER 1`);
  } catch {
    try {
      adb(`shell am start -n ${ANDROID_PACKAGE}/.MainActivity`);
    } catch {
      // best effort
    }
  }
  execSync("sleep 3");
}

/**
 * Run Android Maestro with optional retry on transient/unknown failures.
 * @param {(attempt: number) => { ok: boolean, output: string, status: number }} runOnce
 */
export function runMaestroWithAndroidRetry(label, runOnce, { maxAttempts = 2 } = {}) {
  let lastResult;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      console.log(`\n=== ${label}: Android recovery attempt ${attempt}/${maxAttempts} ===`);
      recoverAndroidApp();
    }
    lastResult = runOnce(attempt);
    if (lastResult.ok) return lastResult;

    const kind = classifyE2EFailure(lastResult.output || "");
    console.warn(`  … ${label} failed (${failureCategoryLabel(kind)} / ${kind})`);
    if (!shouldRetryE2E(kind, attempt, maxAttempts)) break;
  }
  return lastResult;
}

export { ANDROID_APK, E2E_CLIP_WAIT_MS };
