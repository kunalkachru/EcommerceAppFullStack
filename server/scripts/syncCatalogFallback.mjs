// server/scripts/syncCatalogFallback.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const STATIC_PATH = join(__dirname, "..", "catalog-static.json");
const FALLBACK_PATH = join(REPO_ROOT, "src", "data", "catalog-fallback.json");

function main() {
  const staticCatalog = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  writeFileSync(FALLBACK_PATH, JSON.stringify({ products: staticCatalog.products }, null, 2), "utf8");
  console.log(`Synced ${staticCatalog.products.length} products to ${FALLBACK_PATH}`);
}

main();
