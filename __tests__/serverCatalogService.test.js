function okJson(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe("server catalogService", () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("seeds the live catalog merge from the richer snapshot baseline", async () => {
    global.fetch
      .mockResolvedValueOnce(
        okJson({
          products: [
            {
              id: 1,
              title: "Live Smartphone Alpha",
              description: "Unlocked smartphone with OLED screen",
              category: "smartphones",
              price: 499,
              thumbnail: "https://example.com/live-smartphone.jpg",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson([
          {
            id: 7,
            title: "Live Canvas Weekender Bag",
            description: "Travel bag with zip top and padded strap",
            category: "bags",
            price: 74,
            image: "https://example.com/live-bag.jpg",
          },
        ])
      )
      .mockResolvedValueOnce(
        okJson([
          {
            id: 9,
            title: "Live Accent Chair",
            description: "Accent chair for living room reading corners",
            category: { name: "furniture" },
            price: 229,
            images: ["https://example.com/live-chair.jpg"],
          },
        ])
      );

    const service = require("../server/src/catalogService");
    const products = await service.fetchCatalog({ force: true });
    const meta = service.getCatalogMeta();

    expect(products.length).toBeGreaterThanOrEqual(350);
    expect(meta.offline).toBe(false);
    expect(meta.sources[0]).toMatchObject({ name: "snapshot-seed" });
    expect(products.some((product) => product.id === "demo-backpack-109")).toBe(true);
    expect(
      products.some((product) => product.title === "Live Canvas Weekender Bag")
    ).toBe(true);
    expect(
      products.some((product) => product.title === "Live Accent Chair")
    ).toBe(true);
  });

  it("prefers a tracked server-root snapshot path before local-only artifacts", () => {
    const service = require("../server/src/catalogService");

    expect(service.SNAPSHOT_CANDIDATE_PATHS[0]).toMatch(/server[\/\\]catalog-snapshot\.json$/);
    expect(service.SNAPSHOT_CANDIDATE_PATHS).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/src[\/\\]data[\/\\]catalog-fallback\.json$/),
      ])
    );
  });
});
