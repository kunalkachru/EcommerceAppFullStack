const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;
const { Image } = require("react-native");

jest.mock("../src/data/catalog-fallback.json", () => ({
  products: [
    {
      id: "dj-83",
      title: "Blue & Black Check Shirt",
      price: 29.99,
      image: "assets/products/blue-black-check-shirt/1.webp",
      images: ["assets/products/blue-black-check-shirt/1.webp"],
    },
  ],
}));

jest.mock("../src/config/api", () => ({
  getApiBaseUrl: () => "http://10.0.2.2:5001",
}));

const FeaturedProductsStrip = require("../src/components/FeaturedProductsStrip").default;

describe("FeaturedProductsStrip", () => {
  it("resolves relative fallback image paths into absolute URLs the Image component can load", () => {
    let tree;
    act(() => {
      tree = ReactTestRenderer.create(React.createElement(FeaturedProductsStrip));
    });
    const image = tree.root.findByType(Image);
    expect(image.props.source.uri).toBe(
      "http://10.0.2.2:5001/assets/products/blue-black-check-shirt/1.webp"
    );
  });
});
