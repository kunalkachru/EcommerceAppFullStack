/** Open the Products tab on the catalog root (not a stale PDP/checkout screen). */
export function navigateToProductList(navigation) {
  navigation.navigate("Products", { screen: "ProductList" });
}

/** Open catalog with voice/AI search results. */
export function navigateToProductListWithVoiceResults(navigation, { query, matches }) {
  navigation.navigate("Products", {
    screen: "ProductList",
    params: {
      voiceQuery: query ?? "",
      voiceProductIds: (matches ?? []).map((p) => String(p.id)),
      matchSource: "voice",
      resetSearch: true,
    },
  });
}

/** Open catalog with visual or smart-search match IDs (not broken text filter). */
export function navigateToProductListWithMatchResults(
  navigation,
  { query, matches, source = "search" }
) {
  navigation.navigate("Products", {
    screen: "ProductList",
    params: {
      voiceQuery: query ?? "",
      voiceProductIds: (matches ?? []).map((p) => String(p.id)),
      matchSource: source,
      resetSearch: true,
    },
  });
}

/** @deprecated Prefer navigateToProductListWithMatchResults after running searchCatalog */
export function navigateToProductListWithSearch(navigation, searchQuery) {
  navigation.navigate("Products", {
    screen: "ProductList",
    params: {
      pendingSearch: searchQuery ?? "",
      resetSearch: true,
    },
  });
}

/** Open catalog filtered to a category (e.g. from home shortcuts). */
export function navigateToProductListWithCategory(navigation, category) {
  navigation.navigate("Products", {
    screen: "ProductList",
    params: { category: category ?? "All" },
  });
}

export function navigateToCheckout(navigation) {
  navigation.navigate("Products", { screen: "Checkout" });
}
