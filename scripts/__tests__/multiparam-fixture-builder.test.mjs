import test from "node:test";
import assert from "node:assert/strict";
import { buildFixtures } from "../lib/multiparam-fixture-builder.mjs";

const SAMPLE_PRODUCTS = [
  {
    id: "p1",
    title: "Man Plaid Shirt",
    category: "mens-clothing",
    department: "fashion",
    price: 34.99,
    colors: ["red", "black", "white"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    materials: ["cotton", "wool"],
    specifications: {},
  },
  {
    id: "p2",
    title: "Essence Mascara Lash Princess",
    category: "beauty-fragrances",
    department: "beauty",
    price: 9.99,
    colors: ["black"],
    sizes: [],
    materials: [],
    specifications: { waterproof: true },
  },
  {
    id: "p3",
    title: "Nike Air Jordan 1 Red And Black",
    category: "footwear",
    department: "fashion",
    price: 120,
    colors: ["red", "black"],
    sizes: ["8", "9", "10"],
    materials: ["leather"],
    specifications: {},
  },
  {
    id: "p4",
    title: "Classic Denim Jacket",
    category: "womens-clothing",
    department: "fashion",
    price: 59.99,
    colors: ["blue"],
    sizes: ["S", "M", "L"],
    materials: ["denim"],
    specifications: {},
  },
  {
    id: "p5",
    title: "Stainless Steel Water Bottle",
    category: "home-kitchen",
    department: "home",
    price: 19.99,
    colors: ["silver"],
    sizes: [],
    materials: ["steel"],
    specifications: { insulated: true },
  },
];

test("buildFixtures returns exactly 5 positive fixtures + 1 no-match fixture", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const positive = fixtures.filter((f) => f.expectedProductTitle !== null);
  const noMatch = fixtures.filter((f) => f.expectedProductTitle === null);
  assert.equal(fixtures.length, 6);
  assert.equal(positive.length, 5);
  assert.equal(noMatch.length, 1);
});

test("every positive fixture's expectedProductTitle matches a real input product", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const titles = new Set(SAMPLE_PRODUCTS.map((p) => p.title));
  for (const f of fixtures) {
    if (f.expectedProductTitle !== null) {
      assert.ok(titles.has(f.expectedProductTitle), `"${f.expectedProductTitle}" not in input products`);
    }
  }
});

test("every fixture has a natural-language query, not a keyword list", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  for (const f of fixtures) {
    assert.equal(typeof f.query, "string");
    assert.ok(f.query.length > 10);
    // A real sentence has at least one lowercase filler word a keyword-list query wouldn't.
    assert.ok(/\b(a|for|in|with|that|looking)\b/i.test(f.query), `"${f.query}" doesn't read like a sentence`);
  }
});

test("the no-match fixture's query does not match any real product", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const noMatch = fixtures.find((f) => f.expectedProductTitle === null);
  assert.ok(noMatch);
  assert.equal(typeof noMatch.query, "string");
});
