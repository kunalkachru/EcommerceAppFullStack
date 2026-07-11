jest.mock("../src/config/api", () => ({
  getApiBaseUrl: () => "http://localhost:5001",
}));

const { resolveCategoryModelUrl } = require("../src/config/category3DModels");

describe("resolveCategoryModelUrl", () => {
  it("returns null for a category with no 3D model yet", () => {
    expect(resolveCategoryModelUrl("groceries")).toBeNull();
  });

  it("returns an absolute URL for a category with a model", () => {
    expect(resolveCategoryModelUrl("footwear")).toBe(
      "http://localhost:5001/assets/models/footwear/model.glb"
    );
  });
});
