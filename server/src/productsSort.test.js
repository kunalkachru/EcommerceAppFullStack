const http = require("http");

const mockFetchCatalog = jest.fn();
const mockGetCatalogMeta = jest.fn();

jest.mock("./catalogService", () => ({
  fetchCatalog: mockFetchCatalog,
  getCatalogMeta: mockGetCatalogMeta,
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
            let parsedBody;
            try {
              parsedBody = JSON.parse(body);
            } catch {
              parsedBody = body;
            }
            resolve({ status: response.statusCode, body: parsedBody });
          });
        });
      });
      request.on("error", (error) => server.close(() => reject(error)));
    });
  });
}

const products = [
  { id: "p-1", title: "Mid-price", price: "12.50", category: "test" },
  { id: "p-2", title: "Low-price", price: 3, category: "test" },
  { id: "p-3", title: "Equal-price first", price: "12.50", category: "test" },
  { id: "p-4", title: "High-price", price: 99.99, category: "test" },
];

const metadata = { sources: ["deterministic-test-fixture"], total: products.length };

beforeEach(() => {
  mockFetchCatalog.mockResolvedValue(products);
  mockGetCatalogMeta.mockReturnValue(metadata);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("returns the complete product list in nondecreasing numeric price order for price_asc", async () => {
  const response = await request("/api/products?sort=price_asc");

  expect(response.status).toBe(200);
  expect(response.body.products).toHaveLength(products.length);
  expect(response.body.products.map(({ price }) => Number(price))).toEqual([
    3,
    12.5,
    12.5,
    99.99,
  ]);
});

test("returns the complete product list in nonincreasing numeric price order for price_desc", async () => {
  const response = await request("/api/products?sort=price_desc");

  expect(response.status).toBe(200);
  expect(response.body.products).toHaveLength(products.length);
  expect(response.body.products.map(({ price }) => Number(price))).toEqual([
    99.99,
    12.5,
    12.5,
    3,
  ]);
});

test("preserves products and metadata while changing only product order", async () => {
  const response = await request("/api/products?sort=price_asc");

  expect(response.body.meta).toEqual(metadata);
  expect(response.body.products).toHaveLength(products.length);
  expect(response.body.products.map(({ id }) => id).sort()).toEqual(
    products.map(({ id }) => id).sort()
  );
  expect(response.body.products.map(({ id }) => id)).not.toEqual(
    products.map(({ id }) => id)
  );
});

test("preserves the existing product order and response shape without sort", async () => {
  const response = await request("/api/products");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ products, meta: metadata });
});

test("rejects unsupported sort values with a clear 400 JSON error", async () => {
  const response = await request("/api/products?sort=rating");

  expect(response.status).toBe(400);
  expect(response.body).toEqual(
    expect.objectContaining({
      message: expect.stringMatching(/sort.*price_asc.*price_desc/i),
    })
  );
});

test("uses deterministic fixtures including equal prices for sorting coverage", () => {
  expect(products).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "p-1", price: "12.50" }),
      expect.objectContaining({ id: "p-3", price: "12.50" }),
    ])
  );
  expect(products.filter(({ price }) => Number(price) === 12.5)).toHaveLength(2);
});
