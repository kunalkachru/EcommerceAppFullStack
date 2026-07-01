#!/usr/bin/env node
/**
 * Verify catalog + ML features 1–6 via HTTP API.
 * Usage: node scripts/verify-ml-features.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = process.env.API_URL || "http://127.0.0.1:5001";
const MIN_CATALOG = 200;
const MIN_INDEX = 200;

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
  if (categories.size >= 10) {
    pass("catalog-categories", `${categories.size} distinct categories`);
  } else {
    fail("catalog-categories", `Only ${categories.size} categories`);
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

  const status = await waitForIndex(MIN_INDEX);
  if (status.indexCount >= MIN_INDEX) {
    pass("clip-index", `Indexed ${status.indexCount} products`);
  } else {
    fail("clip-index", `Only ${status.indexCount} indexed (target ≥${MIN_INDEX})`);
  }

  const jacketPath = join(__dirname, "..", "docs/test-photos/01-catalog-jacket.jpg");
  let imageBase64;
  try {
    imageBase64 = readFileSync(jacketPath).toString("base64");
  } catch {
    fail("visual-search-photo", "Test jacket image missing — run npm run seed:emulator-photos");
    imageBase64 = null;
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

  const fsProduct = products.find((p) => String(p.id).startsWith("fs-"));
  if (fsProduct) {
    const sim = await get(`/api/visual-search/similar/${encodeURIComponent(fsProduct.id)}?limit=5`);
    if (sim.status === 200 && sim.body.matches?.length > 0) {
      pass(
        "feature-1-similar",
        `${sim.body.matches.length} similar to "${fsProduct.title.slice(0, 30)}…"`
      );
    } else {
      fail("feature-1-similar", "No similar products returned");
    }
  } else {
    fail("feature-1-similar", "No fakestore product in catalog");
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
