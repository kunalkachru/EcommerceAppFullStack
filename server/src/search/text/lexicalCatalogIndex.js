const MiniSearch = require("minisearch");
const { normalizeSearchQuery } = require("../intent/queryNormalizer");

function buildSearchDocument(product) {
  return {
    id: String(product.id),
    title: product.title || "",
    category: product.category || "",
    brand: product.brand || "",
    tags: Array.isArray(product.tags) ? product.tags.join(" ") : "",
    description: product.description || "",
  };
}

function buildLexicalCatalogIndex(products = []) {
  const index = new MiniSearch({
    idField: "id",
    fields: ["title", "category", "brand", "tags", "description"],
    storeFields: ["id"],
    searchOptions: {
      boost: {
        title: 6,
        tags: 4,
        brand: 2,
        category: 2,
        description: 1,
      },
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
      boost: {
        title: 6,
        tags: 4,
        brand: 2,
        category: 2,
        description: 1,
      },
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
