/**
 * iOS Simulator recovery for Maestro runs.
 * Handles SpringBoard crash dialogs (macOS host) and sim reboot + retry.
 */
import { execSync, spawnSync } from "node:child_process";

const BUNDLE_ID = "org.reactjs.native.example.EcommerceAppFullStack";

export function getBootedSimulatorUdid() {
  if (process.env.IOS_SIM_UDID) {
    const udid = process.env.IOS_SIM_UDID;
    const out = execSync("xcrun simctl list devices booted", { encoding: "utf8" });
    if (!out.includes(udid)) {
      throw new Error(`IOS_SIM_UDID ${udid} is not booted`);
    }
    return udid;
  }
  const out = execSync("xcrun simctl list devices booted", { encoding: "utf8" });
  const matches = [...out.matchAll(/\(([-A-F0-9]{8,})\)\s+\(Booted\)/gi)];
  if (!matches.length) {
    throw new Error("No booted iOS simulator. Start with: npm run ios");
  }
  if (matches.length > 1) {
    console.warn(
      `Multiple booted simulators; using ${matches[0][1]}. Set IOS_SIM_UDID to pick one.`
    );
  }
  return matches[0][1];
}

/** Best-effort: dismiss Simulator.app crash sheets (SpringBoard quit unexpectedly). */
export function dismissSimulatorCrashDialogs() {
  if (process.env.IOS_DISMISS_SIM_DIALOGS === "0") return false;
  const script = `
    tell application "System Events"
      if not (exists process "Simulator") then return "no-simulator"
      tell process "Simulator"
        repeat with w in windows
          try
            set wt to name of w as text
            if wt contains "SpringBoard" or wt contains "quit unexpectedly" or wt contains "Problem Report" then
              repeat with b in (buttons of w)
                set bt to name of b as text
                if bt is "OK" or bt is "Ignore" then
                  click b
                  return "dismissed"
                end if
              end repeat
            end if
          end try
        end repeat
      end tell
    end tell
    return "none"
  `;
  try {
    const result = execSync(`osascript -e ${JSON.stringify(script)}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (result === "dismissed") {
      console.log("  … dismissed Simulator crash dialog (SpringBoard)");
      return true;
    }
  } catch {
    // Accessibility permission or no dialog — ignore
  }
  return false;
}

export function isSimulatorResponsive(udid = getBootedSimulatorUdid()) {
  try {
    execSync(`xcrun simctl spawn ${udid} launchctl print system 2>/dev/null | head -1`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
}

export function rebootBootedSimulator(deviceName = process.env.IOS_SIM_DEVICE) {
  const udid = getBootedSimulatorUdid();
  console.log(`  … rebooting simulator ${udid}`);
  try {
    execSync(`xcrun simctl shutdown ${udid}`, { stdio: "ignore" });
  } catch {
    // already shut down
  }
  execSync("sleep 2");
  if (deviceName) {
    execSync(`xcrun simctl boot ${JSON.stringify(deviceName)}`, { stdio: "inherit" });
  } else {
    execSync(`xcrun simctl boot ${udid}`, { stdio: "inherit" });
  }
  execSync("sleep 4");
  dismissSimulatorCrashDialogs();
  return getBootedSimulatorUdid();
}

export function launchApp(udid = getBootedSimulatorUdid()) {
  try {
    execSync(`xcrun simctl launch ${udid} ${BUNDLE_ID}`, { stdio: "ignore" });
  } catch {
    // app may already be foreground
  }
}

/**
 * Run fn(); on failure optionally dismiss dialogs, reboot sim, retry once.
 */
export function withSimulatorRecovery(label, fn, { udid, maxAttempts = 2 } = {}) {
  let currentUdid = udid || getBootedSimulatorUdid();
  let lastResult;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      console.log(`\n=== ${label}: recovery attempt ${attempt}/${maxAttempts} ===`);
    }
    dismissSimulatorCrashDialogs();
    lastResult = fn(currentUdid);
    if (lastResult.ok) return { ...lastResult, udid: currentUdid };

    const autoRecover = process.env.IOS_SIM_AUTO_RECOVER !== "0";
    if (!autoRecover || attempt >= maxAttempts) break;

    console.warn(`  … ${label} failed (exit ${lastResult.status}); recovering simulator…`);
    dismissSimulatorCrashDialogs();
    currentUdid = rebootBootedSimulator();
    launchApp(currentUdid);
    execSync("sleep 3");
  }

  return { ...lastResult, udid: currentUdid };
}

export function runMaestroFlow(maestroBin, flowPath, udid, maestroEnv = {}) {
  const env = {
    APP_ID: "org.reactjs.native.example.EcommerceAppFullStack",
    ...maestroEnv,
  };
  const envArgs = Object.entries(env)
    .filter(([, v]) => v != null && v !== "")
    .flatMap(([k, v]) => ["-e", `${k}=${String(v)}`]);

  const result = spawnSync(
    maestroBin,
    ["test", "--platform", "ios", "--udid", udid, ...envArgs, flowPath],
    { encoding: "utf8", env: process.env, cwd: process.cwd() }
  );
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  dismissSimulatorCrashDialogs();
  return { ok: result.status === 0, output, status: result.status ?? 1 };
}

export function runMaestroFlowAndroid(maestroBin, flowPath, maestroEnv = {}) {
  const env = {
    APP_ID: "com.ecommerceappfullstack",
    ...maestroEnv,
  };
  const envArgs = Object.entries(env)
    .filter(([, v]) => v != null && v !== "")
    .flatMap(([k, v]) => ["-e", `${k}=${String(v)}`]);

  const result = spawnSync(
    maestroBin,
    ["test", "--platform", "android", ...envArgs, flowPath],
    { encoding: "utf8", env: process.env, cwd: process.cwd() }
  );
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  return { ok: result.status === 0, output, status: result.status ?? 1 };
}
