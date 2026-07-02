function buildUnifiedSearchResponse({
  mode,
  runtime,
  query = {},
  intent = null,
  results = {},
  diagnostics = {},
  meta = {},
}) {
  return {
    mode,
    runtime: {
      name: runtime?.name || "baseline",
      engine: runtime?.engine || "unknown",
      strategy: runtime?.strategy || "semantic-first",
    },
    query: {
      raw: query?.raw || "",
      normalized: query?.normalized || "",
    },
    intent: intent
      ? {
          source: intent.source || "rules",
          parsed: intent.parsed || null,
        }
      : null,
    results: {
      matches: Array.isArray(results.matches) ? results.matches : [],
      resultStatus: results.resultStatus || "unknown",
      nearestMatch: results.nearestMatch || null,
    },
    diagnostics: {
      labels: Array.isArray(diagnostics.labels) ? diagnostics.labels : [],
      attributes: Array.isArray(diagnostics.attributes) ? diagnostics.attributes : [],
      identification: diagnostics.identification || null,
    },
    meta: {
      searchQuery: meta.searchQuery || "",
      categoryFilter: meta.categoryFilter || "all",
    },
  };
}

module.exports = {
  buildUnifiedSearchResponse,
};
