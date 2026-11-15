# Spec v2: S-62

## Goal
Add `GET /api/catalog/products/:id/similar` to the catalog API. The endpoint loads the same catalog as the existing catalog routes, finds products in the requested product's category, excludes the requested product, orders the remaining products by ascending absolute price difference from the requested product, then orders equal price differences by ascending product id, and returns at most five products by default. An optional `limit` query parameter changes the maximum to an integer from 1 through 10; every other supplied value is rejected with HTTP 400 and a clear error message. Existing catalog and search endpoint behavior remains unchanged.

## Acceptance checks
- AC-1: GET /api/catalog/products/:id/similar returns HTTP 200 with a JSON object containing a products array using the existing catalog product representation (how to see it: test: server/src/catalogSimilar.test.js)
- AC-2: With no limit query parameter, the similar-products response contains no more than 5 products (how to see it: test: server/src/catalogSimilar.test.js)
- AC-3: Every returned product has the same category as the requested product, and the requested product is absent from the response (how to see it: test: server/src/catalogSimilar.test.js)
- AC-4: Returned products are ordered by nondecreasing absolute difference between each product price and the requested product price, with products having equal differences ordered by ascending product id (how to see it: test: server/src/catalogSimilar.test.js)
- AC-5: A supplied integer limit from 1 through 10 returns no more than that many similar products (how to see it: test: server/src/catalogSimilar.test.js)
- AC-6: A supplied limit outside the inclusive integer range 1 through 10, or a non-integer/non-numeric limit, returns HTTP 400 with a clear error message (how to see it: http: GET /api/catalog/products/<known-id>/similar?limit=0 → 400 with a JSON error message)
- AC-7: An unknown product id returns HTTP 404 with the catalog API's product-not-found error shape (how to see it: http: GET /api/catalog/products/<unknown-id>/similar → 404 with a JSON error message)
- AC-8: The similar-products endpoint's ordering, limit handling, unknown-id handling, and self-exclusion are covered by focused automated tests (how to see it: test: server/src/catalogSimilar.test.js)
- AC-9: Existing catalog and search endpoint responses remain unchanged by adding the similar-products route (how to see it: test: server/src/catalogSimilar.test.js)

## Affected areas
- (none)

## Risks
- (none)

## New packages
- (none)

## Choices
- For equal price differences, sort products by product id ascending, as requested by the owner.

## Assumptions
- (none)

## Docs used
- (none)
