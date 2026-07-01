const {
  parseVoiceQuery,
  productMatchesIntent,
  relevanceScore,
  genderMatches,
} = require("../server/src/voiceQueryParser");

describe("parseVoiceQuery", () => {
  it("parses under price", () => {
    const intent = parseVoiceQuery("blue jacket under 50 dollars");
    expect(intent.priceMax).toBe(50);
    expect(intent.categoryGroups).toContain("clothing");
  });

  it("parses between price", () => {
    const intent = parseVoiceQuery("laptop between 500 and 900");
    expect(intent.priceMin).toBe(500);
    expect(intent.priceMax).toBe(900);
    expect(intent.categoryGroups).toContain("electronics");
  });

  it("parses reversed between price order", () => {
    const intent = parseVoiceQuery("laptop 900 and 500 between");
    expect(intent.priceMin).toBe(500);
    expect(intent.priceMax).toBe(900);
  });

  it("parses reversed under price order", () => {
    const intent = parseVoiceQuery("gaming monitor 240 under");
    expect(intent.priceMax).toBe(240);
  });

  it("parses reversed above price order", () => {
    const intent = parseVoiceQuery("women shoes 30 above");
    expect(intent.priceMin).toBe(30);
  });

  it("parses shoes women with gender and footwear", () => {
    const intent = parseVoiceQuery("shoes women");
    expect(intent.gender).toBe("women");
    expect(intent.categoryGroups).toContain("footwear");
    expect(intent.categoryFilters).toEqual(
      expect.arrayContaining(["womens-shoes"])
    );
    expect(intent.semanticQuery).toMatch(/women/i);
    expect(intent.semanticQuery).toMatch(/shoes/i);
  });

  it("filters products by intent", () => {
    const intent = parseVoiceQuery("lipstick under 20");
    const product = {
      title: "Red Lipstick",
      description: "matte lipstick",
      category: "beauty",
      price: 12,
      tags: [],
    };
    expect(productMatchesIntent(product, intent)).toBe(true);
  });

  it("scores women's shoes for shoes women query", () => {
    const intent = parseVoiceQuery("shoes women");
    const shoe = {
      title: "Pampi Shoes",
      description: "casual shoes",
      category: "womens-shoes",
      price: 29.99,
      tags: ["footwear"],
    };
    const menShirt = {
      title: "Men Shirt",
      description: "cotton shirt",
      category: "mens-shirts",
      price: 25,
      tags: [],
    };
    expect(relevanceScore(shoe, intent)).toBeGreaterThan(relevanceScore(menShirt, intent));
    expect(genderMatches(shoe, intent.gender)).toBe(true);
  });

  it("does not expand headphone query into phone keywords", () => {
    const intent = parseVoiceQuery("wireless headphones below 100");
    expect(intent.productTypes).toEqual(expect.arrayContaining(["headphones"]));
    expect(intent.keywords).toEqual(expect.arrayContaining(["headphones", "wireless"]));
    expect(intent.keywords).not.toEqual(expect.arrayContaining(["phone", "smartphone", "mobile"]));
  });
});
