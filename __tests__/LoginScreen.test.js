const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const { TextInput } = require("react-native");

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) =>
    selector({
      auth: {
        user: null,
        loading: false,
        error: null,
      },
    }),
}));

jest.mock("../src/redux/authSlice", () => ({
  loginUser: jest.fn(),
}));

jest.mock("../src/components/PromoCarousel", () => "PromoCarousel");
jest.mock("../src/components/FeaturedProductsStrip", () => "FeaturedProductsStrip");

const LoginScreen = require("../src/screens/LoginScreen").default;

describe("LoginScreen autofill behavior", () => {
  it("disables aggressive password autofill hooks on demo login inputs", async () => {
    let tree;

    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(LoginScreen, {
          navigation: {
            replace: jest.fn(),
            navigate: jest.fn(),
          },
        })
      );
    });

    const inputs = tree.root.findAllByType(TextInput);
    const emailInput = inputs.find((node) => node.props.testID === "login-email");
    const passwordInput = inputs.find((node) => node.props.testID === "login-password");

    expect(emailInput.props.autoComplete).toBe("off");
    expect(emailInput.props.textContentType).toBe("none");
    expect(emailInput.props.importantForAutofill).toBe("no");

    expect(passwordInput.props.autoComplete).toBe("off");
    expect(passwordInput.props.textContentType).toBe("oneTimeCode");
    expect(passwordInput.props.importantForAutofill).toBe("no");

    await act(async () => {
      tree.unmount();
    });
  });
});
