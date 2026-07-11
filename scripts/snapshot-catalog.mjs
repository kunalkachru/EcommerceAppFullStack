#!/usr/bin/env node
/**
 * Fetch merged catalog and write server/data/catalog-snapshot.json for offline fallback.
 * Usage: node scripts/snapshot-catalog.mjs
 *
 * This script's sole purpose is refreshing the dormant live-fetch snapshot
 * (see server/src/catalogLiveSource.js), so it always forces CATALOG_MODE=live
 * regardless of the app's default (CATALOG_MODE=static as of the static
 * catalog cutover) -- otherwise it would silently re-dump the static catalog
 * back into its own fallback file.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

process.env.CATALOG_MODE = "live";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const { fetchCatalog, getCatalogMeta } = require(join(ROOT, "server/src/catalogService.js"));

async function main() {
  const products = await fetchCatalog({ force: true });
  const meta = getCatalogMeta();
  const outDir = join(ROOT, "server/data");
  const serverTrackedOut = join(ROOT, "server", "catalog-snapshot.json");
  const clientOut = join(ROOT, "src/data/catalog-fallback.json");

  mkdirSync(outDir, { recursive: true });

  const payload = {
    updatedAt: new Date().toISOString(),
    total: products.length,
    sources: meta.sources,
    products,
  };

  writeFileSync(join(outDir, "catalog-snapshot.json"), JSON.stringify(payload, null, 2));
  writeFileSync(serverTrackedOut, JSON.stringify(payload, null, 2));
  writeFileSync(clientOut, JSON.stringify(payload, null, 2));

  console.log(`Snapshot: ${products.length} products`);
  console.log(`  server/catalog-snapshot.json`);
  console.log(`  server/data/catalog-snapshot.json`);
  console.log(`  src/data/catalog-fallback.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
