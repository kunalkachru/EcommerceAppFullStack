const { normalizeSearchQuery } = require("../intent/queryNormalizer");
const { buildSearchIntent: defaultBuildSearchIntent } = require("../intent/buildSearchIntent");
const {
  buildLexicalCatalogIndex,
  searchLexicalCatalog,
} = require("./lexicalCatalogIndex");
const {
  rerankTextCandidates,
} = require("./semanticTextReranker");

let cachedIndex = null;
let cachedKey = "";

function buildEmbedPhrase(intent) {
  const normalized = normalizeSearchQuery(intent.rawQuery);
  return intent.searchText || intent.semanticQuery || normalized || intent.rawQuery;
}

function getLexicalIndex(vectors) {
  const key = vectors.map((row) => String(row.id)).join("|");
  if (cachedIndex && cachedKey === key) {
    return cachedIndex;
  }
  cachedIndex = buildLexicalCatalogIndex(vectors.map((row) => row.product));
  cachedKey = key;
  return cachedIndex;
}

function attachVectorsToCandidates(candidates, vectors) {
  const vectorsById = new Map(vectors.map((row) => [String(row.id), row]));
  return candidates
    .map((row) => {
      const vector = vectorsById.get(String(row.product.id));
      if (!vector) return null;
      return {
        ...row,
        textVec: vector.textVec,
        imageVec: vector.imageVec,
      };
    })
    .filter(Boolean);
}

function ensureCandidateCoverage(candidates, vectors, limit = 120) {
  if (candidates.length >= limit) {
    return candidates.slice(0, limit);
  }

  const existing = new Set(candidates.map((row) => String(row.product.id)));
  const supplemented = [...candidates];
  for (const row of vectors) {
    if (existing.has(String(row.id))) continue;
    supplemented.push({
      product: row.product,
      lexicalScore: 0,
      textVec: row.textVec,
      imageVec: row.imageVec,
    });
    if (supplemented.length >= limit) break;
  }

  return supplemented;
}

async function searchTextCatalog(text, deps, options = {}) {
  const {
    buildSearchIntent = defaultBuildSearchIntent,
    ensureIndex,
    embedText,
    cosine,
    engineKey = "unknown",
  } = deps;
  const {
    limit = 30,
    minScore = 0.07,
    llmOptions = {},
    runtimeName = "baseline",
  } = options;

  const rawQuery = String(text || "").trim();
  if (!rawQuery) {
    throw new Error("Query text is required");
  }

  const intent = await buildSearchIntent(rawQuery, llmOptions);
  const vectors = await ensureIndex();
  const lexicalIndex = getLexicalIndex(vectors);
  const lexicalCandidates = searchLexicalCatalog(lexicalIndex, rawQuery, {
    limit: Math.max(limit * 4, 80),
  });
  const candidatePool = ensureCandidateCoverage(
    attachVectorsToCandidates(lexicalCandidates, vectors),
    vectors
  );

  const embedPhrase = buildEmbedPhrase(intent);
  const queryVec = await embedText(
    `online store product search: ${normalizeSearchQuery(intent.rawQuery)}. Customer wants: ${embedPhrase}`
  );

  const ranked = rerankTextCandidates(
    { queryVec, candidates: candidatePool, intent, limit, minScore },
    { cosine }
  );
  const matches = ranked.map((row) => ({
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
    engine: engineKey,
    intentSource: intent.source,
    searchMode:
      runtimeName === "hybrid" ? "hybrid-lexical-semantic-v1" : "semantic-first",
  };
}

module.exports = {
  searchTextCatalog,
  buildEmbedPhrase,
};
