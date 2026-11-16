# Spec v1: S-78

## Goal
Add price sorting to the product-list endpoint. `GET /api/products?sort=price_asc` returns the complete product list ordered by nondecreasing numeric `price`; `GET /api/products?sort=price_desc` returns the same list ordered by nonincreasing numeric `price`. A supplied `sort` value other than `price_asc` or `price_desc` returns HTTP 400 with a clear JSON error message. Requests without `sort` retain the endpoint's existing product ordering and response shape.

## Acceptance checks
- AC-1: GET /api/products?sort=price_asc returns HTTP 200 with the existing product-list JSON shape and all returned products ordered by nondecreasing numeric price (how to see it: test: server/src/productsSort.test.js)
- AC-2: GET /api/products?sort=price_desc returns HTTP 200 with the existing product-list JSON shape and all returned products ordered by nonincreasing numeric price (how to see it: test: server/src/productsSort.test.js)
- AC-3: GET /api/products?sort=price_asc and GET /api/products?sort=price_desc return the same products and existing metadata as GET /api/products, with only product ordering changed (how to see it: test: server/src/productsSort.test.js)
- AC-4: GET /api/products without a sort query parameter preserves the existing product ordering and response shape (how to see it: test: server/src/productsSort.test.js)
- AC-5: GET /api/products?sort=<any value other than price_asc or price_desc> returns HTTP 400 with a JSON error message stating that sort must be price_asc or price_desc (how to see it: http: GET /api/products?sort=rating → 400 with a JSON error message containing "price_asc" and "price_desc")
- AC-6: The price sorting and invalid-sort behavior are covered by focused automated endpoint tests using deterministic catalog fixtures, including products with equal prices (how to see it: test: server/src/productsSort.test.js)

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
