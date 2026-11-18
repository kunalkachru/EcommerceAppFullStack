# Products filters — implementation plan

## T1: Add focused product-filter endpoint tests

Checks: AC-1, AC-2, AC-3, AC-4, AC-6, AC-7

Files:
- Create: `server/src/productsFilters.test.js`

Tests:
- `server/src/productsFilters.test.js::filters products by a case-insensitive title or brand keyword`
- `server/src/productsFilters.test.js::filters products by category`
- `server/src/productsFilters.test.js::filters products by inclusive numeric price range`
- `server/src/productsFilters.test.js::combines keyword category and price filters conjunctively`
- `server/src/productsFilters.test.js::rejects negative minPrice or maxPrice with a clear 400 JSON error`
- `server/src/productsFilters.test.js::rejects a minPrice above maxPrice with a clear 400 JSON error`

How to show:
- Mock the catalog loader and metadata provider with deterministic products covering title matches, brand matches, case differences, multiple categories, numeric prices at both bounds, and nonmatching products.
- Exercise `/api/products` with each supported filter and with all filters together; assert HTTP 200, exact matching product membership, inclusive bounds, the existing `{ products, meta }` response shape, and that invalid ranges return HTTP 400 with an error message identifying the invalid price range.

## T2: Update existing sorting regression coverage for filtered lists

Checks: AC-5, AC-8, AC-9

Files:
- Modify: `server/src/productsSort.test.js`

Tests:
- `server/src/productsSort.test.js::returns filtered products in nondecreasing numeric price order for price_asc`
- `server/src/productsSort.test.js::returns filtered products in nonincreasing numeric price order for price_desc`
- `server/src/productsSort.test.js::preserves the existing product order and response shape without filters or sort`
- `server/src/productsSort.test.js::retains existing price sorting behavior alongside filtering`

How to show:
- Preserve the existing no-filter and sort assertions while adding requests that combine a supported filter with each price sort direction.
- Assert that only filtered products are returned, numeric ordering is correct, metadata and product-list shape remain unchanged, and the unfiltered baseline ordering still matches the pre-filter behavior.

## T3: Implement combined filtering and validation in the products route

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8

Files:
- Modify: `server/src/index.js`

Tests:
- `server/src/productsFilters.test.js`
- `server/src/productsSort.test.js`

How to show:
- Parse `q`, `category`, `minPrice`, and `maxPrice` from `GET /api/products`; match `q` case-insensitively against `title` and `brand`, match category, and apply inclusive numeric price bounds as conjunctive filters.
- Reject a negative price bound and a `minPrice` greater than `maxPrice` with HTTP 400 and a clear JSON message identifying the invalid price range.
- Apply filtering before the existing `price_asc` or `price_desc` numeric sort, return the established `{ products, meta }` shape, and leave the original catalog order and existing `/api/catalog/products` behavior unchanged when no new filters are supplied.

## T4: Run focused and full regression verification

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9

Files:
- `server/src/index.js`
- `server/src/productsFilters.test.js`
- `server/src/productsSort.test.js`

Tests:
- `npx jest --ci --runInBand --forceExit server/src/productsFilters.test.js`
- `npx jest --ci --runInBand --forceExit server/src/productsSort.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:
- Run the focused filter and sorting suites and confirm all supported filter combinations, invalid-range responses, sorting composition, response-shape preservation, and no-filter regressions pass.
- Run the repository Jest command and record the complete-suite result, keeping any unrelated pre-existing failures separate from this endpoint coverage.
