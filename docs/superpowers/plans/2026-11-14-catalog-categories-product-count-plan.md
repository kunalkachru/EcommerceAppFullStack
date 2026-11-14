# Catalog categories with product counts — implementation plan

## T1: Make the catalog API app testable and add the categories endpoint

Checks: AC-1, AC-2, AC-3, AC-4, AC-5

Files:
- Modify: `server/src/index.js`

Tests:
- `server/src/catalogCategories.test.js::returns the catalog categories with exact fields and a 200 response`
- `server/src/catalogCategories.test.js::counts every distinct category slug using its catalog label`
- `server/src/catalogCategories.test.js::sorts categories by descending count and ascending slug for ties`
- `server/src/catalogCategories.test.js::returns the existing 500 message error shape when catalog loading fails`

How to show:
- Add `GET /api/catalog/categories` alongside the existing catalog routes and load products through the existing catalog service, grouping only categories represented by products.
- Derive each response entry as exactly `{ slug, label, productCount }`, using the product category slug and `categoryLabel`, with a non-negative integer count.
- Sort by `productCount` descending and then `slug` ascending, and return `{ categories: [...] }` with HTTP 200.
- Reuse the catalog routes’ `try/catch` response contract (`{ message: string }`) with HTTP 500 when `fetchCatalog()` rejects.
- Export the Express app and guard startup so importing it for HTTP tests does not open a listening socket; preserve normal production startup behavior.

## T2: Add focused HTTP contract and failure tests for catalog categories

Checks: AC-1, AC-2, AC-3, AC-4, AC-5

Files:
- Create: `server/src/catalogCategories.test.js`

Tests:
- `server/src/catalogCategories.test.js::returns the catalog categories with exact fields and a 200 response`
- `server/src/catalogCategories.test.js::counts every distinct category slug using its catalog label`
- `server/src/catalogCategories.test.js::sorts categories by descending count and ascending slug for ties`
- `server/src/catalogCategories.test.js::returns the existing 500 message error shape when catalog loading fails`
- `npx jest --ci --runInBand --forceExit server/src/catalogCategories.test.js`

How to show:
- Mock the catalog service with representative products, including repeated slugs and tied counts, then issue an actual HTTP GET against the Express app and assert status, JSON shape, exact field sets, labels, counts, ordering, and deterministic repeated results.
- In a separate failure case, make the mocked catalog loader reject and assert HTTP 500 plus a string `body.message`, without accepting a separately invented error shape.
- Keep the test isolated from the on-disk catalog and avoid credentials, network calls, and new dependencies.
