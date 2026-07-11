function containsAny(xml, needles) {
  const hay = String(xml || "");
  return needles.some((needle) => hay.includes(needle));
}

export function hasBundleLoadError(xml) {
  return containsAny(xml, [
    "Unable to load script",
    "Make sure you're running Metro",
    "index.android.bundle",
  ]);
}

export function isLoginScreen(xml) {
  return containsAny(xml, [
    "login-email",
    "login-submit",
    "Sign in ↓",
    "Member access",
    "Demo account: test@example.com / secret123",
  ]);
}

export function isProductListScreen(xml) {
  return containsAny(xml, [
    "screen-product-list",
    "product-search-input",
    "Search and discovery",
    "Find the right product with less friction.",
  ]);
}

export function isCartScreen(xml) {
  return containsAny(xml, [
    "screen-cart",
    "cart-proceed-checkout",
    "A calmer path to checkout.",
    "Your bag is ready when you are.",
  ]);
}

export function isOrdersScreen(xml) {
  return containsAny(xml, [
    "screen-orders",
    "Your after-purchase story, kept simple.",
    "No order history yet",
  ]);
}

export function isAuthenticatedShell(xml) {
  return (
    containsAny(xml, [
      "tab-home",
      "tab-products",
      "tab-cart",
      "tab-orders",
      "tab-profile",
      "browse-all-products",
      "Browse the full catalog",
      "Curated promos that feel editorial, not noisy.",
      "voice-search-card",
    ]) ||
    isProductListScreen(xml) ||
    isCartScreen(xml) ||
    isOrdersScreen(xml)
  ) && !hasBundleLoadError(xml);
}
