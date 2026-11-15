const http = require("http");

const mockFetchCatalog = jest.fn();
const mockGetProductById = jest.fn();
const mockFindSimilarProducts = jest.fn();

jest.mock("./catalogService", () => ({
  fetchCatalog: mockFetchCatalog,
  getCatalogMeta: jest.fn(() => ({ sources: ["test"], total: 0 })),
  getProductById: mockGetProductById,
}));

jest.mock("./visualSearch", () => ({
  searchByImageBase64: jest.fn(),
  searchByVoiceQuery: jest.fn(),
  findSimilarProducts: mockFindSimilarProducts,
  warmVisualSearchIndex: jest.fn(),
  getStatus: jest.fn(() => ({})),
  CATEGORY_GROUPS: {},
}));

process.env.SKIP_CLIP_WARMUP = "1";

const { app } = require("./index");

function request(path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const request = http.get({ host: "127.0.0.1", port, path }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          server.close(() => {
            resolve({
              status: response.statusCode,
              body: JSON.parse(body),
            });
          });
        });
      });
      request.on("error", (error) => server.close(() => reject(error)));
    });
  });
}

const products = [
  { id: "1", title: "Requested", category: "phones", price: 100 },
  { id: "2", title: "Closest", category: "phones", price: 101 },
  { id: "3", title: "Tie lower id", category: "phones", price: 98 },
  { id: "4", title: "Tie higher id", category: "phones", price: 102 },
  { id: "5", title: "Farther", category: "phones", price: 110 },
  { id: "6", title: "Other category", category: "laptops", price: 100 },
];

beforeEach(() => {
  mockFetchCatalog.mockResolvedValue(products);
  mockGetProductById.mockImplementation((id) =>
    products.find((product) => String(product.id) === String(id)) || null
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

test("returns same-category products in price-distance order and excludes the requested product", async () => {
  const response = await request("/api/catalog/products/1/similar");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["2", "3", "4", "5"]);
  expect(response.body.products).not.toContainEqual(products[0]);
  expect(response.body.products.every(({ category }) => category === "phones")).toBe(true);
});

test("uses a default maximum of five products", async () => {
  const catalog = [
    products[0],
    ...Array.from({ length: 8 }, (_, index) => ({
      id: String(index + 2),
      category: "phones",
      price: 101 + index,
    })),
  ];
  mockFetchCatalog.mockResolvedValue(catalog);

  const response = await request("/api/catalog/products/1/similar");

  expect(response.status).toBe(200);
  expect(response.body.products).toHaveLength(5);
});

test("accepts integer limits from one through ten", async () => {
  const catalog = [
    products[0],
    ...Array.from({ length: 10 }, (_, index) => ({
      id: String(index + 2),
      category: "phones",
      price: 101 + index,
    })),
  ];
  mockFetchCatalog.mockResolvedValue(catalog);

  for (const limit of [1, 5, 10]) {
    const response = await request(`/api/catalog/products/1/similar?limit=${limit}`);
    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(limit);
  }
});

test("rejects invalid limits with a clear 400 error message", async () => {
  for (const limit of ["0", "11", "1.5", "nope", ""]) {
    const response = await request(`/api/catalog/products/1/similar?limit=${limit}`);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/limit.*integer.*1.*10/i);
  }
});

test("returns the catalog product-not-found 404 shape for an unknown product id", async () => {
  const response = await request("/api/catalog/products/missing/similar");

  expect(response.status).toBe(404);
  expect(response.body).toEqual({ message: "Product not found" });
});

test("leaves existing catalog and search endpoint responses unchanged", async () => {
  const catalogResponse = await request("/api/catalog/products");
  expect(catalogResponse.status).toBe(200);
  expect(catalogResponse.body).toEqual({
    products,
    meta: { sources: ["test"], total: 0 },
  });

  mockFindSimilarProducts.mockResolvedValue({ product: products[0], products: [products[1]] });
  const searchResponse = await request("/api/visual-search/similar/1");
  expect(searchResponse.status).toBe(200);
  expect(searchResponse.body).toEqual({ product: products[0], products: [products[1]] });
});
