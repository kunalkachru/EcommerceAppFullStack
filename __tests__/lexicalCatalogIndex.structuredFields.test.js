const { buildLexicalCatalogIndex, searchLexicalCatalog } = require("../server/src/search/text/lexicalCatalogIndex");

describe("lexical index includes structured attribute fields", () => {
  const products = [
    { id: "p1", title: "Classic Trousers", category: "mens-clothing", brand: "ShopEase", tags: [], description: "Everyday trousers.", colors: ["brown"], materials: ["cotton"], sizes: ["XL"], specifications: {} },
    { id: "p2", title: "Classic Trousers", category: "mens-clothing", brand: "ShopEase", tags: [], description: "Everyday trousers.", colors: ["blue"], materials: ["cotton"], sizes: ["S"], specifications: {} },
  ];

  it("surfaces the product whose color field matches a color-only query term", () => {
    const index = buildLexicalCatalogIndex(products);
    const results = searchLexicalCatalog(index, "brown trousers", { limit: 10 });
    expect(results[0].product.id).toBe("p1");
    expect(results[0].lexicalScore).toBeGreaterThan(results[1]?.lexicalScore ?? 0);
  });
});
