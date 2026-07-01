const {
  productTypeMatches,
  getProductTypeMatchStrength,
  refineRankedResults,
  priceDistance,
} = require("../server/src/naturalSearch");

describe("naturalSearch helpers", () => {
  it("matches headphone-like products for headphones intent", () => {
    const product = {
      title: "Wireless Earbuds",
      description: "Noise cancelling earbuds",
      category: "electronics",
      tags: [],
    };
    const intent = { productTypes: ["headphones"] };
    expect(productTypeMatches(product, intent)).toBe(true);
  });

  it("rejects unrelated products for headphones intent", () => {
    const product = {
      title: "Ceramic Coffee Mug",
      description: "Kitchen mug set",
      category: "home-kitchen",
      tags: ["kitchen"],
    };
    const intent = { productTypes: ["headphones"] };
    expect(productTypeMatches(product, intent)).toBe(false);
  });

  it("prefers strong type signals over weak description-only signals", () => {
    const intent = { productTypes: ["laptop"] };
    const strong = {
      title: "Sleek Gaming Laptop",
      description: "High performance machine",
      category: "electronics",
      tags: [],
    };
    const weak = {
      title: "Work Backpack",
      description: "Fits 15 inch laptop",
      category: "bags",
      tags: [],
    };
    expect(getProductTypeMatchStrength(strong, intent)).toBe(2);
    expect(getProductTypeMatchStrength(weak, intent)).toBe(1);
  });

  it("demotes accessory-like matches for primary product intents", () => {
    const intent = { productTypes: ["laptop"] };
    const accessory = {
      title: "Laptop Backpack with USB Port",
      description: "Travel backpack",
      category: "bags",
      tags: [],
    };
    expect(getProductTypeMatchStrength(accessory, intent)).toBe(1);
  });

  it("uses available in-range results when price constraints exist", () => {
    const intent = { productTypes: ["laptop"], priceMin: 500, priceMax: 900 };
    const ranked = [
      {
        score: 0.95,
        product: { title: "Laptop A", category: "laptops", description: "", tags: [], price: 1200 },
      },
      {
        score: 0.8,
        product: { title: "Laptop B", category: "laptops", description: "", tags: [], price: 799 },
      },
      {
        score: 0.6,
        product: { title: "Laptop C", category: "laptops", description: "", tags: [], price: 450 },
      },
    ];
    const refined = refineRankedResults(ranked, intent);
    expect(refined).toHaveLength(1);
    expect(refined[0].product.title).toBe("Laptop B");
  });

  it("falls back to nearest price when no product is strictly in range", () => {
    const intent = { productTypes: ["monitor"], priceMin: 0, priceMax: 250 };
    const ranked = [
      {
        score: 0.7,
        product: { title: "Monitor High", category: "electronics", description: "monitor", tags: [], price: 999 },
      },
      {
        score: 0.69,
        product: { title: "Monitor Mid", category: "electronics", description: "monitor", tags: [], price: 399 },
      },
      {
        score: 0.65,
        product: { title: "Monitor Closest", category: "electronics", description: "monitor", tags: [], price: 299 },
      },
    ];
    const refined = refineRankedResults(ranked, intent);
    expect(refined[0].product.title).toBe("Monitor Closest");
    expect(priceDistance(refined[0].product, intent)).toBeLessThan(
      priceDistance(refined[1].product, intent)
    );
  });
});
