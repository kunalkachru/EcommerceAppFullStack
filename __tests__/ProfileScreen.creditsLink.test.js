const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector({ auth: { user: { name: "Test", email: "t@x.com" } } }),
}));

jest.mock("../src/redux/authSlice", () => ({ logoutUser: jest.fn() }));

jest.mock("../src/config/model3DCredits", () => ({ MODEL_3D_CREDITS: [] }));

const { MODEL_3D_CREDITS } = require("../src/config/model3DCredits");
const Screen = require("../src/screens/ProfileScreen").default;

describe("ProfileScreen credits link", () => {
  afterEach(() => {
    MODEL_3D_CREDITS.length = 0;
  });

  it("shows a credits nav entry when credited models exist", () => {
    MODEL_3D_CREDITS.push({ category: "footwear", title: "x", author: "y", license: "z", sourceUrl: "u" });

    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Screen, { navigation: { navigate: jest.fn() } })
      );
    });
    expect(() => tree.root.findByProps({ testID: "profile-credits-link" })).not.toThrow();
  });

  it("hides the credits nav entry when there are no credited models", () => {
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Screen, { navigation: { navigate: jest.fn() } })
      );
    });
    expect(() => tree.root.findByProps({ testID: "profile-credits-link" })).toThrow();
  });
});
