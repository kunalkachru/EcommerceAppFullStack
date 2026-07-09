> **SUPERSEDED** by `docs/superpowers/specs/2026-07-09-static-product-catalog-design.md` — written before we discovered the catalog is live-fetched/re-normalized hourly, not static JSON. Kept for historical context only.

# Implementation Plan: Multi-Parameter Search & Product Catalog Enhancement
**Timeline**: 2-3 weeks | **Platforms**: Android & iOS (simultaneous)

---

## Goals

1. ✅ Enable realistic multi-parameter searches (e.g., "trousers size XL brown color")
2. ✅ Enrich product catalog with complete attributes (colors, sizes, materials, specs)
3. ✅ Implement product variants for multi-option items
4. ✅ Add 3D product image support
5. ✅ Verify all features work on both Android and iOS

---

## Phase 1: Product Data Schema Enhancement (Week 1)

### Task 1.1: Extend Product Schema
**Files to Modify**:
- `src/types/product.ts` (or `.js` if TypeScript not used)
- `server/src/models/product.js`
- Database migration files

**Changes Required**:
```typescript
// Add these fields to product schema:
interface Product {
  // ... existing fields ...
  
  // NEW: Product attributes
  colors: string[];           // ["red", "blue", "green"]
  materials: string[];        // ["cotton", "polyester"]
  sizes: string[];           // ["XS", "S", "M", "L", "XL"]
  
  // NEW: Product specifications/properties
  specifications: {
    [key: string]: string | number | boolean;
    // Examples:
    // "waterproof": true
    // "wireless": true
    // "bluetooth": true
    // "batteryLife": "10 hours"
    // "longLasting": true
  };
  
  // NEW: Product variants (for same product, different options)
  variants: ProductVariant[];
}

interface ProductVariant {
  sku: string;               // "shirt-001-red-m"
  title?: string;            // Optional variant-specific title
  price: number;
  size?: string;             // "M", "L", "XL"
  color?: string;            // "red", "blue"
  material?: string;         // "cotton", "polyester"
  images?: string[];         // Variant-specific images
  inventory: number;
}

// NEW: 3D Image support
interface Product3D {
  id: string;
  title: string;
  modelUrl: string;         // glTF, OBJ, or USDZ format
  format: "gltf" | "obj" | "usdz";
  thumbnail: string;
}
```

**Acceptance Criteria**:
- [ ] Schema updated in TypeScript/database models
- [ ] Migrations created for new fields
- [ ] Backwards compatible with existing products

---

### Task 1.2: Create Database Migrations
**Files to Create**:
- `server/migrations/001-add-product-attributes.js`
- `server/migrations/002-add-product-variants.js`
- `server/migrations/003-add-3d-models.js`

**Migration Content**:
```sql
-- Migration 1: Add new fields to products table
ALTER TABLE products ADD COLUMN colors JSON DEFAULT '[]';
ALTER TABLE products ADD COLUMN materials JSON DEFAULT '[]';
ALTER TABLE products ADD COLUMN sizes JSON DEFAULT '[]';
ALTER TABLE products ADD COLUMN specifications JSON DEFAULT '{}';

-- Migration 2: Create variants table
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  sku VARCHAR UNIQUE NOT NULL,
  price DECIMAL(10,2),
  size VARCHAR,
  color VARCHAR,
  material VARCHAR,
  images JSON,
  inventory INT DEFAULT 0,
  created_at TIMESTAMP
);

-- Migration 3: Create 3d_models table
CREATE TABLE product_3d_models (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  model_url VARCHAR NOT NULL,
  format VARCHAR(10),
  thumbnail VARCHAR,
  created_at TIMESTAMP
);
```

**Acceptance Criteria**:
- [ ] Migrations run without errors
- [ ] New tables created successfully
- [ ] Existing data preserved

---

## Phase 2: Product Data Enrichment (Week 1-2)

### Task 2.1: Enrich Colors for All Products
**Process**:
1. Identify which products should have colors (clothing, makeup, etc.)
2. Extract color keywords from product tags/description
3. Map to standardized color names

**Files to Modify**:
- `server/data/catalog-snapshot.json`
- `src/data/catalog-fallback.json`

**Example Data Enrichment**:
```json
{
  "id": "dj-45",
  "title": "Classic Polo Shirt",
  "description": "Available in blue, red, and white...",
  "colors": ["blue", "red", "white"],  // ENRICHED
  "category": "clothing",
  // ... other fields ...
}
```

**Script to Create** (`server/scripts/enrich-colors.js`):
```javascript
// Reads catalog, extracts color keywords from description/tags
// Updates colors array for each product
// Validates against standard color palette
// Exports enriched catalog
```

**Acceptance Criteria**:
- [ ] 277 products with empty colors array updated
- [ ] Realistic colors assigned (not random)
- [ ] Data validation: no duplicates, proper format
- [ ] Export updated catalog

---

### Task 2.2: Enrich Materials for All Products
**Process**:
1. Identify which products have materials (clothing, furniture, etc.)
2. Extract material keywords from product tags/description
3. Map to standardized material names

**Files to Modify**:
- `server/data/catalog-snapshot.json`
- `src/data/catalog-fallback.json`

**Example Data Enrichment**:
```json
{
  "id": "dj-45",
  "title": "Cotton Blend Shirt",
  "description": "Made from cotton and polyester blend...",
  "materials": ["cotton", "polyester"],  // ENRICHED
  // ... other fields ...
}
```

**Standard Material List**:
```
Clothing/Textiles: cotton, polyester, silk, wool, linen, nylon, spandex, rayon, blend
Furniture: leather, fabric, wood, metal, glass, plastic
Electronics: aluminum, stainless steel, plastic, glass
```

**Acceptance Criteria**:
- [ ] 339 products with empty materials updated
- [ ] Realistic materials assigned
- [ ] Data validation: standard materials only
- [ ] Export updated catalog

---

### Task 2.3: Add Sizes for Clothing Products
**Process**:
1. Identify clothing/apparel products (shoes, shirts, pants, dresses, etc.)
2. Assign appropriate size ranges based on product type
3. Create size matrix for variants

**Files to Modify**:
- `server/data/catalog-snapshot.json`
- Size configuration file

**Size Mappings**:
```javascript
const sizesByCategory = {
  "clothing/shirts": ["XS", "S", "M", "L", "XL", "XXL"],
  "clothing/pants": ["28", "30", "32", "34", "36", "38"],
  "clothing/dresses": ["XS", "S", "M", "L", "XL"],
  "shoes": ["5", "6", "7", "8", "9", "10", "11", "12", "13"],
  "accessories": ["one-size"],
}
```

**Example Data Enrichment**:
```json
{
  "id": "dj-156",
  "title": "Classic Jeans",
  "subcategory": "pants",
  "sizes": ["28", "30", "32", "34", "36", "38"],  // ENRICHED
  // ... other fields ...
}
```

**Acceptance Criteria**:
- [ ] 50+ clothing products have sizes field
- [ ] Appropriate sizes for each product type
- [ ] Size ranges are realistic
- [ ] Export updated catalog

---

### Task 2.4: Add Specifications for Products
**Process**:
1. Identify products with special properties
2. Extract specifications from descriptions
3. Map to standardized specification fields

**Specification Examples**:
```javascript
{
  "makeup": {
    "waterproof": boolean,
    "longLasting": boolean,
    "hypoallergenic": boolean,
    "crueltyfree": boolean
  },
  "electronics": {
    "wireless": boolean,
    "bluetooth": boolean,
    "batteryLife": string,
    "waterproof": boolean,
    "noiseIsolation": boolean
  },
  "clothing": {
    "stretchable": boolean,
    "waterproof": boolean,
    "insulated": boolean,
    "wrinkleResistant": boolean
  }
}
```

**Example Data Enrichment**:
```json
{
  "id": "dj-1",
  "title": "Essence Mascara Lash Princess",
  "description": "...long-lasting and cruelty-free formula",
  "specifications": {  // ENRICHED
    "waterproof": false,
    "longLasting": true,
    "hypoallergenic": false,
    "crueltyfree": true
  },
  // ... other fields ...
}
```

**Script to Create** (`server/scripts/enrich-specifications.js`):
```javascript
// Parse descriptions for keywords
// Map to specification fields
// Assign boolean/string values
// Validate against schema
// Export enriched catalog
```

**Acceptance Criteria**:
- [ ] 100+ products have specifications
- [ ] Specifications match product type
- [ ] Data types correct (boolean/string)
- [ ] Export updated catalog

---

## Phase 3: Product Variants Implementation (Week 2)

### Task 3.1: Create Variant Database Schema
**Files to Modify**:
- Database schema for variants table

**Schema**:
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  sku VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  size VARCHAR(50),
  color VARCHAR(100),
  material VARCHAR(100),
  images TEXT[],
  inventory_count INT DEFAULT 0,
  availability VARCHAR(50) DEFAULT 'in_stock',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_color_size ON product_variants(color, size);
```

**Acceptance Criteria**:
- [ ] Table created successfully
- [ ] Indexes created for performance
- [ ] Can insert test variants

---

### Task 3.2: Migrate Products with Multiple Variants
**Process**:
1. Identify products that should have variants (multi-color shirts, etc.)
2. Create variant records for each combination
3. Update product references to variants

**Example Migration**:
```javascript
// Before: Single product with multiple attributes
{
  id: "shirt-001",
  title: "Cotton Shirt",
  colors: ["red", "blue", "green"],
  sizes: ["S", "M", "L", "XL"],
  price: 29.99,
  images: ["img1.jpg", "img2.jpg"]
}

// After: Product with variants
{
  id: "shirt-001",
  title: "Cotton Shirt",
  description: "Available in multiple colors and sizes",
  basePrice: 29.99,
  variants: [
    {
      sku: "SHIRT-001-RED-S",
      color: "red",
      size: "S",
      price: 29.99,
      inventory: 10,
      images: ["red-s-1.jpg"]
    },
    {
      sku: "SHIRT-001-RED-M",
      color: "red",
      size: "M",
      price: 29.99,
      inventory: 15,
      images: ["red-m-1.jpg"]
    },
    // ... more variants
  ]
}
```

**Script to Create** (`server/scripts/create-variants.js`):
```javascript
// For each product with colors + sizes
// Create variant for each combination
// Generate unique SKU
// Distribute inventory
// Assign variant-specific images if available
```

**Acceptance Criteria**:
- [ ] 50+ products have variant records created
- [ ] Each variant has unique SKU
- [ ] Inventory distributed realistically
- [ ] Product-variant relationships correct

---

## Phase 4: Search Backend Enhancement (Week 2-3)

### Task 4.1: Update Search Query Parser
**Files to Modify**:
- `src/services/catalogSearchService.js`
- Create `src/services/queryParser.js`

**Current Search Flow**:
```javascript
searchQuery("trousers size XL brown")
→ Simple keyword match on title/tags
→ Returns all trousers
→ No filtering by size/color
```

**New Search Flow**:
```javascript
searchQuery("trousers size XL brown")
→ NLP Parser (extract structured attributes)
→ Parse into:
   {
     category: "trousers",
     size: "XL",
     color: "brown",
     priceMax: null
   }
→ Structured filtering on variants + attributes
→ Return only matching products
```

**Implementation**:
```javascript
// src/services/queryParser.js

function parseSearchQuery(query) {
  // Extract size patterns: "size XL", "XL", "medium", "m"
  const sizeMatch = query.match(/\b(XS|S|M|L|XL|XXL|\d{1,2})\b/i);
  
  // Extract color patterns: "red", "blue", "brown"
  const colorMatch = query.match(/\b(red|blue|green|brown|black|white|yellow|pink|purple|orange|gray|grey)\b/i);
  
  // Extract price patterns: "under 50", "under $50", "$ 50"
  const priceMatch = query.match(/(?:under|below|less than)\s*[\$]?(\d+)/i);
  
  // Extract category/product type
  const categoryKeywords = {
    "trousers|pants|jeans": "pants",
    "shirt|tshirt|t-shirt": "shirt",
    "dress": "dress",
    "shoes|shoe": "shoes",
    "headphones|headphone": "headphones",
    "makeup": "makeup",
    // ... more
  };
  
  let category = null;
  for (const [pattern, cat] of Object.entries(categoryKeywords)) {
    if (new RegExp(pattern, 'i').test(query)) {
      category = cat;
      break;
    }
  }
  
  // Extract specifications
  const specifications = extractSpecifications(query);
  
  return {
    query: query.trim(),
    category,
    size: sizeMatch ? sizeMatch[1].toUpperCase() : null,
    color: colorMatch ? colorMatch[1].toLowerCase() : null,
    priceMax: priceMatch ? parseFloat(priceMatch[1]) : null,
    specifications,
    keywords: extractKeywords(query)
  };
}

function extractSpecifications(query) {
  const specs = {};
  
  // Common specifications
  if (/\bwaterproof\b/i.test(query)) specs.waterproof = true;
  if (/\bwireless\b/i.test(query)) specs.wireless = true;
  if (/\bbluetooth\b/i.test(query)) specs.bluetooth = true;
  if (/\blong.lasting|longlasting\b/i.test(query)) specs.longLasting = true;
  if (/\bstretch/i.test(query)) specs.stretchable = true;
  
  return Object.keys(specs).length > 0 ? specs : null;
}
```

**Acceptance Criteria**:
- [ ] Parser correctly extracts size from "size XL"
- [ ] Parser correctly extracts color from "brown"
- [ ] Parser correctly extracts price from "under 50"
- [ ] Parser correctly identifies category from keywords
- [ ] Parser extracts specifications from text
- [ ] Test cases pass for all query types

---

### Task 4.2: Implement Multi-Parameter Filtering
**Files to Modify**:
- `src/services/catalogSearchService.js`
- Create `src/services/filterEngine.js`

**Current Filtering**:
```javascript
function search(query) {
  return products.filter(p => 
    p.title.includes(query) || 
    p.tags.some(t => t.includes(query))
  );
}
```

**New Filtering**:
```javascript
// src/services/filterEngine.js

function filterProducts(parsedQuery) {
  let results = products;
  
  // 1. Filter by category
  if (parsedQuery.category) {
    results = results.filter(p => 
      p.subcategory === parsedQuery.category ||
      p.category.includes(parsedQuery.category)
    );
  }
  
  // 2. Filter by size (search variants table)
  if (parsedQuery.size) {
    results = results.filter(p => {
      if (p.sizes && p.sizes.includes(parsedQuery.size)) {
        return true; // Product has this size
      }
      if (p.variants) {
        return p.variants.some(v => v.size === parsedQuery.size);
      }
      return false;
    });
  }
  
  // 3. Filter by color (search variants table)
  if (parsedQuery.color) {
    results = results.filter(p => {
      if (p.colors && p.colors.some(c => c.toLowerCase() === parsedQuery.color)) {
        return true;
      }
      if (p.variants) {
        return p.variants.some(v => v.color?.toLowerCase() === parsedQuery.color);
      }
      return false;
    });
  }
  
  // 4. Filter by price
  if (parsedQuery.priceMax) {
    results = results.filter(p => {
      if (p.variants && p.variants.length > 0) {
        return p.variants.some(v => v.price <= parsedQuery.priceMax);
      }
      return p.price <= parsedQuery.priceMax;
    });
  }
  
  // 5. Filter by specifications
  if (parsedQuery.specifications) {
    results = results.filter(p => {
      if (!p.specifications) return false;
      return Object.entries(parsedQuery.specifications).every(
        ([key, value]) => p.specifications[key] === value
      );
    });
  }
  
  // 6. Filter by keywords (fallback)
  if (parsedQuery.keywords && parsedQuery.keywords.length > 0) {
    results = results.filter(p =>
      parsedQuery.keywords.some(kw =>
        p.title.toLowerCase().includes(kw.toLowerCase()) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(kw.toLowerCase())))
      )
    );
  }
  
  return results;
}
```

**Acceptance Criteria**:
- [ ] Filters work independently
- [ ] Filters work in combination
- [ ] Variants are searched correctly
- [ ] Results are ranked by relevance
- [ ] Performance acceptable (< 200ms for 400 products)

---

### Task 4.3: Integration & API Updates
**Files to Modify**:
- `server/src/routes/search.js`
- `src/api/searchApi.js`

**API Endpoint Update**:
```javascript
// GET /api/search?q=trousers%20size%20XL%20brown
// Response includes parsed query + filtered results
{
  "query": "trousers size XL brown",
  "parsed": {
    "category": "pants",
    "size": "XL",
    "color": "brown",
    "priceMax": null,
    "specifications": null
  },
  "results": [
    {
      "id": "pants-001",
      "title": "Classic Jeans XL Brown",
      "price": 59.99,
      "colors": ["brown", "black"],
      "sizes": ["M", "L", "XL"],
      "matchingVariants": [
        {
          "sku": "PANTS-001-BROWN-XL",
          "price": 59.99,
          "inventory": 5
        }
      ]
    },
    // ... more results
  ],
  "totalResults": 3,
  "executionTime": 45
}
```

**Acceptance Criteria**:
- [ ] API returns parsed query structure
- [ ] API returns filtered results
- [ ] Variants included in response
- [ ] Performance metrics included

---

## Phase 5: Frontend/UI Updates (Week 3)

### Task 5.1: Update Product Detail View
**Files to Modify**:
- `src/screens/ProductDetailScreen.jsx`
- `src/components/ProductVariantSelector.jsx` (NEW)
- `src/components/SpecificationsList.jsx` (NEW)

**UI Components to Add**:
1. **Variant Selector** (for size/color selection)
   - Show available size options
   - Show available color options
   - Update price based on selection
   - Show variant-specific inventory

2. **Specifications Display**
   - List all product specifications
   - Show icons for common specs (waterproof, wireless, etc.)

3. **3D Model Viewer** (if available)
   - Toggle between 2D/3D view
   - 3D model controls (rotate, zoom)

**Example Component**:
```jsx
<ProductVariantSelector
  variants={product.variants}
  onSelect={(variant) => {
    setSelectedVariant(variant);
    setPrice(variant.price);
  }}
/>

<SpecificationsList 
  specifications={product.specifications}
/>
```

**Acceptance Criteria**:
- [ ] Size selector appears for sizeable products
- [ ] Color selector appears for products with colors
- [ ] Price updates when variant selected
- [ ] Inventory shown for selected variant
- [ ] Specifications displayed clearly

---

### Task 5.2: Update Search Results View
**Files to Modify**:
- `src/screens/SearchResultsScreen.jsx`
- `src/components/SearchResultCard.jsx`

**Enhancements**:
- Show which variant matched the search
- Display key attributes (size, color, price)
- Highlight matching attributes
- Show specification badges

**Example Result Card**:
```
[Image]
Classic Jeans XL Brown
$59.99
⭐ 4.2 (125 reviews)

Matched: Size XL, Brown Color, Under $75
🏷️ Durable  🌧️ Water-resistant
```

**Acceptance Criteria**:
- [ ] Search results show matched attributes
- [ ] Variant SKU/inventory shown
- [ ] Specifications shown as badges
- [ ] Results sorted by relevance

---

## Phase 6: Cross-Platform Testing (Week 3)

### Task 6.1: Update Test Cases
**Files to Update**:
- `.maestro/android/ml-multiparameter-search.yaml`
- `.maestro/ios/ml-multiparameter-search.yaml`

**Test Cases**:
1. ✅ "trousers size XL brown" → Returns brown XL trousers
2. ✅ "wireless headphones under 50" → Returns wireless headphones < $50
3. ✅ "waterproof makeup under 15" → Returns waterproof makeup < $15
4. ✅ "shirt red medium cotton" → Returns red medium cotton shirts
5. ✅ "blue jeans 32 waist" → Returns blue size 32 jeans
6. ✅ "long-lasting lipstick red" → Returns red long-lasting lipstick

**Test Script Example**:
```yaml
- inputText: "trousers size XL brown"
- pressKey: back
- extendedWaitUntil:
    visible: "brown"
    timeout: 5000
- extendedWaitUntil:
    visible: "XL"
    timeout: 5000
- extendedWaitUntil:
    visible: "$"
    timeout: 5000
# Verify results are actually brown trousers in size XL
```

**Acceptance Criteria**:
- [ ] All test cases pass on Android
- [ ] All test cases pass on iOS
- [ ] Results match query parameters
- [ ] No crashes or errors
- [ ] Performance acceptable

---

### Task 6.2: Regression Testing
**Test Coverage**:
- ✅ Basic search still works
- ✅ Single-parameter search (price only)
- ✅ Category browsing unchanged
- ✅ Login/authentication unaffected
- ✅ Add to cart functionality works
- ✅ Checkout processes correctly

**Acceptance Criteria**:
- [ ] No regressions in existing features
- [ ] All previous tests still pass
- [ ] Performance metrics maintained

---

## Phase 7: 3D Image Support (Optional, Week 4+)

### Task 7.1: Add 3D Model URLs to Catalog
**Files**:
- `server/data/3d-models.json`
- `src/data/3d-models-fallback.json`

**Format**:
```json
{
  "productId": "dj-45",
  "models": [
    {
      "format": "gltf",
      "url": "https://cdn.example.com/models/shirt-red.glb",
      "thumbnail": "https://cdn.example.com/thumbnails/shirt-red.jpg"
    }
  ]
}
```

### Task 7.2: Implement 3D Viewer Component
**Files to Create**:
- `src/components/ThreeDViewer.jsx`
- Use `react-three-fiber` or similar library

**Features**:
- Load glTF/OBJ models
- Rotate, zoom, pan controls
- Toggle 2D/3D view
- Mobile-optimized

---

## Success Criteria (All Phases)

✅ **Multi-Parameter Search**:
- [ ] "trousers size XL brown" returns only brown size XL trousers
- [ ] "wireless headphones under 50" returns wireless headphones < $50
- [ ] "waterproof makeup under 15" returns waterproof makeup < $15
- [ ] No app crashes with complex queries
- [ ] Results ranked by relevance

✅ **Product Catalog**:
- [ ] All products have populated colors
- [ ] All products have populated materials
- [ ] Clothing products have sizes
- [ ] 100+ products have specifications
- [ ] 50+ products have variants created

✅ **Cross-Platform**:
- [ ] Android: All tests pass ✓
- [ ] iOS: All tests pass ✓
- [ ] No platform-specific issues
- [ ] Performance acceptable on both

✅ **UI/UX**:
- [ ] Variant selection works smoothly
- [ ] Specifications clearly displayed
- [ ] Search results show matched attributes
- [ ] No regression in existing features

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data enrichment incomplete | Medium | High | Create validation scripts, weekly audits |
| Search performance degrades | Low | High | Index variants table, cache results |
| Variants cause DB issues | Low | Medium | Proper indexing, load testing |
| iOS compatibility issues | Low | Medium | Test on real device early |
| Breaking changes to API | Medium | High | Version API endpoint, backwards compat |

---

## Resource Requirements

- **Backend Developer**: 40-50 hours (Data enrichment, search, variants)
- **Frontend Developer**: 30-40 hours (UI, 3D viewer)
- **QA/Testing**: 20-30 hours (Test cases, cross-platform verification)
- **Data Analyst**: 10-15 hours (Catalog enrichment, validation)

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Schema | 3 days | Week 1 Day 1 | Week 1 Day 3 |
| Phase 2: Data Enrichment | 6 days | Week 1 Day 4 | Week 2 Day 2 |
| Phase 3: Variants | 3 days | Week 2 Day 3 | Week 2 Day 5 |
| Phase 4: Search Backend | 5 days | Week 2 Day 6 | Week 3 Day 3 |
| Phase 5: Frontend/UI | 3 days | Week 3 Day 4 | Week 3 Day 6 |
| Phase 6: Testing | 3 days | Week 3 Day 7 | Week 4 Day 2 |
| Phase 7: 3D (Optional) | 5 days | Week 4 Day 3 | Week 4 Day 7 |

**Total**: 2-3 weeks (core features)

---

## Next Steps

1. **Immediate**: Review and approve this implementation plan
2. **Day 1**: Create database migrations and schema updates
3. **Day 2-3**: Begin data enrichment scripts
4. **Day 4**: Start variant implementation
5. **Day 5**: Parallel: Backend search + Frontend UI work
6. **Day 10**: Integration testing
7. **Day 14-15**: Cross-platform validation (Android + iOS)

---

**Document Created**: July 9, 2026
**Status**: Ready for Implementation
**Approved By**: [Pending User Approval]
**Target Completion**: July 22-25, 2026
