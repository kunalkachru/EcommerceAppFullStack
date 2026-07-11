jest.mock("../src/services/voiceSearchService", () => ({
  searchProductsByVoice: jest.fn(),
}));

const { searchProductsByVoice } = require("../src/services/voiceSearchService");
const { searchCatalog } = require("../src/services/catalogSearchService");
const fallback = require("../src/data/catalog-fallback.json").products ?? [];

describe("searchCatalog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns API matches when available", async () => {
    searchProductsByVoice.mockResolvedValue({
      matches: [{ id: "a", title: "A", price: 10 }],
      parsed: { priceMax: 45 },
      intentSource: "rules",
    });
    const result = await searchCatalog("below 45", fallback);
    expect(result.matches).toHaveLength(1);
    expect(result.source).toBe("rules");
  });

  it("falls back to local filter when API returns empty with an unknown/legacy result status", async () => {
    searchProductsByVoice.mockResolvedValue({
      matches: [],
      parsed: { priceMax: 45 },
      intentSource: "rules",
      resultStatus: "unknown",
    });
    const result = await searchCatalog("below 45", fallback);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.source).toBe("local-fallback");
    expect(result.matches.every((p) => p.price <= 45)).toBe(true);
  });

  it("does not fall back to a broad local filter when the API confidently found no matches", async () => {
    searchProductsByVoice.mockResolvedValue({
      matches: [],
      parsed: { priceMax: 15 },
      intentSource: "rules",
      resultStatus: "no_matches",
    });
    const result = await searchCatalog(
      "fluorescent pink size 47 titanium umbrella for my pet dinosaur",
      fallback
    );
    expect(result.matches).toHaveLength(0);
    expect(result.source).toBe("no_matches");
  });

  it("uses local offline when API throws (LLM off)", async () => {
    searchProductsByVoice.mockRejectedValue(new Error("network"));
    const result = await searchCatalog("below 45", fallback);
    expect(result.source).toBe("local-offline");
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it("rethrows when LLM enabled and API fails", async () => {
    searchProductsByVoice.mockRejectedValue(
      Object.assign(new Error("key required"), { code: "llm_key_required" })
    );
    await expect(
      searchCatalog("shoes", fallback, { useLlmReasoning: true })
    ).rejects.toThrow("key required");
  });

  it("returns empty for blank query", async () => {
    const result = await searchCatalog("  ", fallback);
    expect(result.matches).toHaveLength(0);
    expect(result.source).toBe("empty");
  });
});
