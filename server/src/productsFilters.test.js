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
  {
    id: "p-1",
    title: "Aurora Headphones",
    brand: "SoundPeak",
    category: "electronics",
    price: "100",
  },
  {
    id: "p-2",
    title: "Trail Backpack",
    brand: "Aurora Gear",
    category: "outdoors",
    price: 79.5,
  },
  {
    id: "p-3",
    title: "Aurora Camera",
    brand: "PixelCraft",
    category: "electronics",
    price: 129.99,
  },
  {
    id: "p-4",
    title: "Ceramic Mug",
    brand: "Houseware Co",
    category: "home",
    price: 12,
  },
];

const metadata = { sources: ["deterministic-test-fixture"], total: products.length };

beforeEach(() => {
  mockFetchCatalog.mockResolvedValue(products);
  mockGetCatalogMeta.mockReturnValue(metadata);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("AC-1: filters products by title or brand with a case-insensitive q query", async () => {
  const response = await request("/api/products?q=aUrOrA");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-1", "p-2", "p-3"]);
});

test("AC-2: filters products by exact category", async () => {
  const response = await request("/api/products?category=electronics");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-1", "p-3"]);
});

test("AC-3 AC-4: filters products by inclusive minPrice and maxPrice bounds", async () => {
  const response = await request("/api/products?minPrice=12&maxPrice=79.5");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-2", "p-4"]);
});

test("AC-5: combines q category and price filters", async () => {
  const response = await request(
    "/api/products?q=aurora&category=electronics&minPrice=40&maxPrice=100"
  );

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-1"]);
});

test("AC-6: sorts the combined filtered result by price_asc and price_desc", async () => {
  const ascending = await request(
    "/api/products?q=aurora&category=electronics&minPrice=40&maxPrice=150&sort=price_asc"
  );
  const descending = await request(
    "/api/products?q=aurora&category=electronics&minPrice=40&maxPrice=150&sort=price_desc"
  );

  expect(ascending.status).toBe(200);
  expect(ascending.body.products.map(({ id }) => id)).toEqual(["p-1", "p-3"]);
  expect(descending.status).toBe(200);
  expect(descending.body.products.map(({ id }) => id)).toEqual(["p-3", "p-1"]);
});

test("AC-7: rejects negative price bounds with a clear invalid price range message", async () => {
  const minResponse = await request("/api/products?minPrice=-1");
  const maxResponse = await request("/api/products?maxPrice=-0.01");

  expect(minResponse.status).toBe(400);
  expect(minResponse.body).toEqual({
    message: expect.stringMatching(/invalid price range/i),
  });
  expect(maxResponse.status).toBe(400);
  expect(maxResponse.body).toEqual({
    message: expect.stringMatching(/invalid price range/i),
  });
});

test("AC-8: rejects minPrice greater than maxPrice with a clear minPrice message", async () => {
  const response = await request("/api/products?minPrice=80&maxPrice=20");

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    message: expect.stringMatching(/minPrice.*cannot be greater than maxPrice/i),
  });
});

test("AC-9: preserves the existing response shape and ordering without filters", async () => {
  const response = await request("/api/products");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ products, meta: metadata });
});

test("AC-9: retains established sort behavior without filters", async () => {
  const response = await request("/api/products?sort=price_asc");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-4", "p-2", "p-1", "p-3"]);
});

test("filters products by title or brand with a case-insensitive q query", async () => {
  const response = await request("/api/products?q=aUrOrA");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-1", "p-2", "p-3"]);
});

test("filters products by exact category", async () => {
  const response = await request("/api/products?category=electronics");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-1", "p-3"]);
});

test("filters products by inclusive minPrice and maxPrice bounds", async () => {
  const response = await request("/api/products?minPrice=12&maxPrice=79.5");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-2", "p-4"]);
});

test("combines q category and price filters", async () => {
  const response = await request(
    "/api/products?q=aurora&category=electronics&minPrice=40&maxPrice=100"
  );

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-1"]);
});

test("sorts the combined filtered result by price_asc and price_desc", async () => {
  const ascending = await request(
    "/api/products?q=aurora&category=electronics&minPrice=40&maxPrice=150&sort=price_asc"
  );
  const descending = await request(
    "/api/products?q=aurora&category=electronics&minPrice=40&maxPrice=150&sort=price_desc"
  );

  expect(ascending.status).toBe(200);
  expect(ascending.body.products.map(({ id }) => id)).toEqual(["p-1", "p-3"]);
  expect(descending.status).toBe(200);
  expect(descending.body.products.map(({ id }) => id)).toEqual(["p-3", "p-1"]);
});

test("rejects negative price bounds with a clear invalid price range message", async () => {
  const response = await request("/api/products?minPrice=-1");

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    message: expect.stringMatching(/invalid price range/i),
  });
});

test("rejects minPrice greater than maxPrice with a clear minPrice message", async () => {
  const response = await request("/api/products?minPrice=80&maxPrice=20");

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    message: expect.stringMatching(/minPrice.*cannot be greater than maxPrice/i),
  });
});

test("preserves the existing response shape and ordering without filters", async () => {
  const response = await request("/api/products");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ products, meta: metadata });
});

test("retains established sort behavior without filters", async () => {
  const response = await request("/api/products?sort=price_asc");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-4", "p-2", "p-1", "p-3"]);
});
