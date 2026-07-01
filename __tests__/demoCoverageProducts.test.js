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
});
