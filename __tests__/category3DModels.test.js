jest.mock("../src/config/api", () => ({
  getApiBaseUrl: () => "http://localhost:5001",
}));

const { resolveCategoryModelUrl } = require("../src/config/category3DModels");

describe("resolveCategoryModelUrl", () => {
  it("returns null for a category that isn't in the catalog at all", () => {
    expect(resolveCategoryModelUrl("nonexistent-category")).toBeNull();
  });

  it("returns an absolute URL for a category with a model", () => {
    expect(resolveCategoryModelUrl("footwear")).toBe(
      "http://localhost:5001/assets/models/footwear/model.glb"
    );
  });

  it("resolves a model URL for every one of the catalog's 12 categories", () => {
    const categories = [
      "automotive", "bags-accessories", "beauty-fragrances", "electronics", "footwear",
      "groceries", "home-kitchen", "jewelry", "mens-clothing", "sports-fitness", "watches",
      "womens-clothing",
    ];
    categories.forEach((category) => {
      expect(resolveCategoryModelUrl(category)).not.toBeNull();
    });
  });
});
