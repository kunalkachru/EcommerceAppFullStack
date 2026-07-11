#!/usr/bin/env node
/**
 * Build a standalone release APK for Appetize / BrowserStack (JS bundle embedded, cloud API).
 * Output: dist/demo/shopease-cloud-demo.apk
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ANDROID_APK, BUILD_META, DIST_DIR, ROOT } from "./lib/demo-build-paths.mjs";
import { cloudApiBaseUrl, readCloudApiConfig } from "./lib/read-cloud-api.mjs";
import { withTemporaryApiTargetMode } from "./lib/api-target-config.mjs";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

await withTemporaryApiTargetMode("cloud", async () => {
  run("node", ["scripts/assert-cloud-api-target.mjs"]);

  console.log("\n=== Gradle assembleRelease (bundles JS into APK) ===\n");
  // Appetize cloud emulators often run x86_64 — include both for browser demos.
  // Local-only: DEMO_APK_ABIS=arm64-v8a npm run build:demo:apk
  const abis = process.env.DEMO_APK_ABIS || "arm64-v8a,x86_64";
  console.log(`  ABIs: ${abis}\n`);
  run("./gradlew", ["assembleRelease", `-PreactNativeArchitectures=${abis}`], {
    cwd: join(ROOT, "android"),
  });

  const srcApk = join(ROOT, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
  mkdirSync(DIST_DIR, { recursive: true });
  copyFileSync(srcApk, ANDROID_APK);

  const meta = {
    platform: "android",
    artifact: "shopease-cloud-demo.apk",
    applicationId: "com.ecommerceappfullstack",
    apiBaseUrl: cloudApiBaseUrl(),
    apiTargetMode: "cloud",
    signedWith: "debug-keystore (demo only — not Play Store)",
    builtAt: new Date().toISOString(),
    sizeBytes: statSync(ANDROID_APK).size,
    appetize: { platform: "android", note: "Upload dist/demo/shopease-cloud-demo.apk" },
    browserStack: { note: "Upload same APK to App Live" },
    testLogin: { email: "test@example.com", password: "secret123" },
  };
  writeFileSync(BUILD_META, JSON.stringify(meta, null, 2));

  console.log(`\n✓ APK ready: ${ANDROID_APK}`);
  console.log(`  Size: ${(meta.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  API: ${meta.apiBaseUrl}`);
  console.log("\nNext: npm run upload:appetize -- --platform android");
  console.log("  or upload dist/demo/shopease-cloud-demo.apk in Appetize / BrowserStack dashboard\n");
});
