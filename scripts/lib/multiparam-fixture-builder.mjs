/**
 * Derives natural-language multi-parameter search fixtures from real catalog products,
 * instead of hand-invented query strings that may not match anything (see the diagnostic
 * finding: 4 of the original file's 5 queries matched zero real products).
 */

// Mirrors server/src/voiceQueryParser.js's COLOR_WORDS so the generator can avoid picking
// a title's trailing word as the "type" placeholder when that word is itself a color (e.g.
// "Apple MacBook Pro 14 Inch Space Grey" -- using "grey" as both color and type reads as
// a confusing double-color query and risks the parser mis-weighting the signal).
const COLOR_WORDS = [
  "red", "blue", "green", "black", "white", "brown", "gray", "grey", "pink",
  "purple", "yellow", "orange", "navy", "beige", "gold", "silver", "dark",
  "light", "cream", "tan", "maroon", "teal",
];

function hasAttrs(product, count) {
  let n = 0;
  if (product.colors?.length) n++;
  if (product.sizes?.length) n++;
  if (product.materials?.length) n++;
  if (Object.keys(product.specifications || {}).length) n++;
  return n >= count;
}

// Skip trivial conjunctions/articles too -- a title like "Nike Air Jordan 1 Red And
// Black" would otherwise yield "and" as the "type" word once "black" is skipped as a
// color, which reads as a meaningless connective rather than a real product noun.
const STOPWORDS = ["and", "or", "the", "a", "an", "of", "&", "with", "for"];

function typeWordFor(product) {
  const words = product.title.split(" ").filter(Boolean);
  // Walk from the end, skipping any word that reads as a color or is a bare stopword --
  // the last real noun is a much safer stand-in for "what kind of thing is this" than a
  // blind last-word grab, which for e.g. "...Space Grey" would just repeat the color, or
  // for "...Red And Black" would land on the meaningless "and".
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].toLowerCase();
    if (!COLOR_WORDS.includes(w) && !STOPWORDS.includes(w)) return w;
  }
  return words[words.length - 1].toLowerCase();
}

function sentenceFor(product) {
  const color = product.colors?.[0];
  const size = product.sizes?.[0];
  const material = product.materials?.[0];
  const specKeys = Object.keys(product.specifications || {}).filter(
    (k) => product.specifications[k] === true
  );
  const spec = specKeys[0];
  const typeWord = typeWordFor(product);

  const parts = ["I'm looking for a"];
  if (size) parts.push(`${sizeWord(size)}`);
  if (color) parts.push(color);
  if (material) parts.push(material);
  parts.push(typeWord);
  if (spec) parts.push(`that's ${spec}`);
  if (Number.isFinite(product.price)) parts.push(`under ${Math.ceil(product.price + 5)} dollars`);
  return parts.join(" ");
}

function sizeWord(code) {
  const letterMap = { XS: "extra small", S: "small", M: "medium", L: "large", XL: "extra large", XXL: "double extra large" };
  if (letterMap[code]) return letterMap[code];
  // Bare numeric shoe/waist sizes (e.g. "6", "32") aren't recognized by the parser's
  // extractSize() unless prefixed with "size" -- see server/src/voiceQueryParser.js's
  // explicit "size X" match, which is required for anything outside the XS-XXL letter set.
  if (/^\d+$/.test(String(code))) return `size ${code}`;
  return code;
}

export function buildFixtures(products) {
  const candidates = products.filter((p) => hasAttrs(p, 2));
  // Prefer distinct departments/categories for breadth, then distinct attribute
  // combinations (color+size, price+spec, etc.) among the remainder.
  const seenCategories = new Set();
  const picked = [];
  for (const p of candidates) {
    if (picked.length >= 5) break;
    if (seenCategories.has(p.category)) continue;
    seenCategories.add(p.category);
    picked.push(p);
  }
  for (const p of candidates) {
    if (picked.length >= 5) break;
    if (picked.includes(p)) continue;
    picked.push(p);
  }

  const positive = picked.slice(0, 5).map((p, i) => ({
    id: `multiparam-${i + 1}`,
    query: sentenceFor(p),
    expectedProductTitle: p.title,
    attributesUsed: {
      color: p.colors?.[0] ?? null,
      size: p.sizes?.[0] ?? null,
      material: p.materials?.[0] ?? null,
    },
  }));

  const noMatch = {
    id: "multiparam-no-match",
    query: "I need a fluorescent pink size 47 titanium umbrella for my pet dinosaur",
    expectedProductTitle: null,
    attributesUsed: {},
  };

  return [...positive, noMatch];
}
