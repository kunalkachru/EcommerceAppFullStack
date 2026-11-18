# Spec v1: S-116

## Goal
Extend `GET /api/products` so shoppers can narrow the existing product list by keyword, category, and price range while retaining the existing response shape and price sort behavior. The `q` query matches the existing product `title` (the product name) or `brand`, case-insensitively. Filters are applied together, and the resulting products are then ordered by the existing `sort=price_asc` or `sort=price_desc` parameter when supplied. A negative `minPrice` or `maxPrice`, or a `minPrice` greater than `maxPrice`, is rejected with HTTP 400 and a clear range error message.

## Acceptance checks
- AC-1: GET /api/products?q=<keyword> returns HTTP 200 with only products whose title or brand contains the keyword case-insensitively, using the existing product-list response shape (how to see it: test: server/src/productsFilters.test.js)
- AC-2: GET /api/products?category=<category> returns HTTP 200 with only products whose category equals the requested category, using the existing product-list response shape (how to see it: test: server/src/productsFilters.test.js)
- AC-3: GET /api/products?minPrice=<value> returns HTTP 200 with only products whose numeric price is greater than or equal to minPrice (how to see it: test: server/src/productsFilters.test.js)
- AC-4: GET /api/products?maxPrice=<value> returns HTTP 200 with only products whose numeric price is less than or equal to maxPrice (how to see it: test: server/src/productsFilters.test.js)
- AC-5: GET /api/products?q=<keyword>&category=<category>&minPrice=<min>&maxPrice=<max> returns only products satisfying every supplied filter (how to see it: test: server/src/productsFilters.test.js)
- AC-6: Applying q, category, minPrice, and maxPrice together with sort=price_asc orders the filtered products by nondecreasing numeric price, and sort=price_desc orders them by nonincreasing numeric price (how to see it: test: server/src/productsFilters.test.js)
- AC-7: GET /api/products?minPrice=<negative> or GET /api/products?maxPrice=<negative> returns HTTP 400 with a clear JSON message identifying the invalid price range (how to see it: test: server/src/productsFilters.test.js)
- AC-8: GET /api/products?minPrice=<greater-than-max>&maxPrice=<max> returns HTTP 400 with a clear JSON message identifying that minPrice cannot exceed maxPrice (how to see it: test: server/src/productsFilters.test.js)
- AC-9: GET /api/products without filters retains the existing product-list response shape and ordering, and existing sort values retain their established behavior (how to see it: test: the full suite)

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
