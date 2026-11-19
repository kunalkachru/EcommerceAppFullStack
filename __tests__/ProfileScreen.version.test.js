const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector) => selector({ auth: { user: { name: "Test", email: "t@x.com" } } }),
}));

jest.mock("../src/redux/authSlice", () => ({ logoutUser: jest.fn() }));
jest.mock("../src/config/model3DCredits", () => ({ MODEL_3D_CREDITS: [] }));

const Screen = require("../src/screens/ProfileScreen").default;

const renderScreen = () => {
  let tree;
  act(() => {
    tree = ReactTestRenderer.create(
      React.createElement(Screen, { navigation: { navigate: jest.fn() } })
    );
  });
  return tree;
};

describe("ProfileScreen version AC-1", () => {
  it("AC-1: renders the package version with the required label", () => {
    const tree = renderScreen();

    expect(tree.root.findByProps({ testID: "profile-version" }).props.children).toBe(
      "Version 0.0.1"
    );
  });
});

describe("ProfileScreen version AC-2", () => {
  it("AC-2: renders the version after the existing profile actions", () => {
    const tree = renderScreen();
    const testIds = tree.root
      .findAll((node) => Boolean(node.props && node.props.testID))
      .map((node) => node.props.testID);

    expect(testIds[testIds.length - 1]).toBe("profile-version");
  });
});
