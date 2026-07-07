const {
  normalizeCategory,
  isCatalogProductSane,
  enrichCatalogProduct,
} = require("../server/src/catalogMetadata");

describe("catalogMetadata", () => {
  it("maps noisy upstream categories into shopper-friendly canonical categories", () => {
    expect(
      normalizeCategory({
        category: "tops",
        title: "Blue Frock",
        description: "Women's day dress with short sleeves",
      })
    ).toBe("women's clothing");

    expect(
      normalizeCategory({
        category: "miscellaneous",
        title: "Radiant Citrus Eau de Parfum",
        description: "Fresh perfume for everyday wear",
      })
    ).toBe("fragrances");

    expect(
      normalizeCategory({
        category: "vehicle",
        title: "Pacifica Touring",
        description: "Family minivan with premium trim",
      })
    ).toBe("automotive");
  });

  it("rejects junk or placeholder catalog titles before they reach the shopper UI", () => {
    expect(
      isCatalogProductSane({
        title:
          "Test Ppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp",
        description: "placeholder",
        image: "https://cdn.example.com/test.jpg",
        price: 99,
      })
    ).toBe(false);

    expect(
      isCatalogProductSane({
        title: "Classic Black Hooded Sweatshirt",
        description: "Everyday wardrobe staple",
        image: "https://cdn.example.com/hoodie.jpg",
        price: 79,
      })
    ).toBe(true);
  });

  it("adds production-style metadata fields used for realistic browsing and search", () => {
    const product = enrichCatalogProduct({
      id: "fs-17",
      title: "Rain Jacket Women Windbreaker Striped Climbing Raincoats",
      description: "Lightweight blue outerwear for rainy commutes and travel.",
      category: "women's clothing",
      price: 39.99,
      image: "https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_.jpg",
      rating: 4.1,
      brand: null,
      tags: [],
      source: "fakestore",
    });

    expect(product).toMatchObject({
      slug: "rain-jacket-women-windbreaker-striped-climbing-raincoats",
      sku: "SKU-FS-17",
      currency: "USD",
      availability: expect.stringMatching(/in_stock|limited_stock/),
      inventoryCount: expect.any(Number),
      category: "women's clothing",
      department: "fashion",
      audience: "women",
      imageAlt: expect.stringContaining("Rain Jacket Women"),
      priceTier: expect.any(String),
    });
    expect(product.colors).toContain("blue");
    expect(product.tags).toEqual(expect.arrayContaining(["jacket", "windbreaker", "women"]));
    expect(product.keywords).toEqual(expect.arrayContaining(["jacket", "raincoat", "blue"]));
  });
});
