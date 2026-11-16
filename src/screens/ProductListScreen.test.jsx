const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const { colors } = require("../theme/tokens");

const mockDispatch = jest.fn();
const mockAddToCart = jest.fn((product) => ({
  type: "cart/addToCart",
  payload: product,
}));

const products = [
  {
    id: 1,
    title: "Zero Stock Tote",
    price: 60,
    stock: 0,
    image: "https://example.com/zero-stock-tote.png",
    category: "bags",
  },
  {
    id: 2,
    title: "Available Backpack",
    price: 129,
    stock: 7,
    image: "https://example.com/available-backpack.png",
    category: "bags",
  },
  {
    id: 3,
    title: "Available Coat",
    price: 189,
    stock: 2,
    image: "https://example.com/available-coat.png",
    category: "women's clothing",
  },
];

jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: {} }),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) =>
    selector({
      cart: { pendingByProduct: {} },
      auth: { user: null },
    }),
}));

jest.mock("../redux/api/catalogApi", () => ({
  useCatalogProducts: () => ({
    products,
    isLoading: false,
    error: null,
    isOfflineFallback: false,
    refetch: jest.fn(),
    catalogTotal: products.length,
  }),
  getTopCategories: () => ["bags", "women's clothing"],
}));

jest.mock("../redux/cartSlice", () => ({
  addToCart: (...args) => mockAddToCart(...args),
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
  resolveDefaultLlmOptions: jest.fn().mockResolvedValue({}),
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

function productItem(tree, id) {
  return tree.root.findByProps({ testID: `product-list-item-${id}` });
}

function addButton(productInfo) {
  return productInfo.parent.findAll(
    (node) =>
      typeof node.props?.onPress === "function" &&
      node.props?.disabled !== undefined
  )[0];
}

function textValue(node) {
  return Array.isArray(node.props.children)
    ? node.props.children.join("")
    : String(node.props.children);
}

async function renderScreen() {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      React.createElement(ProductListScreen, {
        navigation: { navigate: jest.fn() },
      })
    );
  });
  return tree;
}

describe("ProductListScreen stock-state cards", () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockAddToCart.mockClear();
  });

  it("renders Out of stock below the price in the error color for a zero-stock product", async () => {
    const tree = await renderScreen();
    const info = productItem(tree, 1);
    const Text = require("react-native").Text;
    const textNodes = info.findAllByType(Text);
    const priceIndex = textNodes.findIndex((node) => textValue(node) === "$60");
    const stockLabel = textNodes.find((node) => node.props.children === "Out of stock");

    expect(priceIndex).toBeGreaterThanOrEqual(0);
    expect(stockLabel).toBeDefined();
    expect(textNodes.indexOf(stockLabel)).toBeGreaterThan(priceIndex);
    const stockStyle = require("react-native").StyleSheet.flatten(stockLabel.props.style);
    expect(stockStyle).toEqual(expect.objectContaining({ color: colors.error }));
    expect(stockStyle.color).not.toBe(colors.text);
    expect(stockStyle.color).not.toBe(colors.textMuted);
  });

  it("disables the zero-stock Add button without dispatching addToCart", async () => {
    const tree = await renderScreen();
    const info = productItem(tree, 1);
    const button = addButton(info);

    expect(button.props.disabled).toBe(true);
    act(() => button.props.onPress());

    expect(mockAddToCart).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("keeps an in-stock product unchanged and dispatches addToCart", async () => {
    const tree = await renderScreen();
    const info = productItem(tree, 2);
    const button = addButton(info);

    expect(info.findAll((node) => node.props.children === "Out of stock")).toHaveLength(0);
    expect(button.props.disabled).not.toBe(true);

    act(() => button.props.onPress());

    expect(mockAddToCart).toHaveBeenCalledWith(products[1]);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "cart/addToCart",
      payload: products[1],
    });
  });

  it("preserves product card content and ordering for mixed stock states", async () => {
    const tree = await renderScreen();
    const items = tree.root.findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        node.props.testID.startsWith("product-list-item-")
    );
    const uniqueItems = [...new Map(items.map((item) => [item.props.testID, item])).values()];

    expect(uniqueItems.map((item) => item.props.testID)).toEqual([
      "product-list-item-1",
      "product-list-item-2",
      "product-list-item-3",
    ]);
    expect(uniqueItems.map((item) => item.findAllByType(require("react-native").Text)[0].props.children)).toEqual([
      "Zero Stock Tote",
      "Available Backpack",
      "Available Coat",
    ]);
    expect(uniqueItems.map((item) => item.findAllByType(require("react-native").Text).some((node) => node.props.children === "Out of stock"))).toEqual([
      true,
      false,
      false,
    ]);
  });
});
