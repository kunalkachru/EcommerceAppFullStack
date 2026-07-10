const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

let latestPickerProps = null;

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
        title: "Alpha Tote",
        price: 140,
        image: "https://example.com/tote.png",
        category: "bags",
      },
      {
        id: 2,
        title: "Budget Tote",
        price: 60,
        image: "https://example.com/tote-budget.png",
        category: "bags",
      },
      {
        id: 3,
        title: "Structured Wool Coat",
        price: 210,
        image: "https://example.com/coat.png",
        category: "women's clothing",
      },
    ],
    isLoading: false,
    error: null,
    isOfflineFallback: false,
    refetch: jest.fn(),
    catalogTotal: 394,
  }),
  getTopCategories: () => ["bags", "women's clothing"],
}));

jest.mock("../src/services/catalogSearchService", () => ({
  searchCatalog: jest.fn(),
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
    return ReactModule.createElement(RN.View, null);
  };
});

jest.mock("../src/components/UnifiedFilterPanel", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function UnifiedFilterPanelMock(props) {
    return ReactModule.createElement(
      RN.View,
      {
        testID: "unified-filter-panel",
        onSortChange: props.onSortChange,
        onPriceChange: props.onPriceChange,
        onSearchCategoryChange: props.onSearchCategoryChange,
      },
      ReactModule.createElement(RN.View, null)
    );
  };
});

jest.mock("react-native-vector-icons/Ionicons", () => "Ionicons");

jest.mock("@react-native-community/slider", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function SliderMock(props) {
    return ReactModule.createElement(RN.View, props);
  };
});

jest.mock("react-native-picker-select", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function PickerMock(props) {
    latestPickerProps = props;
    return ReactModule.createElement(RN.View, {
      testID: props.testID || "product-sort-picker",
    });
  };
});

const ProductListScreen = require("../src/screens/ProductListScreen").default;

function visibleProductItemIds(tree) {
  return [...new Set(tree.root
    .findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        node.props.testID.startsWith("product-list-item-")
    )
    .map((node) => node.props.testID))];
}

describe("ProductListScreen discovery controls", () => {
  beforeEach(() => {
    latestPickerProps = null;
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("filters by category when no active search is present", async () => {
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductListScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    await act(async () => {
      tree.root.findByProps({ testID: "filter-category-bags" }).props.onPress();
    });

    expect(visibleProductItemIds(tree)).toEqual([
      "product-list-item-1",
      "product-list-item-2",
    ]);

    await act(async () => {
      tree.unmount();
    });
  });

  it("applies sort order and price ceiling through the discovery controls", async () => {
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductListScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    await act(async () => {
      tree.root
        .findByProps({ testID: "unified-filter-panel" })
        .props.onSortChange("Price: High to Low");
    });

    expect(visibleProductItemIds(tree)).toEqual([
      "product-list-item-3",
      "product-list-item-1",
      "product-list-item-2",
    ]);

    await act(async () => {
      tree.root
        .findByProps({ testID: "unified-filter-panel" })
        .props.onPriceChange([0, 150]);
    });

    expect(visibleProductItemIds(tree)).toEqual([
      "product-list-item-1",
      "product-list-item-2",
    ]);

    await act(async () => {
      tree.unmount();
    });
  });
});
