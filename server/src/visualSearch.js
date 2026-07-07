/**
 * CLIP-based visual search (Xenova/transformers.js).
 * Compares query photos against merged catalog embeddings (image + rich text).
 */
/* eslint-env node */
/* global Buffer */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const {
  CLIPVisionModelWithProjection,
  CLIPTextModelWithProjection,
  AutoProcessor,
  AutoTokenizer,
  RawImage,
} = require("@xenova/transformers");
const { fetchCatalog, getProductById } = require("./catalogService");
const { validateQueryImage } = require("./search/visual/imageQualityGate");

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const CACHE_MODEL_KEY = `${MODEL_ID}-catalog-v3`;
const EMBED_CACHE_PATH = path.join(__dirname, "..", "data", "clip-embeddings.json");

let clipReady = null;
let visionModel;
let textModel;
let processor;
let tokenizer;

let indexedCatalogCount = 0;
let productVectors = [];
let warming = null;
let probeVectors = null;
let attributeProbeVectors = null;

const OBJECT_PROBES = [
  { id: "backpack", label: "a backpack or bag", text: "a photo of a backpack or bag" },
  { id: "jacket", label: "a jacket or coat", text: "a photo of a jacket or coat" },
  { id: "shirt", label: "a shirt or t-shirt", text: "a photo of a shirt or t-shirt" },
  { id: "dress", label: "a dress", text: "a photo of a dress or women's clothing" },
  { id: "jewelry", label: "jewelry", text: "a photo of jewelry, a ring, or a bracelet" },
  { id: "watch", label: "a wristwatch", text: "a photo of a wristwatch" },
  { id: "monitor", label: "a computer monitor", text: "a photo of a computer monitor or screen" },
  { id: "storage", label: "computer storage", text: "a photo of a hard drive or USB storage device" },
  { id: "pants", label: "pants or trousers", text: "a photo of pants or trousers" },
  { id: "shoes", label: "shoes", text: "a photo of shoes or footwear" },
  { id: "phone", label: "a smartphone", text: "a photo of a smartphone or mobile phone" },
  { id: "car", label: "a car or automobile", text: "a photo of a car or automobile" },
  { id: "furniture", label: "furniture", text: "a photo of furniture" },
  { id: "food", label: "food", text: "a photo of food or a meal" },
  { id: "pet", label: "a pet or animal", text: "a photo of a pet or animal" },
];

const COLOR_PROBES = [
  { id: "black", label: "black", text: "a photo of a black product" },
  { id: "white", label: "white", text: "a photo of a white product" },
  { id: "blue", label: "blue", text: "a photo of a blue product" },
  { id: "red", label: "red", text: "a photo of a red product" },
  { id: "green", label: "green", text: "a photo of a green product" },
  { id: "brown", label: "brown", text: "a photo of a brown product" },
  { id: "gray", label: "gray", text: "a photo of a gray or silver product" },
];

const MATERIAL_PROBES = [
  { id: "cotton", label: "cotton", text: "a photo of cotton clothing or fabric" },
  { id: "leather", label: "leather", text: "a photo of leather material" },
  { id: "metal", label: "metal", text: "a photo of metal material" },
  { id: "plastic", label: "plastic", text: "a photo of plastic material" },
  { id: "wood", label: "wood", text: "a photo of wood material" },
];

/** Shop-by-category groups for guided visual search (feature 3). */
const CATEGORY_GROUPS = {
  clothing: [
    "clothes",
    "men's clothing",
    "women's clothing",
    "shoes",
    "bags",
  ],
  electronics: [
    "electronics",
    "laptops",
    "smartphones",
    "mobile-accessories",
    "watches",
  ],
  beauty: ["beauty", "fragrances", "jewelry"],
  home: ["furniture", "home-decoration", "kitchen-accessories"],
  groceries: ["groceries"],
  sports: ["sports-accessories"],
};

const PROBE_CATEGORY_BOOST = {
  jacket: ["clothes", "men's clothing", "women's clothing"],
  shirt: ["clothes", "men's clothing", "women's clothing"],
  dress: ["clothes", "women's clothing"],
  pants: ["clothes", "men's clothing", "women's clothing"],
  backpack: ["bags", "sports-accessories", "clothes"],
  jewelry: ["jewelry", "beauty"],
  watch: ["watches", "electronics"],
  monitor: ["electronics", "laptops"],
  storage: ["electronics"],
  phone: ["smartphones", "mobile-accessories", "electronics"],
  shoes: ["shoes", "clothes"],
};

const OFF_INVENTORY_PROBE_IDS = new Set(["pet", "car"]);

function l2Normalize(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i += 1) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  return vec.map((v) => v / norm);
}

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot;
}

function categoriesForGroup(groupKey) {
  if (!groupKey || groupKey === "all") return null;
  return CATEGORY_GROUPS[groupKey] ?? [String(groupKey).toLowerCase()];
}

function productMatchesCategory(product, categoryFilter) {
  if (!categoryFilter || categoryFilter === "all") return true;
  const cat = String(product.category || "").toLowerCase();
  const allowed = categoriesForGroup(categoryFilter);
  if (!allowed) return cat === String(categoryFilter).toLowerCase();
  return allowed.some((a) => cat === a || cat.includes(a));
}

async function loadClip() {
  if (!clipReady) {
    clipReady = (async () => {
      console.log("[visual-search] Loading CLIP model (first run may download ~150MB)…");
      visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID);
      textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID);
      processor = await AutoProcessor.from_pretrained(MODEL_ID);
      tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
      console.log("[visual-search] CLIP model ready");
    })();
  }
  await clipReady;
}

async function embedImageFromUrl(url) {
  await loadClip();
  const image = await RawImage.read(url);
  const inputs = await processor(image);
  const { image_embeds } = await visionModel(inputs);
  return l2Normalize(Array.from(image_embeds.data));
}

async function embedText(text) {
  await loadClip();
  const inputs = await tokenizer([text], { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);
  return l2Normalize(Array.from(text_embeds.data));
}

function decodeBase64Buffer(base64) {
  const raw = String(base64).replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(raw, "base64");
}

/** Feature 2: center square crop + resize for cleaner single-product embeddings. */
async function preprocessQueryBuffer(buffer) {
  const meta = await sharp(buffer).metadata();
  const side = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - side) / 2);
  const top = Math.floor((meta.height - side) / 2);

  const { data, info } = await sharp(buffer)
    .extract({ left, top, width: side, height: side })
    .resize(512, 512, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { data, info };
}

async function rawImageFromBuffer(buffer) {
  const quality = await validateQueryImage(buffer);
  if (!quality.ok) {
    const err = new Error(quality.message);
    err.code = quality.code;
    throw err;
  }

  const { data, info } = await preprocessQueryBuffer(buffer);
  return new RawImage(new Uint8ClampedArray(data), info.width, info.height, info.channels);
}

async function embedQueryImageBase64(base64) {
  await loadClip();
  const buffer = decodeBase64Buffer(base64);
  const image = await rawImageFromBuffer(buffer);
  const inputs = await processor(image);
  const { image_embeds } = await visionModel(inputs);
  return l2Normalize(Array.from(image_embeds.data));
}

function productTextBlob(product) {
  const parts = [
    `a photo of ${product.title}`,
    product.category,
    product.brand,
    ...(product.tags || []).slice(0, 6),
    String(product.description || "").slice(0, 220),
  ].filter(Boolean);
  return parts.join(", ");
}

function loadEmbeddingCache() {
  try {
    const raw = fs.readFileSync(EMBED_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.modelId === CACHE_MODEL_KEY && Array.isArray(parsed.products)) {
      return parsed.products;
    }
  } catch {
    /* no cache */
  }
  return null;
}

function saveEmbeddingCache(entries) {
  fs.mkdirSync(path.dirname(EMBED_CACHE_PATH), { recursive: true });
  fs.writeFileSync(
    EMBED_CACHE_PATH,
    JSON.stringify(
      { modelId: CACHE_MODEL_KEY, updatedAt: new Date().toISOString(), products: entries },
      null,
      0
    )
  );
}

async function buildProductVectors(products) {
  const cached = loadEmbeddingCache();
  const byId = new Map((cached || []).map((row) => [String(row.id), row]));
  const entries = [];
  let built = 0;

  for (const product of products) {
    const id = String(product.id);
    const textBlob = productTextBlob(product);
    const cachedRow = byId.get(id);
    if (
      cachedRow?.imageUrl === product.image &&
      cachedRow?.textBlob === textBlob &&
      cachedRow?.imageVec?.length &&
      cachedRow?.textVec?.length
    ) {
      entries.push({
        id,
        product,
        imageVec: cachedRow.imageVec,
        textVec: cachedRow.textVec,
      });
      continue;
    }

    try {
      const [imageVec, textVec] = await Promise.all([
        embedImageFromUrl(product.image),
        embedText(textBlob),
      ]);
      entries.push({ id, product, imageVec, textVec, imageUrl: product.image, textBlob });
      built += 1;
      if (built % 25 === 0) {
        console.log(`[visual-search] Indexed ${entries.length}/${products.length} products…`);
      }
    } catch (err) {
      console.warn(`[visual-search] Skip product ${id}:`, err.message);
    }
  }

  saveEmbeddingCache(
    entries.map((e) => ({
      id: e.id,
      imageUrl: e.product.image,
      textBlob: productTextBlob(e.product),
      imageVec: e.imageVec,
      textVec: e.textVec,
    }))
  );

  return entries;
}

async function ensureIndex() {
  const products = await fetchCatalog();
  if (productVectors.length && indexedCatalogCount === products.length) {
    return productVectors;
  }
  await loadClip();
  console.log(`[visual-search] Building index for ${products.length} products…`);
  productVectors = await buildProductVectors(products);
  indexedCatalogCount = products.length;
  return productVectors;
}

function combinedProductVec(row) {
  const out = row.imageVec.map((v, i) => 0.7 * v + 0.3 * row.textVec[i]);
  return l2Normalize(out);
}

function scoreProduct(queryVec, row, { categoryFilter, probeBoostId } = {}) {
  let score = 0.7 * cosine(queryVec, row.imageVec) + 0.3 * cosine(queryVec, row.textVec);

  if (categoryFilter && productMatchesCategory(row.product, categoryFilter)) {
    score += 0.08;
  }

  if (probeBoostId && PROBE_CATEGORY_BOOST[probeBoostId]) {
    const cats = PROBE_CATEGORY_BOOST[probeBoostId];
    const cat = String(row.product.category || "").toLowerCase();
    if (cats.some((c) => cat === c || cat.includes(c))) {
      score += 0.06;
    }
  }

  return score;
}

async function ensureProbeVectors() {
  if (probeVectors) return probeVectors;
  await loadClip();
  probeVectors = [];
  for (const probe of OBJECT_PROBES) {
    const vec = await embedText(probe.text);
    probeVectors.push({ ...probe, vec, kind: "object" });
  }
  return probeVectors;
}

async function ensureAttributeProbeVectors() {
  if (attributeProbeVectors) return attributeProbeVectors;
  await loadClip();
  attributeProbeVectors = [];
  for (const probe of COLOR_PROBES) {
    const vec = await embedText(probe.text);
    attributeProbeVectors.push({ ...probe, vec, kind: "color" });
  }
  for (const probe of MATERIAL_PROBES) {
    const vec = await embedText(probe.text);
    attributeProbeVectors.push({ ...probe, vec, kind: "material" });
  }
  return attributeProbeVectors;
}

async function identifyFromProbes(queryVec) {
  const probes = await ensureProbeVectors();
  const ranked = probes
    .map((p) => ({
      id: p.id,
      label: p.label,
      confidence: cosine(queryVec, p.vec),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const top = ranked[0];
  return {
    summary: top?.label ?? "an item",
    confidence: top?.confidence ?? 0,
    probes: ranked.slice(0, 5).map((p) => ({
      id: p.id,
      label: p.label,
      confidence: Math.round(p.confidence * 1000) / 1000,
    })),
  };
}

/** Feature 4: color + material attribute chips. */
async function identifyAttributes(queryVec) {
  const probes = await ensureAttributeProbeVectors();
  const ranked = probes
    .map((p) => ({
      id: p.id,
      label: p.label,
      kind: p.kind,
      confidence: cosine(queryVec, p.vec),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const minConf = 0.14;
  const colors = ranked.filter((p) => p.kind === "color" && p.confidence >= minConf).slice(0, 2);
  const materials = ranked.filter((p) => p.kind === "material" && p.confidence >= minConf).slice(0, 1);

  return [...colors, ...materials].map((p) => ({
    text: p.label,
    kind: p.kind,
    confidence: Math.round(p.confidence * 1000) / 1000,
    source: "attribute",
  }));
}

function shouldSuppressCatalogMatches(identification, bestProductScore) {
  const top = identification.probes?.[0];
  if (!top || !OFF_INVENTORY_PROBE_IDS.has(top.id)) {
    return false;
  }
  return top.confidence >= 0.22 && bestProductScore < 0.55;
}

function deriveResultStatus(matches, identification, bestProductScore, suppressed) {
  if (matches.length > 0) return "found";
  if (suppressed || identification?.confidence >= 0.22 || bestProductScore >= 0.14) {
    return "no_inventory_match";
  }
  return "unrecognized";
}

function rankProducts(queryVec, vectors, options = {}) {
  const { limit = 8, minScore = 0.18, categoryFilter } = options;
  const probeBoostId = options.probeBoostId;

  let pool = vectors;
  if (categoryFilter && categoryFilter !== "all") {
    const filtered = vectors.filter((row) => productMatchesCategory(row.product, categoryFilter));
    if (filtered.length >= 3) {
      pool = filtered;
    }
  }

  return pool
    .map((row) => ({
      product: row.product,
      score: scoreProduct(queryVec, row, { categoryFilter, probeBoostId }),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((row) => row.score >= minScore)
    .slice(0, limit);
}

async function searchByImageBase64(
  base64,
  { limit = 8, minScore = 0.18, categoryFilter = null } = {}
) {
  const vectors = await ensureIndex();
  if (!vectors.length) {
    throw new Error("Product index is empty");
  }

  const queryVec = await embedQueryImageBase64(base64);
  const identification = await identifyFromProbes(queryVec);
  const attributes = await identifyAttributes(queryVec);
  const probeBoostId = identification.probes?.[0]?.id;

  const allRanked = vectors
    .map((row) => ({
      product: row.product,
      score: scoreProduct(queryVec, row, { categoryFilter, probeBoostId }),
    }))
    .sort((a, b) => b.score - a.score);

  const bestProduct = allRanked[0];
  const bestProductScore = bestProduct?.score ?? 0;
  const suppressed = shouldSuppressCatalogMatches(identification, bestProductScore);

  const ranked = rankProducts(queryVec, vectors, {
    limit,
    minScore,
    categoryFilter,
    probeBoostId,
  });

  let matches = ranked.map((row) => ({
    ...row.product,
    matchScore: Math.round(row.score * 1000) / 1000,
    matchPercent: Math.min(99, Math.round(row.score * 100)),
  }));

  if (suppressed) {
    matches = [];
  }

  const resultStatus = deriveResultStatus(matches, identification, bestProductScore, suppressed);

  const labels =
    matches.length > 0
      ? ranked.slice(0, 5).map((row) => ({
          text: row.product.title.split(" ").slice(0, 4).join(" "),
          confidence: row.score,
          source: "catalog",
        }))
      : identification.probes.slice(0, 5).map((p) => ({
          text: p.label,
          confidence: p.confidence,
          source: "ai",
        }));

  const searchQuery = ranked[0]
    ? ranked[0].product.title.split(" ").slice(0, 3).join(" ")
    : identification.summary ?? "";

  const nearestMatch =
    bestProduct && matches.length === 0
      ? {
          id: bestProduct.product.id,
          title: bestProduct.product.title,
          category: bestProduct.product.category,
          image: bestProduct.product.image,
          matchScore: Math.round(bestProductScore * 1000) / 1000,
          matchPercent: Math.min(99, Math.round(bestProductScore * 100)),
        }
      : null;

  return {
    matches,
    labels,
    attributes,
    searchQuery,
    identification,
    resultStatus,
    nearestMatch,
    suppressed,
    categoryFilter: categoryFilter || "all",
    engine: CACHE_MODEL_KEY,
  };
}

/** Feature 1: similar products for PDP. */
async function findSimilarProducts(productId, { limit = 8, minScore = 0.22 } = {}) {
  const vectors = await ensureIndex();
  const source = vectors.find((row) => String(row.id) === String(productId));
  if (!source) {
    const product = getProductById(productId);
    if (!product) {
      return { matches: [], product: null };
    }
    return { matches: [], product };
  }

  const queryVec = combinedProductVec(source);
  const ranked = vectors
    .filter((row) => String(row.id) !== String(productId))
    .map((row) => ({
      product: row.product,
      score: 0.65 * cosine(queryVec, combinedProductVec(row)) +
        0.35 * cosine(source.imageVec, row.imageVec),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((row) => row.score >= minScore)
    .slice(0, limit);

  return {
    product: source.product,
    matches: ranked.map((row) => ({
      ...row.product,
      matchScore: Math.round(row.score * 1000) / 1000,
      matchPercent: Math.min(99, Math.round(row.score * 100)),
    })),
  };
}

/** Natural-language search — semantic CLIP ranking + optional LLM intent. */
async function searchByVoiceQuery(text, { limit = 24, minScore = 0.07, llmOptions = {} } = {}) {
  const { searchByNaturalLanguage } = require("./naturalSearch");
  return searchByNaturalLanguage(
    text,
    { ensureIndex, loadClip, embedText, cosine, CACHE_MODEL_KEY },
    { limit, minScore, llmOptions }
  );
}

function getStatus() {
  return {
    engine: CACHE_MODEL_KEY,
    modelLoaded: Boolean(visionModel && textModel),
    catalogCount: indexedCatalogCount,
    indexCount: productVectors.length,
    indexing: Boolean(warming),
  };
}

function warmVisualSearchIndex() {
  if (!warming) {
    warming = ensureIndex()
      .then(() => {
        console.log(`[visual-search] Indexed ${productVectors.length} products`);
      })
      .catch((err) => {
        console.warn("[visual-search] Warm-up failed:", err.message);
      })
      .finally(() => {
        warming = null;
      });
  }
  return warming;
}

module.exports = {
  searchByImageBase64,
  searchByVoiceQuery,
  findSimilarProducts,
  warmVisualSearchIndex,
  getStatus,
  CATEGORY_GROUPS,
  ensureIndex,
  loadClip,
  embedText,
  cosine,
  CACHE_MODEL_KEY,
};
