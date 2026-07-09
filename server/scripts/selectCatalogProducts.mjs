import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CATEGORY_TARGETS } from "./catalogAttributePools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, "..", "catalog-snapshot.json");
const OUTPUT_PATH = join(__dirname, "..", "data", "catalog-selection.json");

// The pre-built snapshot excludes some real dummyjson categories entirely
// (the old live-merge pipeline's SHOPPABLE_CATEGORIES filter dropped
// "vehicle"/"motorcycle", and several dummyjson sub-categories were never
// pulled in the first place). These are fetched directly, live, one time,
// during catalog authoring -- this is real source data, not invented --
// to close shortfalls the local snapshot alone can't fill.
const SUPPLEMENTARY_SOURCES = [
  { dummyjsonCategory: "vehicle", targetCategoryKey: "automotive" },
  { dummyjsonCategory: "motorcycle", targetCategoryKey: "automotive" },
  { dummyjsonCategory: "womens-dresses", targetCategoryKey: "womens-clothing" },
  { dummyjsonCategory: "womens-jewellery", targetCategoryKey: "jewelry" },
  { dummyjsonCategory: "womens-bags", targetCategoryKey: "bags-accessories" },
  { dummyjsonCategory: "sunglasses", targetCategoryKey: "bags-accessories" },
  { dummyjsonCategory: "skin-care", targetCategoryKey: "beauty-fragrances" },
];

function mapDummyJsonCategoryItem(item) {
  const images = Array.isArray(item.images) ? item.images.map(String).filter(Boolean) : [];
  const image = item.thumbnail || images[0] || "";
  return {
    id: `dj-${item.id}`,
    title: String(item.title || "").trim(),
    description: String(item.description || "").slice(0, 500),
    category: String(item.category || "general").toLowerCase(),
    price: Number(item.price) || 0,
    image,
    rating: typeof item.rating === "number" ? item.rating : item.rating?.rate ?? null,
    brand: item.brand ? String(item.brand) : null,
    images,
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    source: "dummyjson",
  };
}

async function fetchSupplementaryCandidates() {
  const byTargetKey = new Map();
  for (const { dummyjsonCategory, targetCategoryKey } of SUPPLEMENTARY_SOURCES) {
    try {
      const res = await fetch(`https://dummyjson.com/products/category/${dummyjsonCategory}?limit=0`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const items = (body.products || []).map(mapDummyJsonCategoryItem);
      const existing = byTargetKey.get(targetCategoryKey) || [];
      byTargetKey.set(targetCategoryKey, [...existing, ...items]);
      console.log(`  supplementary: ${dummyjsonCategory} -> ${targetCategoryKey} (${items.length} real items)`);
    } catch (err) {
      console.warn(`  supplementary fetch failed for ${dummyjsonCategory}: ${err.message}`);
    }
  }
  return byTargetKey;
}

function byCategory_allIds(byCategory) {
  const ids = [];
  for (const items of byCategory.values()) {
    for (const item of items) ids.push(item.id);
  }
  return ids;
}

// Maps the *existing* normalized category values (see server/src/catalogMetadata.js
// CATEGORY_DISPLAY keys) to our new 12-category taxonomy.
const SOURCE_CATEGORY_MAP = {
  "men's clothing": "mens-clothing",
  "women's clothing": "womens-clothing",
  clothes: "mens-clothing", // ambiguous source category; re-split below by audience hints
  shoes: "footwear",
  electronics: "electronics",
  laptops: "electronics",
  smartphones: "electronics",
  beauty: "beauty-fragrances",
  fragrances: "beauty-fragrances",
  jewelry: "jewelry",
  furniture: "home-kitchen",
  "home-decoration": "home-kitchen",
  "kitchen-accessories": "home-kitchen",
  groceries: "groceries",
  "sports-accessories": "sports-fitness",
  bags: "bags-accessories",
  watches: "watches",
  automotive: "automotive",
};

function score(product) {
  // Favor: real image, longer description, has a brand, has tags.
  let s = 0;
  if (Array.isArray(product.images) && product.images.length >= 2) s += 3;
  if ((product.description || "").length > 80) s += 2;
  if (product.brand) s += 1;
  if (Array.isArray(product.tags) && product.tags.length >= 3) s += 1;
  if (Number(product.price) > 0) s += 1;
  return s;
}

function targetCategoryFor(product) {
  const raw = String(product.category || "").toLowerCase();
  let mapped = SOURCE_CATEGORY_MAP[raw];
  if (mapped === "mens-clothing" && raw === "clothes") {
    const hay = `${product.title} ${product.description}`.toLowerCase();
    if (/\bwomen|\bladies|\bdress|\bskirt|\bblouse/.test(hay)) mapped = "womens-clothing";
  }
  return mapped || null;
}

async function main() {
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  const products = snapshot.products || [];

  // Fetch supplementary sources FIRST. These represent a more specific/correct
  // categorization than the legacy snapshot's normalizeCategory() (which had a
  // known bug folding "sunglasses" into "shoes" -- see dj-154..dj-158). Any id
  // covered here takes priority; the legacy snapshot placement is skipped for
  // that id so each product ends up in exactly one target category.
  console.log("Fetching supplementary real-source categories (vehicle, motorcycle, womens-dresses, womens-jewellery, womens-bags, sunglasses, skin-care)...");
  const supplementary = await fetchSupplementaryCandidates();

  const byCategory = new Map(CATEGORY_TARGETS.map((c) => [c.key, []]));
  const supplementaryCoveredIds = new Set();
  for (const items of supplementary.values()) {
    for (const item of items) supplementaryCoveredIds.add(item.id);
  }

  for (const product of products) {
    if (supplementaryCoveredIds.has(product.id)) continue; // supplementary categorization wins
    const targetKey = targetCategoryFor(product);
    if (!targetKey || !byCategory.has(targetKey)) continue;
    byCategory.get(targetKey).push(product);
  }

  const globalSeenIds = new Set(byCategory_allIds(byCategory));
  for (const [targetKey, items] of supplementary.entries()) {
    if (!byCategory.has(targetKey)) continue;
    const deduped = [];
    const seenInThisBatch = new Set();
    for (const item of items) {
      if (globalSeenIds.has(item.id) || seenInThisBatch.has(item.id)) continue; // cross-source dedup (e.g. vehicle+motorcycle overlap)
      seenInThisBatch.add(item.id);
      globalSeenIds.add(item.id);
      deduped.push(item);
    }
    byCategory.get(targetKey).push(...deduped);
  }

  const selection = [];
  const shortfalls = [];

  for (const target of CATEGORY_TARGETS) {
    const candidates = byCategory.get(target.key) || [];
    const ranked = candidates
      .map((p) => ({ product: p, score: score(p) }))
      .sort((a, b) => b.score - a.score);

    const picked = ranked.slice(0, target.targetCount).map((r) => ({
      ...r.product,
      targetCategoryKey: target.key,
    }));

    selection.push(...picked);
    if (picked.length < target.targetCount) {
      shortfalls.push(`${target.key}: got ${picked.length}/${target.targetCount}`);
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify({ selection }, null, 2), "utf8");

  console.log(`Selected ${selection.length} products across ${CATEGORY_TARGETS.length} categories.`);
  if (shortfalls.length) {
    console.warn("SHORTFALLS (need manual backfill in Task 1.3):");
    shortfalls.forEach((s) => console.warn(`  - ${s}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
