function buildIntentSourceLabel(source) {
  if (source === "llm") return "AI reasoning";
  if (source === "rules-fallback" || source === "local-fallback") {
    return "Smart rules (AI unavailable)";
  }
  if (source === "rules" || String(source || "").includes("local")) {
    return "Smart rules";
  }
  if (source === "api") return "AI search";
  return null;
}

function buildAmbientSearchBanner({ mode, query, matchCount, source }) {
  const safeCount = Number(matchCount) || 0;
  const safeQuery = String(query || "").trim();
  const sourceLabel = buildIntentSourceLabel(source);

  if (mode === "photo") {
    return {
      title: "Matched for visual similarity",
      message:
        `Showing ${safeCount} catalog options based on the photo's shape, material, and closest product cues.` +
        (safeQuery ? ` Refined as "${safeQuery}".` : ""),
    };
  }

  if (mode === "photo-fallback") {
    return {
      title: "Converted photo cues into search",
      message: safeQuery
        ? `No close visual match yet, so ShopEase searched for "${safeQuery}" instead.`
        : "No close visual match yet, so ShopEase converted the photo into a broader catalog search.",
    };
  }

  return {
    title: "Refined from your intent",
    message:
      `Showing ${safeCount} matches` +
      (safeQuery ? ` for "${safeQuery}"` : "") +
      (sourceLabel ? ` using ${sourceLabel}.` : "."),
  };
}

function buildAmbientUnderstandingLine({ summary, source }) {
  const safeSummary = String(summary || "").trim();
  if (!safeSummary) return null;
  const sourceLabel = buildIntentSourceLabel(source);
  return `Refined for ${safeSummary}${sourceLabel ? ` · ${sourceLabel}` : ""}`;
}

function buildVisualCueHeading(hasMatches) {
  return hasMatches ? "Matched for style and closest catalog fit" : "Detected visual cues";
}

function buildVisualMatchesHeading() {
  return "Closest catalog matches";
}

module.exports = {
  buildIntentSourceLabel,
  buildAmbientSearchBanner,
  buildAmbientUnderstandingLine,
  buildVisualCueHeading,
  buildVisualMatchesHeading,
};
