const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const {
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
} = require("react-native");

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) =>
    selector({
      cart: {
        cartItems: [
          {
            id: "demo-1",
            title: "Essence Mascara Lash Princess",
            price: 9.99,
            quantity: 1,
          },
        ],
      },
    }),
}));

jest.mock("../src/services/ordersService", () => ({
  createOrder: jest.fn(),
}));

const CheckoutScreen = require("../src/screens/CheckoutScreen").default;

describe("CheckoutScreen", () => {
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
      (node) => node.props.placeholder === "Phone Number"
    );
    expect(phoneInput).toBeTruthy();

    await act(async () => {
      tree.unmount();
    });
  });
});
