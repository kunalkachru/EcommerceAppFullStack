const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

jest.mock("../src/config/category3DModels", () => ({
  resolveCategoryModelUrl: (category) =>
    category === "footwear" ? "http://localhost:5001/assets/models/footwear/model.glb" : null,
}));

const Product3DViewer = require("../src/components/Product3DViewer").default;

describe("Product3DViewer", () => {
  it("renders nothing for a category with no model", () => {
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Product3DViewer, { category: "groceries" })
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  it("starts in loading status, then reflects a loaded bridge message", () => {
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Product3DViewer, { category: "footwear" })
      );
    });

    const status = tree.root.findByProps({ testID: "product-3d-status" });
    expect(status.props.accessibilityValue.text).toBe("loading");

    const webview = tree.root.findByProps({ testID: "product-3d-webview" });
    act(() => {
      webview.props.onMessage({
        nativeEvent: { data: JSON.stringify({ type: "loaded" }) },
      });
    });

    const updatedStatus = tree.root.findByProps({ testID: "product-3d-status" });
    expect(updatedStatus.props.accessibilityValue.text).toBe("loaded");
  });

  it("shows a retry button on an error bridge message, and resets to loading on retry", () => {
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(Product3DViewer, { category: "footwear" })
      );
    });

    const webview = tree.root.findByProps({ testID: "product-3d-webview" });
    act(() => {
      webview.props.onMessage({
        nativeEvent: { data: JSON.stringify({ type: "error", reason: "load failed" }) },
      });
    });

    expect(
      tree.root.findByProps({ testID: "product-3d-status" }).props.accessibilityValue.text
    ).toBe("error");
    const retryButton = tree.root.findByProps({ testID: "product-3d-retry" });

    act(() => {
      retryButton.props.onPress();
    });

    expect(
      tree.root.findByProps({ testID: "product-3d-status" }).props.accessibilityValue.text
    ).toBe("loading");
  });
});
