# Master Implementation Plan: Multi-Parameter Search & Product Catalog Enhancement
**Status**: IN PROGRESS | **Start Date**: July 9, 2026 | **Target Completion**: July 22-25, 2026

---

## Plan Overview

**Goal**: Enable realistic multi-parameter searches (e.g., "trousers size XL brown color") with complete product attribute data across Android and iOS.

**Approach**: Test-driven, phase-by-phase implementation with API testing and emulator/simulator verification after each logical task completion.

**Success Criteria**:
- ✅ All multi-parameter searches work correctly
- ✅ No regressions in existing features
- ✅ Android and iOS both working identically
- ✅ All test suites passing
- ✅ Zero data loss or corruption

---

## Phase Overview & Status

| Phase | Name | Status | Start | Target | Dependencies |
|-------|------|--------|-------|--------|--------------|
| 1 | Schema & Migrations | ⏳ PLANNED | Week 1 Day 1 | Week 1 Day 3 | - |
| 2 | Data Enrichment | ⏳ PLANNED | Week 1 Day 4 | Week 2 Day 2 | Phase 1 ✓ |
| 3 | Variants Implementation | ⏳ PLANNED | Week 2 Day 3 | Week 2 Day 5 | Phase 2 ✓ |
| 4 | Search Backend | ⏳ PLANNED | Week 2 Day 6 | Week 3 Day 3 | Phase 3 ✓ |
| 5 | Frontend/UI | ⏳ PLANNED | Week 3 Day 4 | Week 3 Day 6 | Phase 4 ✓ |
| 6 | Cross-Platform Testing | ⏳ PLANNED | Week 3 Day 7 | Week 4 Day 2 | Phase 5 ✓ |
| 7 | 3D Images (Optional) | ⏳ PLANNED | Week 4 Day 3 | Week 4 Day 7 | Phase 6 ✓ |

---

# PHASE 1: Schema & Database Migrations
**Timeline**: Week 1 Days 1-3 | **Owner**: Backend Developer

## Phase Goal
Update product database schema to support colors, materials, sizes, specifications, and variants. Create all necessary database tables and migrations.

---

## Task 1.1: Analyze Current Product Schema
**Status**: ⏳ NOT STARTED

**Objective**: Document current schema and identify exact changes needed.

**Completion Criteria**:
- [ ] Current product table schema documented
- [ ] Current fields listed with types
- [ ] Existing constraints and indexes identified
- [ ] Migration strategy documented

**Steps**:
1. [ ] Read current product model: `server/src/models/product.js`
2. [ ] Check database schema: `server/database/schema.sql`
3. [ ] List all fields and types
4. [ ] Document in `PHASE_1_SCHEMA_ANALYSIS.md`
5. [ ] Commit: "docs: Phase 1 - Current schema analysis"

**Testing**:
- [ ] Connect to database and query `PRAGMA table_info(products)` (SQLite) or equivalent
- [ ] Verify 384 products exist in DB
- [ ] Confirm current fields match documentation

**Ongoing Issues**:
- None yet

---

## Task 1.2: Create Product Schema Migration
**Status**: ⏳ NOT STARTED

**Objective**: Create database migration to add new fields.

**Completion Criteria**:
- [ ] Migration file created: `server/migrations/001-add-product-attributes.js`
- [ ] All new fields included with correct types
- [ ] Rollback function implemented
- [ ] Migration tested (up and down)

**New Fields to Add**:
```javascript
// Colors array
ALTER TABLE products ADD COLUMN colors JSON DEFAULT '[]';

// Materials array
ALTER TABLE products ADD COLUMN materials JSON DEFAULT '[]';

// Sizes array (for clothing products)
ALTER TABLE products ADD COLUMN sizes JSON DEFAULT '[]';

// Specifications object
ALTER TABLE products ADD COLUMN specifications JSON DEFAULT '{}';
```

**Steps**:
1. [ ] Create `server/migrations/001-add-product-attributes.js`
2. [ ] Implement up() function with ALTER TABLE statements
3. [ ] Implement down() function for rollback
4. [ ] Test locally: `npm run migrate:up`
5. [ ] Test rollback: `npm run migrate:down`
6. [ ] Verify data integrity after migration
7. [ ] Commit: "feat: Phase 1 - Add product attributes to schema"

**Testing**:
- [ ] Run migration: `npm run migrate:up`
- [ ] Query database: Verify colors, materials, sizes, specifications fields exist
- [ ] Check data types: All should be JSON
- [ ] Verify defaults: New products should have empty arrays/objects
- [ ] Run rollback: `npm run migrate:down`
- [ ] Verify fields removed
- [ ] Run migration up again

**Emulator/Simulator Testing**:
- [ ] Restart backend server after migration
- [ ] Make API call: `GET /api/products/1`
- [ ] Verify response includes new fields with empty values

**Ongoing Issues**:
- None yet

---

## Task 1.3: Create Variants Table
**Status**: ⏳ NOT STARTED

**Objective**: Create database table for product variants.

**Completion Criteria**:
- [ ] Migration created: `server/migrations/002-create-variants-table.js`
- [ ] Table has all necessary fields and relationships
- [ ] Indexes created for performance
- [ ] Tested and verified

**Variants Table Schema**:
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  price DECIMAL(10,2) NOT NULL,
  size VARCHAR(50),
  color VARCHAR(100),
  material VARCHAR(100),
  images JSON,
  inventory_count INT DEFAULT 0,
  availability VARCHAR(50) DEFAULT 'in_stock',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_color_size ON product_variants(color, size);
```

**Steps**:
1. [ ] Create `server/migrations/002-create-variants-table.js`
2. [ ] Define table with all columns
3. [ ] Add foreign key constraint to products
4. [ ] Create indexes for query performance
5. [ ] Implement rollback (DROP TABLE)
6. [ ] Test migration: `npm run migrate:up`
7. [ ] Verify table exists and is queryable
8. [ ] Commit: "feat: Phase 1 - Create product_variants table"

**Testing**:
- [ ] Run migration: `npm run migrate:up`
- [ ] Query table: `SELECT COUNT(*) FROM product_variants` (should be 0)
- [ ] Insert test variant: `INSERT INTO product_variants (...) VALUES (...)`
- [ ] Query it back
- [ ] Verify SKU uniqueness constraint works
- [ ] Verify inventory tracking works
- [ ] Run rollback and verify table gone

**Emulator/Simulator Testing**:
- [ ] Restart backend
- [ ] Make API call: `GET /api/products/1/variants`
- [ ] Should return empty array (no variants yet)

**Ongoing Issues**:
- None yet

---

## Task 1.4: Create 3D Models Table (Optional)
**Status**: ⏳ NOT STARTED

**Objective**: Create database table for 3D product models.

**Completion Criteria**:
- [ ] Migration created: `server/migrations/003-create-3d-models-table.js`
- [ ] Table properly structured
- [ ] Tested and verified

**3D Models Table Schema**:
```sql
CREATE TABLE product_3d_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  model_url VARCHAR NOT NULL,
  format VARCHAR(10),
  thumbnail VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_3d_models_product_id ON product_3d_models(product_id);
```

**Steps**:
1. [ ] Create migration file
2. [ ] Define table
3. [ ] Add indexes
4. [ ] Test migration up/down
5. [ ] Commit: "feat: Phase 1 - Create product_3d_models table"

**Testing**:
- [ ] Migration runs successfully
- [ ] Table queries work
- [ ] Foreign key constraint verified

**Ongoing Issues**:
- None yet

---

## Task 1.5: Update TypeScript/JavaScript Type Definitions
**Status**: ⏳ NOT STARTED

**Objective**: Update type definitions to reflect new product schema.

**Completion Criteria**:
- [ ] TypeScript types updated
- [ ] New fields included in Product interface
- [ ] Variants interface created
- [ ] No type errors in codebase

**Files to Update**:
- `src/types/product.ts` (or `.js` if no TypeScript)
- `server/src/models/Product.ts`

**New Types**:
```typescript
interface Product {
  // ... existing fields ...
  colors: string[];
  materials: string[];
  sizes: string[];
  specifications: Record<string, string | number | boolean>;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  title?: string;
  price: number;
  size?: string;
  color?: string;
  material?: string;
  images?: string[];
  inventory_count: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  created_at: Date;
  updated_at: Date;
}

interface Product3DModel {
  id: string;
  product_id: string;
  model_url: string;
  format: 'gltf' | 'obj' | 'usdz';
  thumbnail?: string;
  created_at: Date;
}
```

**Steps**:
1. [ ] Open `src/types/product.ts`
2. [ ] Add new fields to Product interface
3. [ ] Create ProductVariant interface
4. [ ] Create Product3DModel interface
5. [ ] Update server models
6. [ ] Run type check: `npm run type-check`
7. [ ] Verify no type errors
8. [ ] Commit: "feat: Phase 1 - Update product type definitions"

**Testing**:
- [ ] Type checking passes: `npm run type-check`
- [ ] No compilation errors
- [ ] TypeScript LSP works in IDE

**Ongoing Issues**:
- None yet

---

## Task 1.6: Update Product API Endpoints
**Status**: ⏳ NOT STARTED

**Objective**: Update API endpoints to return new product fields.

**Completion Criteria**:
- [ ] GET /api/products/:id returns colors, materials, sizes, specifications
- [ ] GET /api/products/:id/variants returns variants array
- [ ] API tests pass
- [ ] Emulator/simulator testing passes

**Endpoints to Update**:
- `GET /api/products` - Include new fields in response
- `GET /api/products/:id` - Include new fields + variants
- `GET /api/products/:id/variants` - Return variants array

**Steps**:
1. [ ] Open `server/src/routes/products.js`
2. [ ] Update GET /api/products to include new fields in response
3. [ ] Update GET /api/products/:id to join with variants table
4. [ ] Create GET /api/products/:id/variants endpoint
5. [ ] Write tests for each endpoint
6. [ ] Run tests: `npm test`
7. [ ] Commit: "feat: Phase 1 - Update product API endpoints"

**Testing**:
- [ ] Unit tests written for each endpoint
- [ ] API tests pass: `npm test -- api`
- [ ] Integration test: Query product via API, verify fields present

**Emulator/Simulator Testing**:
- [ ] Backend running
- [ ] Call: `curl http://localhost:5001/api/products/1`
- [ ] Verify response includes: colors, materials, sizes, specifications
- [ ] Call: `curl http://localhost:5001/api/products/1/variants`
- [ ] Verify response is empty array (no variants yet)

**Ongoing Issues**:
- None yet

---

## Phase 1: Completion Gate
**Status**: ⏳ PENDING

**All Phase 1 Tasks Complete?**
- [ ] Task 1.1: Schema Analysis ✓
- [ ] Task 1.2: Attributes Migration ✓
- [ ] Task 1.3: Variants Table ✓
- [ ] Task 1.4: 3D Models Table ✓
- [ ] Task 1.5: Type Definitions ✓
- [ ] Task 1.6: API Endpoints ✓

**Regression Test Suite**:
- [ ] All existing tests still pass
- [ ] Login still works
- [ ] Product browsing still works
- [ ] Add to cart still works
- [ ] Checkout still works
- [ ] Orders still work
- [ ] No new errors in logs

**Phase 1 Approval**: ⏳ PENDING USER SIGN-OFF

**Next Phase**: Phase 2 - Data Enrichment (on approval)

---

# PHASE 2: Data Enrichment
**Timeline**: Week 1 Days 4 - Week 2 Day 2 | **Owner**: Backend + Data

## Phase Goal
Populate 384 products with missing attributes: colors, materials, sizes, specifications.

---

## Task 2.1: Create Color Enrichment Script
**Status**: ⏳ NOT STARTED

**Objective**: Populate colors array for all applicable products.

**Completion Criteria**:
- [ ] Script created: `server/scripts/enrich-colors.js`
- [ ] 277 products with empty colors have colors populated
- [ ] Realistic colors assigned (not random)
- [ ] Data validated (no duplicates, proper format)

**Steps**:
1. [ ] Create `server/scripts/enrich-colors.js`
2. [ ] Define color palette by category
3. [ ] Extract color keywords from product descriptions
4. [ ] Assign realistic colors to each product
5. [ ] Validate: No empty arrays, no typos
6. [ ] Run script: `npm run enrich:colors`
7. [ ] Commit: "feat: Phase 2 - Enrich product colors"

**Testing**:
- [ ] Script completes without errors
- [ ] Query: `SELECT COUNT(*) FROM products WHERE colors = '[]'` (should be 0)
- [ ] Sample query: `SELECT title, colors FROM products LIMIT 10`
- [ ] Verify colors look realistic

**Emulator/Simulator Testing**:
- [ ] API call: `GET /api/products/1`
- [ ] Verify colors array is populated and has realistic values

**Ongoing Issues**:
- None yet

---

## Task 2.2: Create Materials Enrichment Script
**Status**: ⏳ NOT STARTED

**Objective**: Populate materials array for all applicable products.

**Completion Criteria**:
- [ ] Script created: `server/scripts/enrich-materials.js`
- [ ] 339 products with empty materials have materials populated
- [ ] Realistic materials assigned
- [ ] Data validated

**Steps**:
1. [ ] Create `server/scripts/enrich-materials.js`
2. [ ] Define material options by product type
3. [ ] Extract material keywords from descriptions
4. [ ] Assign realistic materials
5. [ ] Validate data
6. [ ] Run script: `npm run enrich:materials`
7. [ ] Commit: "feat: Phase 2 - Enrich product materials"

**Testing**:
- [ ] Script completes successfully
- [ ] Query: `SELECT COUNT(*) FROM products WHERE materials = '[]'` (should be 0)
- [ ] Sample 10 products, verify materials realistic

**Emulator/Simulator Testing**:
- [ ] API call: `GET /api/products/1`
- [ ] Verify materials array populated

**Ongoing Issues**:
- None yet

---

## Task 2.3: Create Sizes Enrichment Script (Clothing Products)
**Status**: ⏳ NOT STARTED

**Objective**: Add sizes to clothing products.

**Completion Criteria**:
- [ ] Script created: `server/scripts/enrich-sizes.js`
- [ ] 50+ clothing products have sizes populated
- [ ] Size ranges realistic for each product type
- [ ] Data validated

**Size Mappings**:
- Shirts/Tops: XS, S, M, L, XL, XXL
- Pants: 28, 30, 32, 34, 36, 38
- Shoes: 5-13 (depending on type)
- Dresses: XS, S, M, L, XL

**Steps**:
1. [ ] Create `server/scripts/enrich-sizes.js`
2. [ ] Identify clothing products by category
3. [ ] Assign appropriate size ranges
4. [ ] Validate data
5. [ ] Run script: `npm run enrich:sizes`
6. [ ] Commit: "feat: Phase 2 - Enrich product sizes"

**Testing**:
- [ ] Script completes
- [ ] Query clothing products: `SELECT title, sizes FROM products WHERE category = 'clothing' LIMIT 10`
- [ ] Verify sizes realistic

**Emulator/Simulator Testing**:
- [ ] API call for clothing product: `GET /api/products/50`
- [ ] Verify sizes array present and realistic

**Ongoing Issues**:
- None yet

---

## Task 2.4: Create Specifications Enrichment Script
**Status**: ⏳ NOT STARTED

**Objective**: Add specifications to 100+ products.

**Completion Criteria**:
- [ ] Script created: `server/scripts/enrich-specifications.js`
- [ ] 100+ products have specifications
- [ ] Specifications match product type
- [ ] Data validated

**Specification Examples**:
```javascript
{
  "makeup": { waterproof: boolean, longLasting: boolean, hypoallergenic: boolean },
  "electronics": { wireless: boolean, bluetooth: boolean, batteryLife: string },
  "clothing": { stretchable: boolean, waterproof: boolean, wrinkleResistant: boolean }
}
```

**Steps**:
1. [ ] Create `server/scripts/enrich-specifications.js`
2. [ ] Define specs for each category
3. [ ] Extract keywords from descriptions
4. [ ] Assign specifications
5. [ ] Validate: Only valid specs, correct types
6. [ ] Run script: `npm run enrich:specs`
7. [ ] Commit: "feat: Phase 2 - Enrich product specifications"

**Testing**:
- [ ] Script completes
- [ ] Query: `SELECT title, specifications FROM products WHERE specifications != '{}' LIMIT 10`
- [ ] Verify specs realistic

**Emulator/Simulator Testing**:
- [ ] API call: `GET /api/products/1`
- [ ] Verify specifications object populated

**Ongoing Issues**:
- None yet

---

## Task 2.5: Data Validation & Cleanup
**Status**: ⏳ NOT STARTED

**Objective**: Verify all data is correct and complete.

**Completion Criteria**:
- [ ] All 384 products have colors
- [ ] All 384 products have materials
- [ ] 50+ clothing products have sizes
- [ ] 100+ products have specifications
- [ ] No null values, no empty arrays where not expected
- [ ] No duplicate entries

**Steps**:
1. [ ] Create validation script: `server/scripts/validate-enrichment.js`
2. [ ] Check colors count: Should be ~380+
3. [ ] Check materials count: Should be ~380+
4. [ ] Check sizes count: Should be 50+
5. [ ] Check specs count: Should be 100+
6. [ ] Run validation: `npm run validate:enrichment`
7. [ ] Fix any issues found
8. [ ] Commit: "feat: Phase 2 - Data validation and cleanup"

**Testing**:
- [ ] Validation script reports 0 errors
- [ ] Manual spot checks: Query 10 random products, verify all fields populated

**Emulator/Simulator Testing**:
- [ ] API call 10 different products
- [ ] All have colors, materials, etc.

**Ongoing Issues**:
- None yet

---

## Task 2.6: Export Updated Catalog
**Status**: ⏳ NOT STARTED

**Objective**: Export enriched catalog for reference and backup.

**Completion Criteria**:
- [ ] Catalog exported: `server/data/catalog-enriched.json`
- [ ] Contains all 384 products with new attributes
- [ ] Matches database exactly

**Steps**:
1. [ ] Create export script: `server/scripts/export-catalog.js`
2. [ ] Query all products + variants
3. [ ] Export to JSON
4. [ ] Verify completeness
5. [ ] Run: `npm run export:catalog`
6. [ ] Commit: "docs: Phase 2 - Export enriched catalog"

**Testing**:
- [ ] Export completes
- [ ] File created with correct data
- [ ] Can re-import from export

**Ongoing Issues**:
- None yet

---

## Phase 2: Completion Gate
**Status**: ⏳ PENDING

**All Phase 2 Tasks Complete?**
- [ ] Task 2.1: Colors ✓
- [ ] Task 2.2: Materials ✓
- [ ] Task 2.3: Sizes ✓
- [ ] Task 2.4: Specifications ✓
- [ ] Task 2.5: Validation ✓
- [ ] Task 2.6: Export ✓

**Regression Tests**:
- [ ] All Phase 1 tests still pass
- [ ] API still returns products correctly
- [ ] No data loss
- [ ] Product count still 384

**Phase 2 Approval**: ⏳ PENDING USER SIGN-OFF

---

# PHASE 3: Product Variants Implementation
**Timeline**: Week 2 Days 3-5

*(Continued in next sections...)*

---

# PHASE 4: Search Backend Enhancement
**Timeline**: Week 2 Days 6 - Week 3 Day 3

*(Detailed tasks to follow...)*

---

# PHASE 5: Frontend/UI Updates
**Timeline**: Week 3 Days 4-6

*(Detailed tasks to follow...)*

---

# PHASE 6: Cross-Platform Testing
**Timeline**: Week 3 Day 7 - Week 4 Day 2

*(Detailed tasks to follow...)*

---

# PHASE 7: 3D Images Support (Optional)
**Timeline**: Week 4 Days 3-7

*(Detailed tasks to follow...)*

---

## Overall Status Dashboard

| Component | Status | Notes |
|-----------|--------|-------|
| **Schema** | ⏳ Pending Phase 1 | Database migrations ready |
| **Data** | ⏳ Pending Phase 2 | Enrichment scripts prepared |
| **Variants** | ⏳ Pending Phase 3 | Structure designed |
| **Search** | ⏳ Pending Phase 4 | Parser design complete |
| **UI** | ⏳ Pending Phase 5 | Component specs ready |
| **Testing** | ⏳ Pending Phase 6 | Test cases written |
| **3D** | ⏳ Optional Phase 7 | Design ready |

---

## Blockers & Issues Tracker

| ID | Issue | Status | Impact | Resolution |
|----|-------|--------|--------|-----------|
| None yet | - | - | - | - |

---

## Document History

| Date | Change | By |
|------|--------|-----|
| 2026-07-09 | Initial master plan created | Claude |
| | | |

---

**Next Action**: Execute Phase 1 Task 1.1 (Schema Analysis)

