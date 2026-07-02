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
    (term) => title.includes(term) || category.includes(term) || tags.includes(term)
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
      refined = [...refined].sort((a, b) => {
        const priceDiff = priceDistance(a.product, intent) - priceDistance(b.product, intent);
        if (priceDiff !== 0) return priceDiff;
        return b.score - a.score;
      });
    }
  }

  return refined;
}

function constraintBoost(product, intent) {
  let boost = 0.35;

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
      (filter) => cat === filter || cat.includes(filter) || filter.includes(cat.replace(/'/g, ""))
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
    const hits = intent.keywords.filter((keyword) => keyword.length > 2 && hay.includes(keyword)).length;
    boost += Math.min(0.2, hits * 0.06);
  }

  return Math.max(0, Math.min(1, boost));
}

function rerankTextCandidates(
  { queryVec, candidates = [], intent, limit = 30, minScore = 0.07 },
  { cosine }
) {
  const maxLexicalScore = Math.max(...candidates.map((row) => row.lexicalScore || 0), 1);
  const ranked = candidates.map((row) => {
    const textSim = cosine(queryVec, row.textVec);
    const imageSim = cosine(queryVec, row.imageVec);
    const lexicalScore = (row.lexicalScore || 0) / maxLexicalScore;
    const boost = constraintBoost(row.product, intent);
    const score = 0.46 * textSim + 0.14 * imageSim + 0.2 * lexicalScore + 0.2 * boost;
    return {
      ...row,
      score,
      textSim,
      imageSim,
      boost,
    };
  });

  const refined = refineRankedResults(
    [...ranked].sort((a, b) => b.score - a.score),
    intent
  );
  const threshold = Math.max(minScore, (refined[0]?.score || minScore) * 0.55);

  return refined.filter((row) => row.score >= threshold).slice(0, limit);
}

module.exports = {
  rerankTextCandidates,
  constraintBoost,
  productTypeMatches,
  getProductTypeMatchStrength,
  refineRankedResults,
  priceDistance,
  hasPriceConstraint,
};
