const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

const mockDispatch = jest.fn();
let mockProducts;
let renderedTree;

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: {} }),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) =>
    selector({
      auth: { user: null },
      cart: { pendingByProduct: {} },
    }),
}));

jest.mock("../redux/api/catalogApi", () => ({
  useCatalogProducts: () => ({
    products: mockProducts,
    isLoading: false,
    error: null,
    isOfflineFallback: false,
    refetch: jest.fn(),
    catalogTotal: mockProducts.length,
  }),
  getTopCategories: () => [],
}));

jest.mock("../redux/cartSlice", () => ({
  addToCart: (product) => ({ type: "cart/addToCart", payload: product }),
}));

jest.mock("../services/catalogSearchService", () => ({
  searchCatalog: jest.fn(),
}));

jest.mock("../services/visualSearchService", () => ({
  analyzeImageForProducts: jest.fn(),
}));

jest.mock("../utils/photoPicker", () => ({
  pickPhotoAsset: jest.fn(),
}));
jest.mock("../utils/llmSearchDefaults", () => ({
  resolveDefaultLlmOptions: jest.fn().mockResolvedValue({ apiKey: null }),
}));

jest.mock("../components/VisualSearchCategoryPrompt", () => () => null);
jest.mock("../components/LlmSearchInviteBanner", () => () => null);
jest.mock("../components/CategoryFilterBar", () => () => null);
jest.mock("../components/UnifiedFilterPanel", () => () => null);
jest.mock("../components/LuxuryStateIndicators", () => ({
  LuxuryErrorBanner: () => null,
  LuxuryLoadingState: () => null,
  LuxuryEmptyState: () => null,
}));
jest.mock("react-native-vector-icons/Ionicons", () => "Ionicons");
jest.mock("@react-native-community/slider", () => "Slider");
jest.mock("react-native-picker-select", () => "Picker");

const ProductListScreen = require("./ProductListScreen").default;

const outOfStockProduct = {
  id: "zero-stock",
  title: "Zero Stock Product",
  price: 25,
  image: "https://example.com/zero-stock.png",
  category: "test",
  inventoryCount: 0,
};

const inStockProduct = {
  id: "in-stock",
  title: "In Stock Product",
  price: 40,
  image: "https://example.com/in-stock.png",
  category: "test",
  inventoryCount: 3,
};

function renderProducts(products) {
  mockProducts = products;
  mockDispatch.mockClear();
  let tree;
  act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(ProductListScreen, {
        navigation: { navigate: jest.fn() },
      })
    );
  });
  renderedTree = tree;
  return tree;
}

function productCard(tree, product) {
  return tree.root.findByProps({ testID: `product-list-item-${product.id}` });
}

function cardTexts(card) {
  return card.findAllByType("Text");
}

function textValue(node) {
  return Array.isArray(node.props.children)
    ? node.props.children.join("")
    : String(node.props.children ?? "");
}

describe("ProductListScreen product-card stock behavior", () => {
  beforeEach(() => {
    mockProducts = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      renderedTree?.unmount();
      jest.runOnlyPendingTimers();
    });
    renderedTree = undefined;
    jest.useRealTimers();
  });

  it("renders a red Out of stock label directly under the price for a zero-stock product", () => {
    const tree = renderProducts([outOfStockProduct]);
    const card = productCard(tree, outOfStockProduct);
    const texts = cardTexts(card);
    const priceIndex = texts.findIndex((node) => textValue(node) === "$25");
    const stockLabel = texts[priceIndex + 1];

    expect(stockLabel.props.children).toBe("Out of stock");
    expect(stockLabel.props.style).toEqual(expect.objectContaining({ color: "#C62828" }));
  });

  it("disables the add button and does not dispatch for a zero-stock product", () => {
    const tree = renderProducts([outOfStockProduct]);
    const addButton = tree.root.findByProps({ testID: `product-list-add-${outOfStockProduct.id}` });

    expect(addButton.props.disabled).toBe(true);
    act(() => {
      addButton.props.onPress();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("keeps the in-stock card unchanged and dispatches add to cart from its enabled button", () => {
    const tree = renderProducts([inStockProduct]);
    const card = productCard(tree, inStockProduct);
    const addButton = tree.root.findByProps({ testID: `product-list-add-${inStockProduct.id}` });

    expect(cardTexts(card).some((node) => textValue(node) === "Out of stock")).toBe(false);
    expect(addButton.props.disabled).toBe(false);
    act(() => {
      addButton.props.onPress();
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "cart/addToCart",
      payload: inStockProduct,
    });
  });
});
