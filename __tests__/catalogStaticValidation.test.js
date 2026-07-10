// __tests__/catalogStaticValidation.test.js
const path = require("path");
const fs = require("fs");
const catalog = require("../server/catalog-static.json");
const { CATEGORY_TARGETS } = require("../server/scripts/catalogAttributePools.js");
const {
  findDuplicateGroups,
  isLikelyPlaceholder,
} = require("../server/scripts/lib/imageIntegrity");

describe("catalog-static.json completeness", () => {
  const products = catalog.products;

  it("has between 180 and 220 products", () => {
    expect(products.length).toBeGreaterThanOrEqual(180);
    expect(products.length).toBeLessThanOrEqual(220);
  });

  it("every product has at least one color", () => {
    const missing = products.filter((p) => !Array.isArray(p.colors) || p.colors.length === 0);
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it("every product in a materialsRequired category has at least one material", () => {
    const requiredKeys = new Set(
      CATEGORY_TARGETS.filter((t) => t.materialsRequired).map((t) => t.key)
    );
    const missing = products.filter(
      (p) => requiredKeys.has(p.category) && (!Array.isArray(p.materials) || p.materials.length === 0)
    );
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it("every product in a hasSizes category has a non-empty sizes array", () => {
    const sizedKeys = new Set(CATEGORY_TARGETS.filter((t) => t.hasSizes).map((t) => t.key));
    const missing = products.filter(
      (p) => sizedKeys.has(p.category) && (!Array.isArray(p.sizes) || p.sizes.length === 0)
    );
    expect(missing.map((p) => p.id)).toEqual([]);
  });

  it("every product has at least one local image path (not a remote URL)", () => {
    const bad = products.filter(
      (p) => !Array.isArray(p.images) || p.images.length === 0 || p.images.some((i) => /^https?:\/\//.test(i))
    );
    expect(bad.map((p) => p.id)).toEqual([]);
  });

  it("has no duplicate SKUs", () => {
    const skus = products.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("no two products share an identical primary-image hash", () => {
    const repoRoot = path.join(__dirname, "..");
    const groups = findDuplicateGroups(products, repoRoot);
    const offenders = groups.map((g) => g.members.map((p) => p.id).join(" == "));
    expect(offenders).toEqual([]);
  });

  it("every product's primary image exceeds the minimum real-photo size threshold", () => {
    const repoRoot = path.join(__dirname, "..");
    const tooSmall = products.filter((p) => {
      const img = p.images?.[0];
      if (!img) return true;
      const full = path.join(repoRoot, img);
      if (!fs.existsSync(full)) return true;
      return isLikelyPlaceholder(fs.readFileSync(full));
    });
    expect(tooSmall.map((p) => p.id)).toEqual([]);
  });
});
