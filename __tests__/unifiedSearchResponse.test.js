const {
  buildUnifiedSearchResponse,
} = require("../server/src/search/contracts/unifiedSearchResponse");
const {
  toLegacyTextSearchResponse,
  toLegacyVisualSearchResponse,
} = require("../server/src/search/contracts/legacyAdapters");

describe("unified search response contract", () => {
  it("adapts text search responses back to the legacy client contract", () => {
    const unified = buildUnifiedSearchResponse({
      mode: "text",
      runtime: {
        name: "hybrid",
        engine: "Xenova/clip-vit-base-patch32-catalog-v4",
        strategy: "hybrid-lexical-semantic-v1",
      },
      query: {
        raw: "wireless headphones under 100",
        normalized: "wireless headphones under 100",
      },
      intent: {
        source: "rules",
        parsed: { productTypes: ["headphones"], priceMax: 100 },
      },
      results: {
        matches: [{ id: "p-1", title: "Wireless Headphones", matchPercent: 91 }],
        resultStatus: "found",
      },
    });

    expect(toLegacyTextSearchResponse(unified)).toEqual({
      query: "wireless headphones under 100",
      normalizedQuery: "wireless headphones under 100",
      parsed: { productTypes: ["headphones"], priceMax: 100 },
      matches: [{ id: "p-1", title: "Wireless Headphones", matchPercent: 91 }],
      resultStatus: "found",
      engine: "Xenova/clip-vit-base-patch32-catalog-v4",
      intentSource: "rules",
      searchMode: "hybrid-lexical-semantic-v1",
    });
  });

  it("adapts visual search responses back to the legacy client contract", () => {
    const unified = buildUnifiedSearchResponse({
      mode: "image",
      runtime: {
        name: "hybrid",
        engine: "Xenova/clip-vit-base-patch32-catalog-v4",
        strategy: "hybrid-lexical-semantic-v1",
      },
      results: {
        matches: [{ id: "p-2", title: "Canvas Backpack", matchPercent: 87 }],
        resultStatus: "found",
        nearestMatch: { id: "p-3", title: "Travel Bag", matchPercent: 61 },
      },
      diagnostics: {
        labels: [{ text: "backpack", confidence: 0.81, source: "ai" }],
        attributes: [{ text: "black", confidence: 0.5, source: "attribute" }],
      },
      meta: {
        searchQuery: "Canvas Backpack",
        categoryFilter: "all",
      },
    });

    expect(toLegacyVisualSearchResponse(unified)).toEqual({
      matches: [{ id: "p-2", title: "Canvas Backpack", matchPercent: 87 }],
      labels: [{ text: "backpack", confidence: 0.81, source: "ai" }],
      attributes: [{ text: "black", confidence: 0.5, source: "attribute" }],
      searchQuery: "Canvas Backpack",
      identification: null,
      resultStatus: "found",
      nearestMatch: { id: "p-3", title: "Travel Bag", matchPercent: 61 },
      categoryFilter: "all",
      engine: "Xenova/clip-vit-base-patch32-catalog-v4",
    });
  });
});
