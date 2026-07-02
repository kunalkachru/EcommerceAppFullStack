/**
 * Rule-based shopping intent parser (fallback when LLM unavailable).
 */
const { normalizeSearchQuery } = require("./queryNormalize");
const CATEGORY_KEYWORDS = {
  clothing: [
    "jacket", "coat", "shirt", "t-shirt", "dress", "pants", "trousers", "clothes",
    "clothing", "hoodie", "sweater", "blouse", "skirt", "jeans",
  ],
  footwear: [
    "shoe", "shoes", "sneaker", "sneakers", "sandal", "sandals", "boot", "boots",
    "heel", "heels", "loafer", "loafers", "footwear", "slipper", "slippers", "espadrille",
  ],
  electronics: [
    "laptop", "phone", "smartphone", "monitor", "computer", "tablet", "headphone",
    "headphones", "earphone", "earbuds", "charger", "usb", "tech", "electronics", "watch",
  ],
  beauty: [
    "perfume", "fragrance", "makeup", "mascara", "lipstick", "beauty", "skincare", "cream",
  ],
  home: ["furniture", "chair", "table", "kitchen", "decor", "home"],
  groceries: ["grocery", "groceries", "food", "snack", "coffee", "tea"],
  sports: ["sport", "fitness", "gym", "ball", "yoga"],
  jewelry: ["ring", "necklace", "bracelet", "jewelry", "jewellery", "earring", "earrings"],
};

const COLOR_WORDS = [
  "red", "blue", "green", "black", "white", "brown", "gray", "grey", "pink",
  "purple", "yellow", "orange", "navy", "beige", "gold", "silver", "dark",
  "light", "cream", "tan", "maroon", "teal",
];

const CATEGORY_GROUP_MAP = {
  clothing: [
    "clothes", "men's clothing", "women's clothing", "womens-dresses", "mens-shirts",
    "tops", "womens-tops", "mens-shoes",
  ],
  footwear: ["womens-shoes", "mens-shoes", "shoesk", "shoes"],
  electronics: [
    "electronics", "laptops", "smartphones", "mobile-accessories", "tablets", "watches",
  ],
  beauty: ["beauty", "fragrances", "skin-care", "womens-perfumes"],
  home: ["furniture", "home-decoration", "kitchen-accessories"],
  groceries: ["groceries"],
  sports: ["sports-accessories"],
  jewelry: ["jewellery", "womens-jewellery"],
};

const GENDER_KEYWORDS = {
  women: ["woman", "women", "womens", "women's", "ladies", "lady", "female", "girls", "girl"],
  men: ["man", "men", "mens", "men's", "male", "boys", "boy", "guys", "guy"],
};

const PRODUCT_SYNONYMS = {
  shoes: ["shoe", "shoes", "sneaker", "sneakers", "sandal", "sandals", "footwear", "boot", "boots", "heel", "heels", "loafer", "espadrille"],
  jeans: ["jeans", "denim", "jean"],
  jacket: ["jacket", "coat", "blazer", "parka", "windbreaker"],
  laptop: ["laptop", "notebook", "macbook", "computer"],
  phone: ["phone", "smartphone", "mobile", "iphone", "android"],
  headphones: ["headphone", "headphones", "earphone", "earphones", "earbuds", "airpods"],
  earrings: ["earring", "earrings", "ear ring", "ear rings"],
};

function parsePriceRange(text) {
  const lower = normalizeSearchQuery(text);
  let priceMin = 0;
  let priceMax = Number.POSITIVE_INFINITY;

  const between = lower.match(
    /(?:between|from)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*\$?\s*(\d+(?:\.\d+)?)/
  );
  if (between) {
    const a = Number(between[1]);
    const b = Number(between[2]);
    priceMin = Math.min(a, b);
    priceMax = Math.max(a, b);
    return { priceMin, priceMax };
  }

  const betweenReversed = lower.match(
    /\$?\s*(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:between|range)/
  );
  if (betweenReversed) {
    const a = Number(betweenReversed[1]);
    const b = Number(betweenReversed[2]);
    priceMin = Math.min(a, b);
    priceMax = Math.max(a, b);
    return { priceMin, priceMax };
  }

  const betweenLooseReversed =
    lower.includes("between") || lower.includes("range")
      ? [...lower.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]))
      : [];
  if (betweenLooseReversed.length >= 2) {
    const a = betweenLooseReversed[0];
    const b = betweenLooseReversed[1];
    priceMin = Math.min(a, b);
    priceMax = Math.max(a, b);
    return { priceMin, priceMax };
  }

  const under = lower.match(
    /(?:under|below|less than|cheaper than|max|maximum|up to|at most)\s*\$?\s*(\d+(?:\.\d+)?)/
  );
  if (under) {
    priceMax = Number(under[1]);
  }
  const underReversed = lower.match(
    /\$?\s*(\d+(?:\.\d+)?)\s*(?:or less|and under|under|below|max|maximum|at most)/
  );
  if (underReversed && !under) {
    priceMax = Number(underReversed[1]);
  }

  const over = lower.match(
    /(?:over|above|more than|greater than|at least|min|minimum|at least)\s*\$?\s*(\d+(?:\.\d+)?)/
  );
  if (over) {
    priceMin = Number(over[1]);
  }
  const overReversed = lower.match(
    /\$?\s*(\d+(?:\.\d+)?)\s*(?:or more|and above|above|over|min|minimum|at least|greater than)/
  );
  if (overReversed && !over) {
    priceMin = Number(overReversed[1]);
  }

  const around = lower.match(/(?:around|about)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (around && !under && !over && !between) {
    const mid = Number(around[1]);
    priceMin = Math.max(0, mid * 0.7);
    priceMax = mid * 1.3;
  }

  return { priceMin, priceMax };
}

function wordMatch(text, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function detectGender(text) {
  const lower = text.toLowerCase();
  const women = GENDER_KEYWORDS.women.some((w) => wordMatch(lower, w));
  const men = GENDER_KEYWORDS.men.some((w) => wordMatch(lower, w));
  if (women && !men) return "women";
  if (men && !women) return "men";
  return null;
}

function detectCategoryGroups(text) {
  const lower = normalizeSearchQuery(text);
  const groups = new Set();
  for (const [group, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) {
      groups.add(group);
    }
  }
  return [...groups];
}

function expandedCategories(groups, gender) {
  const set = new Set();
  for (const g of groups) {
    for (const cat of CATEGORY_GROUP_MAP[g] ?? []) {
      set.add(cat);
    }
  }
  if (gender === "women") {
    set.add("womens-shoes");
    set.add("women's clothing");
    set.add("womens-dresses");
    set.add("womens-tops");
    set.add("womens-jewellery");
    set.add("womens-bags");
    set.add("womens-perfumes");
  }
  if (gender === "men") {
    set.add("mens-shoes");
    set.add("men's clothing");
    set.add("mens-shirts");
    set.add("mens-watches");
  }
  return [...set];
}

function tokenize(text) {
  const normalized = normalizeSearchQuery(text);
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^\d+$/.test(w));
}

function canonicalSynonymToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(es|s)$/i, "");
}

function expandKeywords(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const canonicalToken = canonicalSynonymToken(token);
    for (const synonyms of Object.values(PRODUCT_SYNONYMS)) {
      if (
        synonyms.some((s) => canonicalSynonymToken(s) === canonicalToken)
      ) {
        synonyms.forEach((s) => expanded.add(s));
      }
    }
  }
  return [...expanded];
}

function detectProductTypes(text) {
  const lower = normalizeSearchQuery(text);
  const types = [];
  for (const [type, synonyms] of Object.entries(PRODUCT_SYNONYMS)) {
    if (synonyms.some((s) => lower.includes(s))) {
      types.push(type);
    }
  }
  return types;
}

function buildSemanticQuery({ rawQuery, gender, productTypes, keywords, categoryGroups }) {
  const parts = [];
  if (gender === "women") parts.push("women's");
  if (gender === "men") parts.push("men's");
  if (productTypes.length) {
    parts.push(...productTypes);
  } else if (categoryGroups.includes("footwear")) {
    parts.push("shoes footwear");
  }
  parts.push(...keywords.slice(0, 6));
  const joined = parts.join(" ").trim();
  return joined || rawQuery;
}

function parseVoiceQuery(text) {
  const raw = String(text || "").trim();
  const normalized = normalizeSearchQuery(raw);
  const { priceMin, priceMax } = parsePriceRange(raw);
  const gender = detectGender(normalized);
  const categoryGroups = detectCategoryGroups(raw);
  const categoryFilters = expandedCategories(categoryGroups, gender);
  const productTypes = detectProductTypes(raw);
  const tokens = tokenize(raw);

  const stop = new Set([
    "the", "and", "for", "with", "that", "this", "from", "need", "want", "looking",
    "find", "show", "some", "any", "please", "would", "like", "product", "products",
    "item", "items", "buy", "get", "under", "over", "about", "around", "between",
    "dollars", "dollar", "bucks", "price", "range", "cheap", "expensive",
    "less", "than", "more", "greater", "color", "colored", "colour", "coloured",
    ...GENDER_KEYWORDS.women,
    ...GENDER_KEYWORDS.men,
  ]);
  let keywords = expandKeywords(tokens.filter((t) => !stop.has(t)));
  for (const color of COLOR_WORDS) {
    if (normalized.includes(color) && !keywords.includes(color)) {
      keywords.push(color);
    }
  }
  keywords = [...new Set(keywords)];
  const semanticQuery = buildSemanticQuery({
    rawQuery: raw,
    gender,
    productTypes,
    keywords,
    categoryGroups,
  });

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
    summary: buildSummary({ priceMin, priceMax, gender, productTypes, categoryGroups, keywords }),
    source: "rules",
  };
}

function buildSummary({ priceMin, priceMax, gender, productTypes, categoryGroups, keywords }) {
  const parts = [];
  if (gender) parts.push(gender);
  if (productTypes.length) {
    parts.push(productTypes.join(", "));
  } else if (categoryGroups.length) {
    parts.push(categoryGroups.join(", "));
  }
  if (keywords.length) {
    parts.push(keywords.slice(0, 4).join(" "));
  }
  if (Number.isFinite(priceMax) && priceMax < 1e6) {
    parts.push(`under $${priceMax}`);
  } else if (priceMin > 0) {
    parts.push(`over $${priceMin}`);
  }
  return parts.join(" · ") || "your request";
}

function productHaystack(product) {
  return `${product.title} ${product.description} ${product.category} ${product.brand || ""} ${(product.tags || []).join(" ")}`.toLowerCase();
}

function categoryMatches(product, categoryFilters) {
  if (!categoryFilters?.length) return true;
  const cat = String(product.category || "").toLowerCase();
  return categoryFilters.some(
    (f) => cat === f || cat.includes(f) || f.includes(cat.replace(/'/g, ""))
  );
}

function genderMatches(product, gender) {
  if (!gender) return true;
  const hay = productHaystack(product);
  const cat = String(product.category || "").toLowerCase();
  if (gender === "women") {
    return (
      cat.includes("women") ||
      cat.includes("womens") ||
      hay.includes("women") ||
      hay.includes("ladies") ||
      hay.includes("female")
    );
  }
  if (gender === "men") {
    return (
      cat.includes("men") ||
      cat.includes("mens") ||
      hay.includes(" men") ||
      hay.includes("men's") ||
      hay.includes("male")
    );
  }
  return true;
}

function keywordMatches(product, keywords) {
  if (!keywords?.length) return true;
  const hay = productHaystack(product);
  const hits = keywords.filter((k) => hay.includes(k));
  return hits.length > 0;
}

/** Soft relevance score 0–1 for ranking boosts (not hard gates). */
function relevanceScore(product, intent) {
  let score = 0;
  if (product.price < intent.priceMin || product.price > intent.priceMax) {
    return 0;
  }
  if (categoryMatches(product, intent.categoryFilters)) score += 0.25;
  if (genderMatches(product, intent.gender)) score += 0.2;
  const hay = productHaystack(product);
  const kwHits = (intent.keywords || []).filter((k) => hay.includes(k)).length;
  if (kwHits > 0) score += Math.min(0.35, kwHits * 0.12);
  if ((intent.productTypes || []).some((t) => hay.includes(t))) score += 0.15;
  return Math.min(1, score);
}

function productMatchesIntent(product, intent) {
  if (product.price < intent.priceMin || product.price > intent.priceMax) {
    return false;
  }
  return relevanceScore(product, intent) >= 0.2;
}

module.exports = {
  parseVoiceQuery,
  productMatchesIntent,
  relevanceScore,
  categoryMatches,
  genderMatches,
  keywordMatches,
  CATEGORY_GROUP_MAP,
};
