/**
 * Merged ecommerce catalog from public demo APIs (~250–370 unique products).
 * Single source for REST API + CLIP visual search indexing.
 */
const { getDemoCoverageProducts } = require("./demoCoverageProducts");

const CATALOG_TTL_MS = 60 * 60 * 1000;
const MIN_TARGET = 200;

let catalog = [];
let catalogLoadedAt = 0;
let catalogMeta = { sources: [], total: 0 };

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mapDummyJson(item) {
  const image =
    item.thumbnail ||
    (Array.isArray(item.images) && item.images[0]) ||
    "";
  return {
    id: `dj-${item.id}`,
    title: String(item.title || "").trim(),
    description: String(item.description || "").slice(0, 500),
    category: String(item.category || "general").toLowerCase(),
    price: Number(item.price) || 0,
    image,
    rating:
      typeof item.rating === "number"
        ? item.rating
        : item.rating?.rate ?? null,
    brand: item.brand ? String(item.brand) : null,
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    source: "dummyjson",
  };
}

function mapFakeStore(item) {
  return {
    id: `fs-${item.id}`,
    title: String(item.title || "").trim(),
    description: String(item.description || "").slice(0, 500),
    category: String(item.category || "general").toLowerCase(),
    price: Number(item.price) || 0,
    image: String(item.image || ""),
    rating: item.rating?.rate ?? null,
    brand: null,
    tags: [],
    source: "fakestore",
  };
}

function mapEscuela(item) {
  const category =
    typeof item.category === "object"
      ? item.category?.name
      : item.category;
  const image =
    (Array.isArray(item.images) && item.images[0]) ||
    (typeof item.category === "object" ? item.category?.image : "") ||
    "";
  return {
    id: `es-${item.id}`,
    title: String(item.title || "").trim(),
    description: String(item.description || "").slice(0, 500),
    category: String(category || "general").toLowerCase(),
    price: Number(item.price) || 0,
    image,
    rating: null,
    brand: null,
    tags: [],
    source: "escuelajs",
  };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ShopEaseCatalog/1.0" },
  });
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return res.json();
}

function isUsableProductImage(url) {
  const u = String(url || "").toLowerCase();
  if (!u.startsWith("http")) return false;
  if (u.includes("faces/twitter") || u.includes("uifaces")) return false;
  return true;
}

function mergeProducts(lists) {
  const seen = new Set();
  const merged = [];

  for (const list of lists) {
    for (const product of list) {
      if (!product.title || !isUsableProductImage(product.image) || product.price <= 0) {
        continue;
      }
      const key = normalizeTitle(product.title);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(product);
    }
  }

  return merged;
}

async function loadSnapshot() {
  try {
    const path = require("path");
    const fs = require("fs");
    const snapshotPath = path.join(__dirname, "..", "data", "catalog-snapshot.json");
    const raw = fs.readFileSync(snapshotPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.products) && parsed.products.length >= MIN_TARGET) {
      return parsed.products;
    }
  } catch {
    /* no snapshot */
  }
  return null;
}

async function fetchCatalog({ force = false } = {}) {
  const now = Date.now();
  if (!force && catalog.length && now - catalogLoadedAt < CATALOG_TTL_MS) {
    return catalog;
  }

  const sourceStats = [];
  let merged = [];

  try {
    const [dummy, fake, escuela] = await Promise.all([
      fetchJson("https://dummyjson.com/products?limit=0").then((body) =>
        (body.products || []).map(mapDummyJson)
      ),
      fetchJson("https://fakestoreapi.com/products").then((body) =>
        (body || []).map(mapFakeStore)
      ),
      fetchJson("https://api.escuelajs.co/api/v1/products").then((body) =>
        (body || []).map(mapEscuela)
      ),
    ]);

    sourceStats.push(
      { name: "dummyjson", count: dummy.length },
      { name: "fakestore", count: fake.length },
      { name: "escuelajs", count: escuela.length }
    );

    merged = mergeProducts([dummy, fake, escuela, getDemoCoverageProducts()]);
  } catch (err) {
    console.warn("[catalog] Live fetch failed:", err.message);
    const snapshot = await loadSnapshot();
    if (snapshot?.length) {
      catalog = snapshot;
      catalogLoadedAt = now;
      catalogMeta = { sources: ["snapshot"], total: snapshot.length, offline: true };
      return catalog;
    }
    throw err;
  }

  if (merged.length < MIN_TARGET) {
    console.warn(`[catalog] Only ${merged.length} products after merge`);
  }

  catalog = merged;
  catalogLoadedAt = now;
  catalogMeta = {
    sources: sourceStats,
    total: merged.length,
    offline: false,
  };

  const demoCount = getDemoCoverageProducts().length;
  console.log(
    `[catalog] Loaded ${merged.length} products (${sourceStats.map((s) => `${s.name}:${s.count}`).join(", ")}, demo-coverage:${demoCount})`
  );

  return catalog;
}

function getCatalogMeta() {
  return { ...catalogMeta, total: catalog.length || catalogMeta.total };
}

function getProductById(id) {
  return catalog.find((p) => String(p.id) === String(id)) ?? null;
}

module.exports = {
  fetchCatalog,
  getCatalogMeta,
  getProductById,
  MIN_TARGET,
};
