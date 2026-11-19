const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const { TouchableOpacity } = require("react-native");

let mockCartItems = [
  {
    id: "demo-1",
    productId: "demo-1",
    title: "Structured Wool Coat",
    price: 129.99,
    quantity: 2,
    image: "https://example.com/coat.png",
  },
];

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) =>
    selector({
      auth: { token: "token-1" },
      cart: {
        cartItems: mockCartItems,
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

const renderCart = async () => {
  let tree;

  await act(async () => {
    tree = ReactTestRenderer.create(
      React.createElement(CartScreen, {
        navigation: { navigate: jest.fn() },
      })
    );
  });

  return tree;
};

const collectText = (node) => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(collectText).join("");
  }

  if (node && typeof node === "object") {
    return collectText(node.children);
  }

  return "";
};

const renderedText = (tree) => collectText(tree.toJSON());

describe("CartScreen", () => {
  afterEach(() => {
    mockCartItems = [
      {
        id: "demo-1",
        productId: "demo-1",
        title: "Structured Wool Coat",
        price: 129.99,
        quantity: 2,
        image: "https://example.com/coat.png",
      },
    ];
  });

  it("keeps the primary checkout action available when items are present", async () => {
    const tree = await renderCart();

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

  it("AC-1: displays the free-shipping message beneath the grand total for a non-empty cart", async () => {
    const tree = await renderCart();
    const text = renderedText(tree);
    const totalIndex = text.indexOf("$259.98");
    const shippingMessageIndex = text.indexOf("Free shipping on orders over $50");

    expect(shippingMessageIndex).toBeGreaterThan(totalIndex);

    await act(async () => {
      tree.unmount();
    });
  });

  it("AC-2: displays the exact amount still needed when the cart total is below $50", async () => {
    mockCartItems = [
      {
        id: "demo-2",
        productId: "demo-2",
        title: "Canvas Tote",
        price: 19.99,
        quantity: 1,
        image: "https://example.com/tote.png",
      },
    ];

    const tree = await renderCart();
    const text = renderedText(tree);

    expect(text).toContain("$30.01");

    await act(async () => {
      tree.unmount();
    });
  });

  it("AC-3: does not display a positive amount still needed at exactly $50", async () => {
    mockCartItems = [
      {
        id: "demo-3",
        productId: "demo-3",
        title: "Leather Wallet",
        price: 25,
        quantity: 2,
        image: "https://example.com/wallet.png",
      },
    ];

    const tree = await renderCart();
    const text = renderedText(tree);

    expect(text).toContain("Free shipping on orders over $50");
    expect(text).not.toContain("more for free shipping");

    await act(async () => {
      tree.unmount();
    });
  });
});
