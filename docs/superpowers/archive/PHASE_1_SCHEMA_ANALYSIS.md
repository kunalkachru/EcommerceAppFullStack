> **SUPERSEDED** by `docs/superpowers/specs/2026-07-09-static-product-catalog-design.md` — this is the analysis that *led* to discovering the live-fetch architecture; its actual schema findings (§ current product schema, missing fields) fed directly into the new spec's §4.2. Kept for historical context only.

# Phase 1: Schema Analysis Report

**Date**: July 9, 2026
**Status**: COMPLETE

---

## Current Architecture

### Data Storage System
- **Type**: JSON file-based (not SQL database)
- **Users/Carts/Orders**: `server/data/store.json` (file-based)
- **Products**: `server/catalog-snapshot.json` (JSON file, 384 products)
- **Product Details**: Loaded via `server/src/catalogService.js`

### Current Product Schema
```json
{
  "id": "dj-1",
  "title": "Essence Mascara Lash Princess",
  "description": "...",
  "category": "beauty",
  "price": 9.99,
  "image": "https://cdn.dummyjson.com/...",
  "rating": 2.56,
  "brand": "Essence",
  "tags": ["beauty", "mascara", ...],
  "source": "dummyjson",
  "categoryLabel": "Beauty",
  "department": "beauty",
  "audience": "unisex",
  "subcategory": "makeup",
  "keywords": [...],
  "colors": [],           // ← EMPTY - needs population
  "materials": [],        // ← EMPTY - needs population
  "slug": "essence-mascara-lash-princess",
  "sku": "SKU-DJ-1",
  "currency": "USD",
  "inventoryCount": 49,
  "availability": "in_stock",
  "priceTier": "entry",
  "imageAlt": "...",
  "images": [...]
}
```

### Missing Fields (Need to Add)
```javascript
// NEW: Size information (for clothing/apparel)
"sizes": []  // e.g., ["XS", "S", "M", "L", "XL"]

// NEW: Specifications/properties
"specifications": {}  // e.g., {"waterproof": true, "wireless": false}

// NEW: Product variants (separate items for size/color combinations)
"variants": []  // See variants schema below
```

### Variants Schema (NEW)
```json
{
  "id": "unique-id",
  "product_id": "dj-45",
  "sku": "SKU-DJ-45-RED-M",
  "title": "Optional variant-specific title",
  "price": 29.99,
  "size": "M",
  "color": "red",
  "material": "cotton",
  "images": ["red-m-1.jpg", "red-m-2.jpg"],
  "inventory": 10,
  "availability": "in_stock"
}
```

### 3D Models Schema (NEW - Optional)
```json
{
  "id": "3d-1",
  "product_id": "dj-45",
  "model_url": "https://cdn.example.com/models/shirt.glb",
  "format": "gltf",
  "thumbnail": "https://cdn.example.com/thumb.jpg"
}
```

---

## Implementation Strategy

### Phase 1 Modifications (NOT traditional migrations)

Instead of SQL migrations, we need to:

1. **Update catalog-snapshot.json**:
   - Add `sizes` field to all products (initialize as empty array)
   - Add `specifications` field to all products (initialize as empty object)
   - Add `variants` field to all products (initialize as empty array)

2. **Create variants data file**:
   - `server/data/variants.json` - Store all product variants
   - Use product_id as key for quick lookup

3. **Create 3D models data file**:
   - `server/data/3d-models.json` - Store all 3D model references

4. **Update catalogService.js**:
   - Load variants data on startup
   - Join variants with products when returning product data
   - Expose variants API endpoints

5. **Update API Endpoints**:
   - `GET /api/products/:id` - Include variants in response
   - `GET /api/products/:id/variants` - New endpoint for variants
   - `GET /api/products/3d/:id` - New endpoint for 3D models

---

## Files to Modify

| File | Change | Type |
|------|--------|------|
| `server/catalog-snapshot.json` | Add sizes, specifications, variants fields | Data |
| `server/data/variants.json` | Create new file with variants data | New Data File |
| `server/data/3d-models.json` | Create new file with 3D models | New Data File |
| `server/src/catalogService.js` | Load variants, join with products | Code Update |
| `server/src/index.js` | Add/update API endpoints | Code Update |
| `src/types/product.ts` | Update TypeScript definitions | Code Update |

---

## Current API Endpoints

### Existing
- `GET /api/products` - Returns all products (no variants)
- `GET /api/products/:id` - Returns single product (no variants)
- `GET /api/search` - Text search (no multi-parameter)

### To Be Added
- `GET /api/products/:id/variants` - Returns variants for product
- `GET /api/products/3d/:id` - Returns 3D models for product
- `POST /api/search` - Advanced multi-parameter search (Phase 4)

---

## Data Statistics

- **Total Products**: 384
- **Products without colors**: 277 (72%)
- **Products without materials**: 339 (88%)
- **Products without sizes**: 384 (100%)
- **Products without specifications**: 384 (100%)
- **Current variants**: 0 (to be created in Phase 3)

---

## Implementation Plan Adjustment

### Phase 1 Tasks (Adjusted)

1. **Task 1.1**: ✅ Schema Analysis (THIS DOCUMENT)
2. **Task 1.2**: Update catalog-snapshot.json structure
3. **Task 1.3**: Create variants.json data file
4. **Task 1.4**: Create 3d-models.json data file
5. **Task 1.5**: Update catalogService.js
6. **Task 1.6**: Update API endpoints & TypeScript types

---

## Next Steps

1. ✅ Schema analysis complete
2. ➡️ Proceed to Task 1.2: Update catalog-snapshot.json
3. ➡️ Create variants.json structure
4. ➡️ Create 3d-models.json structure
5. ➡️ Update backend code to use new structure

---

**Status**: Ready for Task 1.2
