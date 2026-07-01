#!/usr/bin/env node
/**
 * Download 15 sample images and push them to the Android emulator gallery
 * for visual-search testing (Gallery button on Home).
 *
 * Usage: node scripts/seed-emulator-photos.mjs [device-id]
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOCAL_DIR = join(ROOT, "docs", "test-photos");
const DEVICE = process.argv[2] || process.env.ADB_DEVICE || "emulator-5554";
const REMOTE_DIR = "/sdcard/Pictures/ShopEaseTest";

const SAMPLES = [
  { file: "01-catalog-jacket.jpg", url: "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png", label: "Catalog: jacket" },
  { file: "02-catalog-backpack.jpg", url: "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png", label: "Catalog: backpack" },
  { file: "03-catalog-tshirt.jpg", url: "https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_t.png", label: "Catalog: t-shirt" },
  { file: "04-catalog-ring.jpg", url: "https://cdn.dummyjson.com/product-images/womens-jewellery/green-crystal-earring/thumbnail.webp", label: "Catalog: jewelry" },
  { file: "05-catalog-monitor.jpg", url: "https://fakestoreapi.com/img/81Zt42ioCgL._AC_SX679_t.png", label: "Catalog: monitor" },
  { file: "06-catalog-watch.jpg", url: "https://cdn.dummyjson.com/product-images/mens-watches/brown-leather-belt-watch/thumbnail.webp", label: "Catalog: watch" },
  { file: "07-catalog-womens-coat.jpg", url: "https://cdn.dummyjson.com/product-images/womens-dresses/black-women's-gown/thumbnail.webp", label: "Catalog: women's dress" },
  { file: "08-catalog-lipstick.jpg", url: "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp", label: "Catalog: beauty" },
  { file: "09-catalog-laptop.jpg", url: "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp", label: "Catalog: laptop" },
  { file: "10-catalog-sneakers.jpg", url: "https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp", label: "Catalog: sneakers" },
  { file: "11-catalog-groceries.jpg", url: "https://cdn.dummyjson.com/product-images/groceries/apple/thumbnail.webp", label: "Catalog: groceries" },
  { file: "12-off-catalog-pizza.jpg", url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", label: "Off-catalog: pizza" },
  { file: "13-off-catalog-dog.jpg", url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", label: "Off-catalog: dog" },
  { file: "14-off-catalog-car.jpg", url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800", label: "Off-catalog: car" },
  { file: "15-off-catalog-beach.jpg", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", label: "Off-catalog: beach" },
];

function adb(cmd) {
  return execSync(`adb -s ${DEVICE} ${cmd}`, { encoding: "utf8" }).trim();
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, { headers: { "User-Agent": "ShopEaseTest/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function tryLoadEmulatorCameraImage(hostPath) {
  try {
    adb(`emu camera load_image "${hostPath.replace(/"/g, '\\"')}"`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`Device: ${DEVICE}`);
  try {
    adb("get-state");
  } catch {
    console.error("No emulator/device found. Start the Android emulator first.");
    process.exit(1);
  }

  mkdirSync(LOCAL_DIR, { recursive: true });
  adb(`shell mkdir -p ${REMOTE_DIR}`);

  console.log(`\nDownloading ${SAMPLES.length} test images…`);
  for (const sample of SAMPLES) {
    const localPath = join(LOCAL_DIR, sample.file);
    if (!existsSync(localPath)) {
      process.stdout.write(`  ${sample.file}… `);
      const buf = await fetchUrl(sample.url);
      writeFileSync(localPath, buf);
      console.log(`${(buf.length / 1024).toFixed(0)} KB`);
    } else {
      console.log(`  ${sample.file} (cached)`);
    }

    execSync(`adb -s ${DEVICE} push "${localPath}" "${REMOTE_DIR}/${sample.file}"`, {
      stdio: "inherit",
    });
  }

  console.log("\nRefreshing media index…");
  try {
    adb(
      `shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://${REMOTE_DIR}`
    );
  } catch {
    adb("shell am broadcast -a android.intent.action.MEDIA_MOUNTED -d file:///sdcard");
  }

  console.log("\nOn emulator:", REMOTE_DIR);
  console.log(adb(`shell ls ${REMOTE_DIR} | wc -l`), "files");

  const readme = `# Test photos (${SAMPLES.length} images)

Seeded to: \`${REMOTE_DIR}\`

## Catalog photos (should match products)
01–11: jacket, backpack, t-shirt, ring, monitor, watch, coat, lipstick, laptop, sneakers, groceries

## Off-catalog (AI identifies, may not stock)
12 pizza · 13 dog · 14 car · 15 beach

\`\`\`bash
npm run seed:emulator-photos
\`\`\`
`;
  writeFileSync(join(LOCAL_DIR, "README.md"), readme);

  const jacketPath = join(LOCAL_DIR, "01-catalog-jacket.jpg");
  if (tryLoadEmulatorCameraImage(jacketPath)) {
    console.log("\nVirtual camera loaded with jacket image.");
  }

  console.log(`\nDone — ${SAMPLES.length} photos in Pictures → ShopEaseTest`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
