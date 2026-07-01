const { filterProductsLocally, isPriceOrIntentOnlyQuery, parseVoiceQuery } = require("../src/utils/catalogTextFilter");
const fallback = require("../src/data/catalog-fallback.json");

describe("catalogTextFilter", () => {
  const products = fallback.products ?? [];

  it('filters "below 45" by price without requiring keyword match', () => {
    const result = filterProductsLocally(products, "below 45");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.price <= 45)).toBe(true);
  });

  it('filters "Below 45" case-insensitively', () => {
    const result = filterProductsLocally(products, "Below 45");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.price <= 45)).toBe(true);
  });

  it('filters "under $50" by price', () => {
    const result = filterProductsLocally(products, "under $50");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.price <= 50)).toBe(true);
  });

  it('filters "shoes women" with relevance', () => {
    const result = filterProductsLocally(products, "shoes women");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns all products for empty query", () => {
    expect(filterProductsLocally(products, "").length).toBe(products.length);
  });

  it("detects price-only queries", () => {
    expect(isPriceOrIntentOnlyQuery("below 45")).toBe(true);
    expect(isPriceOrIntentOnlyQuery("blue jacket")).toBe(false);
  });

  it("parses between price range", () => {
    const intent = parseVoiceQuery("between 20 and 40 dollars");
    expect(intent.priceMin).toBe(20);
    expect(intent.priceMax).toBe(40);
    const result = filterProductsLocally(products, "between 20 and 40 dollars");
    expect(result.every((p) => p.price >= 20 && p.price <= 40)).toBe(true);
  });

  it("does not match nonsense literally", () => {
    const result = filterProductsLocally(products, "xyzqwerty nonsense");
    expect(result.length).toBe(0);
  });
});
