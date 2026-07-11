/**
 * Natural-language search runtime switch.
 *
 * - baseline: semantic-first CLIP ranking
 * - hybrid: lexical candidate generation + semantic rerank + constraints
 */
const { normalizeSearchQuery } = require("./search/intent/queryNormalizer");
const { buildSearchIntent } = require("./search/intent/buildSearchIntent");
const { getSearchRuntimeConfig } = require("./runtime/searchRuntimeConfig");
const {
  searchTextCatalog,
  buildEmbedPhrase,
} = require("./search/text/searchTextCatalog");
const {
  constraintBoost,
  productTypeMatches,
  getProductTypeMatchStrength,
  refineRankedResults,
  priceDistance,
  hasPriceConstraint,
} = require("./search/text/semanticTextReranker");

// A relative-only threshold (topScore * factor) can never reject a query outright --
// the top-ranked row always clears a fraction of its own score. Genuinely irrelevant
// queries (empirically ~0.62-0.64 composite score against this catalog, vs. ~0.70-0.82
// for real matches -- see docs/superpowers/plans/2026-07-10-default-llm-search-and-
// multiparam-e2e.md's Stage C notes) still need to be rejected outright, the way real
// e-commerce search ("no results found for ...") does. 0.65 sits in the gap between the
// two observed clusters.
const ABSOLUTE_MIN_SCORE = 0.65;

async function searchSemanticFirst(text, deps, options = {}) {
  const { ensureIndex, loadClip, embedText, cosine, CACHE_MODEL_KEY } = deps;
  const { limit = 30, minScore = 0.07, llmOptions = {} } = options;

  const rawQuery = String(text || "").trim();
  if (!rawQuery) {
    throw new Error("Query text is required");
  }

  const intent = await buildSearchIntent(rawQuery, llmOptions);
  const vectors = await ensureIndex();
  if (typeof loadClip === "function") {
    await loadClip();
  }

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

  const threshold = Math.max(minScore, ABSOLUTE_MIN_SCORE, ranked[0]?.score * 0.55 ?? minScore);
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

/**
 * @param {string} text
 * @param {object} deps - { ensureIndex, loadClip, embedText, cosine, CACHE_MODEL_KEY }
 * @param {object} options - { limit, minScore, llmOptions, runtimeName }
 */
async function searchByNaturalLanguage(text, deps, options = {}) {
  const runtimeName = options.runtimeName || getSearchRuntimeConfig().runtimeName;

  if (runtimeName === "hybrid") {
    return searchTextCatalog(
      text,
      {
        buildSearchIntent,
        ensureIndex: deps.ensureIndex,
        embedText: deps.embedText,
        cosine: deps.cosine,
        engineKey: deps.CACHE_MODEL_KEY,
      },
      options
    );
  }

  return searchSemanticFirst(text, deps, options);
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
