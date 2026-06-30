/**
 * CLIP-based visual search (Xenova/transformers.js).
 * Compares the query photo against catalog images + titles in a shared embedding space.
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

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const CATALOG_URL = "https://fakestoreapi.com/products";
const EMBED_CACHE_PATH = path.join(__dirname, "..", "data", "clip-embeddings.json");
const CATALOG_TTL_MS = 60 * 60 * 1000;

let clipReady = null;
let visionModel;
let textModel;
let processor;
let tokenizer;

let catalog = [];
let catalogLoadedAt = 0;
let productVectors = [];
let warming = null;

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

async function rawImageFromBase64(base64) {
  const raw = String(base64).replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(raw, "base64");
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new RawImage(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    info.channels
  );
}

async function embedQueryImageBase64(base64) {
  await loadClip();
  const image = await rawImageFromBase64(base64);
  const inputs = await processor(image);
  const { image_embeds } = await visionModel(inputs);
  return l2Normalize(Array.from(image_embeds.data));
}

async function fetchCatalog() {
  const now = Date.now();
  if (catalog.length && now - catalogLoadedAt < CATALOG_TTL_MS) {
    return catalog;
  }
  const res = await fetch(CATALOG_URL);
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: ${res.status}`);
  }
  catalog = await res.json();
  catalogLoadedAt = now;
  return catalog;
}

function productTextBlob(product) {
  const category = String(product.category || "").replace(/'/g, "");
  return `a photo of ${product.title}, ${category}`;
}

function loadEmbeddingCache() {
  try {
    const raw = fs.readFileSync(EMBED_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.modelId === MODEL_ID && Array.isArray(parsed.products)) {
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
    JSON.stringify({ modelId: MODEL_ID, updatedAt: new Date().toISOString(), products: entries }, null, 0)
  );
}

async function buildProductVectors(products) {
  const cached = loadEmbeddingCache();
  const byId = new Map((cached || []).map((row) => [String(row.id), row]));
  const entries = [];

  for (const product of products) {
    const id = String(product.id);
    const cachedRow = byId.get(id);
    if (
      cachedRow?.imageUrl === product.image &&
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
        embedText(productTextBlob(product)),
      ]);
      entries.push({ id, product, imageVec, textVec, imageUrl: product.image });
    } catch (err) {
      console.warn(`[visual-search] Skip product ${id}:`, err.message);
    }
  }

  saveEmbeddingCache(
    entries.map((e) => ({
      id: e.id,
      imageUrl: e.product.image,
      imageVec: e.imageVec,
      textVec: e.textVec,
    }))
  );

  return entries;
}

async function ensureIndex() {
  const products = await fetchCatalog();
  if (
    productVectors.length &&
    productVectors.length === products.length &&
    Date.now() - catalogLoadedAt < CATALOG_TTL_MS
  ) {
    return productVectors;
  }
  await loadClip();
  productVectors = await buildProductVectors(products);
  return productVectors;
}

function scoreProduct(queryVec, row) {
  const imageSim = cosine(queryVec, row.imageVec);
  const textSim = cosine(queryVec, row.textVec);
  return 0.7 * imageSim + 0.3 * textSim;
}

async function searchByImageBase64(base64, { limit = 8, minScore = 0.18 } = {}) {
  const vectors = await ensureIndex();
  if (!vectors.length) {
    throw new Error("Product index is empty");
  }

  const queryVec = await embedQueryImageBase64(base64);
  const ranked = vectors
    .map((row) => ({
      product: row.product,
      score: scoreProduct(queryVec, row),
    }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const matches = ranked.map((row) => ({
    ...row.product,
    matchScore: Math.round(row.score * 1000) / 1000,
  }));

  const labels = ranked.slice(0, 5).map((row) => ({
    text: row.product.title.split(" ").slice(0, 4).join(" "),
    confidence: row.score,
  }));

  const searchQuery = ranked[0]
    ? ranked[0].product.title.split(" ").slice(0, 3).join(" ")
    : "";

  return { matches, labels, searchQuery, engine: "clip-vit-base-patch32" };
}

function getStatus() {
  return {
    engine: "clip-vit-base-patch32",
    modelLoaded: Boolean(visionModel && textModel),
    catalogCount: catalog.length,
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
  warmVisualSearchIndex,
  getStatus,
};
