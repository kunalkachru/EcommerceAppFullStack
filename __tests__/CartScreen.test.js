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
let mockCartError = null;
const mockDispatch = jest.fn(() => Promise.resolve({ type: "cart/clearCart/fulfilled" }));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) =>
    selector({
      auth: { token: "token-1" },
      cart: {
        cartItems: mockCartItems,
        loading: false,
        error: mockCartError,
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
  beforeEach(() => {
    mockDispatch.mockClear();
    mockDispatch.mockResolvedValue({ type: "cart/clearCart/fulfilled" });
    mockCartError = null;
  });

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

  it("AC-4: keeps the primary checkout action available when items are present", async () => {
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

  it("opens the clear confirmation with Clear all and Keep items without dispatching clearCart", async () => {
    const tree = await renderCart();
    const clearButton = tree.root.findByProps({ testID: "cart-clear" });

    await act(async () => clearButton.props.onPress());

    expect(renderedText(tree)).toContain("Clear all");
    expect(renderedText(tree)).toContain("Keep items");
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "cart/clearCart" }));
    await act(async () => tree.unmount());
  });

  it("keeps cart items unchanged when Keep items is selected", async () => {
    const tree = await renderCart();
    await act(async () => tree.root.findByProps({ testID: "cart-clear" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-keep-items" }).props.onPress());

    expect(renderedText(tree)).toContain("Structured Wool Coat");
    expect(renderedText(tree)).not.toContain("Clear all");
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "cart/clearCart" }));
    await act(async () => tree.unmount());
  });

  it("clears only after Clear all is selected and renders the empty state with Undo", async () => {
    const tree = await renderCart();
    await act(async () => tree.root.findByProps({ testID: "cart-clear" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-clear-all" }).props.onPress());

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(renderedText(tree)).toContain("Your bag is ready when you are.");
    expect(renderedText(tree)).toContain("Undo");
    await act(async () => tree.unmount());
  });

  it("restores cleared items when Undo is selected before the deadline", async () => {
    const tree = await renderCart();
    await act(async () => tree.root.findByProps({ testID: "cart-clear" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-clear-all" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-undo" }).props.onPress());

    expect(renderedText(tree)).toContain("Structured Wool Coat");
    expect(renderedText(tree)).toContain("Qty 2");
    expect(renderedText(tree)).not.toContain("Undo");
    await act(async () => tree.unmount());
  });

  it("renders later store cart updates after Undo restoration", async () => {
    let dispatchCount = 0;
    mockDispatch.mockImplementation(() => {
      dispatchCount += 1;
      if (dispatchCount === 2) {
        mockCartItems = [
          {
            ...mockCartItems[0],
            quantity: 3,
          },
        ];
      }
      return Promise.resolve({ type: "cart/operation/fulfilled" });
    });

    const tree = await renderCart();
    await act(async () => tree.root.findByProps({ testID: "cart-clear" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-clear-all" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-undo" }).props.onPress());

    expect(renderedText(tree)).toContain("Qty 3");
    expect(renderedText(tree)).not.toContain("Qty 2");
    await act(async () => tree.unmount());
  });

  it("shows the existing cart error instead of Undo after a failed clear", async () => {
    mockCartError = { message: "Clear failed" };
    mockDispatch.mockResolvedValue({ type: "cart/clearCart/rejected" });
    const tree = await renderCart();

    await act(async () => tree.root.findByProps({ testID: "cart-clear" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-clear-all" }).props.onPress());

    expect(renderedText(tree)).toContain("Clear failed");
    expect(renderedText(tree)).not.toContain("Undo");
    expect(renderedText(tree)).not.toContain("Clear all items?");
    await act(async () => tree.unmount());
  });

  it("removes Undo after five seconds without restoring items", async () => {
    jest.useFakeTimers();
    const tree = await renderCart();
    await act(async () => tree.root.findByProps({ testID: "cart-clear" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-clear-all" }).props.onPress());

    await act(async () => jest.advanceTimersByTime(5000));
    expect(renderedText(tree)).not.toContain("Undo");
    jest.useRealTimers();
    await act(async () => tree.unmount());
  });

  it("keeps checkout, quantity, removal, empty-cart shopping, and free-shipping behavior available", async () => {
    const tree = await renderCart();
    expect(tree.root.findByProps({ testID: "cart-proceed-checkout" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "cart-qty-plus" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "cart-remove" })).toBeTruthy();
    expect(renderedText(tree)).toContain("Free shipping on orders over $50");

    await act(async () => tree.root.findByProps({ testID: "cart-clear" }).props.onPress());
    await act(async () => tree.root.findByProps({ testID: "cart-clear-all" }).props.onPress());
    expect(tree.root.findByProps({ testID: "cart-continue-shopping" })).toBeTruthy();
    await act(async () => tree.unmount());
  });
});
