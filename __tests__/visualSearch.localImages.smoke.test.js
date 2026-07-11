// __tests__/visualSearch.localImages.smoke.test.js
const path = require("path");
const fs = require("fs");

describe("visualSearch local image support (smoke)", () => {
  it("resolves a local catalog image path to an existing file", () => {
    const catalog = require("../server/catalog-static.json");
    const sample = catalog.products.find((p) => p.images?.length);
    expect(sample).toBeTruthy();
    const absolute = path.join(__dirname, "..", "server", sample.images[0]);
    expect(fs.existsSync(absolute)).toBe(true);
  });
});
