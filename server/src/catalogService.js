/**
 * Product catalog source. Defaults to the static, self-contained catalog
 * (server/catalog-static.json). Set CATALOG_MODE=live to re-activate
 * the original live third-party fetch (see catalogLiveSource.js) -- kept
 * fully functional but dormant by default.
 */
const path = require("path");
const fs = require("fs");

const CATALOG_TTL_MS = 60 * 60 * 1000;
const STATIC_CATALOG_PATH = path.join(__dirname, "..", "catalog-static.json");

let catalog = [];
let catalogLoadedAt = 0;
let catalogMeta = { sources: [], total: 0 };

function loadStaticCatalog() {
  const raw = fs.readFileSync(STATIC_CATALOG_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return parsed.products || [];
}

async function fetchCatalog({ force = false } = {}) {
  const now = Date.now();
  if (!force && catalog.length && now - catalogLoadedAt < CATALOG_TTL_MS) {
    return catalog;
  }

  const mode = String(process.env.CATALOG_MODE || "static").toLowerCase();

  if (mode === "live") {
    const { fetchLiveCatalog } = require("./catalogLiveSource");
    const { products, meta } = await fetchLiveCatalog();
    catalog = products;
    catalogMeta = meta;
    catalogLoadedAt = now;
    return catalog;
  }

  catalog = loadStaticCatalog();
  catalogMeta = { sources: ["static"], total: catalog.length, offline: false };
  catalogLoadedAt = now;
  console.log(`[catalog] Loaded ${catalog.length} products from static catalog (CATALOG_MODE=static)`);
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
  STATIC_CATALOG_PATH,
};
