/**
 * Unified natural-language search — semantic (CLIP) first, constraints second.
 *
 * Design:
 * 1. Normalize query text (numbers, symbols) — one place, server-side only.
 * 2. Optional LLM intent when user enables reasoning + provides a key.
 * 3. CLIP embedding over the FULL query always drives ranking (robust to word order).
 * 4. Price min/max applied as a soft-then-hard filter only when confidently parsed.
 * 5. Category / gender / color never hard-gate results — boosts only.
 */
const { normalizeSearchQuery } = require("./queryNormalize");
const { resolveVoiceIntent } = require("./voiceQueryLLM");

const PRODUCT_TYPE_TERMS = {
  headphones: [
    "headphone",
    "headphones",
    "earphone",
    "earphones",
    "earbud",
    "earbuds",
    "airpod",
    "airpods",
  ],
  earbuds: ["earbud", "earbuds", "airpod", "airpods", "earphone", "earphones"],
  shoes: ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots"],
  jacket: ["jacket", "coat", "outerwear", "parka"],
  laptop: ["laptop", "notebook", "macbook", "ultrabook"],
  monitor: ["monitor"],
  shirt: ["shirt", "t-shirt", "tshirt", "tee", "top"],
  lipstick: ["lipstick", "lip color", "lipcolour", "lip gloss"],
  mugs: ["mug", "mugs", "cup", "cups"],
  watch: ["watch", "wristwatch", "smartwatch"],
};

const ACCESSORY_HINT_TERMS = [
  "case",
  "cover",
  "sleeve",
  "bag",
  "backpack",
  "stand",
  "holder",
  "charger",
  "cable",
  "adapter",
  "mouse",
  "keyboard",
  "strap",
  "band",
  "protector",
  "mount",
];

function hasPriceConstraint(intent) {
  return (
    (Number.isFinite(intent.priceMax) && intent.priceMax < 1e6) ||
    (Number.isFinite(intent.priceMin) && intent.priceMin > 0)
  );
}

function priceInRange(product, intent) {
  const min = intent.priceMin ?? 0;
  const max = intent.priceMax ?? Number.POSITIVE_INFINITY;
  return product.price >= min && product.price <= max;
}

function priceDistance(product, intent) {
  const min = intent.priceMin ?? 0;
  const max = intent.priceMax ?? Number.POSITIVE_INFINITY;
  const price = Number(product.price) || 0;
  if (price >= min && price <= max) return 0;
  if (price < min) return min - price;
  if (Number.isFinite(max)) return price - max;
  return 0;
}

function typeTermsForIntent(intent) {
  const set = new Set();
  for (const type of intent.productTypes || []) {
    const normalizedType = String(type || "").toLowerCase().trim();
    if (!normalizedType) continue;
    const terms = PRODUCT_TYPE_TERMS[normalizedType] || [normalizedType];
    terms.forEach((term) => set.add(term));
  }
  return [...set];
}

function getProductTypeMatchStrength(product, intent) {
  if (!intent.productTypes?.length) return 0;
  const terms = typeTermsForIntent(intent);
  if (!terms.length) return 0;
  const title = String(product.title || "").toLowerCase();
  const category = String(product.category || "").toLowerCase();
  const tags = (product.tags || []).join(" ").toLowerCase();
  const description = String(product.description || "").toLowerCase();
  const looksLikeAccessory = ACCESSORY_HINT_TERMS.some(
    (term) => title.includes(term) || category.includes(term)
  );

  const hasStrongMatch = terms.some(
    (term) =>
      title.includes(term) ||
      category.includes(term) ||
      tags.includes(term)
  );
  if (hasStrongMatch) return looksLikeAccessory ? 1 : 2;

  const hasWeakMatch = terms.some((term) => description.includes(term));
  return hasWeakMatch ? 1 : 0;
}

function productTypeMatches(product, intent) {
  return getProductTypeMatchStrength(product, intent) > 0;
}

function refineRankedResults(ranked, intent) {
  let refined = [...ranked];

  if (intent.productTypes?.length) {
    const strongTyped = refined.filter(
      (row) => getProductTypeMatchStrength(row.product, intent) >= 2
    );
    if (strongTyped.length > 0) {
      refined = strongTyped;
    } else {
      const weakTyped = refined.filter(
        (row) => getProductTypeMatchStrength(row.product, intent) >= 1
      );
      if (weakTyped.length > 0) {
        refined = weakTyped;
      }
    }
  }

  if (hasPriceConstraint(intent)) {
    const priced = refined.filter((row) => priceInRange(row.product, intent));
    if (priced.length > 0) {
      refined = priced;
    } else {
      // Keep results non-empty but prefer nearest-price candidates when strict matches are unavailable.
      refined = [...refined].sort((a, b) => {
        const priceDiff = priceDistance(a.product, intent) - priceDistance(b.product, intent);
        if (priceDiff !== 0) return priceDiff;
        return b.score - a.score;
      });
    }
  }

  return refined;
}

/** Soft boosts 0–1 — never zero-out semantic candidates solely on keywords. */
function constraintBoost(product, intent) {
  let boost = 0.35; // baseline so semantics dominate but filters nudge

  if (hasPriceConstraint(intent)) {
    if (priceInRange(product, intent)) {
      boost += 0.25;
    } else {
      const rangeWidth = Number.isFinite(intent.priceMax)
        ? Math.max(1, intent.priceMax - (intent.priceMin ?? 0))
        : Math.max(50, intent.priceMin || 100);
      const distRatio = priceDistance(product, intent) / rangeWidth;
      boost -= Math.min(0.5, 0.15 + distRatio * 0.35);
    }
  }

  if (intent.categoryFilters?.length) {
    const cat = String(product.category || "").toLowerCase();
    const ok = intent.categoryFilters.some(
      (f) => cat === f || cat.includes(f) || f.includes(cat.replace(/'/g, ""))
    );
    if (ok) boost += 0.15;
  }

  if (intent.gender) {
    const hay = `${product.title} ${product.description} ${product.category}`.toLowerCase();
    const cat = String(product.category || "").toLowerCase();
    if (intent.gender === "women") {
      if (cat.includes("women") || hay.includes("women") || hay.includes("ladies")) {
        boost += 0.12;
      }
    } else if (intent.gender === "men") {
      if (cat.includes("men") || hay.includes("men's") || hay.includes(" male")) {
        boost += 0.12;
      }
    }
  }

  if (intent.keywords?.length) {
    const hay =
      `${product.title} ${product.description} ${product.category} ${(product.tags || []).join(" ")}`.toLowerCase();
    const hits = intent.keywords.filter((k) => k.length > 2 && hay.includes(k)).length;
    boost += Math.min(0.2, hits * 0.06);
  }

  return Math.max(0, Math.min(1, boost));
}

function buildEmbedPhrase(intent) {
  const normalized = normalizeSearchQuery(intent.rawQuery);
  return (
    intent.searchText ||
    intent.semanticQuery ||
    normalized ||
    intent.rawQuery
  );
}

/**
 * @param {string} text
 * @param {object} deps - { ensureIndex, loadClip, embedText, cosine, CACHE_MODEL_KEY }
 * @param {object} options - { limit, minScore, llmOptions }
 */
async function searchByNaturalLanguage(text, deps, options = {}) {
  const { ensureIndex, loadClip, embedText, cosine, CACHE_MODEL_KEY } = deps;
  const { limit = 30, minScore = 0.07, llmOptions = {} } = options;

  const rawQuery = String(text || "").trim();
  if (!rawQuery) {
    throw new Error("Query text is required");
  }

  const intent = await resolveVoiceIntent(rawQuery, llmOptions);
  const vectors = await ensureIndex();
  await loadClip();

  const embedPhrase = buildEmbedPhrase(intent);
  const queryVec = await embedText(
    `online store product search: ${normalizeSearchQuery(intent.rawQuery)}. Customer wants: ${embedPhrase}`
  );

  const scored = vectors.map((row) => {
    const textSim = cosine(queryVec, row.textVec);
    const imageSim = cosine(queryVec, row.imageVec);
    const boost = constraintBoost(row.product, intent);
    const score = 0.52 * textSim + 0.18 * imageSim + 0.3 * boost;
    return { product: row.product, score, textSim, boost };
  });

  let ranked = [...scored].sort((a, b) => b.score - a.score);
  ranked = refineRankedResults(ranked, intent);

  const threshold = Math.max(minScore, ranked[0]?.score * 0.55 ?? minScore);
  const matches = ranked
    .filter((row) => row.score >= threshold)
    .slice(0, limit)
    .map((row) => ({
      ...row.product,
      matchScore: Math.round(row.score * 1000) / 1000,
      matchPercent: Math.min(99, Math.round(row.score * 100)),
    }));

  return {
    query: intent.rawQuery,
    normalizedQuery: normalizeSearchQuery(intent.rawQuery),
    parsed: intent,
    matches,
    resultStatus: matches.length > 0 ? "found" : "no_matches",
    engine: CACHE_MODEL_KEY,
    intentSource: intent.source,
    searchMode: "semantic-first",
  };
}

module.exports = {
  searchByNaturalLanguage,
  constraintBoost,
  productTypeMatches,
  getProductTypeMatchStrength,
  refineRankedResults,
  priceDistance,
  hasPriceConstraint,
  buildEmbedPhrase,
};
