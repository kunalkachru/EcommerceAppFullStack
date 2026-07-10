#!/usr/bin/env node
/**
 * Seed the Android emulator's gallery with real catalog product photos from
 * the Phase 2 image-search sample gallery (test-assets/image-search-samples/),
 * converting webp -> jpg. Android's native gallery picker and iOS's
 * `simctl addmedia` both handle jpg reliably; webp support is inconsistent
 * (simctl addmedia rejects .webp outright).
 *
 * Two modes:
 *   node scripts/seed-emulator-photos.mjs
 *     Seeds one sample per category (diverse default set for manual testing).
 *   node scripts/seed-emulator-photos.mjs <category>/<file>
 *     Clears the test album and seeds EXACTLY that one sample. Used by
 *     automated Maestro verification so the native picker's only visible
 *     thumbnail is unambiguous (native pickers can't be targeted by
 *     testID/text, only by fixed grid position).
 *
 * Usage: node scripts/seed-emulator-photos.mjs [sample-path] [device-id]
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(join(ROOT, "server", "package.json"));
const sharp = require("sharp");

const SAMPLES_DIR = join(ROOT, "test-assets", "image-search-samples");
const MANIFEST_PATH = join(SAMPLES_DIR, "manifest.json");
const LOCAL_DIR = join(ROOT, "docs", "test-photos");
const REMOTE_DIR = "/sdcard/Pictures/ShopEaseTest";

const argSample = process.argv[2] && !process.argv[2].includes("emulator-") ? process.argv[2] : null;
const DEVICE = (argSample ? process.argv[3] : process.argv[2]) || process.env.ADB_DEVICE || "emulator-5554";

function adb(cmd) {
  return execSync(`adb -s ${DEVICE} ${cmd}`, { encoding: "utf8" }).trim();
}

function loadManifest() {
  return JSON.parse(require("node:fs").readFileSync(MANIFEST_PATH, "utf8"));
}

function pickDefaultSamples(manifest) {
  const seenCategories = new Set();
  const picked = [];
  for (const entry of manifest) {
    if (seenCategories.has(entry.category)) continue;
    seenCategories.add(entry.category);
    picked.push(entry);
  }
  return picked;
}

async function convertToJpg(sourcePath, destPath) {
  await sharp(sourcePath).jpeg({ quality: 90 }).toFile(destPath);
}

async function main() {
  console.log(`Device: ${DEVICE}`);
  try {
    adb("get-state");
  } catch {
    console.error("No emulator/device found. Start the Android emulator first.");
    process.exit(1);
  }

  const manifest = loadManifest();
  let entries;
  if (argSample) {
    const entry = manifest.find((m) => m.file === argSample);
    if (!entry) {
      console.error(`Sample "${argSample}" not found in manifest.json`);
      process.exit(1);
    }
    entries = [entry];
    console.log(`Deterministic single-sample mode: ${argSample} -> "${entry.productTitle}"`);
    rmSync(LOCAL_DIR, { recursive: true, force: true });
    adb(`shell rm -rf ${REMOTE_DIR}`);
  } else {
    entries = pickDefaultSamples(manifest);
    console.log(`Default mode: seeding ${entries.length} diverse samples (one per category).`);
  }

  mkdirSync(LOCAL_DIR, { recursive: true });
  adb(`shell mkdir -p ${REMOTE_DIR}`);

  console.log(`\nConverting and pushing ${entries.length} sample image(s)…`);
  for (const entry of entries) {
    const sourcePath = join(SAMPLES_DIR, entry.file);
    const jpgName = entry.file.replace(/\//g, "-").replace(/\.webp$/i, ".jpg");
    const localPath = join(LOCAL_DIR, jpgName);
    await convertToJpg(sourcePath, localPath);
    execSync(`adb -s ${DEVICE} push "${localPath}" "${REMOTE_DIR}/${jpgName}"`, { stdio: "inherit" });
    console.log(`  ${entry.file} -> ${jpgName}  ("${entry.productTitle}")`);
  }

  console.log("\nRefreshing media index…");
  try {
    adb(`shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${REMOTE_DIR}`);
  } catch {
    adb("shell am broadcast -a android.intent.action.MEDIA_MOUNTED -d file:///sdcard");
  }

  console.log("\nOn emulator:", REMOTE_DIR);
  console.log(adb(`shell ls ${REMOTE_DIR} | wc -l`), "file(s)");

  const readme = `# Test photos (seeded from test-assets/image-search-samples/)

Seeded to: \`${REMOTE_DIR}\`

${entries.map((e) => `- ${e.file} -> "${e.productTitle}" (${e.category})`).join("\n")}

\`\`\`bash
npm run seed:emulator-photos                       # diverse default set
node scripts/seed-emulator-photos.mjs <category>/<file>  # single deterministic sample
\`\`\`
`;
  writeFileSync(join(LOCAL_DIR, "README.md"), readme);

  console.log(`\nDone — ${entries.length} photo(s) in Pictures → ShopEaseTest`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
