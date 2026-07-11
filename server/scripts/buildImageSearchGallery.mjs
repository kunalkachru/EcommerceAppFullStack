// server/scripts/buildImageSearchGallery.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { CATEGORY_TARGETS } from "./catalogAttributePools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const STATIC_PATH = join(__dirname, "..", "catalog-static.json");
const GALLERY_ROOT = join(REPO_ROOT, "test-assets", "image-search-samples");

function main() {
  const { products } = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  const manifest = [];

  for (const target of CATEGORY_TARGETS) {
    const candidates = products.filter((p) => p.category === target.key && p.images?.length);
    // Take up to 2 samples per category: one "typical" (first by id) and one with the
    // richest colors (best for testing color-aware image search).
    const picks = [
      candidates[0],
      [...candidates].sort((a, b) => (b.colors?.length || 0) - (a.colors?.length || 0))[0],
    ].filter((p, idx, arr) => p && arr.findIndex((x) => x.id === p.id) === idx);

    const dir = join(GALLERY_ROOT, target.key);
    mkdirSync(dir, { recursive: true });

    picks.forEach((product, idx) => {
      const sourcePath = join(REPO_ROOT, product.images[0]);
      // Preserve the real source extension (most catalog images are .webp, some
      // .png/.jpeg) instead of hardcoding .jpg -- a mislabeled extension would
      // break OS photo-picker recognition when these seed the Android/iOS
      // galleries in Phase 6.
      const ext = extname(sourcePath) || ".jpg";
      const filename = `sample-${idx + 1}${ext}`;
      copyFileSync(sourcePath, join(dir, filename));
      manifest.push({
        file: `${target.key}/${filename}`,
        productId: product.id,
        productTitle: product.title,
        category: target.key,
        colors: product.colors,
      });
    });
  }

  writeFileSync(join(GALLERY_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Built gallery with ${manifest.length} sample images across ${CATEGORY_TARGETS.length} categories.`);
}

main();
