const COLOR_WORDS = [
  "black",
  "white",
  "blue",
  "red",
  "green",
  "brown",
  "gray",
  "grey",
  "silver",
  "gold",
  "pink",
  "purple",
  "beige",
  "tan",
  "orange",
  "yellow",
  "teal",
  "navy",
];

const MATERIAL_WORDS = [
  "cotton",
  "leather",
  "faux leather",
  "metal",
  "plastic",
  "wood",
  "silicone",
  "denim",
  "wool",
  "canvas",
  "mesh",
  "rubber",
  "glass",
];

const CATEGORY_DISPLAY = {
  clothes: "Clothing",
  "men's clothing": "Men's Clothing",
  "women's clothing": "Women's Clothing",
  shoes: "Shoes",
  bags: "Bags",
  jewelry: "Jewelry",
  watches: "Watches",
  beauty: "Beauty",
  fragrances: "Fragrances",
  electronics: "Electronics",
  laptops: "Laptops",
  smartphones: "Smartphones",
  furniture: "Furniture",
  "home-decoration": "Home Decor",
  "kitchen-accessories": "Kitchen",
  groceries: "Groceries",
  "sports-accessories": "Sports",
  automotive: "Automotive",
};

const CATEGORY_DEPARTMENT = {
  clothes: "fashion",
  "men's clothing": "fashion",
  "women's clothing": "fashion",
  shoes: "fashion",
  bags: "fashion",
  jewelry: "accessories",
  watches: "accessories",
  beauty: "beauty",
  fragrances: "beauty",
  electronics: "tech",
  laptops: "tech",
  smartphones: "tech",
  furniture: "home",
  "home-decoration": "home",
  "kitchen-accessories": "home",
  groceries: "essentials",
  "sports-accessories": "lifestyle",
  automotive: "specialty",
};

const SHOPPABLE_CATEGORIES = new Set([
  "clothes",
  "men's clothing",
  "women's clothing",
  "shoes",
  "bags",
  "jewelry",
  "watches",
  "beauty",
  "fragrances",
  "electronics",
  "laptops",
  "smartphones",
  "furniture",
  "home-decoration",
  "kitchen-accessories",
  "groceries",
  "sports-accessories",
]);

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "your",
  "into",
  "wear",
  "daily",
  "everyday",
  "women",
  "woman",
  "mens",
  "men",
  "inch",
  "pack",
  "style",
  "plus",
  "set",
  "edition",
]);

const SEMANTIC_KEYWORD_RULES = [
  { test: /\bjacket\b|\bcoat\b|\bwindbreaker\b|\braincoat\b/, values: ["jacket", "coat", "windbreaker", "raincoat"] },
  { test: /\bheadphone\b|\bearbud\b|\bearphone\b/, values: ["headphones", "earbuds", "audio"] },
  { test: /\bmonitor\b|\bdisplay\b|\bscreen\b/, values: ["monitor", "display"] },
  { test: /\blaptop\b|\bnotebook\b|\bmacbook\b/, values: ["laptop", "notebook", "computer"] },
  { test: /\bbackpack\b|\bhandbag\b|\bbag\b|\bluggage\b/, values: ["backpack", "bag", "luggage"] },
  { test: /\bshoe\b|\bsneaker\b|\bsandal\b|\bboot\b/, values: ["shoes", "sneakers", "footwear"] },
  { test: /\bperfume\b|\bfragrance\b|\bcologne\b/, values: ["perfume", "fragrance", "cologne"] },
  { test: /\bwatch\b/, values: ["watch", "timepiece"] },
  { test: /\blipstick\b|\bmascara\b|\bpalette\b/, values: ["makeup", "beauty"] },
];

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function productText(product) {
  return normalizeWhitespace(
    `${product.title || ""} ${product.description || ""} ${product.category || ""} ${
      product.brand || ""
    } ${(product.tags || []).join(" ")}`
  ).toLowerCase();
}

function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleLooksPlaceholder(title) {
  const normalized = normalizeWhitespace(title);
  if (!normalized || normalized.length < 4 || normalized.length > 140) {
    return true;
  }
  if (/^test\b/i.test(normalized)) {
    return true;
  }
  if (/(.)\1{11,}/i.test(normalized)) {
    return true;
  }
  return false;
}

function hasUsableImage(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

function normalizeCategory(product) {
  const raw = normalizeWhitespace(product.category).toLowerCase();
  const hay = productText(product);

  if (
    /\blaptop\b|\bnotebook\b|\bmacbook\b|\bultrabook\b/.test(hay) ||
    raw === "laptops"
  ) {
    return "laptops";
  }
  if (/\bsmartphone\b|\biphone\b|\bandroid\b|\bmobile phone\b/.test(hay) || raw === "smartphones") {
    return "smartphones";
  }
  if (
    /\bheadphone\b|\bearbud\b|\bearphone\b|\bmonitor\b|\bkeyboard\b|\bmouse\b|\bcharger\b|\bssd\b|\btech\b/.test(
      hay
    ) ||
    ["electronics", "mobile-accessories", "tablets"].includes(raw)
  ) {
    return "electronics";
  }
  if (
    /\bperfume\b|\bfragrance\b|\bcologne\b|\beau de parfum\b/.test(hay) ||
    ["fragrances", "womens-perfumes"].includes(raw)
  ) {
    return "fragrances";
  }
  if (
    /\bmascara\b|\blipstick\b|\bskincare\b|\bcream\b|\bpalette\b|\bpowder\b|\bmakeup\b|\bnail polish\b/.test(
      hay
    ) ||
    ["beauty", "skin-care"].includes(raw)
  ) {
    return "beauty";
  }
  if (
    /\bwatch\b/.test(hay) ||
    ["mens-watches", "womens-watches", "watches"].includes(raw)
  ) {
    return "watches";
  }
  if (
    /\bring\b|\bbracelet\b|\bnecklace\b|\bearring\b|\bjewel/.test(hay) ||
    ["jewelery", "jewellery", "womens-jewellery", "jewelry"].includes(raw)
  ) {
    return "jewelry";
  }
  if (
    /\bbackpack\b|\bhandbag\b|\bluggage\b|\bbag\b|\bcarry-on\b/.test(hay) ||
    ["womens-bags", "mens-bags", "bags"].includes(raw)
  ) {
    return "bags";
  }
  if (
    /\bshoe\b|\bsneaker\b|\bsandal\b|\bboot\b|\bheel\b|\bloafer\b|\bfootwear\b/.test(hay) ||
    ["womens-shoes", "mens-shoes", "shoesk", "shoes", "sunglasses"].includes(raw)
  ) {
    return "shoes";
  }
  if (
    /\bjacket\b|\bcoat\b|\bhoodie\b|\bsweatshirt\b|\bjeans\b|\bdress\b|\bshirt\b|\bt-shirt\b|\bblouse\b|\bskirt\b|\bfrock\b|\bcap\b|\bjogger\b/.test(
      hay
    ) ||
    ["clothes", "tops", "mens-shirts"].includes(raw)
  ) {
    if (/\bwomen\b|\bladies\b|\bfemale\b|\bdress\b|\bfrock\b/.test(hay) || raw === "women's clothing") {
      return "women's clothing";
    }
    if (/\bmen\b|\bmale\b|\bmens\b/.test(hay) || raw === "men's clothing") {
      return "men's clothing";
    }
    return "clothes";
  }
  if (/\bchair\b|\bsofa\b|\btable\b|\bbed\b|\bfurniture\b/.test(hay) || raw === "furniture") {
    return "furniture";
  }
  if (/\bdecor\b|\blamp\b|\bmirror\b|\bplant\b/.test(hay) || raw === "home-decoration") {
    return "home-decoration";
  }
  if (
    /\bpan\b|\bpot\b|\bknife\b|\bspatula\b|\bkitchen\b|\bcookware\b|\bplate\b|\bmug\b/.test(hay) ||
    raw === "kitchen-accessories"
  ) {
    return "kitchen-accessories";
  }
  if (
    /\bapple\b|\bcoffee\b|\btea\b|\bsnack\b|\bgrocery\b|\bfruit\b|\bchocolate\b|\bjuice\b/.test(hay) ||
    raw === "groceries"
  ) {
    return "groceries";
  }
  if (
    /\byoga\b|\bfitness\b|\bgym\b|\bsport\b|\bball\b|\btraining\b/.test(hay) ||
    raw === "sports-accessories"
  ) {
    return "sports-accessories";
  }
  if (
    /\bcar\b|\bvehicle\b|\bautomobile\b|\bminivan\b|\bsedan\b|\bmotorcycle\b|\bgo-kart\b|\belectric bicycle\b/.test(
      hay
    ) ||
    ["vehicle", "motorcycle"].includes(raw)
  ) {
    return "automotive";
  }

  return raw || "clothes";
}

function inferAudience(product, category) {
  const hay = productText(product);
  if (category === "women's clothing" || /\bwomen\b|\bladies\b|\bfemale\b/.test(hay)) {
    return "women";
  }
  if (category === "men's clothing" || /\bmen\b|\bmens\b|\bmale\b/.test(hay)) {
    return "men";
  }
  if (["furniture", "home-decoration", "kitchen-accessories", "groceries"].includes(category)) {
    return "home";
  }
  if (["electronics", "laptops", "smartphones"].includes(category)) {
    return "tech";
  }
  return "unisex";
}

function extractWords(hay, candidates) {
  return candidates.filter((candidate) =>
    hay.includes(candidate)
  );
}

function inferSubcategory(product, category) {
  const hay = productText(product);
  if (/jacket|coat|windbreaker/.test(hay)) return "jackets";
  if (/headphone|earbud|earphone/.test(hay)) return "audio";
  if (/monitor|display|screen/.test(hay)) return "displays";
  if (/laptop|macbook|notebook/.test(hay)) return "computers";
  if (/backpack|handbag|luggage/.test(hay)) return "bags";
  if (/shoe|sneaker|sandal|boot/.test(hay)) return "footwear";
  if (/perfume|fragrance|cologne/.test(hay)) return "perfume";
  if (/watch/.test(hay)) return "watches";
  if (/chair|sofa/.test(hay)) return "seating";
  if (/lipstick|mascara|palette/.test(hay)) return "makeup";
  return category;
}

function inferredSemanticKeywords(product) {
  const hay = productText(product);
  const values = [];
  for (const rule of SEMANTIC_KEYWORD_RULES) {
    if (rule.test.test(hay)) {
      values.push(...rule.values);
    }
  }
  return uniqueList(values);
}

function baseKeywordTokens(product) {
  return normalizeWhitespace(`${product.title} ${product.description} ${product.brand || ""}`)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).toLowerCase()))];
}

function priceTier(price) {
  if (price < 30) return "entry";
  if (price < 80) return "budget";
  if (price < 200) return "mid";
  if (price < 800) return "premium";
  return "luxury";
}

function inventoryCountFor(product) {
  const seed = `${product.id || ""}:${product.title || ""}:${product.source || ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  }
  return 4 + (hash % 48);
}

function availabilityFor(count) {
  if (count <= 8) return "limited_stock";
  return "in_stock";
}

function brandFor(product) {
  if (product.brand) {
    return normalizeWhitespace(product.brand);
  }
  const title = normalizeWhitespace(product.title);
  const parts = title.split(" ");
  if (parts.length >= 2) {
    return parts.slice(0, 2).join(" ");
  }
  return parts[0] || "ShopEase Select";
}

function imageAltFor(product, categoryLabel) {
  return `${product.title} in ${categoryLabel}`;
}

function buildDummyJsonGallery(url) {
  const match = String(url || "").match(
    /^(https:\/\/cdn\.dummyjson\.com\/product-images\/.+)\/thumbnail\.(webp|png|jpe?g)$/i
  );
  if (!match) {
    return [];
  }

  const [, base, ext] = match;
  return [
    url,
    `${base}/1.${ext}`,
    `${base}/2.${ext}`,
    `${base}/3.${ext}`,
  ];
}

function normalizeImageGallery(product) {
  const rawCandidates = [
    ...(Array.isArray(product.images) ? product.images : []),
    product.image,
  ];

  if ((!Array.isArray(product.images) || product.images.length < 2) && product.image) {
    rawCandidates.push(...buildDummyJsonGallery(product.image));
  }

  return uniqueList(rawCandidates.filter((value) => /^https?:\/\//i.test(String(value || ""))));
}

function isCatalogProductSane(product) {
  return (
    !titleLooksPlaceholder(product.title) &&
    hasUsableImage(product.image) &&
    Number(product.price) > 0
  );
}

function isMerchandisableCategory(category) {
  return SHOPPABLE_CATEGORIES.has(category);
}

function enrichCatalogProduct(product) {
  const title = normalizeWhitespace(product.title);
  const description = normalizeWhitespace(product.description).slice(0, 500);
  const category = normalizeCategory({ ...product, title, description });
  const images = normalizeImageGallery(product);
  const department = CATEGORY_DEPARTMENT[category] || "general";
  const audience = inferAudience({ ...product, title, description, category }, category);
  const hay = productText({ ...product, title, description, category });
  const colors = uniqueList(extractWords(hay, COLOR_WORDS));
  const materials = uniqueList(extractWords(hay, MATERIAL_WORDS));
  const baseTags = uniqueList(product.tags || []);
  const subcategory = inferSubcategory({ ...product, title, description, category }, category);
  const keywords = uniqueList([
    ...baseTags,
    ...baseKeywordTokens({ ...product, title, description }),
    ...inferredSemanticKeywords({ ...product, title, description, category }),
    ...colors,
    ...materials,
    category,
    subcategory,
    audience,
    brandFor(product).toLowerCase(),
  ]).slice(0, 20);
  const mergedTags = uniqueList([
    ...baseTags,
    ...keywords,
    department,
  ]).slice(0, 18);
  const categoryLabel = CATEGORY_DISPLAY[category] || category;
  const inventoryCount = inventoryCountFor(product);
  const normalizedId = String(product.id || slugify(title)).toUpperCase().replace(/[^A-Z0-9]+/g, "-");

  return {
    ...product,
    title,
    description,
    image: images[0] || product.image,
    images,
    category,
    categoryLabel,
    department,
    audience,
    subcategory,
    brand: brandFor(product),
    tags: mergedTags,
    keywords,
    colors,
    materials,
    slug: slugify(title),
    sku: `SKU-${normalizedId}`,
    currency: "USD",
    inventoryCount,
    availability: availabilityFor(inventoryCount),
    priceTier: priceTier(Number(product.price) || 0),
    imageAlt: imageAltFor({ ...product, title }, categoryLabel),
    source: product.source || "catalog",
  };
}

function normalizeCatalogProducts(products) {
  const seen = new Set();
  const normalized = [];

  for (const product of products || []) {
    if (!isCatalogProductSane(product)) {
      continue;
    }
    const enriched = enrichCatalogProduct(product);
    if (!isMerchandisableCategory(enriched.category)) {
      continue;
    }
    const dedupeKey = `${slugify(enriched.title)}::${enriched.category}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    normalized.push(enriched);
  }

  return normalized;
}

module.exports = {
  normalizeCategory,
  isCatalogProductSane,
  enrichCatalogProduct,
  normalizeCatalogProducts,
  SHOPPABLE_CATEGORIES,
};
