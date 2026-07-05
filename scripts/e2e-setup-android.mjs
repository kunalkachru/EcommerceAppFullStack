#!/usr/bin/env node
/** Android E2E setup: permissions + seeded gallery photos. */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { grantPhotoPermissions, PACKAGE, DEVICE } from "./e2e-adb.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export function setupAndroidE2E() {
  console.log(`=== Android E2E setup (${DEVICE}) ===`);
  try {
    execSync(`adb -s ${DEVICE} get-state`, { encoding: "utf8" });
  } catch {
    throw new Error("No Android device/emulator connected");
  }
  grantPhotoPermissions();
  execSync("npm run seed:emulator-photos", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ADB_DEVICE: DEVICE },
  });
  console.log(`✓ Permissions granted, photos seeded for ${PACKAGE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupAndroidE2E();
}
