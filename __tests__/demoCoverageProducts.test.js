const {
  DEMO_COVERAGE_PRODUCTS,
  getDemoCoverageProducts,
} = require("../server/src/demoCoverageProducts");

describe("demoCoverageProducts", () => {
  it("returns cloned demo products", () => {
    const first = getDemoCoverageProducts();
    first[0].title = "mutated";
    expect(getDemoCoverageProducts()[0].title).not.toBe("mutated");
  });

  it("includes laptops in the 500-900 range", () => {
    const laptops = DEMO_COVERAGE_PRODUCTS.filter(
      (p) =>
        p.category === "laptops" &&
        p.price >= 500 &&
        p.price <= 900
    );
    expect(laptops.length).toBeGreaterThanOrEqual(3);
  });

  it("includes gaming monitors under 240", () => {
    const monitors = DEMO_COVERAGE_PRODUCTS.filter(
      (p) =>
        `${p.title} ${p.description}`.toLowerCase().includes("gaming monitor") &&
        p.price <= 240
    );
    expect(monitors.length).toBeGreaterThanOrEqual(2);
  });

  it("covers the key demo search stories with deterministic inventory", () => {
    const hay = (product) =>
      `${product.title} ${product.description} ${product.category} ${(product.tags || []).join(" ")}`
        .toLowerCase();

    expect(DEMO_COVERAGE_PRODUCTS.length).toBeGreaterThanOrEqual(18);
    expect(
      DEMO_COVERAGE_PRODUCTS.filter(
        (product) => /headphone|earbud|earphone/.test(hay(product)) && product.price <= 100
      ).length
    ).toBeGreaterThanOrEqual(3);
    expect(
      DEMO_COVERAGE_PRODUCTS.filter(
        (product) =>
          /jacket|coat|windbreaker/.test(hay(product)) &&
          /blue/.test(hay(product)) &&
          product.price <= 60
      ).length
    ).toBeGreaterThanOrEqual(2);
    expect(
      DEMO_COVERAGE_PRODUCTS.filter(
        (product) =>
          /shoe|sneaker|sandal|boot/.test(hay(product)) &&
          /women|ladies|female/.test(hay(product)) &&
          product.price <= 50
      ).length
    ).toBeGreaterThanOrEqual(3);
    expect(
      DEMO_COVERAGE_PRODUCTS.filter(
        (product) => /perfume|fragrance|cologne/.test(hay(product)) && product.price <= 90
      ).length
    ).toBeGreaterThanOrEqual(2);
  });

  it("includes production-grade metadata on curated coverage products", () => {
    expect(
      DEMO_COVERAGE_PRODUCTS.every(
        (product) =>
          product.sku &&
          product.currency === "USD" &&
          typeof product.inventoryCount === "number" &&
          product.inventoryCount > 0 &&
          typeof product.availability === "string" &&
          Array.isArray(product.colors) &&
          Array.isArray(product.materials) &&
          Array.isArray(product.keywords) &&
          product.imageAlt
      )
    ).toBe(true);
  });

  it("includes premium gallery coverage for at least the hero demo assortment", () => {
    expect(
      DEMO_COVERAGE_PRODUCTS.filter(
        (product) => Array.isArray(product.images) && product.images.length >= 3
      ).length
    ).toBeGreaterThanOrEqual(10);
  });
});
