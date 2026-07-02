function fuseSearchResults({ visual = {}, text = {} }) {
  const visualMatches = Array.isArray(visual.matches) ? visual.matches : [];
  const textMatches = Array.isArray(text.matches) ? text.matches : [];

  if (visualMatches.length > 0) {
    return {
      matches: visualMatches,
      resultStatus: visual.resultStatus || "found",
      searchQuery: visual.searchQuery || "",
      labels: visual.labels || [],
      attributes: visual.attributes || [],
      identification: visual.identification || null,
      nearestMatch: visual.nearestMatch || null,
      fallbackUsed: false,
    };
  }

  if (textMatches.length > 0) {
    return {
      matches: textMatches,
      resultStatus: "text_fallback_found",
      searchQuery: visual.searchQuery || text.query || "",
      labels: visual.labels || [],
      attributes: visual.attributes || [],
      identification: visual.identification || null,
      nearestMatch: visual.nearestMatch || null,
      fallbackUsed: true,
    };
  }

  return {
    matches: [],
    resultStatus: visual.resultStatus || text.resultStatus || "no_matches",
    searchQuery: visual.searchQuery || text.query || "",
    labels: visual.labels || [],
    attributes: visual.attributes || [],
    identification: visual.identification || null,
    nearestMatch: visual.nearestMatch || null,
    fallbackUsed: false,
  };
}

module.exports = {
  fuseSearchResults,
};
