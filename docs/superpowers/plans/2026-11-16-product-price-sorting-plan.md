# Product price sorting — implementation plan

## T1: Add focused endpoint contract tests for price sorting

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6

Files:
- Create: `server/src/productsSort.test.js`

Tests:
- `server/src/productsSort.test.js::returns the complete product list in nondecreasing numeric price order for price_asc`
- `server/src/productsSort.test.js::returns the complete product list in nonincreasing numeric price order for price_desc`
- `server/src/productsSort.test.js::preserves products and metadata while changing only product order`
- `server/src/productsSort.test.js::preserves the existing product order and response shape without sort`
- `server/src/productsSort.test.js::rejects unsupported sort values with a clear 400 JSON error`
- `server/src/productsSort.test.js::uses deterministic fixtures including equal prices for sorting coverage`

How to show:
- Mock the catalog loader and metadata provider with a deterministic product fixture containing numeric prices, duplicate/equal prices, and a deliberately non-price-sorted baseline order.
- Exercise `/api/products` with `sort=price_asc`, `sort=price_desc`, no `sort`, and unsupported values such as `rating`; assert HTTP status, complete product membership, metadata, response shape, numeric ordering, and the error message containing both `price_asc` and `price_desc`.
- For equal prices, assert that both products remain present and that the implementation's deterministic tie behavior is stable without adding a requirement beyond the approved spec.

## T2: Implement the `/api/products` sort query contract

Checks: AC-1, AC-2, AC-3, AC-4, AC-5

Files:
- Modify: `server/src/index.js`

Tests:
- `server/src/productsSort.test.js`
- `server/src/productsSort.test.js::returns the complete product list in nondecreasing numeric price order for price_asc`
- `server/src/productsSort.test.js::returns the complete product list in nonincreasing numeric price order for price_desc`
- `server/src/productsSort.test.js::preserves products and metadata while changing only product order`
- `server/src/productsSort.test.js::preserves the existing product order and response shape without sort`
- `server/src/productsSort.test.js::rejects unsupported sort values with a clear 400 JSON error`

How to show:
- Add the requested `GET /api/products` route alongside the catalog routes, loading the existing complete catalog and existing metadata, and return the established `{ products, meta }` JSON shape.
- Treat only the exact values `price_asc` and `price_desc` as valid supplied sorts; sort a response copy by numeric `price` in the requested direction and leave the catalog's existing order untouched when `sort` is absent.
- Return HTTP 400 JSON for every other supplied sort value, with a clear message stating that sort must be `price_asc` or `price_desc`; do not mutate the shared catalog array so the unsorted route remains stable.
- Keep the existing `/api/catalog/products` behavior unchanged while implementing the owner-requested `/api/products` contract.

## T3: Verify the endpoint behavior and regression coverage

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6

Files:
- `server/src/index.js`
- `server/src/productsSort.test.js`

Tests:
- `npx jest --ci --runInBand --forceExit server/src/productsSort.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:
- Run the focused named tests and confirm all six acceptance behaviors pass against deterministic fixtures, including equal prices and invalid-sort handling.
- Run the repository Jest command to confirm the new endpoint tests integrate with the existing suite; record any unrelated pre-existing failures separately rather than weakening the focused assertions.
- If an HTTP smoke check is available in the test environment, demonstrate `GET /api/products?sort=price_asc`, `GET /api/products?sort=price_desc`, the unsorted request, and an invalid value such as `sort=rating` with the expected status and response properties.
