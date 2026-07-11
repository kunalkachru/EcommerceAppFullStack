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

const CATEGORY_TO_DUMMYJSON = {
  "mens-clothing": ["mens-shirts", "tops"],
  "womens-clothing": ["womens-dresses"],
  footwear: ["mens-shoes", "womens-shoes"],
  "beauty-fragrances": ["beauty", "fragrances", "skin-care"],
  watches: ["mens-watches", "womens-watches"],
  "bags-accessories": ["womens-bags", "sunglasses"],
};

const CATEGORY_TO_FAKESTORE = {
  "mens-clothing": "men's clothing",
  "womens-clothing": "women's clothing",
};

async function usedIdsBySource() {
  const selection = JSON.parse(
    readFileSync(join(__dirname, "..", "data", "catalog-selection.json"), "utf8")
  );
  return new Set((selection.selection || selection).map((p) => p.id));
}

async function findUnusedDummyjsonCandidate(category, usedIds) {
  const slugs = CATEGORY_TO_DUMMYJSON[category] || [];
  for (const slug of slugs) {
    const res = await fetch(`https://dummyjson.com/products/category/${slug}`);
    if (!res.ok) continue;
    const { products } = await res.json();
    for (const item of products) {
      const id = `dj-${item.id}`;
      if (usedIds.has(id)) continue;
      const img = item.images?.[0] || item.thumbnail;
      if (img) return { sourceLabel: "dummyjson", url: img, id };
    }
  }
  return null;
}

async function findUnusedFakestoreCandidate(category, usedIds) {
  const fsCategory = CATEGORY_TO_FAKESTORE[category];
  if (!fsCategory) return null;
  const res = await fetch(`https://fakestoreapi.com/products/category/${encodeURIComponent(fsCategory)}`);
  if (!res.ok) return null;
  const items = await res.json();
  for (const item of items) {
    const id = `fs-${item.id}`;
    if (usedIds.has(id)) continue;
    if (item.image) return { sourceLabel: "fakestoreapi", url: item.image, id };
  }
  return null;
}

async function findFreshEscuelajsCandidate(product, liveEscuelajs, usedTitles) {
  const categoryWord = product.title.split(" ").slice(-1)[0].toLowerCase();
  const candidate = liveEscuelajs.find(
    (p) => !usedTitles.has(p.title) && p.title.toLowerCase().includes(categoryWord)
  );
  if (!candidate) return null;
  usedTitles.add(candidate.title);
  return { sourceLabel: "escuelajs-fresh", url: candidate.images?.[0] };
}

async function findUnsplashCandidate(product) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const query = encodeURIComponent(product.title);
  const res = await fetch(`https://api.unsplash.com/photos/random?query=${query}`, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (!res.ok) return null;
  const photo = await res.json();
  const url = photo?.urls?.regular;
  return url ? { sourceLabel: "unsplash", url } : null;
}

const PIXABAY_CATEGORY_HINT = {
  "mens-clothing": "fashion",
  "womens-clothing": "fashion",
  footwear: "fashion",
  "beauty-fragrances": "beauty",
  watches: "fashion",
  "bags-accessories": "fashion",
};

async function pixabaySearch(query, category, key) {
  const params = new URLSearchParams({
    key,
    q: query,
    image_type: "photo",
    safesearch: "true",
    per_page: "20",
  });
  if (category) params.set("category", category);
  const res = await fetch(`https://pixabay.com/api/?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.hits || [];
}

async function findPixabayCandidate(product, usedPixabayIds) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const category = PIXABAY_CATEGORY_HINT[product.category];
  const words = product.title.split(" ");
  const queries = [product.title, words.slice(-2).join(" "), words.slice(-1).join(" ")];

  for (const query of queries) {
    const hits = await pixabaySearch(query, category, key);
    if (process.env.DEBUG_FIX) {
      console.error(`  [pixabay debug] ${product.id} q="${query}" hits=${hits.length} usedSoFar=${usedPixabayIds.size}`);
    }
    const hit = hits.find((h) => !usedPixabayIds.has(h.id));
    if (hit) {
      usedPixabayIds.add(hit.id);
      return { sourceLabel: "pixabay", url: hit.largeImageURL || hit.webformatURL };
    }
  }
  return null;
}

async function resolveFallbackChain(remaining, catalog, liveEscuelajs, report) {
  const usedIds = await usedIdsBySource();
  const usedEscuelajsTitles = new Set(liveEscuelajs.map((p) => p.title).filter((t) =>
    catalog.products.some((cp) => cp.title === t)
  ));
  const usedPixabayIds = new Set();
  const stillUnresolved = [];

  for (const product of remaining) {
    let candidate =
      (await findUnusedDummyjsonCandidate(product.category, usedIds)) ||
      (await findUnusedFakestoreCandidate(product.category, usedIds)) ||
      (await findFreshEscuelajsCandidate(product, liveEscuelajs, usedEscuelajsTitles)) ||
      (await findUnsplashCandidate(product)) ||
      (await findPixabayCandidate(product, usedPixabayIds));

    if (!candidate) {
      stillUnresolved.push(product);
      continue;
    }

    if (candidate.id) usedIds.add(candidate.id);

    const ext = candidate.url.match(/\.(jpe?g|png|webp)(\?|$)/i)?.[1] || "jpg";
    const destPath = join(ROOT, "assets", "products", product.slug, `1.${ext}`);
    try {
      const size = await downloadTo(candidate.url, destPath);
      const relPath = `assets/products/${product.slug}/1.${ext}`;
      const catalogProduct = catalog.products.find((p) => p.id === product.id);
      catalogProduct.images = [relPath];
      catalogProduct.image = relPath;
      report.push({ id: product.id, title: product.title, tier: candidate.sourceLabel, size });
      console.log(`  [${candidate.sourceLabel}] ${product.id} "${product.title}" -> ${relPath} (${size} bytes)`);
    } catch (err) {
      console.warn(`  [${candidate.sourceLabel} FAILED] ${product.id} "${product.title}": ${err.message}`);
      stillUnresolved.push(product);
    }
  }
  return stillUnresolved;
}

async function main() {
  const catalog = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  const groups = findDuplicateGroups(catalog.products, ROOT);
  const { needsFix } = classifyDuplicateGroups(groups);
  console.log(`Classified ${needsFix.length} products needing a fix.`);

  const report = [];
  const liveEscuelajs = await fetchEscuelajsLiveCatalog();
  console.log(`Fetched ${liveEscuelajs.length} live escuelajs products.`);

  const afterTier0 = await resolveTier0(needsFix, catalog, report, liveEscuelajs);
  const afterFallback = await resolveFallbackChain(afterTier0, catalog, liveEscuelajs, report);

  writeFileSync(STATIC_PATH, JSON.stringify(catalog, null, 2), "utf8");
  writeFileSync(
    join(__dirname, "..", "data", "image-fix-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(`\nResolved ${report.length}/${needsFix.length}.`);
  if (afterFallback.length) {
    console.log(`UNRESOLVED (${afterFallback.length}) — needs a human decision:`);
    afterFallback.forEach((p) => console.log(`  ${p.id} | ${p.title} | ${p.category}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
