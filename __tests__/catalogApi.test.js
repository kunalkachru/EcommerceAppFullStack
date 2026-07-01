import { getTopCategories } from "../src/redux/api/catalogApi";

describe("getTopCategories", () => {
  const products = [
    { id: "1", category: "clothes" },
    { id: "2", category: "clothes" },
    { id: "3", category: "electronics" },
    { id: "4", category: "beauty" },
    { id: "5", category: "clothes" },
  ];

  it("returns categories sorted by product count", () => {
    expect(getTopCategories(products, 2)).toEqual(["clothes", "electronics"]);
  });

  it("respects limit", () => {
    expect(getTopCategories(products, 1)).toEqual(["clothes"]);
  });
});
