# 3D Product Models — Design

**Date:** 2026-07-11
**Status:** Approved, ready for implementation plan.

## Goal

Add a real, in-app 3D viewer to the product detail screen (PDP), backed by generic
per-category placeholder models (glTF/GLB) — not per-SKU unique assets. This was explicitly
backlogged out of `docs/superpowers/specs/2026-07-09-static-product-catalog-design.md`
("deferred to the very next plan after this one ships") and reconfirmed as backlog in
`docs/superpowers/specs/2026-07-10-default-llm-search-and-multiparam-e2e-design.md`.

By the end of this plan, every one of the catalog's 12 categories has a real, freely-licensed
3D model, and PDP shows a "Photos | 3D" toggle for every product. Nothing is left permanently
scoped down to a subset — the plan runs in two phases (4 categories, then the remaining 8)
specifically so the pipeline gets proven cheaply before repeating the same sourcing/integration
work eight more times, not to cap the feature at 4 categories.

## Background: what was checked before designing anything

- **No 3D or WebView tooling exists in this app today.** `package.json` has no `three`,
  `react-native-webview`, `model-viewer`, `Viro`, `Filament`, or any AR/3D-related dependency.
  This is a from-scratch integration.
- **The current PDP** (`src/screens/ProductDetailScreen.jsx`) shows a hero `<Image>` plus a
  horizontal thumbnail gallery (`activeImage` state, `productImages` array from
  `product.images`). No 3D, no toggle, no WebView anywhere in this screen today.
- **The catalog** (`server/catalog-static.json`) has 196 products across 12 categories:
  automotive (10), bags-accessories (12), beauty-fragrances (16), electronics (25),
  footwear (20), groceries (13), home-kitchen (29), jewelry (7), mens-clothing (20),
  sports-fitness (15), watches (10), womens-clothing (19). Products have no `model3d` field
  today — 3D models are per-*category*, not per-product, so this doesn't need to touch the
  196-product schema at all; a small separate category → model lookup is enough.
- **Static assets are served from a single existing route**: `server/src/index.js:166` —
  `app.use("/assets", express.static(path.join(__dirname, "..", "..", "assets")))` — serving
  the repo-root `assets/` directory (currently only `assets/products/`). New model files and
  the viewer HTML page can live under this same directory with **zero server code changes**.
- **This project has an established, strict "only real, sourced data" precedent** from the
  image-integrity work earlier this session (Stage 0 of the prior plan) — no fabricated
  images were allowed, only real photos from named sources. That precedent extends here:
  3D models must be real, freely-licensed assets, not procedurally-faked placeholders.
- **Maestro cannot inspect WebView-internal content** — it only sees native accessibility
  elements. Whatever is rendered *inside* the WebView (the actual 3D model) is invisible to
  Maestro's selectors unless the page explicitly bridges state back out to native.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Rendering approach | `react-native-webview` + Google's `<model-viewer>` web component, not a native SceneKit/Filament renderer and not a fake pre-rendered image-sequence turntable. No new native modules to link; renders real glTF/GLB directly. |
| Asset sourcing | Real, freely-licensed models from libraries like Sketchfab/Poly Haven — not procedural placeholder shapes, not AI-generated models. Consistent with this project's "no fabricated data" precedent. |
| License preference | Prefer CC0 (no attribution needed); CC-BY allowed if it's the best available model for a category, with attribution surfaced on a small in-app credits screen (not on PDP itself). |
| Category rollout | Two phases in this same plan, not "4 now, rest deferred indefinitely": **Phase 1** (Footwear, Electronics, Watches, Bags-accessories) proves the full pipeline end-to-end; **Phase 2** repeats the same pipeline for the remaining 8 categories (Home-kitchen, Mens-clothing, Womens-clothing, Beauty-fragrances, Sports-fitness, Automotive, Groceries, Jewelry). All 12 categories have a model by the end. |
| AR ("View in your space") | Out of scope for this plan — in-app rotate/zoom/pan viewer only. Tracked as a future backlog item (would need per-model USDZ conversion for iOS Quick Look, camera-permission handling, and AR-specific test considerations). |
| Model hosting | Server-served from `assets/models/<category>/model.glb`, resolved client-side via the existing `getApiBaseUrl()` helper (same pattern `FeaturedProductsStrip.jsx` already uses for image URLs) — not bundled into the app binary. |
| Viewer HTML/JS hosting | Self-hosted at `assets/viewer/product-3d-viewer.html` + a locally-vendored copy of `model-viewer.min.js`, not loaded from a CDN — keeps the viewer working reliably against the local dev server regardless of external network reachability, matching this project's "always know exactly what you're testing against" discipline. |
| Toggle placement | A small "Photos \| 3D" segmented control directly above the existing hero image on PDP. Present only for products whose category has a model; absent (PDP unchanged) for every other category until its model lands in Phase 2. |
| E2E testability of the 3D render itself | A JS bridge: the viewer HTML posts a `window.ReactNativeWebView.postMessage` on the `<model-viewer>` element's own `load`/`error` DOM events; the native `Product3DViewer` component surfaces this as a `testID`-visible status (`loading` / `loaded` / `error`) so Maestro can assert real load success, not just "the WebView didn't crash." |
| Testing platform order | Android first, fully validated, then iOS — matches this project's established "one platform at a time" practice from every prior stage. |

## Architecture

```
ProductDetailScreen.jsx
  ├─ has3DModel = category3DModels[product.category] != null
  ├─ viewMode state: "2d" | "3d" (default "2d")
  ├─ if has3DModel: render "Photos | 3D" segmented toggle
  └─ hero area:
       viewMode === "2d"  → existing gallery (unchanged)
       viewMode === "3d"  → <Product3DViewer category={product.category} />

Product3DViewer.jsx
  ├─ resolves model URL: getApiBaseUrl() + "/assets/models/<category>/model.glb"
  ├─ builds viewer page URL: getApiBaseUrl() + "/assets/viewer/product-3d-viewer.html?model=<encoded-url>"
  ├─ renders <WebView source={{ uri: viewerPageUrl }} onMessage={...} />
  ├─ status state: "loading" | "loaded" | "error", exposed via testID="product-3d-status"
  │    (accessibilityValue reflects current status so Maestro can assert on it)
  └─ on "error": shows "3D view unavailable" + Retry button (remounts the WebView)

assets/viewer/product-3d-viewer.html  (static, server-served)
  ├─ loads locally-vendored model-viewer.min.js
  ├─ reads ?model= query param, sets <model-viewer src="...">
  └─ inline script listens for the model-viewer element's "load"/"error" events,
     calls window.ReactNativeWebView.postMessage(JSON.stringify({ type: "loaded" | "error" }))

assets/models/<category>/model.glb  (one real, licensed model per category, server-served)

src/config/category3DModels.js  (static client-side lookup, category slug -> relative model path)
```

**Data flow:** toggle tap → `viewMode` flips → `Product3DViewer` mounts → WebView loads the
viewer HTML with the resolved model URL → `<model-viewer>` fires its own `load`/`error` →
inline script bridges that to React Native via `postMessage` → `onMessage` handler updates
`status` state → `product-3d-status` testID's value changes → Maestro (or the user, visually)
observes the model rendered and interactive (native pinch/pan/rotate gestures, handled
entirely by `<model-viewer>` itself, no custom gesture code needed).

## Error handling

If the model fails to load (bad URL, network issue, unsupported/corrupt file), the bridge
posts `{ type: "error" }`; `Product3DViewer` shows an inline "3D view unavailable" message
with a "Retry" button that remounts the WebView. The toggle defaults to "Photos" on every
PDP visit, so a broken or slow-loading model never blocks a shopper from seeing the product —
3D is additive, never load-bearing for the core shopping flow.

## Component & file changes

**New:**
- `assets/viewer/product-3d-viewer.html` — static viewer page.
- `assets/viewer/model-viewer.min.js` — vendored copy of Google's `<model-viewer>` library.
- `assets/models/<category>/model.glb` — one per category with a model (4 after Phase 1, 12
  after Phase 2).
- `src/config/category3DModels.js` — category slug → relative model path lookup.
- `src/components/Product3DViewer.jsx` — WebView wrapper, bridge handling, status testID,
  error/retry UI.
- `src/screens/CreditsScreen.jsx` — lists each CC-BY model's author/license/source link;
  reachable from `ProfileScreen.jsx`. Only needed if any sourced model ends up CC-BY rather
  than CC0 — built regardless so it's ready either way.
- `.maestro/android/product-3d-viewer.yaml` / `.maestro/ios/product-3d-viewer.yaml` — one
  flow per platform, parameterized by category the same way `photo-search.yaml` is
  parameterized by sample.

**Modified:**
- `src/screens/ProductDetailScreen.jsx` — category-gated toggle, `viewMode` state, hero-area
  conditional render.
- `src/screens/ProfileScreen.jsx` — one new nav entry to the credits screen, only rendered
  if any credited models exist.

## Testing strategy

- **Jest** (no WebView rendering needed — pure logic):
  - `Product3DViewer`'s `onMessage` parsing and `loading`/`loaded`/`error` state transitions.
  - `ProductDetailScreen`'s category-gated toggle-visibility logic (present for categories
    with a model, absent for those without).
- **Maestro, Android then iOS** (matching this project's established sequential-platform
  gate):
  - One flow per category-with-a-model: navigate to that category's PDP, assert the toggle
    is visible, tap "3D", assert `product-3d-status` reaches `loaded` within a timeout.
  - One flow for a category *without* a model (only needed once per platform, not per
    category): assert the toggle is absent, PDP otherwise unchanged.
  - Full existing regression suite (`login.yaml` x3, `photo-search.yaml`, unset
    `ml-features-comprehensive.yaml`, `complete-e2e-clean.yaml`, `npm test`) re-run green at
    the end of each phase, per this project's standing discipline.

## Backlog (recovered/carried forward, not part of this plan)

- **AR "View in your space"** — deferred here; would need per-model USDZ conversion (iOS
  Quick Look requires USDZ, not glTF/GLB) plus camera-permission handling and AR-specific
  E2E test design.
- **SKU-level variant selection in cart/checkout** — unrelated, already backlogged from the
  original static-catalog spec; not touched by this plan.
- **Orphaned `golden-image-fixtures.json`** — the one known pre-existing Jest failure carved
  out of every prior plan's exit criteria; still not fixed here, unrelated to 3D models.

## Out of scope

- Per-SKU unique 3D models (e.g. a different model for every one of the 20 footwear
  products) — explicitly generic, per-category placeholders only, as originally backlogged.
- AR/camera-based placement (see Backlog above).
- Any change to the 196-product catalog schema — 3D models are looked up by category via a
  small static client-side config, not stored per-product.
