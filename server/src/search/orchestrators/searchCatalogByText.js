const { getSearchRuntimeConfig } = require("../../runtime/searchRuntimeConfig");
const { buildUnifiedSearchResponse } = require("../contracts/unifiedSearchResponse");

async function searchCatalogByText(query, deps, options = {}) {
  const runtime = getSearchRuntimeConfig();
  const result = await deps.searchByNaturalLanguage(query, deps.textDeps, {
    limit: options.limit || 30,
    minScore: options.minScore || 0.07,
    llmOptions: options.llmOptions || {},
    runtimeName: runtime.runtimeName,
  });

  return buildUnifiedSearchResponse({
    mode: "text",
    runtime: {
      name: runtime.runtimeName,
      engine: result.engine,
      strategy: result.searchMode,
    },
    query: {
      raw: result.query,
      normalized: result.normalizedQuery,
    },
    intent: {
      source: result.intentSource,
      parsed: result.parsed,
    },
    results: {
      matches: result.matches,
      resultStatus: result.resultStatus,
    },
  });
}

module.exports = {
  searchCatalogByText,
};
