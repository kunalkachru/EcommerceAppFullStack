/**
 * Merged ecommerce catalog from public demo APIs (~250–370 unique products).
 * Single source for REST API + CLIP visual search indexing.
 */
const { getDemoCoverageProducts } = require("./demoCoverageProducts");
const { normalizeCatalogProducts } = require("./catalogMetadata");
const path = require("path");
const fs = require("fs");

const CATALOG_TTL_MS = 60 * 60 * 1000;
const MIN_TARGET = 200;
const SNAPSHOT_CANDIDATE_PATHS = [
  path.join(__dirname, "..", "catalog-snapshot.json"),
  path.join(__dirname, "..", "data", "catalog-snapshot.json"),
  path.join(__dirname, "..", "..", "src", "data", "catalog-fallback.json"),
];

let catalog = [];
let catalogLoadedAt = 0;
let catalogMeta = { sources: [], total: 0 };

function mapDummyJson(item) {
  const images = Array.isArray(item.images) ? item.images.map(String).filter(Boolean) : [];
  const image =
    item.thumbnail ||
    images[0] ||
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
    images,
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    source: "dummyjson",
  };
}

function mapFakeStore(item) {
  const image = String(item.image || "");
  return {
    id: `fs-${item.id}`,
    title: String(item.title || "").trim(),
    description: String(item.description || "").slice(0, 500),
    category: String(item.category || "general").toLowerCase(),
    price: Number(item.price) || 0,
    image,
    images: image ? [image] : [],
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
  const images = Array.isArray(item.images) ? item.images.map(String).filter(Boolean) : [];
  const image =
    images[0] ||
    (typeof item.category === "object" ? item.category?.image : "") ||
    "";
  return {
    id: `es-${item.id}`,
    title: String(item.title || "").trim(),
    description: String(item.description || "").slice(0, 500),
    category: String(category || "general").toLowerCase(),
    price: Number(item.price) || 0,
    image,
    images,
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

function mergeProducts(lists) {
  return normalizeCatalogProducts(lists.flat());
}

async function loadSnapshot() {
  try {
    for (const snapshotPath of SNAPSHOT_CANDIDATE_PATHS) {
      if (!fs.existsSync(snapshotPath)) {
        continue;
      }
      const raw = fs.readFileSync(snapshotPath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.products) && parsed.products.length >= MIN_TARGET) {
        return parsed.products;
      }
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
  let snapshotCount = 0;
  let snapshotSeeded = false;
  let usedSnapshotFallback = false;

  try {
    const snapshot = await loadSnapshot();
    const sources = await Promise.all([
      fetchJson("https://dummyjson.com/products?limit=0")
        .then((body) => ({
          name: "dummyjson",
          products: (body.products || []).map(mapDummyJson),
        }))
        .catch((err) => {
          console.warn("[catalog] dummyjson failed:", err.message);
          return { name: "dummyjson", products: [] };
        }),
      fetchJson("https://fakestoreapi.com/products")
        .then((body) => ({
          name: "fakestore",
          products: (body || []).map(mapFakeStore),
        }))
        .catch((err) => {
          console.warn("[catalog] fakestore failed:", err.message);
          return { name: "fakestore", products: [] };
        }),
      fetchJson("https://api.escuelajs.co/api/v1/products")
        .then((body) => ({
          name: "escuelajs",
          products: (body || []).map(mapEscuela),
        }))
        .catch((err) => {
          console.warn("[catalog] escuelajs failed:", err.message);
          return { name: "escuelajs", products: [] };
        }),
    ]);

    for (const source of sources) {
      sourceStats.push({ name: source.name, count: source.products.length });
    }

    const liveSourceProductCount = sourceStats.reduce((sum, source) => sum + source.count, 0);
    const mergeInputs = [...sources.map((s) => s.products), getDemoCoverageProducts()];

    if (snapshot?.length >= MIN_TARGET) {
      mergeInputs.push(snapshot);
      snapshotCount = snapshot.length;
      snapshotSeeded = true;
    }

    merged = mergeProducts(mergeInputs);

    if (liveSourceProductCount === 0 || merged.length < MIN_TARGET) {
      if (snapshot?.length >= MIN_TARGET) {
        merged = mergeProducts([getDemoCoverageProducts(), snapshot]);
        snapshotCount = snapshot.length;
        snapshotSeeded = true;
        usedSnapshotFallback = true;
      }
    }

    if (!merged.length) {
      throw new Error("All live catalog sources failed");
    }
  } catch (err) {
    console.warn("[catalog] Live fetch failed:", err.message);
    const snapshot = await loadSnapshot();
    if (snapshot?.length) {
      catalog = mergeProducts([getDemoCoverageProducts(), snapshot]);
      catalogLoadedAt = now;
      catalogMeta = { sources: ["snapshot"], total: catalog.length, offline: true };
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
    sources: usedSnapshotFallback
      ? ["snapshot"]
      : snapshotSeeded
        ? [{ name: "snapshot-seed", count: snapshotCount }, ...sourceStats]
        : sourceStats,
    total: merged.length,
    offline: usedSnapshotFallback,
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
  SNAPSHOT_CANDIDATE_PATHS,
};
