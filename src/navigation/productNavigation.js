/** Open the Products tab on the catalog root (not a stale PDP/checkout screen). */
export function navigateToProductList(navigation) {
  navigation.navigate("Products", { screen: "ProductList" });
}

/** Open catalog with a pre-filled text search (e.g. from visual search). */
export function navigateToProductListWithSearch(navigation, searchQuery) {
  navigation.navigate("Products", {
    screen: "ProductList",
    params: { searchQuery: searchQuery ?? "" },
  });
}

export function navigateToCheckout(navigation) {
  navigation.navigate("Products", { screen: "Checkout" });
}
