describe("search runtime client routing", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete global.__SEARCH_RUNTIME__;
    delete global.__API_HOST__;
    delete global.__API_USE_HTTPS__;
  });

  afterEach(() => {
    try {
      const { clearSearchRuntimeOverride } = require("../src/config/searchRuntime");
      clearSearchRuntimeOverride();
    } catch {
      // module may not be loaded in each test
    }
  });

  it("defaults both API and search runtime URLs to the baseline port", () => {
    jest.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));

    const { getApiBaseUrl } = require("../src/config/api");
    const {
      getSearchApiBaseUrl,
      getSearchRuntimeConfig,
    } = require("../src/config/searchRuntime");

    expect(getApiBaseUrl()).toBe("http://127.0.0.1:5001");
    expect(getSearchApiBaseUrl()).toBe("http://127.0.0.1:5001");
    expect(getSearchRuntimeConfig()).toMatchObject({
      runtimeName: "baseline",
      port: 5001,
    });
  });

  it("switches search runtime URLs to hybrid without changing the legacy API URL", async () => {
    global.__SEARCH_RUNTIME__ = "hybrid";

    jest.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));
    jest.doMock("axios", () => ({
      post: jest.fn().mockResolvedValue({ data: {} }),
      create: jest.fn(() => ({
        post: jest.fn().mockResolvedValue({ data: {} }),
        get: jest.fn().mockResolvedValue({ data: {} }),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      })),
    }));

    const axios = require("axios");
    const { getApiBaseUrl } = require("../src/config/api");
    const { getSearchApiBaseUrl } = require("../src/config/searchRuntime");
    const { searchProductsByVoice } = require("../src/services/voiceSearchService");
    const { analyzeImageForProducts } = require("../src/services/visualSearchService");

    await searchProductsByVoice("red shoes");
    await analyzeImageForProducts(null, null, "base64-image");

    expect(getApiBaseUrl()).toBe("http://127.0.0.1:5001");
    expect(getSearchApiBaseUrl()).toBe("http://127.0.0.1:5002");
    expect(axios.post).toHaveBeenCalledWith(
      "http://127.0.0.1:5002/api/search/voice",
      expect.any(Object),
      expect.any(Object)
    );

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "http://127.0.0.1:5002" })
    );

    const visualClient = axios.create.mock.results[axios.create.mock.results.length - 1].value;
    expect(visualClient.post).toHaveBeenCalledWith(
      "/api/visual-search",
      expect.any(Object),
      expect.any(Object)
    );
  });

  it("supports toggling the search runtime override in-process", () => {
    jest.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));

    const {
      getSearchApiBaseUrl,
      getSearchRuntimeConfig,
      setSearchRuntimeOverride,
    } = require("../src/config/searchRuntime");

    expect(getSearchRuntimeConfig().runtimeName).toBe("baseline");

    setSearchRuntimeOverride("hybrid");
    expect(getSearchRuntimeConfig().runtimeName).toBe("hybrid");
    expect(getSearchApiBaseUrl()).toBe("http://127.0.0.1:5002");

    setSearchRuntimeOverride("baseline");
    expect(getSearchRuntimeConfig().runtimeName).toBe("baseline");
    expect(getSearchApiBaseUrl()).toBe("http://127.0.0.1:5001");
  });
});
