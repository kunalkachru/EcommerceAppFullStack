const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  PLACEHOLDER_SIZE_THRESHOLD_BYTES,
  hashImage,
  findDuplicateGroups,
  classifyDuplicateGroups,
  isLikelyPlaceholder,
} = require("../server/scripts/lib/imageIntegrity");

describe("imageIntegrity", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-integrity-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFile(relPath, content) {
    const full = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  }

  it("hashImage returns the same hash for identical file contents", () => {
    const a = writeFile("a.jpg", "same-bytes");
    const b = writeFile("b.jpg", "same-bytes");
    expect(hashImage(a)).toBe(hashImage(b));
  });

  it("hashImage returns different hashes for different file contents", () => {
    const a = writeFile("a.jpg", "content-one");
    const b = writeFile("b.jpg", "content-two");
    expect(hashImage(a)).not.toBe(hashImage(b));
  });

  it("PLACEHOLDER_SIZE_THRESHOLD_BYTES is 2048", () => {
    expect(PLACEHOLDER_SIZE_THRESHOLD_BYTES).toBe(2048);
  });

  it("isLikelyPlaceholder is true below the threshold, false at or above it", () => {
    expect(isLikelyPlaceholder(Buffer.alloc(503))).toBe(true);
    expect(isLikelyPlaceholder(Buffer.alloc(2047))).toBe(true);
    expect(isLikelyPlaceholder(Buffer.alloc(2048))).toBe(false);
    expect(isLikelyPlaceholder(Buffer.alloc(50000))).toBe(false);
  });

  it("findDuplicateGroups groups products whose primary image is byte-identical", () => {
    writeFile("assets/products/a/1.jpg", "shared-bytes");
    writeFile("assets/products/b/1.jpg", "shared-bytes");
    writeFile("assets/products/c/1.jpg", "unique-bytes");
    const products = [
      { id: "p1", images: ["assets/products/a/1.jpg"] },
      { id: "p2", images: ["assets/products/b/1.jpg"] },
      { id: "p3", images: ["assets/products/c/1.jpg"] },
    ];
    const groups = findDuplicateGroups(products, tmpDir);
    expect(groups.length).toBe(1);
    expect(groups[0].members.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  });

  it("classifyDuplicateGroups excludes the legitimate dj-/fs- original from needsFix", () => {
    const groups = [
      {
        hash: "h1",
        size: 50000,
        members: [
          { id: "dj-88", images: ["x"] },
          { id: "demo-shoes-women-44", images: ["x"] },
        ],
      },
    ];
    const { needsFix, legitimateOriginals } = classifyDuplicateGroups(groups);
    expect(needsFix.map((p) => p.id)).toEqual(["demo-shoes-women-44"]);
    expect(legitimateOriginals.map((p) => p.id)).toEqual(["dj-88"]);
  });

  it("classifyDuplicateGroups needs-fixes everyone in a sub-threshold-size group", () => {
    const groups = [
      {
        hash: "h2",
        size: 503,
        members: [
          { id: "es-3", images: ["x"] },
          { id: "es-4", images: ["x"] },
        ],
      },
    ];
    const { needsFix, legitimateOriginals } = classifyDuplicateGroups(groups);
    expect(needsFix.map((p) => p.id).sort()).toEqual(["es-3", "es-4"]);
    expect(legitimateOriginals).toEqual([]);
  });

  it("classifyDuplicateGroups needs-fixes everyone when 2+ real (dj-/fs-) members coincide", () => {
    const groups = [
      {
        hash: "h3",
        size: 40000,
        members: [
          { id: "dj-97", images: ["x"] },
          { id: "dj-192", images: ["x"] },
        ],
      },
    ];
    const { needsFix, legitimateOriginals } = classifyDuplicateGroups(groups);
    expect(needsFix.map((p) => p.id).sort()).toEqual(["dj-192", "dj-97"]);
    expect(legitimateOriginals).toEqual([]);
  });
});
