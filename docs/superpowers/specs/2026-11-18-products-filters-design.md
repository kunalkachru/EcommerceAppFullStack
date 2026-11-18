# Spec v1: S-113

## Goal
Extend `GET /api/products` so shoppers can narrow the existing product list by a case-insensitive keyword query `q` matching product `title` (the product name) or `brand`, by `category`, and by the inclusive numeric price bounds `minPrice` and `maxPrice`. These filters are conjunctive: every supplied filter must match. They compose with the existing `sort=price_asc` and `sort=price_desc` behavior. A negative price bound or a `minPrice` greater than `maxPrice` is rejected with HTTP 400 and a clear JSON message. Requests without the new filters retain the existing response shape and behavior.

## Acceptance checks
- AC-1: GET /api/products?q=<keyword> returns HTTP 200 with only products whose title or brand contains the keyword case-insensitively (how to see it: test: server/src/productsFilters.test.js)
- AC-2: GET /api/products?category=<category> returns HTTP 200 with only products matching the requested category (how to see it: test: server/src/productsFilters.test.js)
- AC-3: GET /api/products?minPrice=<value>&maxPrice=<value> returns HTTP 200 with only products whose numeric price is within the inclusive requested range (how to see it: test: server/src/productsFilters.test.js)
- AC-4: GET /api/products with q, category, minPrice, and maxPrice supplied together returns only products satisfying every supplied filter (how to see it: test: server/src/productsFilters.test.js)
- AC-5: GET /api/products with any supported filter combined with sort=price_asc or sort=price_desc returns the filtered products in the requested numeric price order and preserves the existing product-list response shape (how to see it: test: server/src/productsFilters.test.js)
- AC-6: GET /api/products?minPrice=<negative value> or GET /api/products?maxPrice=<negative value> returns HTTP 400 with a clear JSON error message identifying the invalid price range (how to see it: test: server/src/productsFilters.test.js)
- AC-7: GET /api/products?minPrice=<value>&maxPrice=<lower value> where minPrice is above maxPrice returns HTTP 400 with a clear JSON error message identifying the invalid price range (how to see it: test: server/src/productsFilters.test.js)
- AC-8: GET /api/products without q, category, minPrice, or maxPrice retains the existing product ordering and response shape, and existing price sorting remains available (how to see it: test: the full suite)
- AC-9: server/src/productsSort.test.js is updated so its existing sorting and no-filter assertions pass with filtering support and confirms sorting composes with filtered product lists (how to see it: test: server/src/productsSort.test.js)

## Affected areas
- (none)

## Risks
- (none)

## New packages
- (none)

## Choices
- (none)

## Assumptions
- (none)

## Docs used
- (none)
