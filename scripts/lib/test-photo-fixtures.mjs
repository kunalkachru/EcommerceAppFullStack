/**
 * Test photos for cloud verify scripts — local file or HTTP fetch (CI has no emulator seed).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const LOCAL_DIR = join(ROOT, "docs", "test-photos");

/** Same samples as scripts/seed-emulator-photos.mjs */
export const TEST_PHOTO_URLS = {
  "01-catalog-jacket.jpg":
    "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png",
  "02-catalog-backpack.jpg":
    "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png",
  "12-off-catalog-pizza.jpg":
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
};

/**
 * @param {string} filename e.g. "01-catalog-jacket.jpg"
 * @returns {Promise<string>} base64 image
 */
export async function loadTestPhotoBase64(filename) {
  const localPath = join(LOCAL_DIR, filename);
  if (existsSync(localPath)) {
    return readFileSync(localPath).toString("base64");
  }
  const url = TEST_PHOTO_URLS[filename];
  if (!url) {
    throw new Error(`Unknown test photo: ${filename}`);
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "ShopEaseVerify/1.0" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${filename}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}
