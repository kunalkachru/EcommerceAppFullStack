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

jest.mock("react-native-image-picker", () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock("./src/redux/api/catalogApi", () => {
  const fallbackProducts = require("./src/data/products").default;
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
    useCatalogProducts: () => ({
      products: fallbackProducts,
      isLoading: false,
      isFetching: false,
      error: null,
      isOfflineFallback: false,
      refetch: jest.fn(),
    }),
  };
});
