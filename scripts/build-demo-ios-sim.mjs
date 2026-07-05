#!/usr/bin/env node
/**
 * Build iOS Simulator .app.zip for Appetize (no device signing required).
 * Output: dist/demo/shopease-cloud-demo-ios-sim.zip
 *
 * Requires: Xcode, CocoaPods (pod install), macOS.
 */
import { spawnSync, execSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  statSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { IOS_SIM_ZIP, BUILD_META, DIST_DIR, ROOT } from "./lib/demo-build-paths.mjs";
import { cloudApiBaseUrl } from "./lib/read-cloud-api.mjs";

const SCHEME = "EcommerceAppFullStack";
const WORKSPACE = join(ROOT, "ios", "EcommerceAppFullStack.xcworkspace");
const DERIVED = join(ROOT, "ios", "build", "DemoDerivedData");
const BUNDLE_ID = "org.reactjs.native.example.EcommerceAppFullStack";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: opts.cwd || ROOT, env: process.env, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.platform !== "darwin") {
  console.error("iOS simulator build requires macOS + Xcode.");
  process.exit(1);
}

run("node", ["scripts/assert-cloud-api-target.mjs"]);

if (!existsSync(join(ROOT, "ios", "Pods"))) {
  console.log("\n=== pod install (first time) ===\n");
  run("pod", ["install"], { cwd: join(ROOT, "ios") });
}

rmSync(DERIVED, { recursive: true, force: true });

console.log("\n=== xcodebuild Release iphonesimulator (embeds JS bundle) ===\n");
run("xcodebuild", [
  "-workspace", WORKSPACE,
  "-scheme", SCHEME,
  "-configuration", "Release",
  "-sdk", "iphonesimulator",
  "-derivedDataPath", DERIVED,
  "ONLY_ACTIVE_ARCH=NO",
  "CODE_SIGNING_ALLOWED=NO",
  "build",
]);

const appPath = join(DERIVED, "Build", "Products", "Release-iphonesimulator", `${SCHEME}.app`);
if (!existsSync(appPath)) {
  console.error(`Expected .app at ${appPath}`);
  process.exit(1);
}

mkdirSync(DIST_DIR, { recursive: true });
const zipStaging = join(DIST_DIR, "_ios_staging");
rmSync(zipStaging, { recursive: true, force: true });
mkdirSync(zipStaging, { recursive: true });

const zipBase = join(zipStaging, `${SCHEME}.app`);
run("cp", ["-R", appPath, zipBase]);

rmSync(IOS_SIM_ZIP, { force: true });
execSync(`cd "${zipStaging}" && zip -r -q "${IOS_SIM_ZIP}" "${SCHEME}.app"`, { stdio: "inherit" });
rmSync(zipStaging, { recursive: true, force: true });

const meta = {
  platform: "ios-simulator",
  artifact: "shopease-cloud-demo-ios-sim.zip",
  bundleId: BUNDLE_ID,
  apiBaseUrl: cloudApiBaseUrl(),
  apiTargetMode: "cloud",
  builtAt: new Date().toISOString(),
  sizeBytes: statSync(IOS_SIM_ZIP).size,
  appetize: { platform: "ios", note: "Upload .zip (simulator .app bundle)" },
  browserStack: {
    note: "App Live prefers signed device IPA; use Android APK or build device IPA separately for iOS on BS",
  },
  testLogin: { email: "test@example.com", password: "secret123" },
};
writeFileSync(BUILD_META, JSON.stringify(meta, null, 2));

console.log(`\n✓ iOS sim bundle ready: ${IOS_SIM_ZIP}`);
console.log(`  Size: ${(meta.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`  API: ${meta.apiBaseUrl}`);
console.log("\nNext: npm run upload:appetize -- --platform ios");
console.log("  or upload the zip in Appetize dashboard (iOS → simulator build)\n");
