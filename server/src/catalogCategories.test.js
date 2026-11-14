const http = require("http");

const mockFetchCatalog = jest.fn();

jest.mock("./catalogService", () => ({
  fetchCatalog: mockFetchCatalog,
  getCatalogMeta: jest.fn(() => ({ sources: [], total: 0 })),
  getProductById: jest.fn(),
}));

jest.mock("./visualSearch", () => ({
  searchByImageBase64: jest.fn(),
  searchByVoiceQuery: jest.fn(),
  findSimilarProducts: jest.fn(),
  warmVisualSearchIndex: jest.fn(),
  getStatus: jest.fn(() => ({})),
  CATEGORY_GROUPS: {},
}));

process.env.SKIP_CLIP_WARMUP = "1";

const { app } = require("./index");

function requestCategories() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const request = http.get(
        { host: "127.0.0.1", port, path: "/api/catalog/categories" },
        (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            server.close(() => {
              let json;
              try {
                json = JSON.parse(body);
              } catch {
                json = body;
              }
              resolve({ status: response.statusCode, body: json });
            });
          });
        }
      );
      request.on("error", (error) => server.close(() => reject(error)));
    });
  });
}

afterEach(() => {
  mockFetchCatalog.mockReset();
});

test("returns the catalog categories with exact fields and a 200 response", async () => {
  mockFetchCatalog.mockResolvedValue([
    { category: "electronics", categoryLabel: "Electronics" },
    { category: "beauty", categoryLabel: "Beauty" },
  ]);

  const response = await requestCategories();

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    categories: [
      { slug: "beauty", label: "Beauty", productCount: 1 },
      { slug: "electronics", label: "Electronics", productCount: 1 },
    ],
  });
});

test("counts every distinct category slug using its catalog label", async () => {
  mockFetchCatalog.mockResolvedValue([
    { category: "mens-clothing", categoryLabel: "Men's Clothing" },
    { category: "mens-clothing", categoryLabel: "Men's Clothing" },
    { category: "electronics", categoryLabel: "Electronics" },
  ]);

  const response = await requestCategories();

  expect(response.body.categories).toEqual([
    { slug: "mens-clothing", label: "Men's Clothing", productCount: 2 },
    { slug: "electronics", label: "Electronics", productCount: 1 },
  ]);
});

test("sorts categories by descending count and ascending slug for ties", async () => {
  mockFetchCatalog.mockResolvedValue([
    { category: "zeta", categoryLabel: "Zeta" },
    { category: "zeta", categoryLabel: "Zeta" },
    { category: "alpha", categoryLabel: "Alpha" },
    { category: "beta", categoryLabel: "Beta" },
  ]);

  const response = await requestCategories();

  expect(response.body.categories.map(({ slug }) => slug)).toEqual([
    "zeta",
    "alpha",
    "beta",
  ]);
});

test("returns the existing 500 message error shape when catalog loading fails", async () => {
  mockFetchCatalog.mockRejectedValue(new Error("Catalog unavailable for test"));

  const response = await requestCategories();

  expect(response.status).toBe(500);
  expect(response.body).toEqual({ message: "Catalog unavailable for test" });
});
