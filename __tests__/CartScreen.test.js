const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const { TouchableOpacity } = require("react-native");

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) =>
    selector({
      auth: { token: "token-1" },
      cart: {
        cartItems: [
          {
            id: "demo-1",
            productId: "demo-1",
            title: "Structured Wool Coat",
            price: 129.99,
            quantity: 2,
            image: "https://example.com/coat.png",
          },
        ],
        loading: false,
        error: null,
      },
    }),
}));

jest.mock("../src/navigation/productNavigation", () => ({
  navigateToCheckout: jest.fn(),
  navigateToProductList: jest.fn(),
}));

const CartScreen = require("../src/screens/CartScreen").default;

describe("CartScreen", () => {
  it("keeps the primary checkout action available when items are present", async () => {
    let tree;

    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(CartScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    expect(() =>
      tree.root.findByProps({ testID: "cart-proceed-checkout" })
    ).not.toThrow();

    const touchables = tree.root.findAllByType(TouchableOpacity);
    expect(
      touchables.some((node) => node.props.testID === "cart-qty-plus")
    ).toBe(true);

    await act(async () => {
      tree.unmount();
    });
  });
});
