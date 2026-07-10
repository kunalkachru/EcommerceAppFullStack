#!/usr/bin/env node
// server/scripts/fixBrokenCatalogImages.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import imageIntegrityModule from "./lib/imageIntegrity.js";

const { findDuplicateGroups, classifyDuplicateGroups, isLikelyPlaceholder } =
  imageIntegrityModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const STATIC_PATH = join(__dirname, "..", "catalog-static.json");

async function downloadTo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (isLikelyPlaceholder(buf)) {
    throw new Error(`Rejected: ${url} is only ${buf.length} bytes (placeholder-sized)`);
  }
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buf);
  return buf.length;
}

async function fetchEscuelajsLiveCatalog() {
  const all = [];
  for (let offset = 0; offset < 300; offset += 50) {
    const res = await fetch(`https://api.escuelajs.co/api/v1/products?limit=50&offset=${offset}`);
    if (!res.ok) break;
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < 50) break;
  }
  return all;
}

async function resolveTier0(needsFix, catalog, report, liveEscuelajs) {
  const stillNeedsFix = [];
  for (const product of needsFix) {
    if (!/^es-/.test(product.id)) {
      stillNeedsFix.push(product);
      continue;
    }
    const liveMatch = liveEscuelajs.find((p) => p.title === product.title);
    const candidateUrl = liveMatch?.images?.[0];
    if (!candidateUrl) {
      stillNeedsFix.push(product);
      continue;
    }
    const ext = candidateUrl.match(/\.(jpe?g|png|webp)(\?|$)/i)?.[1] || "jpg";
    const destPath = join(ROOT, "assets", "products", product.slug, `1.${ext}`);
    try {
      const size = await downloadTo(candidateUrl, destPath);
      const relPath = `assets/products/${product.slug}/1.${ext}`;
      const catalogProduct = catalog.products.find((p) => p.id === product.id);
      catalogProduct.images = [relPath];
      catalogProduct.image = relPath;
      report.push({ id: product.id, title: product.title, tier: "0-escuelajs-title-match", size });
      console.log(`  [Tier 0] ${product.id} "${product.title}" -> ${relPath} (${size} bytes)`);
    } catch (err) {
      console.warn(`  [Tier 0 FAILED] ${product.id} "${product.title}": ${err.message}`);
      stillNeedsFix.push(product);
    }
  }
  return stillNeedsFix;
}

async function main() {
  const catalog = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  const groups = findDuplicateGroups(catalog.products, ROOT);
  const { needsFix } = classifyDuplicateGroups(groups);
  console.log(`Classified ${needsFix.length} products needing a fix.`);

  const report = [];
  const liveEscuelajs = await fetchEscuelajsLiveCatalog();
  console.log(`Fetched ${liveEscuelajs.length} live escuelajs products.`);

  const remaining = await resolveTier0(needsFix, catalog, report, liveEscuelajs);

  writeFileSync(STATIC_PATH, JSON.stringify(catalog, null, 2), "utf8");
  writeFileSync(
    join(__dirname, "..", "data", "image-fix-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(`\nTier 0 resolved ${report.length}/${needsFix.length}.`);
  console.log(`Still needing a fix (${remaining.length}):`);
  remaining.forEach((p) => console.log(`  ${p.id} | ${p.title} | ${p.category}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
