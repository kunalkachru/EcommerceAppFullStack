const { searchByNaturalLanguage } = require("../server/src/naturalSearch");

function makeDeps(similarity) {
  const vectors = [
    {
      product: {
        id: "p1",
        title: "Product A",
        category: "x",
        price: 10,
        colors: [],
        sizes: [],
        materials: [],
        specifications: {},
        tags: [],
        description: "",
      },
      textVec: "v",
      imageVec: "v",
    },
    {
      product: {
        id: "p2",
        title: "Product B",
        category: "x",
        price: 20,
        colors: [],
        sizes: [],
        materials: [],
        specifications: {},
        tags: [],
        description: "",
      },
      textVec: "v",
      imageVec: "v",
    },
  ];
  return {
    ensureIndex: async () => vectors,
    loadClip: async () => {},
    embedText: async () => "queryvec",
    cosine: () => similarity,
    CACHE_MODEL_KEY: "test-engine",
  };
}

describe("searchSemanticFirst absolute relevance floor", () => {
  it("returns matches when semantic similarity is genuinely high", async () => {
    const deps = makeDeps(0.9);
    const result = await searchByNaturalLanguage("a real product query", deps, {
      runtimeName: "baseline",
    });
    expect(result.resultStatus).toBe("found");
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("returns no_matches when semantic similarity is uniformly low across the whole catalog", async () => {
    const deps = makeDeps(0.05);
    const result = await searchByNaturalLanguage("completely unrelated gibberish query", deps, {
      runtimeName: "baseline",
    });
    expect(result.resultStatus).toBe("no_matches");
    expect(result.matches).toEqual([]);
  });
});
