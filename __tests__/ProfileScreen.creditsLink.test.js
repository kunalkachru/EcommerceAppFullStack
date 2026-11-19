const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector({ auth: { user: { name: "Test", email: "t@x.com" } } }),
}));

jest.mock("../src/redux/authSlice", () => ({ logoutUser: jest.fn() }));

jest.mock("../src/config/model3DCredits", () => ({ MODEL_3D_CREDITS: [] }));

const { MODEL_3D_CREDITS } = require("../src/config/model3DCredits");
const { logoutUser } = require("../src/redux/authSlice");
const Screen = require("../src/screens/ProfileScreen").default;

describe("ProfileScreen credits link", () => {
  afterEach(() => {
    MODEL_3D_CREDITS.length = 0;
  });

  it("preserves the optional credits navigation entry when credited models exist", () => {
    MODEL_3D_CREDITS.push({ category: "footwear", title: "x", author: "y", license: "z", sourceUrl: "u" });

    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Screen, { navigation: { navigate: jest.fn() } })
      );
    });
    expect(() => tree.root.findByProps({ testID: "profile-credits-link" })).not.toThrow();
  });

  it("preserves the hidden credits navigation entry when there are no credited models", () => {
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Screen, { navigation: { navigate: jest.fn() } })
      );
    });
    expect(() => tree.root.findByProps({ testID: "profile-credits-link" })).toThrow();
  });

  it("preserves profile identity, order navigation, and logout behavior", () => {
    const navigate = jest.fn();
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Screen, { navigation: { navigate } })
      );
    });

    const textContent = tree.root
      .findAllByType(require("react-native").Text)
      .map((node) => node.props.children)
      .flat()
      .join(" ")
      .replace(/\s+/g, " ");
    expect(textContent).toContain("Name: Test");
    expect(textContent).toContain("Email: t@x.com");

    const orderButton = tree.root
      .findAllByType(require("react-native").TouchableOpacity)
      .find((node) =>
        node
          .findAllByType(require("react-native").Text)
          .some((textNode) => textNode.props.children === "Review orders")
      );
    act(() => orderButton.props.onPress());
    expect(navigate).toHaveBeenCalledWith("Orders");

    act(() => tree.root.findByProps({ testID: "profile-logout" }).props.onPress());
    expect(mockDispatch).toHaveBeenCalledWith(logoutUser());
  });
});
