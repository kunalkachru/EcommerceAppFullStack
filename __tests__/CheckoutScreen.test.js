const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
let mockCartItems = [
  {
    id: "demo-1",
    title: "Essence Mascara Lash Princess",
    price: 9.99,
    quantity: 1,
  },
];
const {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
} = require("react-native");

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) =>
    selector({
      cart: {
        cartItems: mockCartItems,
      },
    }),
}));

jest.mock("../src/services/ordersService", () => ({
  createOrder: jest.fn(),
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

describe("CheckoutScreen", () => {
  afterEach(() => {
    mockCartItems = [
      {
        id: "demo-1",
        title: "Essence Mascara Lash Princess",
        price: 9.99,
        quantity: 1,
      },
    ];
  });

  it("AC-1: renders the place-order button with the exact formatted cart total", async () => {
    let tree;

    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(CheckoutScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    const placeOrderButton = tree.root.findByProps({ testID: "checkout-place-order" });
    expect(placeOrderButton.findByType(Text).props.children).toBe("Place Order · $9.99");

    await act(async () => {
      tree.unmount();
    });
  });

  it("AC-2: updates the idle place-order label when cart contents and total change", async () => {
    let tree;

    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(CheckoutScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    mockCartItems = [
      {
        id: "demo-2",
        title: "Hydrating Serum",
        price: 12.5,
        quantity: 2,
      },
    ];

    await act(async () => {
      tree.update(
        React.createElement(CheckoutScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

    const placeOrderButton = tree.root.findByProps({ testID: "checkout-place-order" });
    expect(placeOrderButton.findByType(Text).props.children).toBe("Place Order · $25.00");

    await act(async () => {
      tree.unmount();
    });
  });

  it("renders checkout inside a keyboard-aware scroll container", async () => {
    let tree;

    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(CheckoutScreen, {
          navigation: { navigate: jest.fn() },
        })
      );
    });

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
