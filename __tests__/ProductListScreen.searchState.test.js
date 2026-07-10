const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

const mockSearchCatalog = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: {} }),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) =>
    selector({
      cart: {
        pendingByProduct: {},
      },
      auth: {
        user: null,
      },
    }),
}));

jest.mock("../src/redux/api/catalogApi", () => ({
  useCatalogProducts: () => ({
    products: [
      {
        id: 1,
        title: "Structured Wool Coat",
        price: 189,
        image: "https://example.com/coat.png",
        category: "women's clothing",
      },
      {
        id: 2,
        title: "Leather City Backpack",
        price: 129,
        image: "https://example.com/bag.png",
        category: "bags",
      },
    ],
    isLoading: false,
    error: null,
    isOfflineFallback: false,
    refetch: jest.fn(),
    catalogTotal: 394,
  }),
  getTopCategories: () => ["women's clothing", "bags"],
}));

jest.mock("../src/services/catalogSearchService", () => ({
  searchCatalog: (...args) => mockSearchCatalog(...args),
  matchIdsFromProducts: (products) => new Set(products.map((product) => String(product.id))),
}));

jest.mock("../src/services/visualSearchService", () => ({
  analyzeImageForProducts: jest.fn(),
}));

jest.mock("../src/utils/photoPicker", () => ({
  pickPhotoAsset: jest.fn(),
}));

jest.mock("../src/components/VisualSearchCategoryPrompt", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function VisualSearchCategoryPromptMock() {
    return ReactModule.createElement(RN.View, { testID: "visual-search-prompt" });
  };
});

jest.mock("react-native-vector-icons/Ionicons", () => "Ionicons");

jest.mock("@react-native-community/slider", () => "Slider");

jest.mock("react-native-picker-select", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function PickerMock() {
    return ReactModule.createElement(RN.View, { testID: "sort-picker" });
  };
});

const ProductListScreen = require("../src/screens/ProductListScreen").default;

describe("ProductListScreen search state", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSearchCatalog.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not keep showing broad catalog items after a search resolves with no matches", async () => {
    mockSearchCatalog.mockResolvedValue({
      matches: [],
      source: "api",
    });

    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductListScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    const initialVisibleItems = tree.root.findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        node.props.testID.startsWith("product-list-item-")
    );
    expect(initialVisibleItems.length).toBeGreaterThan(0);

    const input = tree.root.findByProps({ testID: "product-search-input" });

    await act(async () => {
      input.props.onChangeText("purple velvet trench");
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    const visibleItems = tree.root.findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        node.props.testID.startsWith("product-list-item-"),
      { deep: false }
    );

    expect(visibleItems).toHaveLength(0);
  });

  it("renders search results in the search's relevance-ranked order, not catalog order", async () => {
    // Catalog order is id 1 then id 2 (see the catalogApi mock above). The search
    // backend ranks id 2 as the better match -- the rendered list must follow that
    // ranking, not silently fall back to the base catalog's own ordering.
    mockSearchCatalog.mockResolvedValue({
      matches: [
        { id: 2, title: "Leather City Backpack", price: 129, category: "bags" },
        { id: 1, title: "Structured Wool Coat", price: 189, category: "women's clothing" },
      ],
      source: "api",
    });

    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductListScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    const input = tree.root.findByProps({ testID: "product-search-input" });

    await act(async () => {
      input.props.onChangeText("bag or coat");
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const visibleItems = tree.root.findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        node.props.testID.startsWith("product-list-item-"),
      { deep: false }
    );

    expect(visibleItems.map((node) => node.props.testID)).toEqual([
      "product-list-item-2",
      "product-list-item-1",
    ]);
  });
});
