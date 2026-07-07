const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

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
  fetchSimilarProducts: jest.fn(() => Promise.resolve({ matches: [] })),
}));

jest.mock("../src/components/SimilarProductsStrip", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function SimilarProductsStripMock() {
    return ReactModule.createElement(RN.View, null);
  };
});

const ProductDetailScreen = require("../src/screens/ProductDetailScreen").default;

describe("ProductDetailScreen gallery", () => {
  beforeAll(() => {
    global.window = global.window || {};
    global.window.dispatchEvent = global.window.dispatchEvent || jest.fn();
  });

  it("switches the hero image when a gallery thumbnail is pressed", async () => {
    const product = {
      id: 1,
      title: "Luxury Travel Backpack",
      price: 289,
      image: "https://example.com/bag-hero.png",
      images: [
        "https://example.com/bag-hero.png",
        "https://example.com/bag-side.png",
        "https://example.com/bag-detail.png",
      ],
      description: "Premium travel backpack with clean lines and rich materials.",
      category: "bags",
    };

    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductDetailScreen, {
          route: { params: { product } },
        })
      );
    });

    expect(tree.root.findByProps({ testID: "pdp-hero-image" }).props.source).toEqual({
      uri: "https://example.com/bag-hero.png",
    });

    await act(async () => {
      tree.root.findByProps({ testID: "pdp-gallery-thumb-1" }).props.onPress();
    });

    expect(tree.root.findByProps({ testID: "pdp-hero-image" }).props.source).toEqual({
      uri: "https://example.com/bag-side.png",
    });
  });
});
