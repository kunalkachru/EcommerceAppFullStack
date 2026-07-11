// server/scripts/downloadCatalogImages.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SELECTION_PATH = join(__dirname, "..", "data", "catalog-selection.json");
const STATIC_PATH = join(__dirname, "..", "catalog-static.json");
const ASSETS_ROOT = join(REPO_ROOT, "assets", "products");
const MAX_IMAGES_PER_PRODUCT = 4;

async function downloadOne(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buf);
}

async function main() {
  const { selection } = JSON.parse(readFileSync(SELECTION_PATH, "utf8"));
  const staticCatalog = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  const sourceById = new Map(selection.map((p) => [p.id, p]));

  let done = 0;
  const failed = [];
  for (const product of staticCatalog.products) {
    const source = sourceById.get(product.id);
    const sourceImages = (source?.images || []).slice(0, MAX_IMAGES_PER_PRODUCT);
    if (!sourceImages.length) {
      console.warn(`No source images for ${product.id} (${product.title}) — skipping`);
      continue;
    }

    const dir = join(ASSETS_ROOT, product.slug);
    mkdirSync(dir, { recursive: true });

    const localPaths = [];
    let nextIndex = 1;
    for (let i = 0; i < sourceImages.length; i += 1) {
      const ext = sourceImages[i].match(/\.(webp|png|jpe?g)(\?|$)/i)?.[1] || "jpg";
      const filename = `${nextIndex}.${ext}`;
      const destPath = join(dir, filename);
      try {
        if (!existsSync(destPath)) {
          await downloadOne(sourceImages[i], destPath);
        }
        localPaths.push(`assets/products/${product.slug}/${filename}`);
        nextIndex += 1;
      } catch (err) {
        console.warn(`  image failed for ${product.id} (${product.title}): ${err.message}`);
      }
    }
    if (!localPaths.length) {
      failed.push({ id: product.id, title: product.title });
      continue;
    }
    product.images = localPaths;
    // Legacy schema parity: the live-fetch pipeline always set a singular
    // `image` field (thumbnail), and several existing client components
    // (cart, order history, similar-products strip, home visual-search
    // matches) read `product.image` directly rather than `images[0]`.
    product.image = localPaths[0];
    done += 1;
    if (done % 20 === 0) console.log(`... ${done}/${staticCatalog.products.length}`);
  }

  writeFileSync(STATIC_PATH, JSON.stringify(staticCatalog, null, 2), "utf8");
  console.log(`Localized images for ${done}/${staticCatalog.products.length} products.`);
  if (failed.length) {
    console.warn(`FAILED (zero working images, needs manual fix): ${failed.length}`);
    failed.forEach((f) => console.warn(`  - ${f.id} | ${f.title}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
