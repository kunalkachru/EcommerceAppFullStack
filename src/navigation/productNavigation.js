/** Open the Products tab on the catalog root (not a stale PDP/checkout screen). */
export function navigateToProductList(navigation) {
  navigation.navigate("Products", { screen: "ProductList" });
}

export function navigateToCheckout(navigation) {
  navigation.navigate("Products", { screen: "Checkout" });
}
