# Spec v2: S-52

## Goal
Add a public `GET /api/catalog/categories` endpoint that loads the same catalog used by the existing catalog API and returns one entry for every category represented by at least one product. Each entry exposes the stable category slug as `slug`, the catalog display name as `label`, and the number of catalog products in that category as `productCount`. The response is `{ "categories": [...] }`; entries are ordered by descending `productCount`, then ascending `slug` for deterministic ties. The endpoint must use the catalog service rather than a separately maintained category list, and must return the existing catalog error contract with HTTP 500 if the catalog cannot be loaded.

## Acceptance checks
- AC-1: GET /api/catalog/categories returns HTTP 200 with a JSON object containing a categories array (how to see it: http: GET /api/catalog/categories → status 200 and body.categories is an array)
- AC-2: Every category entry contains exactly slug, label, and productCount, with slug and label strings and productCount a non-negative integer (how to see it: test: server/src/catalogCategories.test.js)
- AC-3: Each returned category represents one distinct product category slug, uses that slug's catalog categoryLabel, and has the matching product count (how to see it: test: server/src/catalogCategories.test.js)
- AC-4: Categories are sorted by descending productCount and ascending slug for ties (how to see it: test: server/src/catalogCategories.test.js)
- AC-5: A catalog-loading failure returns HTTP 500 with a JSON body containing the existing message string error shape (how to see it: test: server/src/catalogCategories.test.js)

## Affected areas
- server/src/index.js` — catalog categories route, testable app export, and guarded server startup
- server/src/catalogCategories.test.js` — focused HTTP contract and catalog-loading failure tests

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
