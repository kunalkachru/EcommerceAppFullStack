# Static Product Catalog & Multi-Parameter Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the live-fetched, attribute-sparse product catalog with a static, self-contained, fully-attributed catalog (~200 products), and extend the search pipeline so multi-parameter queries ("brown size XL trousers", "wireless headphones under $50", "waterproof makeup") return correct, relevant results — with zero regression on Android or iOS.

**Architecture:** A new `server/data/catalog-static.json` becomes the sole runtime data source (mode-switchable, live-fetch code preserved but dormant). Search stays on its existing CLIP-embedding + lexical-candidate + constraint-boost pipeline (`naturalSearch.js` → `searchTextCatalog.js`/`searchSemanticFirst` → `semanticTextReranker.js`), extended to understand and score against `sizes`/`specifications`/`colors`/`materials` as structured fields instead of raw-text substring matching only.

**Tech Stack:** Node.js/Express server, MiniSearch (lexical), `@huggingface/transformers` CLIP embeddings, React Native client, Maestro E2E (Android + iOS), Jest.

## Global Constraints

- Catalog size: 180-220 products, exactly 12 categories (see Task 1.1 for the fixed list and per-category counts).
- No SKU-level variants — attributes are product-level arrays (`colors`, `materials`, `sizes`, `specifications`), never a separate variant/inventory record. (Design spec §4.3 — explicitly out of scope.)
- No OpenAI/external API calls for catalog authoring — attribute generation is done directly by the implementing agent, in-repo, one time. OpenAI usage stays confined to the existing runtime query parser (`voiceQueryLLM.js`).
- Live-fetch code (`dummyjson`/`fakestoreapi`/`escuelajs` calls) must be relocated, never deleted, and re-activatable via `CATALOG_MODE=live`.
- Android and iOS E2E flows live only in their existing separate folders (`.maestro/android/`, `.maestro/ios/`) — no shared/conditional scripts. Flows use `testID`-based `tapOn`/`scrollUntilVisible`, never fixed coordinates.
- Every phase ends with a stated regression gate. A gate failing stops work — no proceeding with known-broken state.
- Android's full gate must be 100% green before any iOS work begins in Phase 7.
- 3D models and SKU-variant cart selection are explicitly NOT part of this plan (see design spec §3, §9 backlog items).

---

# PHASE 1: Build the Static Catalog

## Task 1.1: Define Category Taxonomy & Attribute Pools

**Files:**
- Create: `server/scripts/catalogAttributePools.js`

**Interfaces:**
- Produces: `CATEGORY_TARGETS` (array of `{ key, label, department, audience, targetCount, hasSizes, sizeType, materialsRequired }`), `COLOR_PALETTE` (string array), `SIZE_TABLES` (object keyed by `sizeType`), `MATERIAL_POOLS` (object keyed by category key), `SPECIFICATION_POOLS` (object keyed by category key) — all consumed by Task 1.3's authoring script.

- [ ] **Step 1: Create the attribute-pool config module**

```js
// server/scripts/catalogAttributePools.js

const CATEGORY_TARGETS = [
  { key: "mens-clothing", label: "Men's Clothing", department: "fashion", audience: "men", targetCount: 20, hasSizes: true, sizeType: "apparel", materialsRequired: true },
  { key: "womens-clothing", label: "Women's Clothing", department: "fashion", audience: "women", targetCount: 20, hasSizes: true, sizeType: "apparel", materialsRequired: true },
  { key: "footwear", label: "Footwear", department: "fashion", audience: "unisex", targetCount: 20, hasSizes: true, sizeType: "shoe", materialsRequired: true },
  { key: "electronics", label: "Electronics", department: "tech", audience: "unisex", targetCount: 22, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "beauty-fragrances", label: "Beauty & Fragrances", department: "beauty", audience: "unisex", targetCount: 22, hasSizes: false, sizeType: null, materialsRequired: false },
  { key: "jewelry", label: "Jewelry", department: "accessories", audience: "unisex", targetCount: 12, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "home-kitchen", label: "Home & Kitchen", department: "home", audience: "unisex", targetCount: 24, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "groceries", label: "Groceries", department: "essentials", audience: "unisex", targetCount: 10, hasSizes: false, sizeType: null, materialsRequired: false },
  { key: "sports-fitness", label: "Sports & Fitness", department: "lifestyle", audience: "unisex", targetCount: 12, hasSizes: false, sizeType: null, materialsRequired: false },
  { key: "bags-accessories", label: "Bags & Accessories", department: "fashion", audience: "unisex", targetCount: 16, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "watches", label: "Watches", department: "accessories", audience: "unisex", targetCount: 10, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "automotive", label: "Automotive", department: "specialty", audience: "unisex", targetCount: 12, hasSizes: false, sizeType: null, materialsRequired: true },
];

// Total: 20+20+20+22+22+12+24+10+12+16+10+12 = 200

const COLOR_PALETTE = [
  "black", "white", "brown", "navy", "gray", "beige",
  "red", "blue", "green", "pink", "yellow", "burgundy", "olive", "tan",
];

const SIZE_TABLES = {
  apparel_top: ["XS", "S", "M", "L", "XL", "XXL"],
  apparel_waist: ["28", "30", "32", "34", "36", "38"],
  shoe: ["6", "7", "8", "9", "10", "11", "12"],
};

// Subcategory keyword -> which SIZE_TABLES key applies (checked in order, first match wins)
const APPAREL_SIZE_RULES = [
  { test: /trouser|jean|pant|chino/i, sizeTableKey: "apparel_waist" },
  { test: /.*/, sizeTableKey: "apparel_top" }, // default for shirts/jackets/dresses/etc.
];

const MATERIAL_POOLS = {
  "mens-clothing": ["cotton", "denim", "wool", "linen", "cotton blend", "polyester"],
  "womens-clothing": ["cotton", "silk", "linen", "cotton blend", "polyester", "wool"],
  footwear: ["leather", "canvas", "suede", "mesh", "rubber"],
  electronics: ["aluminum", "plastic", "silicone", "glass"],
  jewelry: ["gold-plated", "sterling silver", "stainless steel", "gemstone"],
  "home-kitchen": ["stainless steel", "ceramic", "glass", "wood", "cast iron", "silicone"],
  "bags-accessories": ["leather", "canvas", "nylon", "faux leather"],
  watches: ["stainless steel", "leather strap", "silicone strap", "titanium"],
  automotive: ["rubber", "aluminum", "abs plastic", "microfiber"],
};

const SPECIFICATION_POOLS = {
  electronics: { wireless: "boolean", bluetooth: "boolean", waterproof: "boolean", batteryLife: "string" },
  "beauty-fragrances": { waterproof: "boolean", longLasting: "boolean", crueltyFree: "boolean", hypoallergenic: "boolean" },
  footwear: { waterproof: "boolean", breathable: "boolean", slipResistant: "boolean" },
  "mens-clothing": { waterproof: "boolean", breathable: "boolean", stretchable: "boolean", wrinkleResistant: "boolean" },
  "womens-clothing": { waterproof: "boolean", breathable: "boolean", stretchable: "boolean", wrinkleResistant: "boolean" },
  "sports-fitness": { waterproof: "boolean", breathable: "boolean", adjustable: "boolean" },
  "home-kitchen": { dishwasherSafe: "boolean", microwaveSafe: "boolean", nonStick: "boolean" },
  "bags-accessories": { waterResistant: "boolean", adjustableStrap: "boolean" },
  watches: { waterResistant: "boolean", batteryLife: "string" },
  jewelry: { hypoallergenic: "boolean" },
  automotive: { universalFit: "boolean", weatherResistant: "boolean" },
  groceries: { organic: "boolean", glutenFree: "boolean" },
};

module.exports = {
  CATEGORY_TARGETS,
  COLOR_PALETTE,
  SIZE_TABLES,
  APPAREL_SIZE_RULES,
  MATERIAL_POOLS,
  SPECIFICATION_POOLS,
};
```

- [ ] **Step 2: Verify the module loads and totals are correct**

Run:
```bash
node -e "
const p = require('./server/scripts/catalogAttributePools.js');
const total = p.CATEGORY_TARGETS.reduce((s, c) => s + c.targetCount, 0);
console.log('Categories:', p.CATEGORY_TARGETS.length, 'Total target:', total);
if (p.CATEGORY_TARGETS.length !== 12) throw new Error('Expected 12 categories');
if (total < 180 || total > 220) throw new Error('Target count out of 180-220 range');
console.log('OK');
"
```
Expected: `Categories: 12 Total target: 200` then `OK`.

- [ ] **Step 3: Commit**

```bash
git add server/scripts/catalogAttributePools.js
git commit -m "feat: Phase 1.1 - Define category taxonomy and attribute pools for static catalog"
```

---

## Task 1.2: Select ~200 Source Products from Existing Snapshot

**Files:**
- Create: `server/scripts/selectCatalogProducts.mjs`
- Consumes: `server/catalog-snapshot.json` (384 products, existing)
- Produces: `server/data/catalog-selection.json` (intermediate — selected products mapped to target categories, before attribute authoring)

**Interfaces:**
- Consumes: `CATEGORY_TARGETS` from Task 1.1's `catalogAttributePools.js`.
- Produces: JSON array of `{ ...originalProductFields, targetCategoryKey }`, written to `server/data/catalog-selection.json`, consumed by Task 1.3.

- [ ] **Step 1: Write the selection script**

```js
// server/scripts/selectCatalogProducts.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CATEGORY_TARGETS } from "./catalogAttributePools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, "..", "catalog-snapshot.json");
const OUTPUT_PATH = join(__dirname, "..", "data", "catalog-selection.json");

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

function main() {
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  const products = snapshot.products || [];

  const byCategory = new Map(CATEGORY_TARGETS.map((c) => [c.key, []]));

  for (const product of products) {
    const targetKey = targetCategoryFor(product);
    if (!targetKey || !byCategory.has(targetKey)) continue;
    byCategory.get(targetKey).push(product);
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

main();
```

- [ ] **Step 2: Run the selection script**

Run: `node server/scripts/selectCatalogProducts.mjs`
Expected: `Selected NNN products across 12 categories.` where NNN is between 180-200. If shortfalls print, note them — Task 1.3 must manually author enough additional products in that category (invented but realistic, following the same schema) to reach the category's `targetCount`.

- [ ] **Step 3: Verify output structure**

Run:
```bash
node -e "
const d = require('./server/data/catalog-selection.json');
console.log('Total selected:', d.selection.length);
const byCat = {};
for (const p of d.selection) byCat[p.targetCategoryKey] = (byCat[p.targetCategoryKey]||0)+1;
console.log(byCat);
"
```
Expected: a count per category key, all reasonably close to their targets (shortfalls acceptable here — fixed in Task 1.3).

- [ ] **Step 4: Commit**

```bash
git add server/scripts/selectCatalogProducts.mjs server/data/catalog-selection.json
git commit -m "feat: Phase 1.2 - Select ~200 candidate products from existing snapshot"
```

---

## Task 1.3: Author Complete Attributes (Colors, Materials, Sizes, Specifications, Descriptions)

**Files:**
- Create: `server/scripts/authorCatalogAttributes.mjs`
- Consumes: `server/data/catalog-selection.json` (Task 1.2 output), `server/scripts/catalogAttributePools.js` (Task 1.1)
- Produces: `server/data/catalog-static.json` (the authoritative catalog — final schema per design spec §4.2)

**Interfaces:**
- Produces: array of product objects each with `id, title, description, brand, category, categoryLabel, department, subcategory, audience, price, currency, priceTier, images, colors, materials, sizes, specifications, tags, keywords, sku, inventoryCount, availability, rating` — this exact field set is consumed by every later task (catalogService.js, reranker, lexical index, client filter).

This task is **authored directly, per product, by the implementing agent** (not scripted randomization) — per the Global Constraint against external API calls for this step. The script below provides the deterministic scaffolding (IDs, SKUs, size-table lookup, schema validation); the agent fills in the per-product `colors`/`materials`/`specifications`/description-polish arrays with realistic, considered values while writing this file, the same way a human catalog editor would, using the real title/description/category as grounding.

- [ ] **Step 1: Write the authoring scaffold**

```js
// server/scripts/authorCatalogAttributes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CATEGORY_TARGETS,
  SIZE_TABLES,
  APPAREL_SIZE_RULES,
  MATERIAL_POOLS,
  SPECIFICATION_POOLS,
} from "./catalogAttributePools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SELECTION_PATH = join(__dirname, "..", "data", "catalog-selection.json");
const OUTPUT_PATH = join(__dirname, "..", "data", "catalog-static.json");

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function priceTier(price) {
  if (price < 30) return "entry";
  if (price < 80) return "budget";
  if (price < 200) return "mid";
  if (price < 800) return "premium";
  return "luxury";
}

function sizeTableFor(target, product) {
  if (!target.hasSizes) return [];
  if (target.sizeType === "shoe") return SIZE_TABLES.shoe;
  const hay = `${product.title} ${product.description}`;
  const rule = APPAREL_SIZE_RULES.find((r) => r.test.test(hay));
  return SIZE_TABLES[rule.sizeTableKey];
}

/**
 * PER-PRODUCT ATTRIBUTE AUTHORING TABLE
 * Keyed by the original snapshot product id (e.g. "dj-45"). Each entry is
 * authored by hand by the implementing agent: 2-3 realistic colors from
 * COLOR_PALETTE, materials from MATERIAL_POOLS[targetCategoryKey] (empty
 * array allowed when materialsRequired is false for that category), a
 * subset of SPECIFICATION_POOLS[targetCategoryKey] keys set to realistic
 * true/false or a descriptive string, and (optionally) a polished
 * description. Populated incrementally, product by product, across all
 * ~200 selected items before this script is run for real.
 *
 * Example entries (agent fills in the rest for every selected product id):
 */
const AUTHORED_ATTRIBUTES = {
  "dj-1": { // Essence Mascara Lash Princess
    colors: ["black"],
    materials: [],
    specifications: { waterproof: false, longLasting: true, crueltyFree: true },
  },
  "dj-2": { // Eyeshadow Palette with Mirror
    colors: ["brown", "beige", "tan"],
    materials: [],
    specifications: { longLasting: true, crueltyFree: false },
  },
  // ... continues for every id present in catalog-selection.json
};

function authorProduct(product, target) {
  const authored = AUTHORED_ATTRIBUTES[product.id];
  if (!authored) {
    throw new Error(
      `Missing authored attributes for product id "${product.id}" (${product.title}). ` +
      `Add an entry to AUTHORED_ATTRIBUTES before running this script.`
    );
  }

  const sizes = sizeTableFor(target, product);
  const title = String(product.title).trim();
  const slug = slugify(title);
  const normalizedId = slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-");

  return {
    id: product.id,
    title,
    description: authored.description || product.description,
    brand: product.brand || "ShopEase Select",
    category: target.key,
    categoryLabel: target.label,
    department: target.department,
    subcategory: target.key,
    audience: target.audience,
    price: Number(product.price) || 0,
    currency: "USD",
    priceTier: priceTier(Number(product.price) || 0),
    images: [], // populated by Task 1.4 (downloadCatalogImages.mjs) after this file is written
    colors: authored.colors || [],
    materials: authored.materials || [],
    sizes,
    specifications: authored.specifications || {},
    tags: Array.isArray(product.tags) ? product.tags.slice(0, 12) : [],
    keywords: [
      ...(authored.colors || []),
      ...(authored.materials || []),
      target.key,
      target.audience,
    ],
    sku: `SKU-${normalizedId}`,
    inventoryCount: 12 + (normalizedId.length % 40),
    availability: "in_stock",
    rating: typeof product.rating === "number" ? product.rating : 4.0,
    slug,
  };
}

function main() {
  const { selection } = JSON.parse(readFileSync(SELECTION_PATH, "utf8"));
  const targetsByKey = new Map(CATEGORY_TARGETS.map((t) => [t.key, t]));

  const authored = selection.map((product) => {
    const target = targetsByKey.get(product.targetCategoryKey);
    return authorProduct(product, target);
  });

  writeFileSync(OUTPUT_PATH, JSON.stringify({ updatedAt: new Date(0).toISOString(), products: authored }, null, 2), "utf8");
  console.log(`Authored ${authored.length} products -> ${OUTPUT_PATH}`);
}

main();
```

- [ ] **Step 2: Author every product's attributes**

For each of the ~200 products in `server/data/catalog-selection.json`, add one entry to `AUTHORED_ATTRIBUTES` in the script above:
- `colors`: 1-3 values from `COLOR_PALETTE` matching what's plausible for that specific product (e.g. a mascara → `["black"]`, not `["red","green"]`).
- `materials`: from `MATERIAL_POOLS[targetCategoryKey]` if that category has `materialsRequired: true`; empty array otherwise.
- `specifications`: a realistic subset of `SPECIFICATION_POOLS[targetCategoryKey]` keys, each set to a plausible value for that specific product (not every product needs every key — e.g. not every electronics item is `wireless`).
- `description` (optional): only include if the original source description is thin (<40 chars) and needs a genuine rewrite; otherwise omit and the original is kept.

Do this directly in the file — it is real implementation work, not a placeholder to defer.

- [ ] **Step 3: Run the authoring script**

Run: `node server/scripts/authorCatalogAttributes.mjs`
Expected: `Authored 200 products -> .../server/data/catalog-static.json` (no "Missing authored attributes" error — if one is thrown, go back to Step 2 for that product id).

- [ ] **Step 4: Commit**

```bash
git add server/scripts/authorCatalogAttributes.mjs server/data/catalog-static.json
git commit -m "feat: Phase 1.3 - Author complete attributes for all static catalog products"
```

---

## Task 1.4: Download and Localize Product Images

**Files:**
- Create: `server/scripts/downloadCatalogImages.mjs`
- Modify: `server/data/catalog-static.json` (fills in the `images` array left empty by Task 1.3)
- Creates: `assets/products/<slug>/1.jpg`, `2.jpg`, ... (repo root `assets/` directory, new)

**Interfaces:**
- Consumes: `server/data/catalog-selection.json` (original `images` URLs, keyed by product `id`), `server/data/catalog-static.json` (products to update).
- Produces: local JPEG files under `assets/products/<slug>/`, and rewrites each product's `images` field in `catalog-static.json` to repo-relative paths (e.g. `"assets/products/essence-mascara-lash-princess/1.jpg"`).

- [ ] **Step 1: Write the image download script**

```js
// server/scripts/downloadCatalogImages.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const SELECTION_PATH = join(__dirname, "..", "data", "catalog-selection.json");
const STATIC_PATH = join(__dirname, "..", "data", "catalog-static.json");
const ASSETS_ROOT = join(REPO_ROOT, "assets", "products");
const MAX_IMAGES_PER_PRODUCT = 4;

async function downloadOne(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buf);
}

async function main() {
  const { selection } = JSON.parse(readFileSync(SELECTION_PATH, "utf8"));
  const staticCatalog = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  const sourceById = new Map(selection.map((p) => [p.id, p]));

  let done = 0;
  for (const product of staticCatalog.products) {
    const source = sourceById.get(product.id);
    const sourceImages = (source?.images || []).slice(0, MAX_IMAGES_PER_PRODUCT);
    if (!sourceImages.length) {
      console.warn(`No source images for ${product.id} (${product.title}) — skipping`);
      continue;
    }

    const dir = join(ASSETS_ROOT, product.slug);
    mkdirSync(dir, { recursive: true });

    const localPaths = [];
    for (let i = 0; i < sourceImages.length; i += 1) {
      const ext = sourceImages[i].match(/\.(webp|png|jpe?g)(\?|$)/i)?.[1] || "jpg";
      const filename = `${i + 1}.${ext}`;
      const destPath = join(dir, filename);
      if (!existsSync(destPath)) {
        await downloadOne(sourceImages[i], destPath);
      }
      localPaths.push(`assets/products/${product.slug}/${filename}`);
    }
    product.images = localPaths;
    done += 1;
    if (done % 20 === 0) console.log(`... ${done}/${staticCatalog.products.length}`);
  }

  writeFileSync(STATIC_PATH, JSON.stringify(staticCatalog, null, 2), "utf8");
  console.log(`Localized images for ${done}/${staticCatalog.products.length} products.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the download script**

Run: `node server/scripts/downloadCatalogImages.mjs`
Expected: `Localized images for 200/200 products.` (any "No source images" warnings must be resolved by manually adding a valid image URL for that product in `catalog-selection.json` and re-running before proceeding).

- [ ] **Step 3: Verify repo size stays in target range**

Run: `du -sh assets/products/`
Expected: roughly 40-90MB. If significantly over 90MB, re-run with a lower `MAX_IMAGES_PER_PRODUCT` (e.g. 3) or add JPEG compression via `sharp` before proceeding.

- [ ] **Step 4: Commit**

```bash
git add assets/products/ server/data/catalog-static.json server/scripts/downloadCatalogImages.mjs
git commit -m "feat: Phase 1.4 - Download and localize catalog product images"
```

---

## Task 1.5: Validation Gate (Phase 1 Completion Gate)

**Files:**
- Create: `server/scripts/validateCatalogStatic.mjs`
- Create: `__tests__/catalogStaticValidation.test.js`

**Interfaces:**
- Consumes: `server/data/catalog-static.json`.
- Produces: exit code 0 (pass) / 1 (fail) for CLI use, and a Jest suite for CI use — both check the same rules.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/catalogStaticValidation.test.js
const catalog = require("../server/data/catalog-static.json");
const { CATEGORY_TARGETS } = require("../server/scripts/catalogAttributePools.js");

describe("catalog-static.json completeness", () => {
  const products = catalog.products;

  it("has between 180 and 220 products", () => {
    expect(products.length).toBeGreaterThanOrEqual(180);
    expect(products.length).toBeLessThanOrEqual(220);
  });

  it("every product has at least one color", () => {
    const missing = products.filter((p) => !Array.isArray(p.colors) || p.colors.length === 0);
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it("every product in a materialsRequired category has at least one material", () => {
    const requiredKeys = new Set(
      CATEGORY_TARGETS.filter((t) => t.materialsRequired).map((t) => t.key)
    );
    const missing = products.filter(
      (p) => requiredKeys.has(p.category) && (!Array.isArray(p.materials) || p.materials.length === 0)
    );
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it("every product in a hasSizes category has a non-empty sizes array", () => {
    const sizedKeys = new Set(CATEGORY_TARGETS.filter((t) => t.hasSizes).map((t) => t.key));
    const missing = products.filter(
      (p) => sizedKeys.has(p.category) && (!Array.isArray(p.sizes) || p.sizes.length === 0)
    );
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it("every product has at least one local image path (not a remote URL)", () => {
    const bad = products.filter(
      (p) => !Array.isArray(p.images) || p.images.length === 0 || p.images.some((i) => /^https?:\/\//.test(i))
    );
    expect(bad.map((p) => p.id)).toEqual([]);
  });

  it("has no duplicate SKUs", () => {
    const skus = products.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (or passes) against current state**

Run: `npx jest __tests__/catalogStaticValidation.test.js`
Expected at this point: PASS (Tasks 1.1-1.4 already produced a complete catalog) — this test is the automated gate confirming Phase 1 is genuinely done, not a red/green TDD cycle for new production code. If it fails, the failure output tells you exactly which product ids are incomplete — go back to Task 1.3/1.4 and fix them.

- [ ] **Step 3: Write the CLI validation script (for use in later phases' CI-style checks)**

```js
// server/scripts/validateCatalogStatic.mjs
import { execSync } from "node:child_process";

try {
  execSync("npx jest __tests__/catalogStaticValidation.test.js", { stdio: "inherit" });
  console.log("Catalog validation PASSED.");
  process.exit(0);
} catch {
  console.error("Catalog validation FAILED. See test output above.");
  process.exit(1);
}
```

- [ ] **Step 4: Add npm script and run it**

Add to root `package.json` `scripts`:
```json
"validate:catalog": "node server/scripts/validateCatalogStatic.mjs"
```

Run: `npm run validate:catalog`
Expected: `Catalog validation PASSED.`

- [ ] **Step 5: Commit**

```bash
git add __tests__/catalogStaticValidation.test.js server/scripts/validateCatalogStatic.mjs package.json
git commit -m "feat: Phase 1.5 - Add automated validation gate for static catalog completeness"
```

## PHASE 1 GATE

- [ ] `npm run validate:catalog` passes.
- [ ] `server/data/catalog-static.json` has 180-220 products across exactly the 12 categories.
- [ ] `assets/products/` contains local images for every product, no remote URLs remain in `catalog-static.json`.
- [ ] Repo size increase for `assets/products/` is within ~40-90MB.

**Do not proceed to Phase 2 until this gate is green.**

---

# PHASE 2: Build the Test-Image Gallery

## Task 2.1: Build the Image-Search Sample Gallery from Real Catalog Images

**Files:**
- Create: `server/scripts/buildImageSearchGallery.mjs`
- Creates: `test-assets/image-search-samples/<category-key>/sample-1.jpg` (+ `sample-2.jpg` for the 3 largest categories), `test-assets/image-search-samples/manifest.json`

**Interfaces:**
- Consumes: `server/data/catalog-static.json` (post Phase 1).
- Produces: `test-assets/image-search-samples/manifest.json` — `[{ file: "mens-clothing/sample-1.jpg", productId, productTitle, category }]`, consumed by Task 6.1's Maestro flows and Task 6.2's assertions.

- [ ] **Step 1: Write the gallery-builder script**

```js
// server/scripts/buildImageSearchGallery.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CATEGORY_TARGETS } from "./catalogAttributePools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const STATIC_PATH = join(__dirname, "..", "data", "catalog-static.json");
const GALLERY_ROOT = join(REPO_ROOT, "test-assets", "image-search-samples");

function main() {
  const { products } = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  const manifest = [];

  for (const target of CATEGORY_TARGETS) {
    const candidates = products.filter((p) => p.category === target.key && p.images?.length);
    // Take up to 2 samples per category: one "typical" (first by id) and one with the
    // richest colors (best for testing color-aware image search).
    const picks = [
      candidates[0],
      [...candidates].sort((a, b) => (b.colors?.length || 0) - (a.colors?.length || 0))[0],
    ].filter((p, idx, arr) => p && arr.findIndex((x) => x.id === p.id) === idx);

    const dir = join(GALLERY_ROOT, target.key);
    mkdirSync(dir, { recursive: true });

    picks.forEach((product, idx) => {
      const sourcePath = join(REPO_ROOT, product.images[0]);
      const filename = `sample-${idx + 1}.jpg`;
      copyFileSync(sourcePath, join(dir, filename));
      manifest.push({
        file: `${target.key}/${filename}`,
        productId: product.id,
        productTitle: product.title,
        category: target.key,
        colors: product.colors,
      });
    });
  }

  writeFileSync(join(GALLERY_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Built gallery with ${manifest.length} sample images across ${CATEGORY_TARGETS.length} categories.`);
}

main();
```

- [ ] **Step 2: Run the script**

Run: `node server/scripts/buildImageSearchGallery.mjs`
Expected: `Built gallery with 20-24 sample images across 12 categories.`

- [ ] **Step 3: Verify manifest**

Run: `cat test-assets/image-search-samples/manifest.json | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.length, 'entries'); console.log(d[0]);"`
Expected: entry count matches script output; first entry has `file`, `productId`, `productTitle`, `category`, `colors`.

- [ ] **Step 4: Commit**

```bash
git add server/scripts/buildImageSearchGallery.mjs test-assets/image-search-samples/
git commit -m "feat: Phase 2.1 - Build image-search test gallery from real catalog images"
```

## PHASE 2 GATE

- [ ] `test-assets/image-search-samples/manifest.json` exists with one entry per sample image, all 12 categories represented.

---

# PHASE 3: Swap Backend to Static-Only Mode

## Task 3.1: Relocate Live-Fetch Logic to `catalogLiveSource.js`

**Files:**
- Create: `server/src/catalogLiveSource.js`
- Modify: `server/src/catalogService.js`

**Interfaces:**
- Produces (`catalogLiveSource.js`): `async function fetchLiveCatalog(): Promise<{ products: Product[], meta: object }>` — encapsulates exactly the current `fetchCatalog()` body (dummyjson/fakestoreapi/escuelajs calls, snapshot fallback merge) unchanged.
- Consumes (`catalogService.js`): `fetchLiveCatalog` when `CATALOG_MODE=live`.

- [ ] **Step 1: Create `catalogLiveSource.js` by moving the live-fetch body verbatim**

```js
// server/src/catalogLiveSource.js
/**
 * Live third-party catalog fetch (dummyjson/fakestoreapi/escuelajs), merged
 * with the on-disk snapshot as fallback. Preserved from the original
 * catalogService.js — kept dormant by default (see catalogService.js's
 * CATALOG_MODE switch) and re-activatable via CATALOG_MODE=live.
 */
const { getDemoCoverageProducts } = require("./demoCoverageProducts");
const { normalizeCatalogProducts } = require("./catalogMetadata");
const path = require("path");
const fs = require("fs");

const MIN_TARGET = 200;
const SNAPSHOT_CANDIDATE_PATHS = [
  path.join(__dirname, "..", "catalog-snapshot.json"),
  path.join(__dirname, "..", "data", "catalog-snapshot.json"),
  path.join(__dirname, "..", "..", "src", "data", "catalog-fallback.json"),
];

function mapDummyJson(item) {
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
  const category = typeof item.category === "object" ? item.category?.name : item.category;
  const images = Array.isArray(item.images) ? item.images.map(String).filter(Boolean) : [];
  const image = images[0] || (typeof item.category === "object" ? item.category?.image : "") || "";
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
  const res = await fetch(url, { headers: { "User-Agent": "ShopEaseCatalog/1.0" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

function mergeProducts(lists) {
  return normalizeCatalogProducts(lists.flat());
}

async function loadSnapshot() {
  try {
    for (const snapshotPath of SNAPSHOT_CANDIDATE_PATHS) {
      if (!fs.existsSync(snapshotPath)) continue;
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

async function fetchLiveCatalog() {
  const sourceStats = [];
  let merged = [];
  let snapshotCount = 0;
  let snapshotSeeded = false;
  let usedSnapshotFallback = false;

  try {
    const snapshot = await loadSnapshot();
    const sources = await Promise.all([
      fetchJson("https://dummyjson.com/products?limit=0")
        .then((body) => ({ name: "dummyjson", products: (body.products || []).map(mapDummyJson) }))
        .catch((err) => { console.warn("[catalog-live] dummyjson failed:", err.message); return { name: "dummyjson", products: [] }; }),
      fetchJson("https://fakestoreapi.com/products")
        .then((body) => ({ name: "fakestore", products: (body || []).map(mapFakeStore) }))
        .catch((err) => { console.warn("[catalog-live] fakestore failed:", err.message); return { name: "fakestore", products: [] }; }),
      fetchJson("https://api.escuelajs.co/api/v1/products")
        .then((body) => ({ name: "escuelajs", products: (body || []).map(mapEscuela) }))
        .catch((err) => { console.warn("[catalog-live] escuelajs failed:", err.message); return { name: "escuelajs", products: [] }; }),
    ]);

    for (const source of sources) sourceStats.push({ name: source.name, count: source.products.length });
    const liveSourceProductCount = sourceStats.reduce((sum, s) => sum + s.count, 0);
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

    if (!merged.length) throw new Error("All live catalog sources failed");
  } catch (err) {
    console.warn("[catalog-live] Live fetch failed:", err.message);
    const snapshot = await loadSnapshot();
    if (snapshot?.length) {
      return {
        products: mergeProducts([getDemoCoverageProducts(), snapshot]),
        meta: { sources: ["snapshot"], total: snapshot.length, offline: true },
      };
    }
    throw err;
  }

  const meta = {
    sources: usedSnapshotFallback
      ? ["snapshot"]
      : snapshotSeeded
        ? [{ name: "snapshot-seed", count: snapshotCount }, ...sourceStats]
        : sourceStats,
    total: merged.length,
    offline: usedSnapshotFallback,
  };

  return { products: merged, meta };
}

module.exports = { fetchLiveCatalog, MIN_TARGET, SNAPSHOT_CANDIDATE_PATHS };
```

- [ ] **Step 2: Rewrite `catalogService.js` as a mode switch**

```js
// server/src/catalogService.js
/**
 * Product catalog source. Defaults to the static, self-contained catalog
 * (server/data/catalog-static.json). Set CATALOG_MODE=live to re-activate
 * the original live third-party fetch (see catalogLiveSource.js) — kept
 * fully functional but dormant by default.
 */
const path = require("path");
const fs = require("fs");

const CATALOG_TTL_MS = 60 * 60 * 1000;
const STATIC_CATALOG_PATH = path.join(__dirname, "..", "data", "catalog-static.json");

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
```

- [ ] **Step 3: Write tests for both modes**

```js
// __tests__/catalogService.modeSwitch.test.js
describe("catalogService CATALOG_MODE switch", () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.CATALOG_MODE;
  });

  it("defaults to static mode and loads catalog-static.json", async () => {
    jest.resetModules();
    delete process.env.CATALOG_MODE;
    const { fetchCatalog, getCatalogMeta } = require("../server/src/catalogService");
    const products = await fetchCatalog({ force: true });
    expect(products.length).toBeGreaterThanOrEqual(180);
    expect(getCatalogMeta().sources).toEqual(["static"]);
  });

  it("static-mode products have local image paths, not remote URLs", async () => {
    jest.resetModules();
    const { fetchCatalog } = require("../server/src/catalogService");
    const products = await fetchCatalog({ force: true });
    const bad = products.filter((p) => (p.images || []).some((i) => /^https?:\/\//.test(i)));
    expect(bad).toEqual([]);
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/catalogService.modeSwitch.test.js`
Expected: 2 passed.

- [ ] **Step 5: Delete the old live-fetch code path from git history is NOT required — confirm old `catalogService.js` behavior is fully preserved in `catalogLiveSource.js` by manually testing live mode**

Run: `CATALOG_MODE=live node -e "require('./server/src/catalogService').fetchCatalog({force:true}).then(p => console.log('live mode loaded', p.length, 'products'))"`
Expected: `live mode loaded NNN products` (NNN ~ 250-380, depending on live API availability that day) — confirms `CATALOG_MODE=live` still works and nothing was lost in the relocation.

- [ ] **Step 6: Commit**

```bash
git add server/src/catalogLiveSource.js server/src/catalogService.js __tests__/catalogService.modeSwitch.test.js
git commit -m "feat: Phase 3.1 - Relocate live-fetch to catalogLiveSource.js, default to static catalog"
```

---

## Task 3.2: Sync Client-Side Fallback Catalog

**Files:**
- Create: `server/scripts/syncCatalogFallback.mjs`
- Modify: `src/data/catalog-fallback.json` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: `server/data/catalog-static.json`.
- Produces: `src/data/catalog-fallback.json` with the identical `products` array (same shape the existing test suite and RN client already expect).

- [ ] **Step 1: Write the sync script**

```js
// server/scripts/syncCatalogFallback.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const STATIC_PATH = join(__dirname, "..", "data", "catalog-static.json");
const FALLBACK_PATH = join(REPO_ROOT, "src", "data", "catalog-fallback.json");

function main() {
  const staticCatalog = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  writeFileSync(FALLBACK_PATH, JSON.stringify({ products: staticCatalog.products }, null, 2), "utf8");
  console.log(`Synced ${staticCatalog.products.length} products to ${FALLBACK_PATH}`);
}

main();
```

- [ ] **Step 2: Add npm script and run it**

Add to root `package.json` `scripts`:
```json
"sync:catalog-fallback": "node server/scripts/syncCatalogFallback.mjs"
```

Run: `npm run sync:catalog-fallback`
Expected: `Synced NNN products to .../src/data/catalog-fallback.json`.

- [ ] **Step 3: Run the existing client-side test suite to confirm no regression**

Run: `npx jest __tests__/catalogTextFilter.test.js`
Expected: all existing tests pass against the new (larger-attribute, smaller-count) catalog. If a test asserted an exact product count from the old fallback file, update it to be range-based (`toBeGreaterThan(0)` style, already the pattern used in that file) rather than hard-coded.

- [ ] **Step 4: Commit**

```bash
git add server/scripts/syncCatalogFallback.mjs src/data/catalog-fallback.json package.json
git commit -m "feat: Phase 3.2 - Sync static catalog to client-side fallback file"
```

## PHASE 3 GATE

- [ ] `curl http://localhost:5001/api/catalog/products` (server started fresh, no `CATALOG_MODE` set) returns `meta.total` between 180-220 and `meta.sources` = `["static"]`.
- [ ] `curl http://localhost:5001/api/catalog/products/<any-static-id>` returns a product with non-empty `colors`, local `images` paths.
- [ ] `CATALOG_MODE=live` still successfully fetches from the 3 external APIs (manually verified, Step 5 above).
- [ ] Full existing Jest suite passes: `npm test`.

**Do not proceed to Phase 4 until this gate is green.**

---

# PHASE 4: Rebuild the Visual-Search (CLIP) Index

## Task 4.1: Support Local File Paths in Image Embedding

**Files:**
- Modify: `server/src/visualSearch.js`

**Interfaces:**
- Consumes: `product.images[0]` — now a repo-relative path like `assets/products/<slug>/1.jpg` instead of an `https://` URL.
- Produces: same `embedImageFromUrl`-equivalent function, now resolving relative paths to absolute filesystem paths before calling `RawImage.read`.

- [ ] **Step 1: Locate the current image-loading call**

Run: `grep -n "RawImage.read\|embedImageFromUrl\|function embedImage" server/src/visualSearch.js`
Expected: shows the line(s) around `RawImage.read(url)` (line ~152 per earlier read) and the enclosing function name.

- [ ] **Step 2: Add a path-resolution helper and use it before `RawImage.read`**

```js
// server/src/visualSearch.js — add near the top, after existing requires
const path = require("path");
const REPO_ROOT = path.join(__dirname, "..", "..");

function resolveImageSource(imageRef) {
  if (/^https?:\/\//i.test(imageRef)) return imageRef; // remote URL (CATALOG_MODE=live path) unchanged
  return path.join(REPO_ROOT, imageRef); // local repo-relative path -> absolute fs path
}
```

Then change the existing embedding function's call site from:
```js
const image = await RawImage.read(url);
```
to:
```js
const image = await RawImage.read(resolveImageSource(url));
```

- [ ] **Step 3: Write a smoke test proving local-path reading works before running the full rebuild**

```js
// __tests__/visualSearch.localImages.smoke.test.js
const path = require("path");
const fs = require("fs");

describe("visualSearch local image support (smoke)", () => {
  it("resolves a local catalog image path to an existing file", () => {
    const catalog = require("../server/data/catalog-static.json");
    const sample = catalog.products.find((p) => p.images?.length);
    expect(sample).toBeTruthy();
    const absolute = path.join(__dirname, "..", sample.images[0]);
    expect(fs.existsSync(absolute)).toBe(true);
  });
});
```

- [ ] **Step 4: Run the smoke test**

Run: `npx jest __tests__/visualSearch.localImages.smoke.test.js`
Expected: PASS. This only checks path resolution, not the actual CLIP embedding call (which is slow/model-dependent) — full verification happens in Task 4.2's real rebuild run.

- [ ] **Step 5: Commit**

```bash
git add server/src/visualSearch.js __tests__/visualSearch.localImages.smoke.test.js
git commit -m "feat: Phase 4.1 - Support local file paths in CLIP image embedding"
```

---

## Task 4.2: Rebuild the CLIP Embedding Cache

**Files:**
- Create: `server/scripts/rebuildClipIndex.js`
- Modify: `server/data/clip-embeddings.json` (regenerated — this is a build artifact, safe to fully overwrite)

**Interfaces:**
- Consumes: `server/src/visualSearch.js`'s existing `warmVisualSearchIndex` export (confirmed present via the `index.js` import list read earlier), `server/data/catalog-static.json`.

Note: `visualSearch.js`, like every other file under `server/src/`, is CommonJS (`require`/`module.exports`), not ESM. This script is written as plain `.js` with `require()` to match — do not use `.mjs`/`import` here (unlike the Phase 1/2 authoring scripts, which only import the simple object-literal `catalogAttributePools.js` config where ESM/CJS interop is safe; `visualSearch.js` is a large, complex module where that interop is not guaranteed).

- [ ] **Step 1: Write the rebuild trigger script**

```js
// server/scripts/rebuildClipIndex.js
const { warmVisualSearchIndex } = require("../src/visualSearch");

async function main() {
  console.log("Rebuilding CLIP embedding index against catalog-static.json ...");
  const start = Date.now();
  await warmVisualSearchIndex({ force: true });
  console.log(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error("CLIP rebuild failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Confirm `warmVisualSearchIndex`'s real signature before running**

Run: `grep -n "warmVisualSearchIndex" server/src/visualSearch.js`
Expected: shows the function definition and its parameter list. If it does **not** accept a `{ force: true }` option (or any option at all), adjust Step 1's call accordingly — the safe fallback that works regardless of signature is to delete the cache file first so it is forced to rebuild from scratch:

```bash
rm -f server/data/clip-embeddings.json
```

then call `warmVisualSearchIndex()` with whatever arguments (or none) its real signature requires, verified from this grep — not assumed.

- [ ] **Step 3: Run the rebuild (this is the real, slow, first-time verification of Task 4.1's local-path support)**

Run: `node server/scripts/rebuildClipIndex.js`
Expected: progress output for ~200 products, ending in `Done in Ns` with no `ENOENT`/file-not-found errors. An `ENOENT` here means Task 4.1's path resolution has a bug — fix it before proceeding, do not skip.

- [ ] **Step 4: Verify the rebuilt embeddings file**

Run:
```bash
node -e "
const d = require('./server/data/clip-embeddings.json');
console.log('Embedding entries:', Array.isArray(d) ? d.length : Object.keys(d).length);
"
```
Expected: entry count matches the static catalog's product count (180-220).

- [ ] **Step 5: Manually verify one image-search query end to end**

Run: `npm run server` (background), then:
```bash
curl -s -X POST http://localhost:5001/api/visual-search \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\": \"$(base64 -i test-assets/image-search-samples/mens-clothing/sample-1.jpg)\"}" | node -e "const d=JSON.parse(require('fs').readFileSync(0)); console.log(d.matches?.slice(0,3).map(m=>m.title));"
```
Expected: top matches include the actual product the sample image came from (cross-check against `test-assets/image-search-samples/manifest.json`'s `productTitle` for `mens-clothing/sample-1.jpg`).

- [ ] **Step 6: Commit**

```bash
git add server/scripts/rebuildClipIndex.js server/data/clip-embeddings.json
git commit -m "feat: Phase 4.2 - Rebuild CLIP embedding index against static catalog images"
```

## PHASE 4 GATE

- [ ] CLIP rebuild completes with zero file-read errors.
- [ ] Manual image-search spot check (Step 4) returns the correct source product in the top 3 matches for at least 3 different sample images across different categories.

**Do not proceed to Phase 5 until this gate is green.**

---

# PHASE 5: Extend Query Understanding and Filtering for Size & Specifications

## Task 5.1: Extend the Rule-Based Parser (`voiceQueryParser.js`) — Fallback Path

**Files:**
- Modify: `server/src/voiceQueryParser.js`
- Modify: `__tests__/voiceQueryParser` (create if no existing file — check first with `find . -iname "*voiceQueryParser*" -path "*__tests__*"`)

**Interfaces:**
- Produces: `parseVoiceQuery(text)` return object gains two new fields: `size: string | null`, `specifications: string[]` (specification *names* mentioned, e.g. `["waterproof"]` — boolean intent, not values).
- Consumes: used by `productMatchesIntent`/`relevanceScore` (same file) and by `buildSearchIntent` → `constraintBoost` (Task 5.3).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/voiceQueryParser.sizeSpec.test.js
const { parseVoiceQuery } = require("../server/src/voiceQueryParser");

describe("voiceQueryParser size and specification extraction", () => {
  it("extracts an apparel letter size", () => {
    const intent = parseVoiceQuery("brown trousers size XL");
    expect(intent.size).toBe("XL");
  });

  it("extracts a numeric waist size", () => {
    const intent = parseVoiceQuery("blue jeans size 32 waist");
    expect(intent.size).toBe("32");
  });

  it("extracts a specification keyword", () => {
    const intent = parseVoiceQuery("waterproof makeup under 15 dollars");
    expect(intent.specifications).toContain("waterproof");
  });

  it("extracts multiple specifications", () => {
    const intent = parseVoiceQuery("wireless bluetooth headphones");
    expect(intent.specifications).toEqual(expect.arrayContaining(["wireless", "bluetooth"]));
  });

  it("returns null size and empty specifications when none mentioned", () => {
    const intent = parseVoiceQuery("red lipstick");
    expect(intent.size).toBeNull();
    expect(intent.specifications).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/voiceQueryParser.sizeSpec.test.js`
Expected: FAIL — `intent.size` is `undefined`, not `"XL"` (the field doesn't exist yet).

- [ ] **Step 3: Add size and specification word lists + extraction to `voiceQueryParser.js`**

Add near the top, alongside the existing `COLOR_WORDS` constant:

```js
const SIZE_LETTER_WORDS = ["xs", "s", "m", "l", "xl", "xxl", "xxxl"];
const SIZE_WAIST_NUMBERS = ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40"];
const SIZE_SHOE_NUMBERS = ["5", "6", "7", "8", "9", "10", "11", "12", "13"];

const SPECIFICATION_WORDS = [
  "waterproof", "water-resistant", "water resistant",
  "wireless", "bluetooth",
  "long-lasting", "long lasting", "longlasting",
  "breathable", "stretchable", "wrinkle-resistant", "wrinkle resistant",
  "cruelty-free", "cruelty free", "hypoallergenic",
  "dishwasher-safe", "dishwasher safe", "microwave-safe", "microwave safe", "non-stick", "nonstick",
  "slip-resistant", "slip resistant", "adjustable", "organic", "gluten-free", "gluten free",
];

function normalizeSpecWord(raw) {
  return raw.replace(/[- ]/g, "").toLowerCase();
}

function extractSize(text) {
  const lower = String(text).toLowerCase();
  // Explicit "size X" / "size X waist" phrasing takes priority.
  const sizeMatch = lower.match(/\bsize\s+([a-z0-9]+)\b/);
  if (sizeMatch) {
    const raw = sizeMatch[1].toUpperCase();
    if (SIZE_LETTER_WORDS.includes(raw.toLowerCase()) || SIZE_WAIST_NUMBERS.includes(sizeMatch[1]) || SIZE_SHOE_NUMBERS.includes(sizeMatch[1])) {
      return raw;
    }
  }
  // Bare letter size as a standalone word (e.g. "trousers XL brown").
  for (const w of ["xxxl", "xxl", "xl", "s", "m", "l", "xs"]) {
    if (wordMatch(lower, w)) return w.toUpperCase();
  }
  return null;
}

function extractSpecifications(text) {
  const lower = String(text).toLowerCase();
  const hits = new Set();
  for (const spec of SPECIFICATION_WORDS) {
    if (wordMatch(lower, spec)) {
      hits.add(normalizeSpecWord(spec));
    }
  }
  return [...hits];
}
```

Then in `parseVoiceQuery()`, add the two new fields to the returned object:

```js
function parseVoiceQuery(text) {
  // ... existing body unchanged up through `keywords` computation ...

  const size = extractSize(raw);
  const specifications = extractSpecifications(raw);

  return {
    rawQuery: raw,
    searchText: semanticQuery,
    semanticQuery,
    priceMin,
    priceMax,
    gender,
    productTypes,
    categoryGroups,
    categoryFilters,
    keywords,
    size,
    specifications,
    summary: buildSummary({ priceMin, priceMax, gender, productTypes, categoryGroups, keywords }),
    source: "rules",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/voiceQueryParser.sizeSpec.test.js`
Expected: 5 passed.

- [ ] **Step 5: Run the full existing parser/filter test suite to confirm no regression**

Run: `npx jest __tests__/catalogTextFilter.test.js`
Expected: all previously-passing tests still pass (adding new fields to the return object must not break existing consumers that destructure specific fields).

- [ ] **Step 6: Commit**

```bash
git add server/src/voiceQueryParser.js __tests__/voiceQueryParser.sizeSpec.test.js
git commit -m "feat: Phase 5.1 - Extract size and specification intent in rule-based parser"
```

---

## Task 5.2: Extend the LLM-Based Parser (`voiceQueryLLM.js`) — Primary Path

**Files:**
- Modify: `server/src/voiceQueryLLM.js`

**Interfaces:**
- Produces: `resolveVoiceIntent()` return object also gains `size: string | null`, `specifications: string[]`, sourced from the LLM's JSON response when available, falling back to the rule-based extraction (Task 5.1) otherwise — mirroring the existing pattern for `keywords`/`productTypes`.

- [ ] **Step 1: Write the failing test**

```js
// __tests__/voiceQueryLLM.sizeSpec.test.js
const { resolveVoiceIntent } = require("../server/src/voiceQueryLLM");

describe("voiceQueryLLM size/specification passthrough (no API key -> rules fallback)", () => {
  it("falls back to rule-based size/specification extraction when LLM is not configured", async () => {
    const intent = await resolveVoiceIntent("brown trousers size XL", { useLlmReasoning: false });
    expect(intent.size).toBe("XL");
    expect(intent.source).toBe("rules");
  });

  it("falls back to rule-based specification extraction when LLM is not configured", async () => {
    const intent = await resolveVoiceIntent("waterproof wireless headphones", { useLlmReasoning: false });
    expect(intent.specifications).toEqual(expect.arrayContaining(["waterproof", "wireless"]));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/voiceQueryLLM.sizeSpec.test.js`
Expected: FAIL — `intent.size`/`intent.specifications` are `undefined` (the rules-path branch in `resolveVoiceIntent` returns `{ ...intent, searchText: intent.semanticQuery, source: "rules" }`, so once Task 5.1 lands, `intent.size`/`intent.specifications` should already be present via the spread — this test should actually PASS immediately after Task 5.1 with no code change here, since the rules-fallback path just spreads the rule parser's output. If it fails, it means the spread is dropping fields somewhere — find and fix that before continuing).

- [ ] **Step 3: Extend the LLM system prompt to request size/specifications**

```js
// server/src/voiceQueryLLM.js — replace SYSTEM_PROMPT
const SYSTEM_PROMPT = `You extract structured shopping search intent from spoken or typed customer requests.
Return ONLY valid JSON (no markdown) with this shape:
{
  "searchText": "natural language product description for semantic search",
  "keywords": ["important", "product", "terms"],
  "categories": ["catalog category slugs if inferable, else []"],
  "gender": "women" | "men" | "unisex" | null,
  "priceMin": number,
  "priceMax": number | null,
  "productTypes": ["shoes", "jacket", etc],
  "size": "XL" | "32" | "9" | null,
  "specifications": ["waterproof", "wireless", "bluetooth", etc],
  "summary": "short human-readable summary"
}
Rules:
- Infer gender from words like women/womens/ladies/girls vs men/mens/boys.
- Map footwear requests to categories like womens-shoes, mens-shoes, shoesk when relevant.
- priceMax null means no upper limit. priceMin defaults to 0.
- keywords should include product type + gender + color/material when mentioned.
- searchText should be a rich phrase for embedding search, e.g. "women's casual shoes sneakers sandals".
- size: infer even from indirect phrasing (e.g. "roomy fit" implies a larger size is wanted — still return
  the explicit size token like "XL" only if a concrete size is stated or strongly implied; otherwise null).
- specifications: infer product properties even from indirect phrasing (e.g. "won't smudge in the rain"
  implies "waterproof"; "no cables" implies "wireless"). Use short lowercase tokens.`;
```

- [ ] **Step 4: Extend `normalizeLlmIntent` to include size/specifications**

```js
// server/src/voiceQueryLLM.js — inside normalizeLlmIntent(), add before the final return:
  const size = llm.size ? String(llm.size).toUpperCase() : rule.size;
  const specifications = [
    ...(Array.isArray(llm.specifications) ? llm.specifications : []),
    ...rule.specifications,
  ]
    .map((s) => String(s).toLowerCase().trim())
    .filter(Boolean);

  return {
    rawQuery,
    searchText,
    priceMin,
    priceMax,
    categoryGroups: rule.categoryGroups,
    categoryFilters: [...new Set(categoryFilters)],
    keywords: [...new Set(keywords)],
    gender,
    productTypes: llmProductTypes.length ? llmProductTypes : rule.productTypes,
    size,
    specifications: [...new Set(specifications)],
    summary: llm.summary || rule.summary,
    source: "llm",
  };
```

(Note: `rule` is already computed at the top of `normalizeLlmIntent` via `const rule = parseVoiceQuery(rawQuery);` — no new dependency needed.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/voiceQueryLLM.sizeSpec.test.js`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add server/src/voiceQueryLLM.js __tests__/voiceQueryLLM.sizeSpec.test.js
git commit -m "feat: Phase 5.2 - Extend LLM parser prompt and normalization for size/specifications"
```

---

## Task 5.3: Extend the Reranker (`semanticTextReranker.js`) to Score Size/Specifications/Colors/Materials as Structured Fields

**Files:**
- Modify: `server/src/search/text/semanticTextReranker.js`

**Interfaces:**
- Consumes: `intent.size`, `intent.specifications` (new, from Task 5.1/5.2), `product.sizes`, `product.specifications`, `product.colors`, `product.materials` (new, from Phase 1's static catalog).
- Produces: `constraintBoost(product, intent)` unchanged signature, now factoring in these fields; `refineRankedResults(ranked, intent)` unchanged signature, now hard-filtering on size when a strong size signal exists (mirroring the existing price/productType pattern).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/semanticTextReranker.sizeSpec.test.js
const { constraintBoost, refineRankedResults } = require("../server/src/search/text/semanticTextReranker");

const trousersXLBrown = { id: "p1", title: "Classic Trousers", category: "mens-clothing", price: 40, colors: ["brown"], materials: ["cotton"], sizes: ["M", "L", "XL"], specifications: {} };
const trousersMBlue = { id: "p2", title: "Classic Trousers", category: "mens-clothing", price: 40, colors: ["blue"], materials: ["cotton"], sizes: ["S", "M"], specifications: {} };
const headphonesWireless = { id: "p3", title: "Studio Headphones", category: "electronics", price: 45, colors: ["black"], materials: [], sizes: [], specifications: { wireless: true, bluetooth: true } };
const headphonesWired = { id: "p4", title: "Studio Headphones Wired", category: "electronics", price: 45, colors: ["black"], materials: [], sizes: [], specifications: { wireless: false } };

describe("constraintBoost - size and specification awareness", () => {
  it("boosts a product whose sizes include the requested size", () => {
    const intent = { size: "XL", specifications: [], keywords: ["brown"], categoryFilters: [], gender: null, priceMin: 0, priceMax: Infinity };
    const boostMatch = constraintBoost(trousersXLBrown, intent);
    const boostNoMatch = constraintBoost(trousersMBlue, intent);
    expect(boostMatch).toBeGreaterThan(boostNoMatch);
  });

  it("boosts a product whose colors array includes the requested color keyword", () => {
    const intent = { size: null, specifications: [], keywords: ["brown"], categoryFilters: [], gender: null, priceMin: 0, priceMax: Infinity };
    const boostBrown = constraintBoost(trousersXLBrown, intent);
    const boostBlue = constraintBoost(trousersMBlue, intent);
    expect(boostBrown).toBeGreaterThan(boostBlue);
  });

  it("boosts a product matching a requested specification", () => {
    const intent = { size: null, specifications: ["wireless"], keywords: [], categoryFilters: [], gender: null, priceMin: 0, priceMax: Infinity };
    const boostWireless = constraintBoost(headphonesWireless, intent);
    const boostWired = constraintBoost(headphonesWired, intent);
    expect(boostWireless).toBeGreaterThan(boostWired);
  });
});

describe("refineRankedResults - size hard-filter with graceful fallback", () => {
  it("filters to only products with the requested size when at least one exists", () => {
    const intent = { size: "XL", specifications: [], productTypes: [], priceMin: 0, priceMax: Infinity };
    const ranked = [
      { product: trousersXLBrown, score: 0.5 },
      { product: trousersMBlue, score: 0.6 },
    ];
    const refined = refineRankedResults(ranked, intent);
    expect(refined.map((r) => r.product.id)).toEqual(["p1"]);
  });

  it("falls back to the full set when no product has the requested size (no crash, no empty result)", () => {
    const intent = { size: "XXXL", specifications: [], productTypes: [], priceMin: 0, priceMax: Infinity };
    const ranked = [
      { product: trousersXLBrown, score: 0.5 },
      { product: trousersMBlue, score: 0.6 },
    ];
    const refined = refineRankedResults(ranked, intent);
    expect(refined.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/semanticTextReranker.sizeSpec.test.js`
Expected: FAIL — `constraintBoost` currently ignores `intent.size`/`intent.specifications`/`product.colors`/`product.sizes` entirely, so the "match" and "no-match" boosts come out equal; `refineRankedResults` doesn't filter by size at all, so both tests in that block also fail (second test may pass by accident since it returns everything anyway, but the first must fail).

- [ ] **Step 3: Extend `constraintBoost`**

```js
// server/src/search/text/semanticTextReranker.js
// Add helper functions above constraintBoost():

function sizeMatches(product, intent) {
  if (!intent.size) return null; // no size requested -> no signal either way
  const sizes = (product.sizes || []).map((s) => String(s).toUpperCase());
  return sizes.includes(String(intent.size).toUpperCase());
}

function specificationMatches(product, intent) {
  if (!intent.specifications?.length) return 0;
  const specs = product.specifications || {};
  const hits = intent.specifications.filter((key) => specs[key] === true).length;
  return hits;
}

function structuredKeywordHits(product, intent) {
  if (!intent.keywords?.length) return 0;
  const colors = (product.colors || []).map((c) => c.toLowerCase());
  const materials = (product.materials || []).map((m) => m.toLowerCase());
  return intent.keywords.filter(
    (k) => colors.includes(k.toLowerCase()) || materials.includes(k.toLowerCase())
  ).length;
}

// Then, inside constraintBoost(product, intent), after the existing `keywords` block
// and before `return Math.max(0, Math.min(1, boost));`, add:

  const sizeMatch = sizeMatches(product, intent);
  if (sizeMatch === true) boost += 0.2;
  if (sizeMatch === false) boost -= 0.2;

  const specHits = specificationMatches(product, intent);
  if (specHits > 0) boost += Math.min(0.15, specHits * 0.08);

  const structuredHits = structuredKeywordHits(product, intent);
  if (structuredHits > 0) boost += Math.min(0.1, structuredHits * 0.05);
```

- [ ] **Step 4: Extend `refineRankedResults` with a size hard-filter (mirrors the existing price/productType pattern)**

```js
// server/src/search/text/semanticTextReranker.js
// Inside refineRankedResults(ranked, intent), add after the productTypes block
// and before the hasPriceConstraint block:

  if (intent.size) {
    const sized = refined.filter((row) => sizeMatches(row.product, intent) === true);
    if (sized.length > 0) {
      refined = sized;
    }
    // else: no product has this size among current candidates -> leave `refined`
    // as-is (graceful fallback, consistent with the existing price-constraint pattern
    // a few lines below, which also falls back to a sorted full set rather than empty).
  }
```

- [ ] **Step 5: Export the new helpers alongside existing ones**

```js
// server/src/search/text/semanticTextReranker.js — update module.exports
module.exports = {
  rerankTextCandidates,
  constraintBoost,
  productTypeMatches,
  getProductTypeMatchStrength,
  refineRankedResults,
  priceDistance,
  hasPriceConstraint,
  sizeMatches,
  specificationMatches,
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/semanticTextReranker.sizeSpec.test.js`
Expected: 5 passed.

- [ ] **Step 7: Run the full search-related test suite to confirm no regression**

Run: `npx jest __tests__/catalogSearchService.test.js __tests__/catalogFallbackQuality.test.js __tests__/catalogMetadata.test.js`
Expected: all previously-passing tests still pass.

- [ ] **Step 8: Commit**

```bash
git add server/src/search/text/semanticTextReranker.js __tests__/semanticTextReranker.sizeSpec.test.js
git commit -m "feat: Phase 5.3 - Score size/specifications/colors/materials as structured fields in reranker"
```

---

## Task 5.4: Index Structured Attributes in the Lexical (Hybrid-Mode) Candidate Retrieval

**Files:**
- Modify: `server/src/search/text/lexicalCatalogIndex.js`

**Interfaces:**
- Consumes: `product.colors`, `product.materials`, `product.sizes`, `product.specifications`.
- Produces: `buildSearchDocument(product)` output gains `colors`, `materials`, `sizes`, `specifications` as searchable MiniSearch fields (lower boost than title/tags, since they're supplementary signal, not primary).

- [ ] **Step 1: Write the failing test**

```js
// __tests__/lexicalCatalogIndex.structuredFields.test.js
const { buildLexicalCatalogIndex, searchLexicalCatalog } = require("../server/src/search/text/lexicalCatalogIndex");

describe("lexical index includes structured attribute fields", () => {
  const products = [
    { id: "p1", title: "Classic Trousers", category: "mens-clothing", brand: "ShopEase", tags: [], description: "Everyday trousers.", colors: ["brown"], materials: ["cotton"], sizes: ["XL"], specifications: {} },
    { id: "p2", title: "Classic Trousers", category: "mens-clothing", brand: "ShopEase", tags: [], description: "Everyday trousers.", colors: ["blue"], materials: ["cotton"], sizes: ["S"], specifications: {} },
  ];

  it("surfaces the product whose color field matches a color-only query term", () => {
    const index = buildLexicalCatalogIndex(products);
    const results = searchLexicalCatalog(index, "brown trousers", { limit: 10 });
    expect(results[0].product.id).toBe("p1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lexicalCatalogIndex.structuredFields.test.js`
Expected: FAIL or ambiguous ranking — both products currently score identically for "brown" since `buildSearchDocument` doesn't index `colors` at all, so MiniSearch can't distinguish them by that term (test may pass by tie-breaking accident; run with `--verbose` and inspect scores to confirm the field truly isn't contributing before trusting a pass — if it passes accidentally, add `expect(results[0].lexicalScore).toBeGreaterThan(results[1]?.lexicalScore ?? 0)` to make the assertion meaningful).

- [ ] **Step 3: Extend `buildSearchDocument` and the index field list**

```js
// server/src/search/text/lexicalCatalogIndex.js
function buildSearchDocument(product) {
  return {
    id: String(product.id),
    title: product.title || "",
    category: product.category || "",
    brand: product.brand || "",
    tags: Array.isArray(product.tags) ? product.tags.join(" ") : "",
    description: product.description || "",
    colors: Array.isArray(product.colors) ? product.colors.join(" ") : "",
    materials: Array.isArray(product.materials) ? product.materials.join(" ") : "",
    sizes: Array.isArray(product.sizes) ? product.sizes.join(" ") : "",
    specifications: product.specifications
      ? Object.keys(product.specifications).filter((k) => product.specifications[k] === true).join(" ")
      : "",
  };
}

function buildLexicalCatalogIndex(products = []) {
  const index = new MiniSearch({
    idField: "id",
    fields: ["title", "category", "brand", "tags", "description", "colors", "materials", "sizes", "specifications"],
    storeFields: ["id"],
    searchOptions: {
      boost: { title: 6, tags: 4, brand: 2, category: 2, description: 1, colors: 3, materials: 2, sizes: 3, specifications: 2 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: "OR",
    },
  });

  const docs = products.map(buildSearchDocument);
  index.addAll(docs);

  return { index, productsById: new Map(products.map((product) => [String(product.id), product])) };
}
```

Also update the inline `boost` object inside `searchLexicalCatalog()`'s `compiledIndex.index.search(query, { ... boost: {...} ...})` call to match (same field/value additions), keeping the two boost configs consistent.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lexicalCatalogIndex.structuredFields.test.js`
Expected: PASS, with `p1`'s `lexicalScore` measurably higher than `p2`'s.

- [ ] **Step 5: Commit**

```bash
git add server/src/search/text/lexicalCatalogIndex.js __tests__/lexicalCatalogIndex.structuredFields.test.js
git commit -m "feat: Phase 5.4 - Index colors/materials/sizes/specifications in lexical candidate retrieval"
```

---

## Task 5.5: Extend Client-Side Fallback Filter (`catalogTextFilter.js`)

**Files:**
- Modify: `src/utils/catalogTextFilter.js`

**Interfaces:**
- Consumes: `intent.size`, `intent.specifications` (now available via `parseVoiceQuery`, Task 5.1).
- Produces: `filterProductsLocally(products, query)` also excludes products failing a stated size/specification requirement, for the offline/client-fallback code path only (server path fixed in Task 5.3).

- [ ] **Step 1: Write the failing test**

```js
// Add to __tests__/catalogTextFilter.test.js (append new `it` blocks to the existing describe block)

  it("filters by size when a size is mentioned and matching products exist", () => {
    const sized = [
      { id: "a", title: "Trousers A", price: 40, category: "mens-clothing", description: "", sizes: ["XL"], colors: ["brown"] },
      { id: "b", title: "Trousers B", price: 40, category: "mens-clothing", description: "", sizes: ["S"], colors: ["brown"] },
    ];
    const result = filterProductsLocally(sized, "brown trousers size XL");
    expect(result.map((p) => p.id)).toEqual(["a"]);
  });

  it("does not crash and returns all candidates when no product matches the requested size", () => {
    const sized = [
      { id: "a", title: "Trousers A", price: 40, category: "mens-clothing", description: "", sizes: ["S"], colors: ["brown"] },
    ];
    const result = filterProductsLocally(sized, "brown trousers size XXXL");
    expect(result.length).toBe(1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/catalogTextFilter.test.js`
Expected: FAIL on the new "filters by size" test (both products currently pass through since `filterProductsLocally` never checks `intent.size`).

- [ ] **Step 3: Extend `filterProductsLocally`**

```js
// src/utils/catalogTextFilter.js
function sizeMatches(product, size) {
  if (!size) return null;
  const sizes = (product.sizes || []).map((s) => String(s).toUpperCase());
  return sizes.includes(String(size).toUpperCase());
}

function filterProductsLocally(products, query) {
  const raw = String(query || "").trim();
  if (!raw) {
    return products;
  }

  const intent = parseVoiceQuery(raw);

  let candidates = products.filter((product) => {
    if (product.price < intent.priceMin || product.price > intent.priceMax) {
      return false;
    }
    if (isPriceOrIntentOnlyQuery(raw)) {
      return true;
    }
    if (intent.keywords.length > 0) {
      const hay =
        `${product.title} ${product.description} ${product.category} ${product.brand || ""}`.toLowerCase();
      const keywordHit = intent.keywords.some((k) => hay.includes(k));
      if (!keywordHit) {
        return false;
      }
    }
    return relevanceScore(product, intent) >= 0.15;
  });

  if (intent.size) {
    const sized = candidates.filter((p) => sizeMatches(p, intent.size) === true);
    if (sized.length > 0) {
      candidates = sized; // graceful fallback: if none match, keep the unfiltered candidate set
    }
  }

  return candidates;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/catalogTextFilter.test.js`
Expected: all tests pass, including the 2 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/utils/catalogTextFilter.js __tests__/catalogTextFilter.test.js
git commit -m "feat: Phase 5.5 - Extend client-side fallback filter for size matching"
```

## PHASE 5 GATE

- [ ] `npx jest` (full suite) passes with zero failures.
- [ ] Manual API check: `curl -s -X POST http://localhost:5001/api/search/natural -H "Content-Type: application/json" -d '{"query":"brown trousers size XL"}'` returns matches whose `colors` includes `"brown"` and `sizes` includes `"XL"` in the top results (spot-check the JSON response by eye).
- [ ] Same check for `"wireless headphones under 50 dollars"` and `"waterproof makeup under 15 dollars"` — top results satisfy both the specification and price constraint.

**Do not proceed to Phase 6 until this gate is green.**

---

# PHASE 6: Seed Emulator/Simulator Galleries & Update Photo-Search E2E Flows

## Task 6.1: Android — Seed Emulator Gallery and Update Photo-Search Flow

**Files:**
- Create: `scripts/seed-android-gallery.sh`
- Modify: `.maestro/android/ml-features-comprehensive.yaml` (photo-search section) — or create `.maestro/android/ml-image-search.yaml` if that file's photo-search block is small enough to extract; check the existing file's current photo-search section first before deciding split vs. inline edit.

**Interfaces:**
- Consumes: `test-assets/image-search-samples/manifest.json` (Phase 2).

- [ ] **Step 1: Write the gallery-seeding script**

```bash
#!/usr/bin/env bash
# scripts/seed-android-gallery.sh
set -euo pipefail
SAMPLES_DIR="test-assets/image-search-samples"

adb wait-for-device
for file in $(find "$SAMPLES_DIR" -name "*.jpg"); do
  dest="/sdcard/Pictures/$(basename "$(dirname "$file")")-$(basename "$file")"
  adb push "$file" "$dest"
done
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures
echo "Seeded $(find "$SAMPLES_DIR" -name '*.jpg' | wc -l) sample images into emulator gallery."
```

- [ ] **Step 2: Make it executable and run it against a booted emulator**

Run: `chmod +x scripts/seed-android-gallery.sh && ./scripts/seed-android-gallery.sh`
Expected: `Seeded NN sample images into emulator gallery.` with no `adb` errors. Verify with `adb shell ls /sdcard/Pictures/` showing the pushed files.

- [ ] **Step 3: Read the current photo-search block in the existing ML flow file**

Run: `grep -n -A 15 "photo\|camera\|Search by photo" .maestro/android/ml-features-comprehensive.yaml`

- [ ] **Step 4: Rewrite the photo-search block to pick from the seeded gallery instead of assuming a live camera**

Replace whatever camera-tap logic exists there with (exact `tapOn`/`id` values must be checked against the running app's actual search-bar camera icon testID — inspect via `adb shell uiautomator dump` if the testID isn't already known from earlier flows):

```yaml
# Photo/image search via gallery picker (camera capture is impossible on emulator)
- tapOn:
    id: "search-camera-icon"
    optional: true

- extendedWaitUntil:
    visible:
      text: "Choose from gallery"
    timeout: 5000
    optional: true

- tapOn:
    text: "Choose from gallery"
    optional: true

# Pick the first seeded sample (mens-clothing-sample-1.jpg, pushed by seed-android-gallery.sh)
- extendedWaitUntil:
    visible:
      text: "mens-clothing"
    timeout: 8000
    optional: true

- tapOn:
    text: "mens-clothing"
    optional: true

- extendedWaitUntil:
    visible:
      text: "$"
    timeout: 15000
    optional: true
```

- [ ] **Step 5: Run the flow and verify against the manifest**

Run: `~/.maestro/bin/maestro test .maestro/android/ml-features-comprehensive.yaml`
Then cross-check the visible result title in the final screenshot against `test-assets/image-search-samples/manifest.json`'s entry for `mens-clothing/sample-1.jpg` — the top result's product title should match or closely relate.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-android-gallery.sh .maestro/android/ml-features-comprehensive.yaml
git commit -m "feat: Phase 6.1 - Seed Android emulator gallery and update photo-search E2E flow"
```

---

## Task 6.2: iOS — Seed Simulator Gallery and Update Photo-Search Flow

**Files:**
- Create: `scripts/seed-ios-gallery.sh`
- Modify: `.maestro/ios/ml-features-comprehensive.yaml` (mirrors Task 6.1, iOS-specific interaction pattern — do NOT share a script with Android, per Global Constraints).

- [ ] **Step 1: Write the gallery-seeding script**

```bash
#!/usr/bin/env bash
# scripts/seed-ios-gallery.sh
set -euo pipefail
SAMPLES_DIR="test-assets/image-search-samples"
SIMULATOR_ID="${1:?Usage: seed-ios-gallery.sh <simulator-udid>}"

for file in $(find "$SAMPLES_DIR" -name "*.jpg"); do
  xcrun simctl addmedia "$SIMULATOR_ID" "$file"
done
echo "Seeded $(find "$SAMPLES_DIR" -name '*.jpg' | wc -l) sample images into iOS simulator ($SIMULATOR_ID) Photos."
```

- [ ] **Step 2: Run it against the booted simulator**

Run: `chmod +x scripts/seed-ios-gallery.sh && ./scripts/seed-ios-gallery.sh $(xcrun simctl list devices booted | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}' | head -1)`
Expected: `Seeded NN sample images into iOS simulator (...) Photos.`

- [ ] **Step 3: Update the iOS photo-search flow with iOS-native gallery-picker interaction**

```yaml
# .maestro/ios/ml-features-comprehensive.yaml — photo-search block
- tapOn:
    id: "search-camera-icon"
    optional: true

- extendedWaitUntil:
    visible:
      text: "Photo Library"
    timeout: 5000
    optional: true

- tapOn:
    text: "Photo Library"
    optional: true

# iOS Photos permission prompt (only appears once per app install)
- runFlow:
    when:
      visible: "Allow Access to All Photos"
    commands:
      - tapOn: "Allow Access to All Photos"

- extendedWaitUntil:
    visible:
      text: "$"
    timeout: 15000
    optional: true
```

- [ ] **Step 4: Run the flow and verify**

Run: `~/.maestro/bin/maestro test .maestro/ios/ml-features-comprehensive.yaml --device <simulator-udid>`
Cross-check the result against the manifest, same as Task 6.1 Step 5.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-ios-gallery.sh .maestro/ios/ml-features-comprehensive.yaml
git commit -m "feat: Phase 6.2 - Seed iOS simulator gallery and update photo-search E2E flow"
```

## PHASE 6 GATE

- [ ] Android photo-search flow passes, correct product surfaces in results for at least 2 different seeded sample images.
- [ ] iOS photo-search flow passes, same check.

**Do not proceed to Phase 7 until this gate is green.**

---

# PHASE 7: Full Regression + New Test Suites — Android First, Then iOS

## Task 7.1: Rewrite Multi-Parameter Search E2E Flow with Real Expected Results (Android)

**Files:**
- Modify: `.maestro/android/ml-multiparameter-search.yaml` (currently has generic assertions written before the catalog existed — Task 1.5's data now lets us assert exact expected titles/attributes)

**Interfaces:**
- Consumes: `server/data/catalog-static.json` to pick real, known test cases (e.g. an actual product that is brown, size XL, category mens-clothing).

- [ ] **Step 1: Pick 3 concrete, known-good test queries from the real static catalog**

Run:
```bash
node -e "
const c = require('./server/data/catalog-static.json');
const p = c.products.find(p => p.category==='mens-clothing' && p.colors.includes('brown') && p.sizes.includes('XL'));
console.log('Brown XL mens-clothing example:', p?.title, p?.id);
const e = c.products.find(p => p.category==='electronics' && p.specifications?.wireless === true && p.price < 50);
console.log('Wireless <\$50 electronics example:', e?.title, e?.id);
const b = c.products.find(p => p.category==='beauty-fragrances' && p.specifications?.waterproof === true && p.price < 15);
console.log('Waterproof <\$15 beauty example:', b?.title, b?.id);
"
```
Note the three titles printed — they become the flow's concrete assertions below (if any prints `undefined`, go back and adjust that specific product's authored attributes in Task 1.3 so a real matching example exists, then re-run this check).

- [ ] **Step 2: Rewrite the flow with concrete assertions**

```yaml
appId: com.ecommerceappfullstack
---
# Android multi-parameter search — asserts REAL catalog products by title,
# not generic text, now that the static catalog guarantees these exist.

- launchApp:
    clearState: true
- extendedWaitUntil:
    visible: "ShopEase"
    timeout: 20000
- runFlow:
    when:
      visible: "Sign in ↓"
    commands:
      - tapOn: "Sign in ↓"
- tapOn:
    id: "login-email"
- inputText: "test@example.com"
- pressKey: back
- tapOn:
    id: "login-password"
- inputText: "secret123"
- pressKey: back
- tapOn:
    id: "login-submit"
- runFlow:
    when:
      visible: "Save password"
    commands:
      - tapOn: "Not now"
- extendedWaitUntil:
    visible:
      id: "tab-home"
    timeout: 15000

- tapOn:
    id: "tab-products"

# Test 1: brown + size XL + category
- tapOn:
    text: "Search products"
    optional: true
- inputText: "brown trousers size XL"
- pressKey: back
- extendedWaitUntil:
    visible: "<TITLE_FROM_STEP_1_BROWN_XL>"   # replace with the real title printed in Step 1
    timeout: 15000

# Test 2: specification + price
- tapOn:
    text: "Search products"
    optional: true
- inputText: "wireless headphones under 50 dollars"
- pressKey: back
- extendedWaitUntil:
    visible: "<TITLE_FROM_STEP_1_WIRELESS>"   # replace with the real title printed in Step 1
    timeout: 15000

# Test 3: specification + price, different category
- tapOn:
    text: "Search products"
    optional: true
- inputText: "waterproof makeup under 15 dollars"
- pressKey: back
- extendedWaitUntil:
    visible: "<TITLE_FROM_STEP_1_WATERPROOF>"   # replace with the real title printed in Step 1
    timeout: 15000
```

Replace the three `<TITLE_FROM_STEP_1_*>` placeholders with the actual titles printed in Step 1 before running — these are not left as placeholders in the committed file.

- [ ] **Step 3: Run the flow**

Run: `~/.maestro/bin/maestro test .maestro/android/ml-multiparameter-search.yaml`
Expected: all three `extendedWaitUntil` assertions pass (COMPLETED, not WARNED) — the real expected product title appears on screen after each search.

- [ ] **Step 4: Commit**

```bash
git add .maestro/android/ml-multiparameter-search.yaml
git commit -m "feat: Phase 7.1 - Rewrite Android multi-parameter search E2E with real catalog assertions"
```

---

## Task 7.2: Full Android Regression Suite

**Files:** none new — runs existing flows against the new catalog/backend.

- [ ] **Step 1: Run login flow**

Run: `~/.maestro/bin/maestro test .maestro/android/login.yaml`
Expected: COMPLETED, home screen reached, no regressions from the catalog swap (login doesn't touch products, but confirms app boots against the new backend cleanly).

- [ ] **Step 2: Run products/browse flow**

Run: `~/.maestro/bin/maestro test .maestro/android/products.yaml`
Expected: COMPLETED, real static-catalog products visible and tappable.

- [ ] **Step 3: Run checkout flow**

Run: `~/.maestro/bin/maestro test .maestro/android/checkout.yaml`
Expected: COMPLETED, add-to-cart and checkout still work against static-catalog products.

- [ ] **Step 4: Run orders flow**

Run: `~/.maestro/bin/maestro test .maestro/android/orders.yaml`
Expected: COMPLETED.

- [ ] **Step 5: Run full ML features flow**

Run: `~/.maestro/bin/maestro test .maestro/android/ml-features-comprehensive.yaml`
Expected: COMPLETED, including the updated photo-search gallery step from Task 6.1.

- [ ] **Step 6: Run the new multi-parameter search flow (from Task 7.1)**

Run: `~/.maestro/bin/maestro test .maestro/android/ml-multiparameter-search.yaml`
Expected: COMPLETED.

- [ ] **Step 7: Run the complete-e2e-clean flow**

Run: `~/.maestro/bin/maestro test .maestro/android/complete-e2e-clean.yaml`
Expected: COMPLETED end to end.

- [ ] **Step 8: Run the full Jest suite one more time**

Run: `npm test`
Expected: 0 failures.

**Only proceed to Task 7.3 (iOS) once every flow above is COMPLETED with zero WARNED/FAILED steps.** If anything fails, stop, fix, re-run this entire task from Step 1 — do not skip ahead to iOS with a known Android issue outstanding.

---

## Task 7.3: Mirror the Multi-Parameter Search Flow for iOS

**Files:**
- Create: `.maestro/ios/ml-multiparameter-search.yaml`

- [ ] **Step 1: Copy the Android flow's structure with iOS-specific login handling**

```yaml
appId: org.reactjs.native.example.EcommerceAppFullStack
---
# iOS multi-parameter search — mirrors Android's ml-multiparameter-search.yaml
# with iOS-native keyboard-dismiss handling (tap "Sign in" area instead of
# Android's pressKey: back, per this project's established iOS pattern).

- launchApp:
    clearState: true
- extendedWaitUntil:
    visible: "ShopEase"
    timeout: 20000
- runFlow:
    when:
      visible: "Sign in ↓"
    commands:
      - tapOn: "Sign in ↓"
- tapOn:
    id: "login-email"
- inputText: "test@example.com"
- tapOn:
    text: "Sign in"
    optional: true
- tapOn:
    id: "login-password"
- inputText: "secret123"
- tapOn:
    text: "Sign in"
    optional: true
- tapOn:
    id: "login-submit"
- runFlow:
    when:
      visible: "Save password"
    commands:
      - tapOn: "Not now"
- extendedWaitUntil:
    visible:
      id: "tab-home"
    timeout: 15000

- tapOn:
    id: "tab-products"

- tapOn:
    text: "Search products"
    optional: true
- inputText: "brown trousers size XL"
- tapOn:
    text: "Search"
    optional: true
- extendedWaitUntil:
    visible: "<TITLE_FROM_TASK_7.1_STEP_1_BROWN_XL>"
    timeout: 15000

- tapOn:
    text: "Search products"
    optional: true
- inputText: "wireless headphones under 50 dollars"
- tapOn:
    text: "Search"
    optional: true
- extendedWaitUntil:
    visible: "<TITLE_FROM_TASK_7.1_STEP_1_WIRELESS>"
    timeout: 15000

- tapOn:
    text: "Search products"
    optional: true
- inputText: "waterproof makeup under 15 dollars"
- tapOn:
    text: "Search"
    optional: true
- extendedWaitUntil:
    visible: "<TITLE_FROM_TASK_7.1_STEP_1_WATERPROOF>"
    timeout: 15000
```

Replace the three placeholder titles with the same real titles found in Task 7.1 Step 1 (same catalog, same expected products — cross-platform consistency check).

- [ ] **Step 2: Run the flow**

Run: `~/.maestro/bin/maestro test .maestro/ios/ml-multiparameter-search.yaml --device <simulator-udid>`
Expected: all three assertions COMPLETED.

- [ ] **Step 3: Commit**

```bash
git add .maestro/ios/ml-multiparameter-search.yaml
git commit -m "feat: Phase 7.3 - Add iOS multi-parameter search E2E flow"
```

---

## Task 7.4: Full iOS Regression Suite

**Files:** none new.

- [ ] **Step 1: Run login flow**

Run: `~/.maestro/bin/maestro test .maestro/ios/login.yaml --device <simulator-udid>`
Expected: COMPLETED.

- [ ] **Step 2: Run products/browse, checkout, orders flows**

Run each in turn:
```bash
~/.maestro/bin/maestro test .maestro/ios/products.yaml --device <simulator-udid>
~/.maestro/bin/maestro test .maestro/ios/checkout.yaml --device <simulator-udid>
~/.maestro/bin/maestro test .maestro/ios/orders.yaml --device <simulator-udid>
```
Expected: all COMPLETED.

- [ ] **Step 3: Run full ML features flow (including Task 6.2's photo-search update)**

Run: `~/.maestro/bin/maestro test .maestro/ios/ml-features-comprehensive.yaml --device <simulator-udid>`
Expected: COMPLETED.

- [ ] **Step 4: Run the multi-parameter search flow (Task 7.3)**

Run: `~/.maestro/bin/maestro test .maestro/ios/ml-multiparameter-search.yaml --device <simulator-udid>`
Expected: COMPLETED.

- [ ] **Step 5: Run the complete-e2e-clean flow**

Run: `~/.maestro/bin/maestro test .maestro/ios/complete-e2e-clean.yaml --device <simulator-udid>`
Expected: COMPLETED end to end.

## PHASE 7 GATE (FINAL PLAN GATE)

- [ ] Every Android flow in Task 7.2 is COMPLETED with zero WARNED/FAILED steps.
- [ ] Every iOS flow in Task 7.4 is COMPLETED with zero WARNED/FAILED steps.
- [ ] `npm test` passes with 0 failures.
- [ ] `npm run validate:catalog` passes.
- [ ] Manual spot-check: 3 different multi-parameter queries return correct, relevant results on both platforms.

**This is the plan's terminal gate. Once green, this implementation is complete and ready for the next plan (generic per-category 3D placeholder models, per design spec §7 item 8).**

---

# Post-Plan Backlog (explicitly not part of this plan)

- Generic per-category 3D placeholder models (design spec §2 "Option B", next plan immediately after this one).
- SKU-level variant selection in cart/checkout (design spec §3, §9 — further-out backlog).
