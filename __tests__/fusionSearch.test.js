const { fuseSearchResults } = require("../server/src/search/fusion/fuseSearchResults");

describe("fuseSearchResults", () => {
  it("preserves strong visual matches when they exist", () => {
    const fused = fuseSearchResults({
      visual: {
        matches: [{ id: "bag-1", title: "Canvas Backpack" }],
        resultStatus: "found",
        searchQuery: "Canvas Backpack",
      },
      text: {
        matches: [{ id: "alt-1", title: "Travel Bag" }],
      },
    });

    expect(fused.matches[0].id).toBe("bag-1");
    expect(fused.fallbackUsed).toBe(false);
  });

  it("falls back to text-style matches when visual search has no catalog hit", () => {
    const fused = fuseSearchResults({
      visual: {
        matches: [],
        resultStatus: "no_inventory_match",
        searchQuery: "black backpack",
        labels: [{ text: "backpack", confidence: 0.8, source: "ai" }],
      },
      text: {
        matches: [{ id: "bag-2", title: "Black Travel Backpack" }],
      },
    });

    expect(fused.matches[0].id).toBe("bag-2");
    expect(fused.resultStatus).toBe("text_fallback_found");
    expect(fused.fallbackUsed).toBe(true);
    expect(fused.labels).toHaveLength(1);
  });
});
