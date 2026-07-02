const { buildSearchIntent } = require("../server/src/search/intent/buildSearchIntent");
const { normalizeSearchQuery } = require("../server/src/search/intent/queryNormalizer");

describe("buildSearchIntent", () => {
  it("normalizes spoken number phrasing before parsing", () => {
    expect(normalizeSearchQuery("it's a fifty dollars jacket blue please")).toContain("50");
  });

  it("parses jumbled price-first voice phrasing into a usable search intent", async () => {
    const intent = await buildSearchIntent("100 under headphones wireless", {
      useLlmReasoning: false,
    });

    expect(intent.source).toBe("rules");
    expect(intent.priceMax).toBe(100);
    expect(intent.productTypes).toEqual(expect.arrayContaining(["headphones"]));
    expect(intent.searchText).toMatch(/headphones/i);
  });
});
