/**
 * Normalize spoken/written numbers and price symbols for intent parsing.
 */

const NUMBER_WORD_MAP = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

/** Parse compound number phrases like "forty-five", "twenty five", "one hundred". */
function parseSpelledNumberPhrase(phrase) {
  const cleaned = phrase.toLowerCase().replace(/-/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return null;

  let total = 0;
  let current = 0;

  for (const part of parts) {
    const n = NUMBER_WORD_MAP[part];
    if (n === undefined) return null;
    if (n === 100) {
      current = current === 0 ? 100 : current * 100;
    } else if (n === 1000) {
      current = current === 0 ? 1000 : current * 1000;
    } else if (n >= 20 && parts.length > 1 && parts.indexOf(part) < parts.length - 1) {
      current += n;
    } else {
      current += n;
    }
  }
  total += current;
  return total > 0 ? total : null;
}

/** Replace spelled numbers in text with digits. */
function replaceSpelledNumbers(text) {
  let result = String(text || "");

  result = result.replace(
    /\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[\s-]+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))*)\b/gi,
    (match) => {
      const value = parseSpelledNumberPhrase(match);
      return value != null ? String(value) : match;
    }
  );

  result = result.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine)\s+hundred\b/gi,
    (_, n) => String(NUMBER_WORD_MAP[n.toLowerCase()] * 100)
  );

  return result;
}

/** Normalize symbols and colloquial price phrasing before parsing. */
function normalizeSearchQuery(text) {
  let t = replaceSpelledNumbers(String(text || "").toLowerCase());

  t = t
    .replace(/≤/g, " under ")
    .replace(/≥/g, " over ")
    .replace(/<\s*\$?/g, " under ")
    .replace(/>\s*\$?/g, " over ")
    .replace(/\$(\d)/g, " $1 ");

  // "45 less than" / "forty-five less than" (colloquial) → under 45
  t = t.replace(
    /(\d+(?:\.\d+)?)\s+(?:or\s+)?less\s+than\s*$/i,
    "under $1"
  );
  t = t.replace(
    /(\d+(?:\.\d+)?)\s+(?:or\s+)?more\s+than\s*$/i,
    "over $1"
  );
  // "less than 45 products" / "product less than 45"
  t = t.replace(
    /less\s+than\s+(\d+(?:\.\d+)?)/gi,
    "under $1"
  );
  t = t.replace(
    /more\s+than\s+(\d+(?:\.\d+)?)/gi,
    "over $1"
  );
  t = t.replace(
    /greater\s+than\s+(\d+(?:\.\d+)?)/gi,
    "over $1"
  );
  t = t.replace(
    /cheaper\s+than\s+(\d+(?:\.\d+)?)/gi,
    "under $1"
  );

  return t.replace(/\s+/g, " ").trim();
}

module.exports = {
  normalizeSearchQuery,
  replaceSpelledNumbers,
  parseSpelledNumberPhrase,
};
