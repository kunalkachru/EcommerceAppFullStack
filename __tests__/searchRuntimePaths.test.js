const { getSearchRuntimeConfig } = require("../server/src/runtime/searchRuntimeConfig");

describe("searchRuntimeConfig", () => {
  it("defaults to the baseline runtime on port 5001", () => {
    const config = getSearchRuntimeConfig({});
    expect(config.runtimeName).toBe("baseline");
    expect(config.port).toBe(5001);
    expect(config.strategy).toBe("semantic-first");
  });

  it("uses the hybrid runtime defaults when SEARCH_RUNTIME=hybrid", () => {
    const config = getSearchRuntimeConfig({ SEARCH_RUNTIME: "hybrid" });
    expect(config.runtimeName).toBe("hybrid");
    expect(config.port).toBe(5002);
    expect(config.strategy).toBe("hybrid-lexical-semantic-v1");
  });

  it("lets an explicit PORT override the runtime default", () => {
    const config = getSearchRuntimeConfig({
      SEARCH_RUNTIME: "hybrid",
      PORT: "5102",
    });
    expect(config.runtimeName).toBe("hybrid");
    expect(config.port).toBe(5102);
  });
});
