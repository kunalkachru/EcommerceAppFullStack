const { getSearchRuntimeConfig } = require("../../runtime/searchRuntimeConfig");
const { buildUnifiedSearchResponse } = require("../contracts/unifiedSearchResponse");
const { fuseSearchResults } = require("../fusion/fuseSearchResults");
const { runVisualCatalogSearch } = require("../visual/visualCatalogSearch");

async function searchCatalogByImage(imageBase64, deps, options = {}) {
  const runtime = getSearchRuntimeConfig();
  const visual = await runVisualCatalogSearch(
    imageBase64,
    { searchByImageBase64: deps.searchByImageBase64 },
    options
  );

  let text = { matches: [] };
  if (runtime.runtimeName === "hybrid" && visual.matches?.length === 0 && visual.searchQuery) {
    text = await deps.searchByNaturalLanguage(visual.searchQuery, deps.textDeps, {
      limit: options.limit || 8,
      minScore: 0.07,
      llmOptions: {},
      runtimeName: runtime.runtimeName,
    });
  }

  const fused = fuseSearchResults({ visual, text });

  return buildUnifiedSearchResponse({
    mode: "image",
    runtime: {
      name: runtime.runtimeName,
      engine: visual.engine,
      strategy:
        runtime.runtimeName === "hybrid" ? "hybrid-lexical-semantic-v1" : "semantic-first",
    },
    results: {
      matches: fused.matches,
      resultStatus: fused.resultStatus,
      nearestMatch: fused.nearestMatch,
    },
    diagnostics: {
      labels: fused.labels,
      attributes: fused.attributes,
      identification: fused.identification,
    },
    meta: {
      searchQuery: fused.searchQuery,
      categoryFilter: visual.categoryFilter || "all",
    },
  });
}

module.exports = {
  searchCatalogByImage,
};
