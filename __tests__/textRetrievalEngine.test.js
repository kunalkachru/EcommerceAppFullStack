const {
  buildLexicalCatalogIndex,
  searchLexicalCatalog,
} = require("../server/src/search/text/lexicalCatalogIndex");
const {
  rerankTextCandidates,
} = require("../server/src/search/text/semanticTextReranker");

describe("hybrid text retrieval", () => {
  const products = [
    {
      id: "hp-1",
      title: "Wireless Headphones",
      description: "Over-ear bluetooth headphones",
      category: "electronics",
      brand: "SoundMax",
      tags: ["audio", "wireless"],
      price: 89,
    },
    {
      id: "ph-1",
      title: "Phone Case",
      description: "Silicone case for mobile phone",
      category: "mobile-accessories",
      brand: "ShieldCo",
      tags: ["phone", "case"],
      price: 19,
    },
    {
      id: "mn-1",
      title: "Gaming Monitor 27 inch",
      description: "Fast refresh IPS monitor",
      category: "electronics",
      brand: "ViewFast",
      tags: ["monitor", "gaming"],
      price: 239,
    },
    {
      id: "mn-2",
      title: "Premium Gaming Monitor 32 inch",
      description: "4k gaming monitor",
      category: "electronics",
      brand: "ViewUltra",
      tags: ["monitor", "gaming"],
      price: 499,
    },
  ];

  it("finds lexical candidates even when the spoken word order is jumbled", () => {
    const index = buildLexicalCatalogIndex(products);
    const matches = searchLexicalCatalog(index, "100 under headphones wireless");

    expect(matches[0].product.id).toBe("hp-1");
    expect(matches.some((row) => row.product.id === "hp-1")).toBe(true);
  });

  it("reranks semantic candidates with price constraints so budget matches win", () => {
    const intent = {
      rawQuery: "under 250 gaming monitor",
      searchText: "gaming monitor",
      priceMin: 0,
      priceMax: 250,
      productTypes: ["monitor"],
      keywords: ["gaming", "monitor"],
      categoryFilters: ["electronics"],
    };

    const matches = rerankTextCandidates(
      {
        queryVec: [1, 0],
        candidates: [
          {
            product: products[2],
            lexicalScore: 8,
            textVec: [0.98, 0.02],
            imageVec: [0.9, 0.1],
          },
          {
            product: products[3],
            lexicalScore: 9,
            textVec: [0.99, 0.01],
            imageVec: [0.92, 0.08],
          },
        ],
        intent,
      },
      {
        cosine: (a, b) => a[0] * b[0] + a[1] * b[1],
      }
    );

    expect(matches[0].product.id).toBe("mn-1");
    expect(matches[0].product.price).toBeLessThanOrEqual(250);
  });
});
