describe("catalogService CATALOG_MODE switch", () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.CATALOG_MODE;
  });

  it("defaults to static mode and loads catalog-static.json", async () => {
    jest.resetModules();
    delete process.env.CATALOG_MODE;
    const { fetchCatalog, getCatalogMeta } = require("../server/src/catalogService");
    const products = await fetchCatalog({ force: true });
    expect(products.length).toBeGreaterThanOrEqual(180);
    expect(getCatalogMeta().sources).toEqual(["static"]);
  });

  it("static-mode products have local image paths, not remote URLs", async () => {
    jest.resetModules();
    const { fetchCatalog } = require("../server/src/catalogService");
    const products = await fetchCatalog({ force: true });
    const bad = products.filter((p) => (p.images || []).some((i) => /^https?:\/\//.test(i)));
    expect(bad).toEqual([]);
  });
});
