const { constraintBoost, refineRankedResults } = require("../server/src/search/text/semanticTextReranker");

const trousersXLBrown = { id: "p1", title: "Classic Trousers", category: "mens-clothing", price: 40, colors: ["brown"], materials: ["cotton"], sizes: ["M", "L", "XL"], specifications: {} };
const trousersMBlue = { id: "p2", title: "Classic Trousers", category: "mens-clothing", price: 40, colors: ["blue"], materials: ["cotton"], sizes: ["S", "M"], specifications: {} };
const headphonesWireless = { id: "p3", title: "Studio Headphones", category: "electronics", price: 45, colors: ["black"], materials: [], sizes: [], specifications: { wireless: true, bluetooth: true } };
const headphonesWired = { id: "p4", title: "Studio Headphones Wired", category: "electronics", price: 45, colors: ["black"], materials: [], sizes: [], specifications: { wireless: false } };

describe("constraintBoost - size and specification awareness", () => {
  it("boosts a product whose sizes include the requested size", () => {
    const intent = { size: "XL", specifications: [], keywords: ["brown"], categoryFilters: [], gender: null, priceMin: 0, priceMax: Infinity };
    const boostMatch = constraintBoost(trousersXLBrown, intent);
    const boostNoMatch = constraintBoost(trousersMBlue, intent);
    expect(boostMatch).toBeGreaterThan(boostNoMatch);
  });

  it("boosts a product whose colors array includes the requested color keyword", () => {
    const intent = { size: null, specifications: [], keywords: ["brown"], categoryFilters: [], gender: null, priceMin: 0, priceMax: Infinity };
    const boostBrown = constraintBoost(trousersXLBrown, intent);
    const boostBlue = constraintBoost(trousersMBlue, intent);
    expect(boostBrown).toBeGreaterThan(boostBlue);
  });

  it("boosts a product matching a requested specification", () => {
    const intent = { size: null, specifications: ["wireless"], keywords: [], categoryFilters: [], gender: null, priceMin: 0, priceMax: Infinity };
    const boostWireless = constraintBoost(headphonesWireless, intent);
    const boostWired = constraintBoost(headphonesWired, intent);
    expect(boostWireless).toBeGreaterThan(boostWired);
  });
});

describe("refineRankedResults - size hard-filter with graceful fallback", () => {
  it("filters to only products with the requested size when at least one exists", () => {
    const intent = { size: "XL", specifications: [], productTypes: [], priceMin: 0, priceMax: Infinity };
    const ranked = [
      { product: trousersXLBrown, score: 0.5 },
      { product: trousersMBlue, score: 0.6 },
    ];
    const refined = refineRankedResults(ranked, intent);
    expect(refined.map((r) => r.product.id)).toEqual(["p1"]);
  });

  it("falls back to the full set when no product has the requested size (no crash, no empty result)", () => {
    const intent = { size: "XXXL", specifications: [], productTypes: [], priceMin: 0, priceMax: Infinity };
    const ranked = [
      { product: trousersXLBrown, score: 0.5 },
      { product: trousersMBlue, score: 0.6 },
    ];
    const refined = refineRankedResults(ranked, intent);
    expect(refined.length).toBe(2);
  });
});
