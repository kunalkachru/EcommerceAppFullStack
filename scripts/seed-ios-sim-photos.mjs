#!/usr/bin/env node
/**
 * Seed iOS Simulator photo library from docs/test-photos for Maestro gallery flows.
 * Usage: node scripts/seed-ios-sim-photos.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PHOTOS_DIR = join(ROOT, "docs", "test-photos");

function getBootedUdid() {
  const out = execSync("xcrun simctl list devices booted", { encoding: "utf8" });
  const match = out.match(/\(([A-F0-9-]{36})\)\s+\(Booted\)/i);
  if (!match) throw new Error("No booted iOS simulator");
  return match[1];
}

function main() {
  if (process.platform !== "darwin") {
    console.error("iOS photo seed requires macOS");
    process.exit(1);
  }
  const udid = process.env.IOS_SIM_UDID || getBootedUdid();
  if (!existsSync(PHOTOS_DIR)) {
    console.error("Run npm run seed:emulator-photos first to download test images");
    process.exit(1);
  }
  // simctl addmedia rejects .webp (confirmed: exit 133, "File type unsupported").
  // scripts/seed-emulator-photos.mjs converts every sample to .jpg before writing
  // here, so only jpg/png should ever land in this directory.
  const files = readdirSync(PHOTOS_DIR).filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) {
    console.error(`No jpg/png photos found in ${PHOTOS_DIR}. Run npm run seed:emulator-photos first.`);
    process.exit(1);
  }
  console.log(`Seeding ${files.length} photos to simulator ${udid}…`);
  for (const file of files) {
    const path = join(PHOTOS_DIR, file);
    execSync(`xcrun simctl addmedia ${udid} "${path}"`, { stdio: "inherit" });
  }
  console.log("✓ iOS simulator photos seeded");
}

main();
