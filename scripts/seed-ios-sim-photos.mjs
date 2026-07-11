#!/usr/bin/env node
/**
 * Seed the iOS Simulator's Photos library from the Phase 2 image-search
 * sample gallery (test-assets/image-search-samples/), converting webp -> jpg
 * (simctl addmedia rejects .webp outright: confirmed empirically -- exit
 * 133, "File type unsupported").
 *
 * Two modes:
 *   node scripts/seed-ios-sim-photos.mjs
 *     Seeds every jpg/png already in docs/test-photos/ (legacy behavior --
 *     that directory is populated by scripts/seed-emulator-photos.mjs).
 *   node scripts/seed-ios-sim-photos.mjs <category>/<file>
 *     Converts and adds exactly that one sample. The simulator's Photos
 *     library sorts newest-first, so the seeded sample reliably lands in
 *     the picker's first (top-left) grid cell regardless of how many other
 *     photos (the simulator's stock defaults) already exist -- there's no
 *     simctl equivalent of "clear the photo library" to start from zero.
 *
 * Usage: node scripts/seed-ios-sim-photos.mjs [category/file]
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "server", "package.json"));
const sharp = require("sharp");

const SAMPLES_DIR = join(ROOT, "test-assets", "image-search-samples");
const MANIFEST_PATH = join(SAMPLES_DIR, "manifest.json");
const PHOTOS_DIR = join(ROOT, "docs", "test-photos");

function getBootedUdid() {
  const out = execSync("xcrun simctl list devices booted", { encoding: "utf8" });
  const match = out.match(/\(([A-F0-9-]{36})\)\s+\(Booted\)/i);
  if (!match) throw new Error("No booted iOS simulator");
  return match[1];
}

async function seedSingleSample(udid, samplePath) {
  const manifest = JSON.parse(require("node:fs").readFileSync(MANIFEST_PATH, "utf8"));
  const entry = manifest.find((m) => m.file === samplePath);
  if (!entry) {
    console.error(`Sample "${samplePath}" not found in manifest.json`);
    process.exit(1);
  }
  const tmpDir = mkdtempSync(join(tmpdir(), "ios-sample-"));
  const jpgPath = join(tmpDir, "sample.jpg");
  await sharp(join(SAMPLES_DIR, entry.file)).jpeg({ quality: 90 }).toFile(jpgPath);
  execSync(`xcrun simctl addmedia ${udid} "${jpgPath}"`, { stdio: "inherit" });
  console.log(`Seeded "${samplePath}" -> "${entry.productTitle}" into simulator ${udid} Photos.`);
}

function seedLegacyDirectory(udid) {
  if (!existsSync(PHOTOS_DIR)) {
    console.error(`Run npm run seed:emulator-photos first to populate ${PHOTOS_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(PHOTOS_DIR).filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) {
    console.error(`No jpg/png photos found in ${PHOTOS_DIR}. Run npm run seed:emulator-photos first.`);
    process.exit(1);
  }
  console.log(`Seeding ${files.length} photos to simulator ${udid}…`);
  for (const file of files) {
    execSync(`xcrun simctl addmedia ${udid} "${join(PHOTOS_DIR, file)}"`, { stdio: "inherit" });
  }
  console.log("Done.");
}

async function main() {
  if (process.platform !== "darwin") {
    console.error("iOS photo seed requires macOS");
    process.exit(1);
  }
  const udid = process.env.IOS_SIM_UDID || getBootedUdid();
  const samplePath = process.argv[2] || null;
  if (samplePath) {
    await seedSingleSample(udid, samplePath);
  } else {
    seedLegacyDirectory(udid);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
