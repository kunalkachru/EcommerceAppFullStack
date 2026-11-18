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
      const clientRequest = http.get({ host: "127.0.0.1", port, path }, (response) => {
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
      clientRequest.on("error", (error) => server.close(() => reject(error)));
    });
  });
}

const products = [
  { id: "p-1", title: "Alpine Jacket", brand: "Northstar", category: "outerwear", price: 120 },
  { id: "p-2", title: "Trail Shoes", brand: "Northstar", category: "footwear", price: 80 },
  { id: "p-3", title: "Alpine Socks", brand: "Summit", category: "accessories", price: 20 },
  { id: "p-4", title: "City Jacket", brand: "Urban Outfitters", category: "outerwear", price: 160 },
  { id: "p-5", title: "Rain Jacket", brand: "Summit", category: "outerwear", price: 120 },
];

const metadata = { sources: ["deterministic-test-fixture"], total: products.length };

beforeEach(() => {
  mockFetchCatalog.mockResolvedValue(products);
  mockGetCatalogMeta.mockReturnValue(metadata);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("AC-1: filters products by a case-insensitive title or brand keyword", async () => {
  const titleMatch = await request("/api/products?q=ALPINE");
  const brandMatch = await request("/api/products?q=nOrThStAr");

  expect(titleMatch.status).toBe(200);
  expect(titleMatch.body.products.map(({ id }) => id)).toEqual(["p-1", "p-3"]);
  expect(brandMatch.status).toBe(200);
  expect(brandMatch.body.products.map(({ id }) => id)).toEqual(["p-1", "p-2"]);
});

test("AC-2: filters products by category", async () => {
  const response = await request("/api/products?category=outerwear");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-1", "p-4", "p-5"]);
});

test("AC-3: filters products by inclusive numeric price range", async () => {
  const response = await request("/api/products?minPrice=80&maxPrice=120");

  expect(response.status).toBe(200);
  expect(response.body.products.map(({ id }) => id)).toEqual(["p-1", "p-2", "p-5"]);
});

test("AC-4 and AC-5: combines keyword category and price filters conjunctively", async () => {
  const response = await request(
    "/api/products?q=JACKET&category=outerwear&minPrice=100&maxPrice=130&sort=price_desc"
  );

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    products: [products[0], products[4]],
    meta: metadata,
  });
});

test("AC-6: rejects negative minPrice or maxPrice with a clear 400 JSON error", async () => {
  for (const query of ["minPrice=-1", "maxPrice=-1"]) {
    const response = await request(`/api/products?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({ message: expect.stringMatching(/invalid.*price range|price range.*invalid/i) })
    );
  }
});

test("AC-7: rejects a minPrice above maxPrice with a clear 400 JSON error", async () => {
  const response = await request("/api/products?minPrice=121&maxPrice=120");

  expect(response.status).toBe(400);
  expect(response.body).toEqual(
    expect.objectContaining({ message: expect.stringMatching(/minPrice.*maxPrice|price range/i) })
  );
});
