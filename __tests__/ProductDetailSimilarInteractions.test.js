const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

const mockPush = jest.fn();
const mockFetchSimilarProducts = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    push: mockPush,
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
  fetchSimilarProducts: mockFetchSimilarProducts,
}));

const ProductDetailScreen = require("../src/screens/ProductDetailScreen").default;

describe("ProductDetailScreen similar items", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchSimilarProducts.mockReset();
  });

  it("opens a similar product detail when a related card is pressed", async () => {
    const sourceProduct = {
      id: 1,
      title: "Demo Jacket",
      price: 129.99,
      image: "https://example.com/jacket.png",
      description: "Warm jacket for testing.",
      category: "fashion",
    };
    const relatedProduct = {
      id: 2,
      title: "Related Coat",
      price: 149.99,
      image: "https://example.com/coat.png",
      description: "Elegant coat.",
      category: "fashion",
      matchScore: 0.87,
      matchPercent: 87,
    };

    mockFetchSimilarProducts.mockResolvedValue({
      product: sourceProduct,
      matches: [relatedProduct],
    });

    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(ProductDetailScreen, {
          route: { params: { product: sourceProduct } },
        })
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const card = tree.root.findByProps({ testID: "pdp-similar-card-2" });

    await act(async () => {
      card.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("ProductDetail", {
      product: relatedProduct,
    });
  });
});
