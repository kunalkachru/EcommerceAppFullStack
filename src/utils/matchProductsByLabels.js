const CATEGORY_HINTS = {
  "men's clothing": ["men", "shirt", "jacket", "clothing", "apparel", "henley", "pants"],
  "women's clothing": ["women", "dress", "blouse", "clothing", "apparel", "jewelry"],
  jewelry: ["ring", "gold", "silver", "bracelet", "necklace", "jewelry", "watch"],
  electronics: ["computer", "monitor", "hard drive", "electronics", "laptop", "usb", "tech"],
};

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreProduct(product, labelTerms) {
  const haystack = `${product.title} ${product.description} ${product.category}`.toLowerCase();
  const categoryHints = CATEGORY_HINTS[product.category] ?? [];
  let score = 0;

  for (const term of labelTerms) {
    if (haystack.includes(term)) {
      score += term.length > 5 ? 4 : 2;
    }
    for (const hint of categoryHints) {
      if (term.includes(hint) || hint.includes(term)) {
        score += 3;
      }
    }
  }

  const titleTokens = tokenize(product.title);
  for (const token of titleTokens) {
    if (labelTerms.some((t) => t.includes(token) || token.includes(t))) {
      score += 2;
    }
  }

  return score;
}

/**
 * Rank catalog products by ML image labels (on-device Image Labeling).
 * @param {Array} products
 * @param {Array<{ text: string, confidence?: number }>} labels
 * @param {{ limit?: number }} options
 */
export function matchProductsByLabels(products, labels, { limit = 8 } = {}) {
  if (!products?.length || !labels?.length) {
    return [];
  }

  const labelTerms = labels
    .filter((l) => (l.confidence ?? 1) >= 0.35)
    .flatMap((l) => tokenize(l.text));

  if (!labelTerms.length) {
    return [];
  }

  return products
    .map((product) => ({ product, score: scoreProduct(product, labelTerms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.product);
}

export function labelsToSearchQuery(labels) {
  return labels
    .filter((l) => (l.confidence ?? 1) >= 0.4)
    .slice(0, 3)
    .map((l) => l.text)
    .join(" ");
}
