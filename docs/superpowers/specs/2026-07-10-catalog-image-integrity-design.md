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

1. **Group 1 — 23 products, broken escuelajs.co/imgur URLs — but 21 of 23 are recoverable
   in place, not permanently dead.** These products (id prefix `es-`) source their photo from
   `i.imgur.com` URLs recorded in `server/data/catalog-selection.json`, stored all-lowercase
   (e.g. `r2pn9wq.jpeg`). Fetching that exact stored URL live returns HTTP 200, but the body
   is imgur's well-known tiny "image removed" placeholder graphic (161×81px, 503 bytes).
   **The actual root cause: imgur URLs are case-sensitive, and the correctly-cased version of
   the same ID is a genuinely different, working image** — verified directly:
   `i.imgur.com/r2pn9wq.jpeg` (as stored) is dead, `i.imgur.com/R2PN9Wq.jpeg` (mixed case) is
   a real, working 64KB photo. Cross-referencing all 23 broken products' exact titles against
   escuelajs's current live catalog (fetched fresh, 55 total live products) found **21 exact
   title matches**, each with a currently-working, correctly-cased image URL for that *same*
   already-selected real product — no product-selection change needed, just a URL correction.
   Only 2 of 23 (`Classic Heather Gray Hoodie`, `Classic Black Hooded Sweatshirt`) have no
   current live match and need the fallback chain described below, same as Groups 2/3.
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
two-or-more `dj-`/`fs-` members is Group 3. True total with a wrong image: **33**, not 39 —
but only **12 of those 33** actually need the sourcing fallback chain below, since 21 of
Group 1's 23 are a same-product URL correction (title-matched against escuelajs's live
catalog), not a re-sourcing problem at all.

By category, for the 12 that need the fallback chain: mens-clothing 2, footwear 3,
womens-clothing 3, beauty-fragrances 2, watches 2. (The 21 title-matched Group 1 corrections
span mens-clothing, footwear, beauty-fragrances, and bags-accessories but need no fallback
sourcing — see Sourcing approach below.)

## Sourcing approach

**Constraint carried from the rest of this project: only real, sourced, non-fictional product
images — never AI-generated or synthesized.** Within that constraint, sourcing choices differ
by how much real inventory each category has left:

- **Tier 0 (Group 1 only, 21 of 23 products): same-product URL correction, no re-sourcing at
  all.** For each Group 1 product whose exact title matches a currently-live escuelajs
  listing, take that listing's current image URL directly — the product itself (title, price,
  description, category) is completely unchanged; only the broken image URL is corrected.
  This is not really "sourcing a replacement," it's fixing a stale/case-wrong URL for a
  product we already legitimately selected, and it's why the fallback-chain volume below is
  12, not 33.
- **Primary (for the remaining 12 — Group 1's 2 unmatched + Group 2's 8 + Group 3's 2):
  dummyjson.com + fakestoreapi.com**, the two sources already proven reliable (152 + 13
  products in the catalog, zero broken images between them). Same-category replacement
  required (preserves the original 12-category, 196-product balance from Phase 1).
- **Feasibility, re-checked against the corrected 12-product need:** mens-clothing needs 2
  (dummyjson's `mens-shirts` has 0 spare of 5, fakestoreapi's `men's clothing` has 1 spare of
  4 — enough for 1 of the 2, fallback needed for at most 1), footwear needs 3 (dummyjson's
  `mens-shoes`+`womens-shoes` combined have ~1 spare of 10 — fallback needed for roughly 2).
  womens-clothing (3), beauty-fragrances (2), and watches (2) are small enough that
  dummyjson/fakestoreapi headroom is not expected to be a problem. The earlier 33-product
  feasibility concern (12 needed vs. ~1 spare in mens-clothing, 11 needed vs. ~4 spare in
  footwear) is effectively resolved by the Tier 0 correction; only a small handful of products
  are now expected to actually reach the escuelajs/Unsplash fallback tiers below.
- **Fallback 1, for whatever's still short after dummyjson/fakestoreapi: fresh, not-yet-used
  escuelajs.co candidates, each individually validated before acceptance** (real decodable
  image, exceeds a minimum size/dimension threshold, no hash collision with any existing
  catalog image) — confirmed via live sampling this session that escuelajs's *current* catalog
  (55 live products, not the stale set originally selected) does contain genuinely working,
  correctly-cased imgur images, so this tier is real and usable, not just theoretical.
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
   - For Group 1 products specifically, first tries Tier 0: fetch escuelajs's live catalog,
     look for an exact `title` match, and if found, take that listing's current image URL
     directly (same product, corrected URL, no category/inventory considerations at all).
   - For anything not resolved by Tier 0 (Group 1's 2 unmatched, all of Group 2, all of
     Group 3), tries in order: (a) an unused dummyjson/fakestoreapi candidate in the same
     category, if any category headroom remains; (b) a fresh, not-yet-used escuelajs
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
Group 1 (23) -> Tier 0: exact-title match against escuelajs's LIVE catalog
                  -> 21 resolved (same product, corrected URL, done)
                  -> 2 unresolved, fall through with Group 2 (8) + Group 3 (2) = 12 total
        |
        v
fixBrokenCatalogImages.mjs, for the 12: try (a) dummyjson/fakestoreapi unused candidate
                              -> (b) fresh validated escuelajs candidate
                              -> (c) Unsplash (requires user-provided ACCESS_KEY)
        |
        v
assets/products/<slug>/*.{webp,jpg} written; catalog-static.json images/image fields updated
  (all 33: 21 via Tier 0, 12 via the (a)/(b)/(c) chain)
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
