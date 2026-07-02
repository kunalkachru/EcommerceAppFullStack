const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

describe("golden search fixtures", () => {
  it("defines text query fixtures with ids and expectations", () => {
    const fixtures = readJson("scripts/fixtures/golden-text-queries.json");
    expect(Array.isArray(fixtures)).toBe(true);
    expect(fixtures.length).toBeGreaterThan(4);
    fixtures.forEach((fixture) => {
      expect(typeof fixture.id).toBe("string");
      expect(typeof fixture.query).toBe("string");
      expect(fixture.query.length).toBeGreaterThan(0);
      expect(typeof fixture.expectation).toBe("object");
    });
  });

  it("defines image fixtures that point at checked-in photos", () => {
    const fixtures = readJson("scripts/fixtures/golden-image-fixtures.json");
    expect(Array.isArray(fixtures)).toBe(true);
    expect(fixtures.length).toBeGreaterThan(2);
    fixtures.forEach((fixture) => {
      expect(typeof fixture.id).toBe("string");
      expect(typeof fixture.imagePath).toBe("string");
      expect(fs.existsSync(path.join(root, fixture.imagePath))).toBe(true);
    });
  });
});
