# Catalog Image Integrity (Stage 0) — Design

**Date:** 2026-07-10
**Status:** Approved, ready to fold into the implementation plan as Stage 0 (runs before the
already-approved Stages A/B/C in
`docs/superpowers/plans/2026-07-10-default-llm-search-and-multiparam-e2e.md`).

## Goal

While investigating the multi-parameter search rewrite, the user asked whether the test-image
sample gallery had enough variety. It did (20 distinct, checksummed-unique files). But
checking that led to a much bigger, real finding: **33 of the catalog's 196 products have a
broken or wrongly-duplicated primary image** — the same image file assigned to two or more
unrelated products, or a dead-link placeholder stub. This directly undermines Phase 4's
CLIP-based visual search for those 33 products (their embeddings are built from a wrong or
degenerate image) and their listing/PDP thumbnails are visually wrong or blank.

This spec fixes the 33 with real, correctly-licensed replacement images, and adds a permanent
regression gate so this class of bug can never silently reappear.

## Root cause (verified by direct execution, not assumption)

MD5-hashed every product's primary image in `server/catalog-static.json` (196 products) and
grouped by hash. Three distinct root causes, not one:

1. **Group 1 — 23 products, dead escuelajs.co/imgur links.** These products (id prefix
   `es-`) source their photo from `i.imgur.com` URLs recorded in
   `server/data/catalog-selection.json`. Fetching one of those URLs live returns HTTP 200,
   but the body is imgur's well-known tiny "image removed" placeholder graphic (161×81px,
   503 bytes) — imgur deleted the original uploads at some point after the catalog was
   originally built, and now serves this stub instead of a proper 404. All 23 escuelajs-sourced
   products in the catalog are affected — confirmed this is the entire escuelajs-sourced
   population, not a sample of it. Re-running the existing download script would fetch the
   exact same dead stub; there is no fix without a different source for these specific
   products.
2. **Group 2 — 8 products, a hand-curation bug.** `server/src/demoCoverageProducts.js`
   contains a small hand-authored list of "demo coverage" products (id prefix `demo-`) added
   to fill search-demo gaps (e.g. specific price-range buckets). Several of these were
   assigned a URL that is literally a *different, unrelated real product's* own photo — e.g.
   `demo-shoes-women-44` ("Urban Step Women Sneakers") is wired to the exact same
   `.../nike-air-jordan-1-red-and-black/thumbnail.webp` URL as the real `dj-88` ("Nike Air
   Jordan 1 Red And Black"). This is an authoring copy-paste error, not a dead link — `dj-88`
   itself is fine and does not need touching.
3. **Group 3 — 2 products, a coincidence within dummyjson's own live data.** Two distinct real
   dummyjson products (e.g. "Rolex Datejust" and "Rolex Datejust Women") happen to use the
   exact same stock photo in dummyjson's own catalog. Neither is "wrong" — this is a
   limitation of the free source data itself.

My first duplicate-scan pass over-counted at 39 by flagging *both* members of every duplicate
pair as broken. Corrected by classifying each duplicate group: a group containing exactly one
`dj-`/`fs-` (dummyjson/fakestoreapi) member and the rest non-real-prefixed is Group 2 (the
`dj-`/`fs-` member is the legitimate original and is excluded from the fix list); a group
where every member shares a sub-2KB file is Group 1 (nobody in it is legitimate); a group of
two-or-more `dj-`/`fs-` members is Group 3. True total needing a fix: **33**, not 39.

By category: mens-clothing 12, footwear 11, beauty-fragrances 3, bags-accessories 2,
womens-clothing 3, watches 2.

## Sourcing approach

**Constraint carried from the rest of this project: only real, sourced, non-fictional product
images — never AI-generated or synthesized.** Within that constraint, sourcing choices differ
by how much real inventory each category has left:

- **Primary: dummyjson.com + fakestoreapi.com**, the two sources already proven reliable
  (152 + 13 products in the catalog, zero broken images between them). Same-category
  replacement required (preserves the original 12-category, 196-product balance from Phase 1).
- **Feasibility problem found and confirmed by live query:** dummyjson's `mens-shirts`
  category has only 5 products total (all 5 already used in the catalog) and fakestoreapi's
  `men's clothing` has only 4 total (3 already used) — combined, ~1 spare slot exists against
  a need for 12. Similarly, dummyjson's `mens-shoes` + `womens-shoes` combined total 10 (9
  already used), fakestoreapi has no shoes category at all — ~4 spare slots against a need for
  11. The other 4 affected categories (beauty-fragrances 3, bags-accessories 2,
  womens-clothing 3, watches 2) are small enough that dummyjson/fakestoreapi headroom is not
  expected to be a problem.
- **Fallback 1, for the mens-clothing/footwear shortfall specifically: fresh, not-yet-used
  escuelajs.co candidates, each individually validated before acceptance** (real decodable
  image, exceeds a minimum size/dimension threshold, no hash collision with any existing
  catalog image). The 23 known-dead escuelajs products are the specific SKUs this catalog
  happened to select, not evidence the entire site is dead — escuelajs has many more products
  than the ones already tried. This keeps the replacement as another catalog API's own real
  product record, at the cost of needing a live validation step per candidate (exactly the
  discipline that was missing the first time).
- **Fallback 2, for whatever remains short after fresh-escuelajs attempts: Unsplash's free API**
  (`api.unsplash.com`, requires a free developer Access Key — confirmed live that
  unauthenticated requests return `401`). Real, correctly-licensed (Unsplash License permits
  commercial/demo use, no attribution required) photographs of real physical objects, on
  infrastructure that's proven far more reliable than escuelajs/imgur hotlinking. Tradeoff,
  stated plainly: an Unsplash photo is stock photography of "a red baseball cap," not that
  specific catalog SKU's own official listing photo the way a dummyjson/fakestoreapi entry is
  — acceptable for generic apparel/footwear items, and used only as a last resort after both
  real-catalog-API options are exhausted.
- **The user will register the free Unsplash developer account and provide the Access Key**
  when the implementation reaches that task — this agent does not and cannot create that
  account (account creation is outside what an agent may do autonomously).

## Components

1. **`server/scripts/lib/imageIntegrity.mjs`** (new) — pure, testable functions:
   - `hashImage(absolutePath): string` — MD5 of file bytes.
   - `findDuplicateGroups(products): Array<{hash, size, members: Product[]}>` — groups
     products by identical primary-image hash.
   - `isLikelyPlaceholder(buffer): boolean` — true if the image is implausibly small to be a
     real product photo (size threshold; see Task detail in the plan for the exact byte
     value, chosen empirically from the confirmed-real Group 1 stub's 503 bytes vs. the
     smallest confirmed-real product photo in the catalog).

   Reused by both the one-time fix script (#2 below) and the permanent test gate (#3 below) —
   single source of truth for "what counts as broken," so the fix script and the regression
   test can never silently disagree about what passes.

2. **`server/scripts/fixBrokenCatalogImages.mjs`** (new) — one-time Stage 0 script:
   - Loads `catalog-static.json`, runs `findDuplicateGroups` + classification (as described
     in Root Cause above) to get the definitive 33-product fix list, tagged by group.
   - For each, tries in order: (a) an unused dummyjson/fakestoreapi candidate in the same
     category, if any category headroom remains: (b) a fresh, not-yet-used escuelajs
     candidate in the same category, validated live before acceptance; (c) an Unsplash photo
     for the same category/type, only if (a) and (b) are exhausted.
   - Downloads the accepted image into `assets/products/<slug>/`, updates that product's
     `images`/`image` fields in `catalog-static.json`.
   - Writes a report (console output, plus a small JSON summary file) listing, per fixed
     product: which of (a)/(b)/(c) supplied its new image — so the result is auditable, not a
     black box, and so a future reviewer can see at a glance how many of the 33 ended up on
     the stock-photo fallback versus a real catalog-API record.

3. **New assertions in `__tests__/catalogStaticValidation.test.js`** (existing file, extended)
   — using the same `imageIntegrity.mjs` functions:
   - "no two products share an identical primary-image hash"
   - "every product's primary image exceeds the minimum real-photo size threshold"

   Both are hard failures, part of the existing `npm test` / `npm run validate:catalog` run —
   same severity as the file's existing "no duplicate SKUs" check. Any future catalog change
   (manual edit, a re-run of the Phase 1 selection scripts, a new demo-coverage entry) that
   reintroduces a duplicate or near-empty image fails the suite immediately.

4. **Re-run `server/scripts/rebuildClipIndex.js`** (existing, unmodified) once the 33 images
   are corrected, so Phase 4's CLIP visual-search index reflects the fix. Confirmed this
   script only supports a full rebuild (deletes `server/data/clip-embeddings.json` and
   re-embeds every product) — no incremental/partial-rebuild mode exists in the current
   codebase, and building one is not warranted for a 33-of-196 change (YAGNI; the existing
   full-rebuild path already worked reliably in Phase 4 and a 196-product rebuild is not slow
   enough to justify new incremental-rebuild infrastructure).

## Data flow

```
catalog-static.json (196 products, 33 flagged)
        |
        v
imageIntegrity.mjs: findDuplicateGroups + classify -> 33-item fix list, grouped 1/2/3
        |
        v
fixBrokenCatalogImages.mjs: per product, try (a) dummyjson/fakestoreapi unused candidate
                              -> (b) fresh validated escuelajs candidate
                              -> (c) Unsplash (requires user-provided ACCESS_KEY)
        |
        v
assets/products/<slug>/*.{webp,jpg} written; catalog-static.json images/image fields updated
        |
        v
rebuildClipIndex.js (full rebuild, existing script, unmodified)
        |
        v
__tests__/catalogStaticValidation.test.js new assertions -> must show 0 duplicates, 0
  placeholder-sized images across all 196 (permanent gate from here on)
```

## Error handling

- If a candidate image fails validation (wrong content-type, below the size threshold, or a
  network/fetch error), the script logs it and moves to the next fallback tier — it does not
  silently accept a bad image, and does not crash the whole run over one product's failure.
- If a product exhausts all three tiers (a)/(b)/(c) without finding an acceptable image, the
  script stops and reports that specific product by id/title rather than leaving it in a
  half-fixed or silently-still-broken state — this is a real "needs a human decision" case
  (e.g. category truly has no candidates anywhere), not something to paper over.
- The Unsplash tier is skipped entirely (falls through to the "exhausted" case above) if
  `UNSPLASH_ACCESS_KEY` is not set in the environment when the script runs — never a silent
  no-op that looks like success.

## Testing

- `node --test` unit tests for `imageIntegrity.mjs`'s three pure functions (hash a known
  file, detect a synthetic duplicate pair, threshold check against both a real product photo
  size and the confirmed 503-byte placeholder).
- Manual run of `fixBrokenCatalogImages.mjs` against the real catalog; verify its report shows
  all 33 resolved and confirm a handful spot-checked in the running app (product listing +
  PDP) show a sensible, correctly-oriented, non-broken photo.
- `npm test` / `npm run validate:catalog` green afterward, including the two new hard-gate
  assertions passing across all 196 products (not just the 33 that were fixed — this also
  re-confirms the 163 untouched products are still fine).
- `node scripts/verify-cloud-clip.mjs` or the equivalent local CLIP smoke check (whichever
  this project's Phase 4 work used) re-run once after `rebuildClipIndex.js`, to confirm the
  index rebuild itself completed without error — full E2E photo-search re-validation is
  already covered by the existing `photo-search.yaml` flows and is not duplicated here.

## Out of scope

- Any images beyond each product's *primary* (`images[0]`/`image`) photo — secondary gallery
  images (`images[1..3]`) are not audited by this spec; a future pass could extend
  `imageIntegrity.mjs`'s checks to the full gallery array, not just the first entry.
- Building incremental/partial CLIP index rebuild support — full rebuild is used as-is.
- Any change to `server/scripts/downloadCatalogImages.mjs`, `selectCatalogProducts.mjs`, or
  `demoCoverageProducts.js`'s existing entries beyond the specific 8 Group-2 URL corrections —
  this is a data fix, not a rewrite of the Phase 1 build pipeline.
- Auditing/fixing secondary gallery images for products outside the 33 (i.e. a product whose
  *first* image is fine but a later gallery image happens to be broken/duplicated) — covered
  only if it happens to surface via the new primary-image-only test gate; a true full-gallery
  audit is the "future pass" noted above, not this spec.
