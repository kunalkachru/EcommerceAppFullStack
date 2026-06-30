import { matchProductsByLabels } from "../src/utils/matchProductsByLabels";
import products from "../src/data/products";

describe("matchProductsByLabels", () => {
  it("ranks jacket-related products when labels mention clothing", () => {
    const labels = [
      { text: "Jacket", confidence: 0.92 },
      { text: "Clothing", confidence: 0.8 },
    ];
    const matches = matchProductsByLabels(products, labels, { limit: 5 });
    expect(matches.length).toBeGreaterThan(0);
    const titles = matches.map((p) => p.title.toLowerCase());
    expect(
      titles.some((t) => t.includes("jacket") || t.includes("shirt"))
    ).toBe(true);
  });

  it("returns empty when no labels", () => {
    expect(matchProductsByLabels(products, [])).toEqual([]);
  });
});
