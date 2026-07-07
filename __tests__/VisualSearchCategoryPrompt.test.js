const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

const VisualSearchCategoryPrompt =
  require("../src/components/VisualSearchCategoryPrompt").default;

describe("VisualSearchCategoryPrompt", () => {
  it("exposes stable automation ids for the refine chips and reports the chosen group", async () => {
    const onChange = jest.fn();
    let tree;

    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(VisualSearchCategoryPrompt, {
          value: "all",
          onChange,
        })
      );
    });

    await act(async () => {
      tree.root.findByProps({ testID: "visual-search-chip-electronics" }).props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith("electronics");
  });
});
