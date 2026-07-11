const CATEGORY_TARGETS = [
  { key: "mens-clothing", label: "Men's Clothing", department: "fashion", audience: "men", targetCount: 20, hasSizes: true, sizeType: "apparel", materialsRequired: true },
  { key: "womens-clothing", label: "Women's Clothing", department: "fashion", audience: "women", targetCount: 19, hasSizes: true, sizeType: "apparel", materialsRequired: true },
  { key: "footwear", label: "Footwear", department: "fashion", audience: "unisex", targetCount: 20, hasSizes: true, sizeType: "shoe", materialsRequired: true },
  { key: "electronics", label: "Electronics", department: "tech", audience: "unisex", targetCount: 25, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "beauty-fragrances", label: "Beauty & Fragrances", department: "beauty", audience: "unisex", targetCount: 16, hasSizes: false, sizeType: null, materialsRequired: false },
  { key: "jewelry", label: "Jewelry", department: "accessories", audience: "unisex", targetCount: 7, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "home-kitchen", label: "Home & Kitchen", department: "home", audience: "unisex", targetCount: 29, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "groceries", label: "Groceries", department: "essentials", audience: "unisex", targetCount: 13, hasSizes: false, sizeType: null, materialsRequired: false },
  { key: "sports-fitness", label: "Sports & Fitness", department: "lifestyle", audience: "unisex", targetCount: 15, hasSizes: false, sizeType: null, materialsRequired: false },
  { key: "bags-accessories", label: "Bags & Accessories", department: "fashion", audience: "unisex", targetCount: 12, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "watches", label: "Watches", department: "accessories", audience: "unisex", targetCount: 10, hasSizes: false, sizeType: null, materialsRequired: true },
  { key: "automotive", label: "Automotive", department: "specialty", audience: "unisex", targetCount: 10, hasSizes: false, sizeType: null, materialsRequired: true },
];

// Total: 20+19+20+25+16+7+29+13+15+12+10+10 = 196
// Targets were rebalanced during Task 1.2 after empirically confirming real,
// de-duplicated source-data ceilings via dummyjson's main + category-specific
// endpoints (see selectCatalogProducts.mjs's SUPPLEMENTARY_SOURCES). jewelry,
// beauty-fragrances, bags-accessories, automotive, and womens-clothing were
// capped at their real supply; electronics, home-kitchen, groceries, and
// sports-fitness (all with abundant real supply) absorbed the difference.
// beauty-fragrances was capped a second time (18->16) after discovering two
// snapshot items ("Ice Cream", "Protein Powder") were legacy-mis-tagged as
// beauty when they're real groceries items (see CATEGORY_OVERRIDES in
// selectCatalogProducts.mjs); the 2-item difference moved to home-kitchen,
// which has the largest real-supply headroom (47 candidates for 27 slots).
// Every product in the catalog is backed by real source data -- none invented.

const COLOR_PALETTE = [
  "black", "white", "brown", "navy", "gray", "beige",
  "red", "blue", "green", "pink", "yellow", "burgundy", "olive", "tan",
];

const SIZE_TABLES = {
  apparel_top: ["XS", "S", "M", "L", "XL", "XXL"],
  apparel_waist: ["28", "30", "32", "34", "36", "38"],
  shoe: ["6", "7", "8", "9", "10", "11", "12"],
};

// Subcategory keyword -> which SIZE_TABLES key applies (checked in order, first match wins)
const APPAREL_SIZE_RULES = [
  { test: /trouser|jean|pant|chino/i, sizeTableKey: "apparel_waist" },
  { test: /.*/, sizeTableKey: "apparel_top" }, // default for shirts/jackets/dresses/etc.
];

const MATERIAL_POOLS = {
  "mens-clothing": ["cotton", "denim", "wool", "linen", "cotton blend", "polyester"],
  "womens-clothing": ["cotton", "silk", "linen", "cotton blend", "polyester", "wool"],
  footwear: ["leather", "canvas", "suede", "mesh", "rubber"],
  electronics: ["aluminum", "plastic", "silicone", "glass"],
  jewelry: ["gold-plated", "sterling silver", "stainless steel", "gemstone"],
  "home-kitchen": ["stainless steel", "ceramic", "glass", "wood", "cast iron", "silicone"],
  "bags-accessories": ["leather", "canvas", "nylon", "faux leather"],
  watches: ["stainless steel", "leather strap", "silicone strap", "titanium"],
  automotive: ["rubber", "aluminum", "abs plastic", "microfiber"],
};

const SPECIFICATION_POOLS = {
  electronics: { wireless: "boolean", bluetooth: "boolean", waterproof: "boolean", batteryLife: "string" },
  "beauty-fragrances": { waterproof: "boolean", longLasting: "boolean", crueltyFree: "boolean", hypoallergenic: "boolean" },
  footwear: { waterproof: "boolean", breathable: "boolean", slipResistant: "boolean" },
  "mens-clothing": { waterproof: "boolean", breathable: "boolean", stretchable: "boolean", wrinkleResistant: "boolean" },
  "womens-clothing": { waterproof: "boolean", breathable: "boolean", stretchable: "boolean", wrinkleResistant: "boolean" },
  "sports-fitness": { waterproof: "boolean", breathable: "boolean", adjustable: "boolean" },
  "home-kitchen": { dishwasherSafe: "boolean", microwaveSafe: "boolean", nonStick: "boolean" },
  "bags-accessories": { waterResistant: "boolean", adjustableStrap: "boolean" },
  watches: { waterResistant: "boolean", batteryLife: "string" },
  jewelry: { hypoallergenic: "boolean" },
  automotive: { universalFit: "boolean", weatherResistant: "boolean" },
  groceries: { organic: "boolean", glutenFree: "boolean" },
};

module.exports = {
  CATEGORY_TARGETS,
  COLOR_PALETTE,
  SIZE_TABLES,
  APPAREL_SIZE_RULES,
  MATERIAL_POOLS,
  SPECIFICATION_POOLS,
};
