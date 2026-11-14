# Spec v1: S-52

## Goal
Add a public `GET /api/catalog/categories` endpoint that loads the same catalog used by the existing catalog API and returns one entry for every category represented by at least one product. Each entry exposes the stable category slug as `slug`, the catalog display name as `label`, and the number of catalog products in that category as `productCount`. The response is `{ "categories": [...] }`; entries are ordered by descending `productCount`, then ascending `slug` for deterministic ties. The endpoint must use the catalog service rather than a separately maintained category list, and must return the existing catalog error contract with HTTP 500 if the catalog cannot be loaded.

## Acceptance checks
- AC-1: GET /api/catalog/categories returns HTTP 200 with a JSON object containing a categories array (how to see it: http: GET /api/catalog/categories → status 200 and body.categories is an array)
- AC-2: Every category entry contains exactly the fields slug, label, and productCount, with slug and label strings and productCount a non-negative integer (how to see it: test: server/src/catalogCategories.test.js)
- AC-3: Each returned category has one entry per distinct product category slug, its label matches the catalog categoryLabel for that slug, and productCount equals the number of catalog products with that slug (how to see it: test: server/src/catalogCategories.test.js)
- AC-4: Category entries are ordered by descending productCount and then ascending slug when counts tie, producing deterministic responses across repeated requests (how to see it: test: server/src/catalogCategories.test.js)
- AC-5: A catalog-loading failure from GET /api/catalog/categories returns HTTP 500 with the existing JSON error shape containing a message string (how to see it: http: GET /api/catalog/categories → status 500 and body.message is a string)

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
