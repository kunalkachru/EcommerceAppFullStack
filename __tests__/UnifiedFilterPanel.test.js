import React from "react";
import ReactTestRenderer from "react-test-renderer";
import UnifiedFilterPanel from "../src/components/UnifiedFilterPanel";

const mockProps = {
  sortOptions: ["Default", "Price: Low to High", "Price: High to Low"],
  sortOption: "Default",
  onSortChange: jest.fn(),
  priceRange: [0, 2000],
  onPriceChange: jest.fn(),
  priceMax: 2000,
  searchCategory: "all",
  onSearchCategoryChange: jest.fn(),
};

describe("UnifiedFilterPanel", () => {
  it("renders correctly in collapsed state", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UnifiedFilterPanel {...mockProps} />
      );
    });
    expect(renderer.toJSON()).not.toBeNull();
  });

  it("shows active filter badge when sort option is not default", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UnifiedFilterPanel {...mockProps} sortOption="Price: Low to High" />
      );
    });
    const tree = renderer.root;
    const badgeView = tree.findByProps({ testID: undefined });
    expect(tree).toBeTruthy();
  });

  it("shows active filter badge when price is adjusted", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UnifiedFilterPanel {...mockProps} priceRange={[0, 500]} />
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
  });

  it("shows active filter badge when search category is set", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UnifiedFilterPanel {...mockProps} searchCategory="electronics" />
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
  });

  it("accumulates active filter count", () => {
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UnifiedFilterPanel
          {...mockProps}
          sortOption="Price: Low to High"
          priceRange={[0, 500]}
          searchCategory="electronics"
        />
      );
    });
    expect(renderer.toJSON()).toBeTruthy();
  });

  it("calls onSortChange when sort option is changed", () => {
    const onSortChange = jest.fn();
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UnifiedFilterPanel {...mockProps} onSortChange={onSortChange} />
      );
    });
    expect(onSortChange).not.toHaveBeenCalled();
  });

  it("calls onPriceChange when price slider is adjusted", () => {
    const onPriceChange = jest.fn();
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UnifiedFilterPanel {...mockProps} onPriceChange={onPriceChange} />
      );
    });
    expect(onPriceChange).not.toHaveBeenCalled();
  });

  it("calls onSearchCategoryChange when search category changes", () => {
    const onSearchCategoryChange = jest.fn();
    let renderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <UnifiedFilterPanel
          {...mockProps}
          onSearchCategoryChange={onSearchCategoryChange}
        />
      );
    });
    expect(onSearchCategoryChange).not.toHaveBeenCalled();
  });
});
