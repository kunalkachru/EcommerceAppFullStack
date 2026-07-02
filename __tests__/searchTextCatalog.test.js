const { searchTextCatalog } = require("../server/src/search/text/searchTextCatalog");

describe("searchTextCatalog", () => {
  it("returns hybrid metadata and reranked matches through the new orchestrator", async () => {
    const result = await searchTextCatalog(
      "100 under headphones wireless",
      {
        buildSearchIntent: async () => ({
          rawQuery: "100 under headphones wireless",
          searchText: "wireless headphones",
          priceMin: 0,
          priceMax: 100,
          productTypes: ["headphones"],
          keywords: ["wireless", "headphones"],
          categoryFilters: ["electronics"],
          source: "rules",
        }),
        ensureIndex: async () => [
          {
            id: "hp-1",
            product: {
              id: "hp-1",
              title: "Wireless Headphones",
              description: "Over-ear bluetooth headphones",
              category: "electronics",
              brand: "SoundMax",
              tags: ["audio", "wireless"],
              price: 89,
            },
            textVec: [1, 0],
            imageVec: [0.9, 0.1],
          },
          {
            id: "ph-1",
            product: {
              id: "ph-1",
              title: "Phone Case",
              description: "Silicone case for mobile phone",
              category: "mobile-accessories",
              brand: "ShieldCo",
              tags: ["phone", "case"],
              price: 19,
            },
            textVec: [0.2, 0.8],
            imageVec: [0.2, 0.7],
          },
        ],
        embedText: async () => [1, 0],
        cosine: (a, b) => a[0] * b[0] + a[1] * b[1],
        engineKey: "Xenova/clip-vit-base-patch32-catalog-v4",
      },
      { runtimeName: "hybrid" }
    );

    expect(result.searchMode).toBe("hybrid-lexical-semantic-v1");
    expect(result.intentSource).toBe("rules");
    expect(result.matches[0].id).toBe("hp-1");
  });
});
