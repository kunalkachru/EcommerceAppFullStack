# Product List Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `GET /api/products` with case-insensitive keyword, category, and inclusive price-range filters that compose with the existing price sort behavior and reject invalid ranges with clear HTTP 400 errors.

**Architecture:** Keep filtering in the existing `/api/products` handler after loading the catalog, then apply the existing `price_asc`/`price_desc` ordering to the filtered copy. Preserve the established `{ products, meta }` response shape and the existing `/api/catalog/products` behavior; use deterministic mocked catalog fixtures in a focused server contract test.

**Tech Stack:** Node.js, Express, Jest, existing catalog service.

**Spec:** `/work/docs/superpowers/specs/2026-11-18-product-list-filters-design.md`

## Global Constraints

- The `q` query matches the existing product `title` (the product name) or `brand`, case-insensitively.
- Filters are applied together, and the resulting products are then ordered by the existing `sort=price_asc` or `sort=price_desc` parameter when supplied.
- A negative `minPrice` or `maxPrice`, or a `minPrice` greater than `maxPrice`, is rejected with HTTP 400 and a clear range error message.
- Preserve the existing `{ products, meta }` product-list response shape and the existing no-filter ordering.
- Add no packages and leave `/api/catalog/products` behavior unchanged.

---

## T1: Add focused product-filter endpoint contract tests

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9

Files:
- Create: `server/src/productsFilters.test.js`

Tests:
- `server/src/productsFilters.test.js::filters products by title or brand with a case-insensitive q query`
- `server/src/productsFilters.test.js::filters products by exact category`
- `server/src/productsFilters.test.js::filters products by inclusive minPrice and maxPrice bounds`
- `server/src/productsFilters.test.js::combines q category and price filters`
- `server/src/productsFilters.test.js::sorts the combined filtered result by price_asc and price_desc`
- `server/src/productsFilters.test.js::rejects negative price bounds with a clear invalid price range message`
- `server/src/productsFilters.test.js::rejects minPrice greater than maxPrice with a clear minPrice message`
- `server/src/productsFilters.test.js::preserves the existing response shape and ordering without filters`
- `server/src/productsFilters.test.js::retains established sort behavior without filters`
- `npx jest --ci --runInBand --forceExit server/src/productsFilters.test.js`

How to show:
- Mock `fetchCatalog` and `getCatalogMeta` using the same isolated Express request pattern as `server/src/productsSort.test.js`.
- Use a deterministic fixture with titles, brands, categories, numeric and string prices, mixed casing, boundary prices, and at least one product that matches `q` through `brand` rather than `title`.
- Assert HTTP 200, exact matching product membership, inclusive price boundaries, exact category equality, the unchanged `{ products, meta }` shape, numeric ascending/descending order, and no mutation of the fixture.
- Assert negative `minPrice` and `maxPrice` requests return HTTP 400 with JSON `message` text that identifies an invalid price range; assert an inverted range returns HTTP 400 with message text that identifies that `minPrice` cannot exceed `maxPrice`.
- Include unfiltered and sort-only requests so the focused contract protects AC-9 as well as the new filter combinations.

## T2: Implement composed filters and range validation in the products route

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9

Files:
- Modify: `server/src/index.js` in the existing `app.get("/api/products", ...)` handler

Tests:
- `server/src/productsFilters.test.js`
- `server/src/productsFilters.test.js::filters products by title or brand with a case-insensitive q query`
- `server/src/productsFilters.test.js::filters products by exact category`
- `server/src/productsFilters.test.js::filters products by inclusive minPrice and maxPrice bounds`
- `server/src/productsFilters.test.js::combines q category and price filters`
- `server/src/productsFilters.test.js::sorts the combined filtered result by price_asc and price_desc`
- `server/src/productsFilters.test.js::rejects negative price bounds with a clear invalid price range message`
- `server/src/productsFilters.test.js::rejects minPrice greater than maxPrice with a clear minPrice message`
- `server/src/productsFilters.test.js::preserves the existing response shape and ordering without filters`
- `server/src/productsFilters.test.js::retains established sort behavior without filters`

How to show:
- Read `q`, `category`, `minPrice`, `maxPrice`, and the existing `sort` query values without changing the route’s established sort validation or error behavior.
- Parse supplied price bounds as numbers before filtering; reject a negative bound immediately with HTTP 400 JSON whose `message` clearly says the price range is invalid, and reject a supplied `minPrice` greater than `maxPrice` with HTTP 400 JSON whose `message` clearly says `minPrice` cannot exceed `maxPrice`.
- Build a filtered copy of the catalog: require `q` to be contained in either `title` or `brand` after case-insensitive normalization, require `category` to equal the requested category, and require numeric product prices to satisfy inclusive `minPrice`/`maxPrice` bounds. Apply every supplied predicate with logical AND.
- Apply `sort=price_asc` or `sort=price_desc` only after filtering, using numeric prices and a copied array so the catalog’s baseline order remains unchanged when no sort is supplied.
- Return the same `{ products, meta }` object shape and leave `/api/catalog/products` untouched.

## T3: Run focused and repository-wide verification

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9

Files:
- `server/src/index.js`
- `server/src/productsFilters.test.js`

Tests:
- `npx jest --ci --runInBand --forceExit server/src/productsFilters.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:
- Run the focused test file and confirm all keyword, category, inclusive-bound, composed-filter, post-filter-sort, invalid-range, response-shape, and regression assertions pass.
- Run the full required Jest command from `/work` and confirm the new endpoint behavior does not regress existing server or application tests, including the previously established sort contract.
- If a failure is unrelated to this story, record its exact test identifier and root cause separately; do not weaken the focused acceptance assertions or change the approved response contract.
