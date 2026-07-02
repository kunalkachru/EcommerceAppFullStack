function toLegacyTextSearchResponse(unified) {
  return {
    query: unified.query?.raw || "",
    normalizedQuery: unified.query?.normalized || "",
    parsed: unified.intent?.parsed || null,
    matches: unified.results?.matches || [],
    resultStatus: unified.results?.resultStatus || "unknown",
    engine: unified.runtime?.engine || "unknown",
    intentSource: unified.intent?.source || "rules",
    searchMode: unified.runtime?.strategy || "semantic-first",
  };
}

function toLegacyVisualSearchResponse(unified) {
  return {
    matches: unified.results?.matches || [],
    labels: unified.diagnostics?.labels || [],
    attributes: unified.diagnostics?.attributes || [],
    searchQuery: unified.meta?.searchQuery || "",
    identification: unified.diagnostics?.identification || null,
    resultStatus: unified.results?.resultStatus || "unknown",
    nearestMatch: unified.results?.nearestMatch || null,
    categoryFilter: unified.meta?.categoryFilter || "all",
    engine: unified.runtime?.engine || "unknown",
  };
}

module.exports = {
  toLegacyTextSearchResponse,
  toLegacyVisualSearchResponse,
};
