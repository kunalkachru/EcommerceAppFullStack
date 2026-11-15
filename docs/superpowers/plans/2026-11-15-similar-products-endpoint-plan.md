# Similar-products endpoint — implementation plan

## T1: Implement the catalog similar-products route

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-9

Files:
- Modify: `server/src/index.js`

Tests:
- `server/src/catalogSimilar.test.js`
- `server/src/catalogSimilar.test.js::returns same-category products in price-distance order and excludes the requested product`
- `server/src/catalogSimilar.test.js::uses a default maximum of five products`
- `server/src/catalogSimilar.test.js::accepts integer limits from one through ten`
- `server/src/catalogSimilar.test.js::rejects invalid limits with a clear 400 error message`
- `server/src/catalogSimilar.test.js::returns the catalog product-not-found 404 shape for an unknown product id`
- `server/src/catalogSimilar.test.js::leaves existing catalog and search endpoint responses unchanged`

How to show:
- Add `GET /api/catalog/products/:id/similar` next to the existing catalog routes, loading products through `fetchCatalog()` and resolving the requested product through the existing catalog representation/lookup path.
- Validate a supplied `limit` as an integer in the inclusive range 1 through 10; reject every other supplied value with HTTP 400 and a JSON `message` that clearly identifies the valid range. Use five when the query parameter is absent.
- Return HTTP 404 with the existing `{ message: "Product not found" }` shape when the requested id is unknown, and return `{ products: [...] }` with HTTP 200 for known products.
- Filter candidates to the requested product’s category and exclude the requested product, then sort by ascending absolute price difference and ascending product id for equal differences before applying the limit. Preserve each product’s existing catalog fields and avoid modifying existing catalog, category, detail, or search route behavior.

## T2: Add focused HTTP contract and regression tests

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9

Files:
- Create: `server/src/catalogSimilar.test.js`

Tests:
- `server/src/catalogSimilar.test.js::returns same-category products in price-distance order and excludes the requested product`
- `server/src/catalogSimilar.test.js::uses a default maximum of five products`
- `server/src/catalogSimilar.test.js::accepts integer limits from one through ten`
- `server/src/catalogSimilar.test.js::rejects invalid limits with a clear 400 error message`
- `server/src/catalogSimilar.test.js::returns the catalog product-not-found 404 shape for an unknown product id`
- `server/src/catalogSimilar.test.js::leaves existing catalog and search endpoint responses unchanged`
- `npx jest --ci --runInBand --forceExit server/src/catalogSimilar.test.js`

How to show:
- Follow the existing app-level HTTP test harness: mock catalog/search dependencies, start an ephemeral HTTP server around the exported Express app, and use representative products with same-category, other-category, equal-distance, and self-exclusion cases.
- Assert the 200 JSON object and existing product fields, default five-item cap, category-only results, absence of the requested product, closest-price ordering, deterministic ascending-id tie-break, and limits 1, 5, and 10.
- Exercise invalid values including below-range, above-range, decimal, non-numeric, and empty supplied values; assert HTTP 400 and a non-empty clear JSON error message. Assert unknown ids return HTTP 404 with the existing product-not-found message.
- Include baseline assertions for the existing catalog and search responses using the same mocked dependencies, demonstrating that adding the new route does not alter their response contracts. Keep tests isolated from the on-disk catalog, network, credentials, and new dependencies.
