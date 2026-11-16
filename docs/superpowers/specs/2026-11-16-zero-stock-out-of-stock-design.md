# Spec v1: S-80

## Goal
Update the product list cards so a product with zero stock displays a red `Out of stock` label directly under its price and cannot be added to the cart. Products with stock remain visually and behaviorally unchanged from the current product-list experience.

## Acceptance checks
- AC-1: A product-list card whose stock count is zero renders the exact text `Out of stock` directly below that card's price (how to see it: test: src/screens/ProductListScreen.test.jsx)
- AC-2: The `Out of stock` label for a zero-stock product uses the product-list error/red color token and is not rendered with the normal price or body text color (how to see it: test: src/screens/ProductListScreen.test.jsx)
- AC-3: The Add button for a zero-stock product is disabled and its press handler does not dispatch an add-to-cart action (how to see it: test: src/screens/ProductListScreen.test.jsx)
- AC-4: A product with stock greater than zero does not render an `Out of stock` label and its Add button remains enabled and dispatches the existing add-to-cart action (how to see it: test: src/screens/ProductListScreen.test.jsx)
- AC-5: Zero-stock and in-stock product cards retain the existing product-list title, image, price, card layout, and product-list ordering (how to see it: test: src/screens/ProductListScreen.test.jsx)

## Affected areas
- (none)

## Risks
- (none)

## New packages
- (none)

## Choices
- (none)

## Assumptions
- (none)

## Docs used
- (none)
