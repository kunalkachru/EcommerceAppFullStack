const fallback = require("../src/data/catalog-fallback.json");

describe("catalog fallback quality", () => {
  const products = fallback.products ?? [];

  it("ships a richly-enriched deterministic fallback snapshot", () => {
    const richProducts = products.filter(
      (product) =>
        product.slug &&
        product.sku &&
        product.currency === "USD" &&
        typeof product.inventoryCount === "number" &&
        Array.isArray(product.colors) &&
        Array.isArray(product.materials) &&
        Array.isArray(product.keywords) &&
        product.imageAlt
    );

    expect(richProducts.length).toBeGreaterThanOrEqual(350);
  });

  it("removes raw upstream junk categories from the bundled shopper catalog", () => {
    const noisy = products.filter((product) =>
      ["kategori yang sudah diganti", "miscellaneous", "vehicle", "tops", "shoesk"].includes(
        product.category
      )
    );

    expect(noisy).toHaveLength(0);
  });

  it("ships meaningful multi-image gallery depth for premium browsing moments", () => {
    const galleryProducts = products.filter(
      (product) => Array.isArray(product.images) && product.images.length >= 3
    );
    const curatedHeroGallery = galleryProducts.filter(
      (product) => product.source === "demo-coverage"
    );

    expect(galleryProducts.length).toBeGreaterThanOrEqual(150);
    expect(curatedHeroGallery.length).toBeGreaterThanOrEqual(10);
  });
});
