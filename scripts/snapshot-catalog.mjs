#!/usr/bin/env node
/**
 * Fetch merged catalog and write server/data/catalog-snapshot.json for offline fallback.
 * Usage: node scripts/snapshot-catalog.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const { fetchCatalog, getCatalogMeta } = require(join(ROOT, "server/src/catalogService.js"));

async function main() {
  const products = await fetchCatalog({ force: true });
  const meta = getCatalogMeta();
  const outDir = join(ROOT, "server/data");
  const clientOut = join(ROOT, "src/data/catalog-fallback.json");

  mkdirSync(outDir, { recursive: true });

  const payload = {
    updatedAt: new Date().toISOString(),
    total: products.length,
    sources: meta.sources,
    products,
  };

  writeFileSync(join(outDir, "catalog-snapshot.json"), JSON.stringify(payload, null, 2));
  writeFileSync(clientOut, JSON.stringify(payload, null, 2));

  console.log(`Snapshot: ${products.length} products`);
  console.log(`  server/data/catalog-snapshot.json`);
  console.log(`  src/data/catalog-fallback.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
