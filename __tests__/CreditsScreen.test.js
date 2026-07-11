const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

jest.mock("../src/config/model3DCredits", () => ({
  MODEL_3D_CREDITS: [
    {
      category: "footwear",
      title: "Generic Sneaker",
      author: "Test Author",
      license: "CC-BY 4.0",
      sourceUrl: "https://example.com/model",
    },
  ],
}));

const CreditsScreen = require("../src/screens/CreditsScreen").default;

describe("CreditsScreen", () => {
  it("lists each credited model's title, author, and license", () => {
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(React.createElement(CreditsScreen, {}));
    });
    const text = tree.root
      .findAll((node) => typeof node.props?.children === "string")
      .map((node) => node.props.children)
      .join(" ");

    expect(text).toContain("Generic Sneaker");
    expect(text).toContain("Test Author");
    expect(text).toContain("CC-BY 4.0");
  });
});
