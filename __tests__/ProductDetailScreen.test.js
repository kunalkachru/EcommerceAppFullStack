const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const { Text, View, TouchableOpacity } = require("react-native");

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(() => ({
    unwrap: () => Promise.resolve({ items: [] }),
  })),
  useSelector: (selector) =>
    selector({
      cart: {
        pendingByProduct: {},
      },
    }),
}));

jest.mock("../src/services/visualSearchService", () => ({
  fetchSimilarProducts: jest.fn(() => new Promise(() => {})),
}));

jest.mock("../src/components/SimilarProductsStrip", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function SimilarProductsStripMock() {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, "More like this")
    );
  };
});

jest.mock("react-native-vector-icons/FontAwesome", () => "Icon");

const ProductDetailScreen = require("../src/screens/ProductDetailScreen").default;

describe("ProductDetailScreen", () => {
  it("shows the add to cart action before the similar products section", async () => {
    const product = {
      id: 1,
      title: "Demo Jacket",
      price: 129.99,
      image: "https://example.com/jacket.png",
      description: "Warm jacket for testing.",
      category: "fashion",
    };

    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductDetailScreen, {
          route: { params: { product } },
        })
      );
    });

    const touchables = tree.root.findAllByType(TouchableOpacity);
    const addButton = touchables.find(
      (node) => node.props.accessibilityLabel === "Add to Cart"
    );
    expect(addButton).toBeTruthy();

    const textNodes = tree.root.findAllByType(Text);
    const renderedTexts = textNodes
      .map((node) => node.props.children)
      .flat()
      .filter((value) => typeof value === "string");

    expect(renderedTexts.indexOf("Add to Cart")).toBeGreaterThan(-1);
    expect(renderedTexts.indexOf("More like this")).toBeGreaterThan(-1);
    expect(renderedTexts.indexOf("Add to Cart")).toBeLessThan(
      renderedTexts.indexOf("More like this")
    );

    await act(async () => {
      tree.unmount();
    });
  });
});
