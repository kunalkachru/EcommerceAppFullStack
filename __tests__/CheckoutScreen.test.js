const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const {
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
} = require("react-native");

let mockCartItems = [
  {
    id: "demo-1",
    title: "Essence Mascara Lash Princess",
    price: 9.99,
    quantity: 1,
  },
];
let mockDispatch;

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) =>
    selector({
      cart: {
        cartItems: mockCartItems,
      },
    }),
}));

let mockCreateOrder;

jest.mock("../src/services/ordersService", () => ({
  createOrder: (...args) => mockCreateOrder(...args),
}));

jest.mock("../src/components/LuxuryPrimitives", () => {
  const ReactModule = require("react");
  return {
    LuxuryEyebrow: (props) => ReactModule.createElement(ReactModule.Fragment, null),
    LuxuryDisplayTitle: (props) => ReactModule.createElement(ReactModule.Fragment, null),
    LuxuryBodyText: (props) => ReactModule.createElement(ReactModule.Fragment, null),
    LuxuryMetricCard: (props) => ReactModule.createElement(ReactModule.Fragment, null),
    LuxurySectionCard: (props) => ReactModule.createElement(ReactModule.Fragment, null, props.children),
  };
});

jest.mock("../src/components/LuxuryStateIndicators", () => {
  const ReactModule = require("react");
  return {
    LuxuryErrorBanner: (props) => ReactModule.createElement(ReactModule.Fragment, null),
    LuxuryLoadingState: (props) => ReactModule.createElement(ReactModule.Fragment, null),
    LuxurySuccessConfirmation: (props) => ReactModule.createElement(ReactModule.Fragment, null),
  };
});

jest.mock("../src/components/LuxuryTextInput", () => {
  const ReactModule = require("react");
  const RN = require("react-native");
  return function LuxuryTextInputMock(props) {
    return ReactModule.createElement(RN.TextInput, {
      ...props,
      placeholder: props.placeholder,
    });
  };
});

const CheckoutScreen = require("../src/screens/CheckoutScreen").default;

const renderCheckout = async () => {
  let tree;

  await act(async () => {
    tree = ReactTestRenderer.create(
      React.createElement(CheckoutScreen, {
        navigation: { navigate: jest.fn() },
      })
    );
  });

  return tree;
};

const placeOrderButton = (tree) => tree.root.findByProps({ testID: "checkout-place-order" });

const collectRenderedText = (node) => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(collectRenderedText).join("");
  }

  if (node && typeof node === "object") {
    return collectRenderedText(node.children);
  }

  return "";
};

const placeOrderLabel = (tree) => collectRenderedText(placeOrderButton(tree));

describe("CheckoutScreen", () => {
  beforeEach(() => {
    mockCartItems = [
      {
        id: "demo-1",
        title: "Essence Mascara Lash Princess",
        price: 9.99,
        quantity: 1,
      },
    ];
    mockDispatch = jest.fn();
    mockCreateOrder = jest.fn(() => new Promise(() => {}));
  });

  it("renders the exact place-order label with a $9.99 grand total", async () => {
    const tree = await renderCheckout();

    expect(placeOrderLabel(tree)).toBe("Place Order · $9.99");

    await act(async () => tree.unmount());
  });

  it("updates the place-order amount for multiple items and quantities", async () => {
    mockCartItems = [
      { id: "demo-1", title: "First item", price: 4.5, quantity: 2 },
      { id: "demo-2", title: "Second item", price: 3.33, quantity: 1 },
    ];
    const tree = await renderCheckout();

    expect(placeOrderLabel(tree)).toBe("Place Order · $12.33");

    mockCartItems = [
      { id: "demo-1", title: "First item", price: 4.5, quantity: 3 },
      { id: "demo-2", title: "Second item", price: 3.33, quantity: 2 },
    ];

    await act(async () => {
      tree.update(
        React.createElement(CheckoutScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    expect(placeOrderLabel(tree)).toBe("Place Order · $20.16");

    await act(async () => tree.unmount());
  });

  it("keeps the existing placing-order label and disabled state while submitting", async () => {
    const tree = await renderCheckout();
    const fields = [
      "checkout-field-fullname",
      "checkout-field-address",
      "checkout-field-city",
      "checkout-field-zipcode",
      "checkout-field-phone",
    ];

    await act(async () => {
      fields.forEach((testID) => {
        tree.root.findByProps({ testID }).props.onChangeText("provided");
      });
    });
    await act(() => {
      placeOrderButton(tree).props.onPress();
    });

    expect(placeOrderLabel(tree)).toBe("Placing Order...");
    expect(placeOrderButton(tree).props.disabled).toBe(true);

    await act(async () => tree.unmount());
  });

  it("renders checkout inside a keyboard-aware scroll container", async () => {
    const tree = await renderCheckout();

    const keyboardView = tree.root.findByType(KeyboardAvoidingView);
    expect(keyboardView).toBeTruthy();

    const scrollView = tree.root.findByType(ScrollView);
    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled");
    expect(scrollView.props.keyboardDismissMode).toBe("on-drag");

    const textInputs = tree.root.findAllByType(TextInput);
    const phoneInput = textInputs.find(
      (node) => node.props.placeholder === "Enter your phone number"
    );
    expect(phoneInput).toBeTruthy();

    await act(async () => {
      tree.unmount();
    });
  });
});
