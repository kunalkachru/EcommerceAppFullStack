const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), push: jest.fn() }),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector({ cart: { pendingByProduct: {} } }),
}));

jest.mock("../src/redux/cartSlice", () => ({ addToCart: jest.fn() }));

jest.mock("../src/services/visualSearchService", () => ({
  fetchSimilarProducts: () => Promise.resolve({ matches: [] }),
}));

jest.mock("../src/components/SimilarProductsStrip", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function SimilarProductsStripMock() {
    return ReactModule.createElement(RN.View, { testID: "similar-products-strip" });
  };
});

jest.mock("../src/config/category3DModels", () => ({
  resolveCategoryModelUrl: (category) => (category === "footwear" ? "http://x/model.glb" : null),
}));

jest.mock("../src/components/Product3DViewer", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function Product3DViewerMock() {
    return ReactModule.createElement(RN.View, { testID: "product-3d-viewer-mock" });
  };
});

const ProductDetailScreen = require("../src/screens/ProductDetailScreen").default;

function makeProduct(overrides) {
  return {
    id: 1,
    title: "Test Product",
    price: 99,
    category: "footwear",
    images: ["http://x/1.jpg"],
    image: "http://x/1.jpg",
    ...overrides,
  };
}

describe("ProductDetailScreen 3D toggle", () => {
  it("shows the Photos/3D toggle for a category with a model", async () => {
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductDetailScreen, {
          route: { params: { product: makeProduct({ category: "footwear" }) } },
        })
      );
    });

    expect(() => tree.root.findByProps({ testID: "pdp-view-toggle-3d" })).not.toThrow();
  });

  it("hides the toggle for a category with no model", async () => {
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductDetailScreen, {
          route: { params: { product: makeProduct({ category: "groceries" }) } },
        })
      );
    });

    expect(() => tree.root.findByProps({ testID: "pdp-view-toggle-3d" })).toThrow();
  });

  it("swaps the hero to Product3DViewer when 3D is tapped", async () => {
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductDetailScreen, {
          route: { params: { product: makeProduct({ category: "footwear" }) } },
        })
      );
    });

    expect(() => tree.root.findByProps({ testID: "product-3d-viewer-mock" })).toThrow();

    const toggle3d = tree.root.findByProps({ testID: "pdp-view-toggle-3d" });
    await act(async () => {
      toggle3d.props.onPress();
    });

    expect(() => tree.root.findByProps({ testID: "product-3d-viewer-mock" })).not.toThrow();
    expect(() => tree.root.findByProps({ testID: "pdp-hero-image" })).toThrow();
  });
});
