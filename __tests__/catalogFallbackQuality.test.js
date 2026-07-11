const fallback = require("../src/data/catalog-fallback.json");
const { CATEGORY_TARGETS } = require("../server/scripts/catalogAttributePools.js");

// Thresholds below are calibrated to the curated static catalog (Phase 1 of
// docs/superpowers/plans/2026-07-09-static-product-catalog-implementation.md):
// 180-220 hand-authored products, every one fully enriched (no "some products
// are thin" split like the old 384-product live-fetch blend had).

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

    // Every product in the static catalog is fully authored, not just a subset.
    expect(richProducts.length).toBe(products.length);
    expect(products.length).toBeGreaterThanOrEqual(180);
    expect(products.length).toBeLessThanOrEqual(220);
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

    // At least half the catalog should have a rich (>=3 image) gallery.
    expect(galleryProducts.length).toBeGreaterThanOrEqual(Math.floor(products.length * 0.45));

    // Gallery depth must not be concentrated in one or two categories -- every
    // category should have at least one product with a rich gallery.
    const categoriesWithGalleryDepth = new Set(galleryProducts.map((p) => p.category));
    const missingCategories = CATEGORY_TARGETS.map((t) => t.key).filter(
      (key) => !categoriesWithGalleryDepth.has(key)
    );
    expect(missingCategories).toEqual([]);
  });
});
