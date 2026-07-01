/**
 * Client-side catalog filtering using the same intent parser as voice search.
 */
const {
  parseVoiceQuery,
  relevanceScore,
} = require("../../server/src/voiceQueryParser");

const SEARCH_STOP_TERMS = new Set([
  "below", "under", "above", "over", "less", "more", "than", "between",
  "from", "to", "and", "the", "for", "with", "dollars", "dollar", "bucks",
  "price", "around", "about", "maximum", "minimum", "cheaper", "expensive",
]);

function isNumericToken(token) {
  if (!token) {
    return false;
  }
  const normalized = String(token).replace(/[$,]/g, "").trim();
  if (!normalized) {
    return false;
  }
  return !Number.isNaN(Number(normalized));
}

function isPriceOrIntentOnlyQuery(query) {
  const intent = parseVoiceQuery(query);
  const meaningful = intent.keywords.filter((k) => {
    if (SEARCH_STOP_TERMS.has(k)) {
      return false;
    }
    if (isNumericToken(k)) {
      return false;
    }
    return true;
  });
  return (
    meaningful.length === 0 &&
    !intent.gender &&
    intent.categoryGroups.length === 0
  );
}

function filterProductsLocally(products, query) {
  const raw = String(query || "").trim();
  if (!raw) {
    return products;
  }

  const intent = parseVoiceQuery(raw);
  return products.filter((product) => {
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
}

function matchIdsFromProducts(products) {
  return new Set(products.map((p) => String(p.id)));
}

module.exports = {
  filterProductsLocally,
  isPriceOrIntentOnlyQuery,
  matchIdsFromProducts,
  parseVoiceQuery,
};
