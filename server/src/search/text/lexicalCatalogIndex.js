const MiniSearch = require("minisearch");
const { normalizeSearchQuery } = require("../intent/queryNormalizer");

// Catalog specification keys are camelCase (e.g. "dishwasherSafe"), but user
// queries are space-separated ("dishwasher safe"). MiniSearch's default
// tokenizer doesn't split camelCase, so indexing the raw key would only
// prefix-match the first half of a multi-word spec. Split into words so
// "dishwasher safe" indexes as two searchable tokens.
function splitCamelCase(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

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
      ? Object.keys(product.specifications)
          .filter((k) => product.specifications[k] === true)
          .map(splitCamelCase)
          .join(" ")
      : "",
  };
}

const LEXICAL_FIELD_BOOST = {
  title: 6,
  tags: 4,
  brand: 2,
  category: 2,
  description: 1,
  colors: 3,
  materials: 2,
  sizes: 3,
  specifications: 2,
};

function buildLexicalCatalogIndex(products = []) {
  const index = new MiniSearch({
    idField: "id",
    fields: ["title", "category", "brand", "tags", "description", "colors", "materials", "sizes", "specifications"],
    storeFields: ["id"],
    searchOptions: {
      boost: LEXICAL_FIELD_BOOST,
      prefix: true,
      fuzzy: 0.2,
      combineWith: "OR",
    },
  });

  const docs = products.map(buildSearchDocument);
  index.addAll(docs);

  return {
    index,
    productsById: new Map(products.map((product) => [String(product.id), product])),
  };
}

function mergeLexicalResult(into, row, weight) {
  const existing = into.get(row.id) || { id: row.id, lexicalScore: 0 };
  existing.lexicalScore += row.score * weight;
  into.set(row.id, existing);
}

function searchLexicalCatalog(compiledIndex, rawQuery, { limit = 80 } = {}) {
  const normalized = normalizeSearchQuery(rawQuery);
  const tokens = normalized.split(/\s+/).filter((token) => token.length > 1);
  const queries = [...new Set([normalized, tokens.join(" ")].filter(Boolean))];
  const merged = new Map();

  queries.forEach((query, idx) => {
    const weight = idx === 0 ? 1 : 0.75;
    const results = compiledIndex.index.search(query, {
      prefix: true,
      fuzzy: query.length > 12 ? 0.2 : false,
      boost: LEXICAL_FIELD_BOOST,
      combineWith: "OR",
    });
    results.forEach((row) => mergeLexicalResult(merged, row, weight));
  });

  return [...merged.values()]
    .map((row) => ({
      product: compiledIndex.productsById.get(String(row.id)),
      lexicalScore: row.lexicalScore,
    }))
    .filter((row) => row.product)
    .sort((a, b) => b.lexicalScore - a.lexicalScore)
    .slice(0, limit);
}

module.exports = {
  buildLexicalCatalogIndex,
  searchLexicalCatalog,
};
