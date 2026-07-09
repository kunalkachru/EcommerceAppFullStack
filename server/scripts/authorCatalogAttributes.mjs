// server/scripts/authorCatalogAttributes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CATEGORY_TARGETS,
  SIZE_TABLES,
  APPAREL_SIZE_RULES,
} from "./catalogAttributePools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SELECTION_PATH = join(__dirname, "..", "data", "catalog-selection.json");
const OUTPUT_PATH = join(__dirname, "..", "catalog-static.json");

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function priceTier(price) {
  if (price < 30) return "entry";
  if (price < 80) return "budget";
  if (price < 200) return "mid";
  if (price < 800) return "premium";
  return "luxury";
}

function sizeTableFor(target, product) {
  if (!target.hasSizes) return [];
  if (target.sizeType === "shoe") return SIZE_TABLES.shoe;
  const hay = `${product.title} ${product.description}`;
  const rule = APPAREL_SIZE_RULES.find((r) => r.test.test(hay));
  return SIZE_TABLES[rule.sizeTableKey];
}

/**
 * PER-PRODUCT ATTRIBUTE AUTHORING TABLE
 * Keyed by the original snapshot product id. Authored directly by the
 * implementing agent (no external API), grounded in each product's real
 * title/description/category from server/data/catalog-selection.json.
 */
const AUTHORED_ATTRIBUTES = {
  // ---------- mens-clothing (20) ----------
  "dj-83": { colors: ["blue", "black"], materials: ["cotton"], specifications: { breathable: true, wrinkleResistant: false } },
  "dj-84": { colors: ["black"], materials: ["cotton"], specifications: { breathable: true } },
  "dj-85": { colors: ["red", "black", "white"], materials: ["cotton", "wool"], specifications: { breathable: true, wrinkleResistant: true } },
  "dj-86": { colors: ["white", "blue"], materials: ["cotton"], specifications: { breathable: true } },
  "dj-87": { colors: ["blue", "white"], materials: ["cotton"], specifications: { breathable: true } },
  "fs-2": { colors: ["black", "gray", "navy"], materials: ["cotton", "polyester"], specifications: { stretchable: true, breathable: true } },
  "fs-3": { colors: ["navy", "black"], materials: ["cotton", "polyester"], specifications: { waterproof: true, breathable: false } },
  "fs-4": { colors: ["white", "blue"], materials: ["cotton"], specifications: { stretchable: true } },
  "es-3": { colors: ["gray"], materials: ["cotton blend"], specifications: { breathable: true } },
  "es-4": { colors: ["gray"], materials: ["cotton blend"], specifications: { breathable: true } },
  "es-5": { colors: ["black"], materials: ["cotton blend"], specifications: { breathable: true } },
  "es-7": { colors: ["gray", "black"], materials: ["cotton blend", "polyester"], specifications: { stretchable: true, breathable: true } },
  "es-8": { colors: ["red"], materials: ["cotton blend"], specifications: { stretchable: true, breathable: true } },
  "es-9": { colors: ["navy"], materials: ["cotton"], specifications: { breathable: true } },
  "es-10": { colors: ["blue"], materials: ["cotton"], specifications: { breathable: true } },
  "es-11": { colors: ["red"], materials: ["cotton"], specifications: { breathable: true } },
  "es-12": { colors: ["black"], materials: ["cotton"], specifications: { breathable: true } },
  "es-13": { colors: ["olive"], materials: ["cotton blend"], specifications: { breathable: true, stretchable: true } },
  "es-14": { colors: ["black", "gray"], materials: ["polyester"], specifications: { stretchable: true, breathable: true } },
  "es-15": { colors: ["white"], materials: ["cotton"], specifications: { breathable: true } },

  // ---------- womens-clothing (19) ----------
  "dj-162": { colors: ["blue"], materials: ["cotton"], specifications: { breathable: true } },
  "dj-163": { colors: ["yellow", "pink"], materials: ["cotton"], specifications: { breathable: true } },
  "dj-164": { colors: ["gray"], materials: ["cotton blend"], specifications: { breathable: true, wrinkleResistant: true } },
  "dj-165": { colors: ["pink"], materials: ["cotton"], specifications: { breathable: true } },
  "dj-166": { colors: ["red", "black"], materials: ["wool"], specifications: { wrinkleResistant: true } },
  "dj-178": { colors: ["black"], materials: ["polyester"], specifications: { stretchable: true } },
  "dj-179": { colors: ["black"], materials: ["polyester", "cotton blend"], specifications: { stretchable: true } },
  "dj-177": { colors: ["black"], materials: ["silk"], specifications: { wrinkleResistant: true } },
  "dj-180": { colors: ["green"], materials: ["cotton"], specifications: { breathable: true } },
  "dj-181": { colors: ["red", "black"], materials: ["wool"], specifications: { wrinkleResistant: true } },
  "fs-15": { colors: ["black", "navy"], materials: ["polyester"], specifications: { waterproof: true, breathable: false } },
  "fs-16": { colors: ["black"], materials: ["polyester"], specifications: { waterproof: false, breathable: true } },
  "fs-17": { colors: ["blue", "yellow"], materials: ["polyester"], specifications: { waterproof: true, breathable: true } },
  "fs-18": { colors: ["black", "white"], materials: ["cotton blend"], specifications: { stretchable: true, breathable: true } },
  "fs-19": { colors: ["gray", "black"], materials: ["polyester"], specifications: { stretchable: true, breathable: true } },
  "fs-20": { colors: ["white", "black"], materials: ["cotton"], specifications: { stretchable: true, breathable: true } },
  "demo-jacket-blue-49": { colors: ["blue"], materials: ["polyester"], specifications: { waterproof: true, breathable: true } },
  "demo-jacket-blue-54": { colors: ["blue"], materials: ["polyester"], specifications: { waterproof: true, breathable: true } },
  "demo-jacket-blue-59": { colors: ["blue"], materials: ["cotton blend", "polyester"], specifications: { waterproof: true, breathable: false } },

  // ---------- footwear (20) ----------
  "dj-88": { colors: ["red", "black"], materials: ["leather", "rubber"], specifications: { breathable: true, slipResistant: true } },
  "dj-89": { colors: ["black", "white"], materials: ["leather", "rubber"], specifications: { slipResistant: true } },
  "dj-90": { colors: ["white", "gray"], materials: ["mesh", "rubber"], specifications: { breathable: true } },
  "dj-91": { colors: ["white", "red"], materials: ["mesh", "rubber"], specifications: { breathable: true } },
  "dj-185": { colors: ["black", "brown"], materials: ["suede"], specifications: { breathable: false } },
  "dj-186": { colors: ["black"], materials: ["leather"], specifications: { slipResistant: false } },
  "dj-187": { colors: ["yellow"], materials: ["leather"], specifications: { slipResistant: false } },
  "dj-188": { colors: ["tan"], materials: ["leather", "canvas"], specifications: { breathable: true } },
  "dj-189": { colors: ["red"], materials: ["leather"], specifications: { slipResistant: false } },
  "demo-shoes-women-39": { colors: ["tan", "white"], materials: ["leather"], specifications: { breathable: true, waterproof: false } },
  "demo-shoes-women-44": { colors: ["white", "gray"], materials: ["mesh"], specifications: { breathable: true } },
  "demo-shoes-women-49": { colors: ["black", "gray"], materials: ["mesh", "rubber"], specifications: { breathable: true, slipResistant: true } },
  "es-35": { colors: ["white", "blue"], materials: ["rubber"], specifications: { slipResistant: true } },
  "es-36": { colors: ["pink", "yellow"], materials: ["suede"], specifications: { slipResistant: false } },
  "es-37": { colors: ["blue", "tan"], materials: ["canvas"], specifications: { breathable: true, waterproof: false } },
  "es-38": { colors: ["red", "blue"], materials: ["mesh", "rubber"], specifications: { breathable: true, slipResistant: true } },
  "es-39": { colors: ["pink"], materials: ["mesh", "rubber"], specifications: { breathable: true } },
  "es-40": { colors: ["gray", "yellow"], materials: ["leather"], specifications: { slipResistant: true } },
  "es-41": { colors: ["black"], materials: ["suede"], specifications: { slipResistant: false } },
  "es-42": { colors: ["burgundy"], materials: ["leather"], specifications: { slipResistant: false } },

  // ---------- electronics (25) ----------
  "dj-78": { colors: ["gray"], materials: ["aluminum"], specifications: { wireless: true, bluetooth: true, batteryLife: "18 hours" } },
  "dj-79": { colors: ["gray"], materials: ["aluminum"], specifications: { wireless: true, bluetooth: true, batteryLife: "10 hours" } },
  "dj-80": { colors: ["gray"], materials: ["aluminum", "glass"], specifications: { wireless: true, bluetooth: true, batteryLife: "12 hours" } },
  "dj-81": { colors: ["gray"], materials: ["aluminum"], specifications: { wireless: true, bluetooth: true, batteryLife: "10 hours" } },
  "dj-82": { colors: ["white", "gray"], materials: ["aluminum"], specifications: { wireless: true, bluetooth: true, batteryLife: "13 hours" } },
  "dj-99": { colors: ["black"], materials: ["plastic"], specifications: { wireless: true, bluetooth: true, waterproof: false } },
  "dj-100": { colors: ["white"], materials: ["plastic"], specifications: { wireless: true, bluetooth: true, batteryLife: "5 hours" } },
  "dj-101": { colors: ["gray"], materials: ["aluminum", "plastic"], specifications: { wireless: true, bluetooth: true, batteryLife: "20 hours" } },
  "dj-102": { colors: ["white"], materials: ["plastic"], specifications: { wireless: true, bluetooth: false } },
  "dj-103": { colors: ["gray"], materials: ["plastic"], specifications: { wireless: true, bluetooth: true } },
  "dj-104": { colors: ["white"], materials: ["plastic"], specifications: { wireless: false, bluetooth: false } },
  "dj-105": { colors: ["white"], materials: ["plastic"], specifications: { wireless: true, batteryLife: "10 hours" } },
  "dj-106": { colors: ["yellow"], materials: ["aluminum"], specifications: { wireless: true, bluetooth: true, waterproof: true, batteryLife: "18 hours" } },
  "dj-107": { colors: ["black"], materials: ["plastic"], specifications: { wireless: true, bluetooth: true, batteryLife: "12 hours" } },
  "dj-108": { colors: ["burgundy"], materials: ["silicone"], specifications: { waterproof: false } },
  "dj-109": { colors: ["black"], materials: ["aluminum"], specifications: { wireless: false } },
  "dj-110": { colors: ["white"], materials: ["plastic"], specifications: { wireless: false } },
  "dj-111": { colors: ["black"], materials: ["aluminum"], specifications: { wireless: true, bluetooth: true } },
  "dj-112": { colors: ["black"], materials: ["aluminum"], specifications: { wireless: false } },
  "dj-121": { colors: ["white", "black"], materials: ["aluminum", "glass"], specifications: { wireless: true, bluetooth: true, batteryLife: "10 hours" } },
  "dj-122": { colors: ["gray", "white"], materials: ["aluminum", "glass"], specifications: { wireless: true, bluetooth: true, batteryLife: "11 hours" } },
  "dj-123": { colors: ["gray", "blue"], materials: ["aluminum", "glass"], specifications: { wireless: true, bluetooth: true, waterproof: true, batteryLife: "22 hours" } },
  "dj-124": { colors: ["black"], materials: ["aluminum", "glass"], specifications: { wireless: true, bluetooth: true, waterproof: true, batteryLife: "12 hours" } },
  "dj-125": { colors: ["black", "blue"], materials: ["plastic", "glass"], specifications: { wireless: true, bluetooth: true, batteryLife: "14 hours" } },
  "dj-126": { colors: ["black", "blue"], materials: ["plastic", "glass"], specifications: { wireless: true, bluetooth: true, batteryLife: "15 hours" } },

  // ---------- beauty-fragrances (16) ----------
  "dj-1": { colors: ["black"], materials: [], specifications: { waterproof: false, longLasting: true, crueltyFree: true } },
  "dj-2": { colors: ["beige", "brown"], materials: [], specifications: { longLasting: true, crueltyFree: false } },
  "dj-3": { colors: ["beige"], materials: [], specifications: { longLasting: true, hypoallergenic: true } },
  "dj-4": { colors: ["red"], materials: [], specifications: { longLasting: true, crueltyFree: false } },
  "dj-5": { colors: ["red"], materials: [], specifications: { longLasting: true } },
  "dj-6": { colors: ["blue"], materials: [], specifications: { longLasting: true, crueltyFree: false } },
  "dj-7": { colors: ["black"], materials: [], specifications: { longLasting: true } },
  "dj-8": { colors: ["yellow"], materials: [], specifications: { longLasting: true } },
  "dj-9": { colors: ["yellow"], materials: [], specifications: { longLasting: true } },
  "dj-10": { colors: ["pink"], materials: [], specifications: { longLasting: true } },
  "demo-fragrance-64": { colors: ["pink"], materials: [], specifications: { longLasting: true } },
  "demo-fragrance-79": { colors: ["yellow"], materials: [], specifications: { longLasting: true } },
  "dj-118": { colors: ["green"], materials: [], specifications: { hypoallergenic: true, crueltyFree: true } },
  "dj-119": { colors: ["beige"], materials: [], specifications: { hypoallergenic: true } },
  "dj-120": { colors: ["blue"], materials: [], specifications: { hypoallergenic: true } },
  "es-47": { colors: ["yellow"], materials: [], specifications: { longLasting: true } },

  // ---------- jewelry (7) ----------
  "dj-182": { colors: ["green"], materials: ["gemstone"], specifications: { hypoallergenic: true } },
  "dj-183": { colors: ["green"], materials: ["gemstone"], specifications: { hypoallergenic: true } },
  "dj-184": { colors: ["green", "yellow"], materials: ["gemstone"], specifications: { hypoallergenic: false } },
  "fs-5": { colors: ["yellow", "gray"], materials: ["gold-plated", "sterling silver"], specifications: { hypoallergenic: false } },
  "fs-6": { colors: ["yellow"], materials: ["gold-plated"], specifications: { hypoallergenic: false } },
  "fs-7": { colors: ["white"], materials: ["gold-plated"], specifications: { hypoallergenic: false } },
  "fs-8": { colors: ["pink"], materials: ["stainless steel"], specifications: { hypoallergenic: true } },

  // ---------- home-kitchen (29) ----------
  "dj-11": { colors: ["brown"], materials: ["wood"], specifications: {} },
  "dj-12": { colors: ["beige"], materials: ["wood"], specifications: {} },
  "dj-13": { colors: ["brown"], materials: ["wood"], specifications: {} },
  "dj-14": { colors: ["black"], materials: ["wood", "stainless steel"], specifications: {} },
  "dj-15": { colors: ["brown"], materials: ["wood", "glass"], specifications: {} },
  "dj-43": { colors: ["brown"], materials: ["wood"], specifications: {} },
  "dj-44": { colors: ["brown"], materials: ["wood"], specifications: {} },
  "dj-45": { colors: ["green"], materials: ["wood"], specifications: {} },
  "dj-46": { colors: ["white"], materials: ["ceramic"], specifications: {} },
  "dj-47": { colors: ["beige"], materials: ["ceramic"], specifications: {} },
  "dj-48": { colors: ["tan"], materials: ["wood"], specifications: { dishwasherSafe: false } },
  "dj-49": { colors: ["black"], materials: ["stainless steel"], specifications: { dishwasherSafe: true } },
  "dj-50": { colors: ["black"], materials: ["stainless steel"], specifications: { dishwasherSafe: true } },
  "dj-51": { colors: ["white"], materials: ["stainless steel", "glass"], specifications: { dishwasherSafe: true } },
  "dj-52": { colors: ["black"], materials: ["cast iron"], specifications: { nonStick: false, dishwasherSafe: false } },
  "dj-53": { colors: ["brown"], materials: ["wood"], specifications: { dishwasherSafe: false } },
  "dj-54": { colors: ["yellow"], materials: ["stainless steel"], specifications: { dishwasherSafe: true } },
  "dj-55": { colors: ["white"], materials: ["stainless steel"], specifications: { dishwasherSafe: true } },
  "dj-56": { colors: ["black"], materials: ["stainless steel"], specifications: {} },
  "dj-57": { colors: ["gray"], materials: ["stainless steel"], specifications: { dishwasherSafe: true } },
  "dj-58": { colors: ["gray"], materials: ["stainless steel"], specifications: { dishwasherSafe: true } },
  "dj-59": { colors: ["white"], materials: ["glass"], specifications: { dishwasherSafe: true, microwaveSafe: true } },
  "dj-60": { colors: ["black"], materials: ["stainless steel"], specifications: { dishwasherSafe: true } },
  "dj-61": { colors: ["white"], materials: ["stainless steel", "silicone"], specifications: { dishwasherSafe: false } },
  "dj-62": { colors: ["white"], materials: ["silicone"], specifications: { dishwasherSafe: true } },
  "dj-63": { colors: ["gray"], materials: ["stainless steel"], specifications: { dishwasherSafe: true } },
  "dj-64": { colors: ["gray"], materials: ["stainless steel"], specifications: { dishwasherSafe: false } },
  "dj-65": { colors: ["blue"], materials: ["stainless steel"], specifications: { microwaveSafe: false, dishwasherSafe: true } },
  "dj-66": { colors: ["black", "white"], materials: ["stainless steel"], specifications: { microwaveSafe: true } },

  // ---------- groceries (13) ----------
  "dj-16": { colors: ["red", "green"], materials: [], specifications: { organic: true, glutenFree: true } },
  "dj-17": { colors: ["red"], materials: [], specifications: { organic: false, glutenFree: true } },
  "dj-20": { colors: ["yellow"], materials: [], specifications: { organic: false, glutenFree: true } },
  "dj-21": { colors: ["green"], materials: [], specifications: { organic: true, glutenFree: true } },
  "dj-22": { colors: ["brown"], materials: [], specifications: { organic: false, glutenFree: false } },
  "dj-25": { colors: ["green"], materials: [], specifications: { organic: true, glutenFree: true } },
  "dj-27": { colors: ["yellow"], materials: [], specifications: { organic: true, glutenFree: true } },
  "dj-28": { colors: ["white"], materials: [], specifications: { organic: false, glutenFree: true } },
  "dj-30": { colors: ["green"], materials: [], specifications: { organic: true, glutenFree: true } },
  "dj-31": { colors: ["yellow"], materials: [], specifications: { organic: true, glutenFree: true } },
  "dj-33": { colors: ["burgundy"], materials: [], specifications: { organic: true, glutenFree: true } },
  "dj-34": { colors: ["brown"], materials: [], specifications: { organic: false, glutenFree: true } },
  "dj-36": { colors: ["white"], materials: [], specifications: { organic: false, glutenFree: true } },

  // ---------- sports-fitness (15) ----------
  "dj-137": { colors: ["brown"], materials: [], specifications: {} },
  "dj-138": { colors: ["white"], materials: [], specifications: {} },
  "dj-139": { colors: ["brown"], materials: [], specifications: { adjustable: true } },
  "dj-140": { colors: ["brown"], materials: [], specifications: {} },
  "dj-141": { colors: ["black"], materials: [], specifications: {} },
  "dj-142": { colors: ["red"], materials: [], specifications: {} },
  "dj-143": { colors: ["brown"], materials: [], specifications: {} },
  "dj-144": { colors: ["white", "black"], materials: [], specifications: { adjustable: true } },
  "dj-145": { colors: ["brown"], materials: [], specifications: {} },
  "dj-146": { colors: ["white"], materials: [], specifications: {} },
  "dj-147": { colors: ["black", "white"], materials: [], specifications: {} },
  "dj-148": { colors: ["white"], materials: [], specifications: {} },
  "dj-149": { colors: ["gray"], materials: [], specifications: {} },
  "dj-150": { colors: ["gray"], materials: [], specifications: {} },
  "dj-151": { colors: ["yellow"], materials: [], specifications: {} },

  // ---------- bags-accessories (12) ----------
  "dj-172": { colors: ["blue"], materials: ["faux leather"], specifications: { adjustableStrap: true } },
  "dj-173": { colors: ["brown"], materials: ["leather"], specifications: { adjustableStrap: true } },
  "dj-174": { colors: ["black"], materials: ["leather"], specifications: { adjustableStrap: false } },
  "dj-175": { colors: ["white"], materials: ["faux leather"], specifications: { adjustableStrap: true } },
  "dj-176": { colors: ["black"], materials: ["leather"], specifications: { adjustableStrap: true } },
  "dj-154": { colors: ["black"], materials: ["faux leather"], specifications: { waterResistant: false } },
  "dj-155": { colors: ["beige"], materials: ["faux leather"], specifications: { waterResistant: false } },
  "dj-156": { colors: ["green", "black"], materials: ["faux leather"], specifications: { waterResistant: false } },
  "dj-157": { colors: ["pink"], materials: ["faux leather"], specifications: { waterResistant: false } },
  "dj-158": { colors: ["black"], materials: ["faux leather"], specifications: { waterResistant: false } },
  "es-48": { colors: ["olive"], materials: ["nylon"], specifications: { waterResistant: true, adjustableStrap: false } },
  "es-49": { colors: ["white"], materials: ["nylon"], specifications: { waterResistant: false, adjustableStrap: true } },

  // ---------- watches (10) ----------
  "dj-93": { colors: ["brown"], materials: ["leather strap"], specifications: { waterResistant: false } },
  "dj-94": { colors: ["gray"], materials: ["stainless steel"], specifications: { waterResistant: true } },
  "dj-95": { colors: ["black"], materials: ["stainless steel"], specifications: { waterResistant: true } },
  "dj-96": { colors: ["gray"], materials: ["stainless steel"], specifications: { waterResistant: true } },
  "dj-97": { colors: ["gray"], materials: ["stainless steel"], specifications: { waterResistant: true } },
  "dj-98": { colors: ["black"], materials: ["stainless steel"], specifications: { waterResistant: true } },
  "dj-190": { colors: ["gray"], materials: ["titanium"], specifications: { waterResistant: true } },
  "dj-192": { colors: ["gray"], materials: ["stainless steel"], specifications: { waterResistant: true } },
  "dj-193": { colors: ["yellow"], materials: ["stainless steel"], specifications: { waterResistant: false } },
  "dj-194": { colors: ["gray", "pink"], materials: ["stainless steel"], specifications: { waterResistant: false, batteryLife: "12 months" } },

  // ---------- automotive (10) ----------
  "dj-168": { colors: ["gray"], materials: ["aluminum"], specifications: { universalFit: false } },
  "dj-169": { colors: ["red"], materials: ["aluminum"], specifications: { universalFit: false } },
  "dj-167": { colors: ["black"], materials: ["aluminum"], specifications: { universalFit: false } },
  "dj-170": { colors: ["white"], materials: ["aluminum"], specifications: { universalFit: false } },
  "dj-171": { colors: ["gray"], materials: ["aluminum"], specifications: { universalFit: false } },
  "dj-113": { colors: ["black"], materials: ["rubber"], specifications: { universalFit: true } },
  "dj-114": { colors: ["green"], materials: ["rubber"], specifications: { universalFit: false } },
  "dj-115": { colors: ["red"], materials: ["rubber"], specifications: { universalFit: false } },
  "dj-116": { colors: ["white"], materials: ["rubber"], specifications: { universalFit: true } },
  "dj-117": { colors: ["black"], materials: ["rubber"], specifications: { universalFit: false } },
};

function authorProduct(product, target) {
  const authored = AUTHORED_ATTRIBUTES[product.id];
  if (!authored) {
    throw new Error(
      `Missing authored attributes for product id "${product.id}" (${product.title}). ` +
      `Add an entry to AUTHORED_ATTRIBUTES before running this script.`
    );
  }

  const sizes = sizeTableFor(target, product);
  const title = String(product.title).trim();
  const slug = slugify(title);
  const normalizedId = slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-");

  return {
    id: product.id,
    title,
    description: authored.description || product.description,
    brand: product.brand || "ShopEase Select",
    category: target.key,
    categoryLabel: target.label,
    department: target.department,
    subcategory: target.key,
    audience: target.audience,
    price: Number(product.price) || 0,
    currency: "USD",
    priceTier: priceTier(Number(product.price) || 0),
    imageAlt: `${title} in ${target.label}`,
    images: [], // populated by Task 1.4 (downloadCatalogImages.mjs) after this file is written
    colors: authored.colors || [],
    materials: authored.materials || [],
    sizes,
    specifications: authored.specifications || {},
    tags: Array.isArray(product.tags) ? product.tags.slice(0, 12) : [],
    keywords: [
      ...(authored.colors || []),
      ...(authored.materials || []),
      target.key,
      target.audience,
    ],
    sku: `SKU-${normalizedId}`,
    inventoryCount: 12 + (normalizedId.length % 40),
    availability: "in_stock",
    rating: typeof product.rating === "number" ? product.rating : 4.0,
    slug,
  };
}

function main() {
  const { selection } = JSON.parse(readFileSync(SELECTION_PATH, "utf8"));
  const targetsByKey = new Map(CATEGORY_TARGETS.map((t) => [t.key, t]));

  const authored = selection.map((product) => {
    const target = targetsByKey.get(product.targetCategoryKey);
    return authorProduct(product, target);
  });

  writeFileSync(OUTPUT_PATH, JSON.stringify({ updatedAt: new Date(0).toISOString(), products: authored }, null, 2), "utf8");
  console.log(`Authored ${authored.length} products -> ${OUTPUT_PATH}`);
}

main();
