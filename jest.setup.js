jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map();
  return {
    setItem: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    getItem: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
    removeItem: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
    multiGet: jest.fn((keys) =>
      Promise.resolve(keys.map((key) => [key, store.get(key) ?? null]))
    ),
    multiSet: jest.fn((pairs) => {
      pairs.forEach(([key, value]) => store.set(key, value));
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach((key) => store.delete(key));
      return Promise.resolve();
    }),
  };
});

jest.mock("react-native-keychain", () => {
  const store = new Map();
  return {
    setGenericPassword: jest.fn((username, password, options) => {
      store.set(options?.service ?? "default", { username, password });
      return Promise.resolve(true);
    }),
    getGenericPassword: jest.fn((options) => {
      const entry = store.get(options?.service ?? "default");
      return Promise.resolve(entry ? { username: entry.username, password: entry.password } : false);
    }),
    resetGenericPassword: jest.fn((options) => {
      store.delete(options?.service ?? "default");
      return Promise.resolve(true);
    }),
  };
});

jest.mock("react-native-image-picker", () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock("@react-native-voice/voice", () => ({
  default: {
    onSpeechStart: null,
    onSpeechEnd: null,
    onSpeechError: null,
    onSpeechResults: null,
    onSpeechPartialResults: null,
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock("react-native-webview", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return {
    // No testID on the inner View -- only the composite (found via
    // findByProps) carries it, so its own onMessage prop is reachable
    // directly without ambiguity between composite and host matches.
    WebView: ReactModule.forwardRef(function MockWebView(props, ref) {
      return ReactModule.createElement(RN.View, {});
    }),
  };
});

jest.mock("./src/redux/api/catalogApi", () => {
  const fallbackProducts =
    require("./src/data/catalog-fallback.json").products?.slice(0, 20) ??
    require("./src/data/products").default;

  function getTopCategories(products, limit = 8) {
    const counts = new Map();
    products.forEach((p) => {
      if (p.category) {
        counts.set(p.category, (counts.get(p.category) || 0) + 1);
      }
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category]) => category);
  }

  return {
    catalogApi: {
      reducerPath: "catalogApi",
      reducer: (state = {}) => state,
      middleware: () => (next) => (action) => next(action),
    },
    useGetProductsQuery: () => ({
      data: fallbackProducts,
      isLoading: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
      refetch: jest.fn(),
    }),
    useGetProductByIdQuery: () => ({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useGetCatalogMetaQuery: () => ({
      data: { total: fallbackProducts.length },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useCatalogProducts: () => ({
      products: fallbackProducts,
      isLoading: false,
      isFetching: false,
      error: null,
      isOfflineFallback: false,
      catalogTotal: fallbackProducts.length,
      refetch: jest.fn(),
    }),
    getTopCategories,
  };
});
