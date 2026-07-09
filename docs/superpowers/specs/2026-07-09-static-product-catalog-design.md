# Static Product Catalog & Multi-Parameter Search — Design

**Date**: 2026-07-09
**Status**: Approved (brainstorming complete)
**Author**: Design session between user and Claude

---

## 1. Problem Statement

Testing revealed that multi-parameter search queries (e.g., *"trousers size XL brown color"*) do not return correct results. Root-cause analysis (see `DIAGNOSTIC_REPORT.md`, `EXECUTIVE_SUMMARY.md`) traced this to two compounding issues:

1. **Data gap**: The product catalog is not static — `catalogService.js` re-fetches from three live third-party APIs (dummyjson, fakestoreapi, escuelajs) roughly hourly and re-derives `colors`/`materials` from free text on every load via a small fixed word list (`catalogMetadata.js::enrichCatalogProduct`). This silently overwrites any hand-authored enrichment, and there is no concept of `sizes` or `specifications` anywhere in the pipeline.
2. **Parser gap**: The query understanding layer (`voiceQueryParser.js`, with an LLM-based parser `voiceQueryLLM.js` as primary and the rule-based parser as fallback) already recognizes price, gender, category, product type, and color — but has no concept of size or specification language at all, so even complete data would not be filterable today.

Both must be fixed for multi-parameter search to work. Additionally, the current architecture makes the catalog fragile (depends on 3 external APIs staying reachable) and inconsistent (re-computed attributes can drift between loads).

---

## 2. Goals

- Replace the live-fetched, partially-empty catalog with a **static, self-contained, fully-attributed** catalog of realistic size, checked into the repo.
- Every product has genuinely complete data: description, price, real local images, colors, materials, sizes (where applicable), specifications.
- Multi-parameter search ("brown size XL trousers", "wireless headphones under $50", "waterproof makeup") returns correct, relevant results.
- Zero regression in existing flows (login, browse, cart, checkout, orders, voice/photo/text search) on both Android and iOS.
- Preserve the existing live-fetch capability in a dormant, re-activatable state rather than deleting it.
- Establish platform-native (not shared/conditional) E2E automation scripts as the ongoing pattern.

## 3. Non-Goals (this plan)

- **3D product models** — deferred to the very next plan after this one ships (generic per-category placeholder models, not per-SKU unique assets).
- **SKU-level variant selection in cart/checkout** (choosing an exact color+size combination when adding to cart) — backlogged further out. Attributes in this plan are product-level descriptive/searchable arrays only, not purchasable variants.
- Expanding the catalog beyond ~180-220 products, or matching the current ~384-product breadth.

---

## 4. Architecture

### 4.1 Static catalog as sole source

- `server/data/catalog-static.json` becomes the **single authoritative source** of product data.
- `catalogService.js` is simplified to: load this file once, cache in memory, serve it. No live HTTP calls in the default path.
- All existing live-fetch logic (calls to dummyjson/fakestoreapi/escuelajs + the merge logic) is **relocated, not deleted**, into `server/src/catalogLiveSource.js`, unchanged in behavior.
- A `CATALOG_MODE` environment variable controls source selection, defaulting to `"static"`. Setting it to `"live"` re-activates the original behavior via `catalogLiveSource.js`. This keeps the old code real and testable rather than commented-out dead weight.

### 4.2 Product schema (static file)

```jsonc
{
  "id": "shp-001",
  "title": "string",
  "description": "string",
  "brand": "string",
  "category": "string",
  "categoryLabel": "string",
  "department": "string",
  "subcategory": "string",
  "audience": "unisex|men|women",
  "price": 0.00,
  "currency": "USD",
  "priceTier": "entry|budget|mid|premium|luxury",
  "images": ["assets/products/<slug>/1.jpg", "..."],
  "colors": ["brown", "black"],
  "materials": ["cotton"],
  "sizes": ["S", "M", "L", "XL"],
  "specifications": { "waterproof": true, "wireless": false },
  "tags": ["..."],
  "keywords": ["..."],
  "sku": "SKU-SHP-001",
  "inventoryCount": 0,
  "availability": "in_stock|limited_stock",
  "rating": 0.0
}
```

`sizes` is empty for non-apparel/footwear categories. `specifications` keys vary by category (see 4.4).

### 4.3 Scope decision: no SKU-level variants

Attributes stay as **product-level arrays** (a product simply lists which colors/sizes it comes in) rather than generating a full cross-product of color×size variant records with individual SKUs/inventory. This is sufficient to make search correct — the stated problem — without touching the cart/checkout data model, which is out of scope and carries real regression risk to already-stabilized purchase flows.

### 4.4 Data authoring pipeline

1. **Source pool**: Reuse the existing `server/catalog-snapshot.json` (384 products already fetched from the three live sources) as the candidate pool — real titles, photos, prices, descriptions already exist here.
2. **Selection**: A script selects ~180-220 products spanning 10-12 target categories (clothing men's/women's, footwear, electronics, beauty, jewelry, home, groceries, sports, bags/accessories, watches, fragrances, automotive), favoring entries with the best existing image/description quality, roughly balanced per category.
3. **Image localization**: Download each selected product's existing (already-licensed-for-demo-use) CDN images into `assets/products/<slug>/1.jpg …`, 3-4 images per product, resized/compressed to a sane web resolution. Target repo footprint: ~60-80MB.
4. **Attribute generation (authored directly during implementation, no external API)**: For each selected product, realistic `colors`, `materials`, `sizes` (where applicable), `specifications`, and a polished description are generated directly as part of implementing this plan — using the real title/description/category as grounding and general product knowledge to infer realistic values, the same way a human catalog editor would, just done by the implementing agent in one pass across the whole catalog for consistency. This is a **one-time authoring task**, not a runtime capability, so it does not call the OpenAI API — there's no reason to add network dependency, cost, or rate limits to something that only needs to happen once, up front, with full context already in hand. (Contrast with §4.6, where OpenAI *is* used — that's understanding a live shopper's query after the app has shipped, which genuinely has to happen at request time.)
5. **Automated validation pass**: A deterministic script checks every product has ≥1 color, ≥1 material where applicable, sizes present for clothing/footwear categories, and at least one specification where the category defines a pool. Any product failing validation is flagged and fixed before the file is considered final. This is the safety net against inconsistency — nothing ships without passing this gate.

### 4.5 Test-image gallery (for image-search E2E testing)

Because Maestro cannot trigger a real camera capture on an emulator/simulator, a curated folder `test-assets/image-search-samples/` holds a diverse set of sample images — at least one representative image per catalog category (e.g., brown trousers, a red top, headphones, a lipstick, a handbag). Before running image-search E2E tests, these are pushed into:
- Android emulator: via `adb push` into `Pictures`/`DCIM`.
- iOS simulator: via `xcrun simctl addmedia`.

E2E flows then exercise "choose from gallery" (not live capture) and assert that search results are relevant to the picked image's actual category/attributes.

### 4.6 Search enhancement

Two parsers exist today: `voiceQueryLLM.js` (primary, LLM-based) and `voiceQueryParser.js` (rule-based fallback, used when the LLM is unavailable). Both are extended, consistent with the existing "LLM-first, rules as safety net" architecture:

- **Primary (LLM) path**: Extended to explicitly extract size and specification intent from natural free-text/voice queries, leveraging the LLM's inference (e.g., "roomy fit" → size signal, "won't smudge in rain" → waterproof) rather than only literal keyword matching.
- **Fallback (rule-based) path**: `voiceQueryParser.js` gets new fixed word lists for size tokens (`XS/S/M/L/XL/XXL`, numeric waist/shoe sizes) and specification keywords (`waterproof`, `wireless`, `bluetooth`, `long-lasting`, etc.), mirroring the existing pattern already used for `COLOR_WORDS`.
- **Filter layer**: `catalogTextFilter.js` / `relevanceScore` extended to check parsed `size`/`specifications` intent against the product's actual `sizes`/`specifications` fields — the "Job 2" piece that has never existed for these attributes.

### 4.7 Visual search (CLIP) index

`server/data/clip-embeddings.json` is tied to the current image URLs. Since the static catalog swaps in new local images, this index must be rebuilt once against the new catalog before photo/image search can be trusted again.

---

## 5. Test Automation Architecture

- Android and iOS automation live exclusively in their existing separate folders (`.maestro/android/`, `.maestro/ios/`) — **no shared script with platform conditionals**. This formalizes a pattern already forced on us empirically (iOS needed different keyboard-dismissal handling than Android).
- Within a platform, flows are written to be form-factor-resilient: `testID`-based `tapOn` and `scrollUntilVisible` rather than fixed coordinates or absolute percentages, so a phone-authored flow has a reasonable chance of also working on that platform's tablet (Android tablet / iPad), without a rewrite.
- Actually running the suite on a tablet/iPad emulator profile is noted as a **"nice to have, time permitting"** verification, not a hard gate for this plan — the priority is phone-class Android + iOS working with zero regressions.

---

## 6. Testing & Regression Gates (sequential, no gate skipped)

1. Static catalog built → automated validation confirms every product has colors, and clothing/footwear have sizes.
2. Backend switched to static-only mode → basic regression: app still loads/browses all products normally.
3. Visual-search index rebuilt → photo search still finds matches against new local images.
4. Parser + filter extended → multi-parameter search tests ("brown size XL trousers", "wireless headphones under $50", "waterproof makeup") return correct, relevant results — verified on Android emulator first.
5. Test-image gallery seeded on device → image-search E2E flows pass per category.
6. Full existing regression suite (login → browse → add-to-cart → checkout → orders → voice/photo/text search) re-run on Android. Only once **fully green** does the same full suite run on iOS.

If any gate fails, work stops and the failure is fixed before proceeding — no accumulating debt.

---

## 7. Rollout / Phase Sequence

1. Build the static catalog (selection, image localization, AI-assisted enrichment, validation).
2. Build the test-image gallery for image-search testing.
3. Swap backend to static-only mode (live-fetch code relocated, off by default via `CATALOG_MODE`).
4. Rebuild the visual-search (CLIP) index against new local images.
5. Extend LLM-based parser (primary) + rule-based parser (fallback) for size/specification understanding; extend the filter to use them.
6. Seed emulator/simulator galleries; update Maestro photo-search flows to use gallery-picker instead of live capture.
7. Full regression + new test suites, gate by gate — Android completely green first, then iOS.
8. *(Next plan, immediately after this ships)* — generic per-category 3D placeholder models (Option B from the 3D discussion).
9. *(Backlog, further out)* — SKU-level variant selection in cart/checkout.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Authored attributes are inconsistent or occasionally wrong | Automated validation gate (§4.4 step 5) before file is considered final; spot-check sample |
| Repo grows too large with local images | Target ~180-220 products, compressed web-resolution images, estimate ~60-80MB |
| Removing live-fetch breaks something depending on it | Code relocated not deleted; `CATALOG_MODE=live` re-activates it; regression-tested before cutover |
| CLIP/photo search silently breaks after image swap | Explicit rebuild step + gate before it's considered done |
| iOS regressions surface late (as they did in this project previously) | Android must be **fully** green (all gates) before iOS work begins, per gate-by-gate testing rule |
| Variant-level cart selection scope creep | Explicitly out of scope, documented as backlog item |

---

## 9. Success Criteria

- ✅ `catalog-static.json` contains 180-220 products, each with complete colors/materials/(sizes where applicable)/specifications, validated automatically.
- ✅ "brown size XL trousers", "wireless headphones under $50", "waterproof makeup under $15" all return correct, relevant results via text and voice search.
- ✅ Image-search returns relevant results for gallery-seeded test images across categories.
- ✅ Full existing regression suite passes on Android, then iOS, with zero regressions.
- ✅ Live-fetch capability preserved and re-activatable via `CATALOG_MODE=live`.
- ✅ Android and iOS automation remain in separate, platform-native flow files.

---

## 10. Open Items for Implementation Plan

- Exact category list and per-category product counts (target ~180-220 total).
- Exact specification vocabulary per category (to be enumerated during implementation).
- Whether authored descriptions replace or supplement the original source descriptions (recommend: supplement/polish, keep original facts).
