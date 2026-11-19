const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { ScrollView } = require("react-native");
const { act } = ReactTestRenderer;

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector({ auth: { user: { name: "Test", email: "t@x.com" } } }),
}));

jest.mock("../src/redux/authSlice", () => ({ logoutUser: jest.fn() }));
jest.mock("../src/config/model3DCredits", () => ({ MODEL_3D_CREDITS: [] }));

const Screen = require("../src/screens/ProfileScreen").default;

describe("ProfileScreen bottom tab clearance", () => {
  it("AC-1: scrolls profile content and leaves space for the bottom tab bar", () => {
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Screen, { navigation: { navigate: jest.fn() } })
      );
    });

    const scrollView = tree.root.findByType(ScrollView);
    const contentStyle = scrollView.props.contentContainerStyle;
    const paddingBottom = Array.isArray(contentStyle)
      ? contentStyle.reduce((value, style) => value + (style?.paddingBottom || 0), 0)
      : contentStyle?.paddingBottom || 0;

    expect(paddingBottom).toBeGreaterThanOrEqual(120);
  });
});
