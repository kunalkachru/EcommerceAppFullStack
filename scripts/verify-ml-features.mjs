#!/usr/bin/env node
/**
 * Verify catalog + ML features 1–6 via HTTP API.
 * Usage: node scripts/verify-ml-features.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveApiUrl } from "./lib/cloud-api-url.mjs";
import { loadTestPhotoBase64 } from "./lib/test-photo-fixtures.mjs";
import { resolveClipIndexTarget } from "./lib/verify-ml-thresholds.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = resolveApiUrl();
const MIN_CATALOG = 350;
const MIN_INDEX = 300;

const results = [];

function pass(id, detail) {
  results.push({ id, ok: true, detail });
  console.log(`✓ ${id}: ${detail}`);
}

function fail(id, detail) {
  results.push({ id, ok: false, detail });
  console.error(`✗ ${id}: ${detail}`);
}

async function get(path) {
  const res = await fetch(`${API}${path}`);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function post(path, payload) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function waitForIndex(minCount, maxWaitMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const { body } = await get("/api/visual-search/status");
    if (body.indexCount >= minCount && !body.indexing) {
      return body;
    }
    process.stdout.write(`  … indexing ${body.indexCount}/${body.catalogCount}\r`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  const { body } = await get("/api/visual-search/status");
  return body;
}

async function main() {
  console.log(`API: ${API}\n`);

  const health = await get("/health");
  if (health.status !== 200 || !health.body.ok) {
    fail("health", "Server not healthy");
    process.exit(1);
  }
  pass("health", "Server OK");

  const meta = await get("/api/catalog/meta");
  const total = meta.body.total ?? 0;
  if (total >= MIN_CATALOG) {
    pass("catalog-size", `${total} products (target ≥${MIN_CATALOG})`);
  } else {
    fail("catalog-size", `Only ${total} products`);
  }

  const catalog = await get("/api/catalog/products");
  const products = catalog.body.products ?? [];
  if (products.length >= MIN_CATALOG) {
    pass("catalog-api", `GET /api/catalog/products → ${products.length} items`);
  } else {
    fail("catalog-api", `Expected ≥${MIN_CATALOG}, got ${products.length}`);
  }

  const categories = new Set(products.map((p) => p.category));
  if (categories.size >= 15) {
    pass("catalog-categories", `${categories.size} distinct categories`);
  } else {
    fail("catalog-categories", `Only ${categories.size} categories`);
  }

  const enrichedProducts = products.filter(
    (p) =>
      p.slug &&
      p.sku &&
      p.currency === "USD" &&
      typeof p.inventoryCount === "number" &&
      Array.isArray(p.colors) &&
      Array.isArray(p.materials) &&
      Array.isArray(p.keywords) &&
      p.imageAlt
  );
  if (enrichedProducts.length >= 350) {
    pass("catalog-enriched-metadata", `${enrichedProducts.length} enriched products`);
  } else {
    fail("catalog-enriched-metadata", `Only ${enrichedProducts.length} enriched products`);
  }

  const hay = (p) =>
    `${p.title} ${p.description} ${p.category} ${(p.tags || []).join(" ")}`.toLowerCase();
  const laptopsMid = products.filter(
    (p) =>
      (p.category === "laptops" || /\blaptop\b|\bnotebook\b|\bmacbook\b/.test(hay(p))) &&
      p.price >= 500 &&
      p.price <= 900
  );
  if (laptopsMid.length >= 2) {
    pass("catalog-coverage-laptops-500-900", `${laptopsMid.length} laptops in $500–900`);
  } else {
    fail("catalog-coverage-laptops-500-900", `Only ${laptopsMid.length} laptops in range`);
  }

  const gamingMonitorsBudget = products.filter(
    (p) => hay(p).includes("gaming monitor") && p.price <= 240
  );
  if (gamingMonitorsBudget.length >= 1) {
    pass(
      "catalog-coverage-gaming-monitor-under-240",
      `${gamingMonitorsBudget.length} gaming monitors under $240`
    );
  } else {
    fail(
      "catalog-coverage-gaming-monitor-under-240",
      `Only ${gamingMonitorsBudget.length} gaming monitors under $240`
    );
  }

  const fragrancesBudget = products.filter(
    (p) => /perfume|fragrance|cologne/.test(hay(p)) && p.price <= 90
  );
  if (fragrancesBudget.length >= 2) {
    pass("catalog-coverage-fragrance-under-90", `${fragrancesBudget.length} fragrances under $90`);
  } else {
    fail("catalog-coverage-fragrance-under-90", `Only ${fragrancesBudget.length} fragrances under $90`);
  }

  const backpacksBudget = products.filter(
    (p) => /backpack|bag|luggage/.test(hay(p)) && p.price <= 120
  );
  if (backpacksBudget.length >= 2) {
    pass("catalog-coverage-backpack-under-120", `${backpacksBudget.length} backpack/bag matches under $120`);
  } else {
    fail("catalog-coverage-backpack-under-120", `Only ${backpacksBudget.length} backpack/bag matches under $120`);
  }

  const clipTarget = resolveClipIndexTarget({
    minIndex: MIN_INDEX,
    catalogCount: total || products.length,
  });
  if (clipTarget < MIN_INDEX) {
    console.log(
      `ℹ clip-index target adjusted to ${clipTarget} because catalog currently exposes ${total || products.length} products`
    );
  }

  const status = await waitForIndex(clipTarget);
  if (status.indexCount >= clipTarget) {
    pass("clip-index", `Indexed ${status.indexCount} products`);
  } else {
    fail("clip-index", `Only ${status.indexCount} indexed (target ≥${clipTarget})`);
  }

  let imageBase64 = null;
  try {
    imageBase64 = await loadTestPhotoBase64("01-catalog-jacket.jpg");
  } catch (e) {
    fail("visual-search-photo", e.message);
  }

  if (imageBase64) {
    const vs = await post("/api/visual-search", { imageBase64, categoryFilter: "clothing" });
    if (vs.status === 200 && vs.body.matches?.length > 0) {
      pass(
        "feature-2-3-visual-search",
        `${vs.body.matches.length} matches, top ${vs.body.matches[0].matchPercent}%`
      );
    } else if (vs.status === 200) {
      fail("feature-2-3-visual-search", `No matches (status ${vs.body.resultStatus})`);
    } else {
      fail("feature-2-3-visual-search", `HTTP ${vs.status}: ${vs.body.message}`);
    }

    if (vs.body.attributes?.length > 0) {
      pass("feature-4-attributes", vs.body.attributes.map((a) => a.text).join(", "));
    } else {
      fail("feature-4-attributes", "No attribute chips returned");
    }
  }

  const similarProduct =
    products.find((p) => String(p.id).startsWith("fs-")) || products[0];
  if (similarProduct) {
    const sim = await get(
      `/api/visual-search/similar/${encodeURIComponent(similarProduct.id)}?limit=5`
    );
    if (sim.status === 200 && sim.body.matches?.length > 0) {
      pass(
        "feature-1-similar",
        `${sim.body.matches.length} similar to "${String(similarProduct.title).slice(0, 30)}…"`
      );
    } else {
      fail("feature-1-similar", "No similar products returned");
    }
  } else {
    fail("feature-1-similar", "Empty catalog");
  }

  const groups = await get("/api/visual-search/category-groups");
  if (groups.status === 200 && groups.body.groups?.clothing) {
    pass("feature-3-category-groups", "Category groups API OK");
  } else {
    fail("feature-3-category-groups", "Missing category groups");
  }

  const voice = await post("/api/search/voice", {
    query: "blue jacket under 60 dollars",
  });
  if (voice.status === 200 && voice.body.matches?.length > 0) {
    pass(
      "feature-7-voice-search",
      `${voice.body.matches.length} products for voice query`
    );
  } else {
    fail("feature-7-voice-search", voice.body.message ?? "No voice matches");
  }

  const shoesWomen = await post("/api/search/voice", { query: "shoes women" });
  if (shoesWomen.status === 200 && shoesWomen.body.matches?.length >= 3) {
    const top = shoesWomen.body.matches[0];
    pass(
      "feature-7-shoes-women",
      `${shoesWomen.body.matches.length} matches, top: ${top.title?.slice(0, 40)}`
    );
  } else {
    fail("feature-7-shoes-women", shoesWomen.body.message ?? "No shoes/women matches");
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
