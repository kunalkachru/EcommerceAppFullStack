const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const { Text, TouchableOpacity } = require("react-native");

const mockDispatch = jest.fn(() => ({
  unwrap: () => Promise.resolve({ items: [] }),
}));
const mockAddToCart = jest.fn((product) => ({
  type: "cart/addToCart",
  payload: product,
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) =>
    selector({
      cart: {
        pendingByProduct: {},
      },
    }),
}));

jest.mock("../src/redux/cartSlice", () => ({
  addToCart: mockAddToCart,
}));

jest.mock("../src/services/visualSearchService", () => ({
  fetchSimilarProducts: jest.fn(() => new Promise(() => {})),
}));

jest.mock("../src/components/SimilarProductsStrip", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function SimilarProductsStripMock() {
    return ReactModule.createElement(RN.View, null);
  };
});

const ProductDetailScreen = require("../src/screens/ProductDetailScreen").default;

const createProduct = (inventoryCount) => ({
  id: 1,
  title: "Demo Jacket",
  price: 129.99,
  image: "https://example.com/jacket.png",
  description: "Warm jacket for testing.",
  category: "fashion",
  inventoryCount,
});

const renderProduct = async (inventoryCount) => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      React.createElement(ProductDetailScreen, {
        route: { params: { product: createProduct(inventoryCount) } },
      })
    );
  });
  return tree;
};

const renderedTexts = (tree) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .map((children) => (Array.isArray(children) ? children.join("") : children))
    .filter((value) => typeof value === "string");

const addButton = (tree) =>
  tree.root
    .findAllByType(TouchableOpacity)
    .find((node) => node.props.testID === "pdp-add-to-cart");

describe("ProductDetailScreen inventory behavior", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockAddToCart.mockClear();
  });

  it("renders the exact low-stock message for inventory counts from 1 through 5", async () => {
    for (const inventoryCount of [1, 2, 3, 4, 5]) {
      const tree = await renderProduct(inventoryCount);
      expect(renderedTexts(tree)).toContain(`Only ${inventoryCount} left`);
      expect(renderedTexts(tree)).not.toContain("Only N left");
      await act(async () => {
        tree.unmount();
      });
    }
  });

  it("keeps Add to Cart and hides the low-stock message for inventory of 6 or more", async () => {
    const tree = await renderProduct(6);

    expect(renderedTexts(tree)).toContain("Add to Cart");
    expect(renderedTexts(tree).some((text) => text.startsWith("Only "))).toBe(false);
    expect(addButton(tree).props.disabled).toBe(false);

    await act(async () => {
      tree.unmount();
    });
  });

  it("disables the sold-out action and skips addToCart dispatch when inventory is zero", async () => {
    const tree = await renderProduct(0);
    const button = addButton(tree);

    expect(renderedTexts(tree)).toContain("Sold out");
    expect(button.props.disabled).toBe(true);

    await act(async () => {
      button.props.onPress();
    });

    expect(mockAddToCart).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => {
      tree.unmount();
    });
  });

  it("dispatches addToCart for positive inventory", async () => {
    const tree = await renderProduct(1);
    const button = addButton(tree);

    expect(button.props.disabled).toBe(false);

    await act(async () => {
      button.props.onPress();
    });

    expect(mockAddToCart).toHaveBeenCalledWith(createProduct(1));
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    await act(async () => {
      tree.unmount();
    });
  });
});
