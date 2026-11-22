# Spec v1: AUT-198

## Goal
Use the product's existing `inventoryCount` value on the product detail page. When the count is from 1 through 5, show the exact low-stock message `Only N left`. When the count is 0, replace the Add to Cart button label with `Sold out`, disable the button, and prevent an add-to-cart dispatch. Products with more than 5 units retain the existing Add to Cart action without a low-stock message.

## Acceptance checks
- AC-1: A product detail page receiving `inventoryCount` values 1, 2, 3, 4, or 5 renders the exact text `Only N left`, with N equal to that product's inventory count (how to see it: test: __tests__/ProductDetailScreen.inventory.test.js)
- AC-2: A product detail page receiving `inventoryCount` 6 or greater does not render any `Only N left` low-stock message and keeps the `Add to Cart` label (how to see it: test: __tests__/ProductDetailScreen.inventory.test.js)
- AC-3: A product detail page receiving `inventoryCount` 0 renders the exact button label `Sold out`, marks the Add to Cart control disabled, and does not dispatch `addToCart` when the control is pressed (how to see it: test: __tests__/ProductDetailScreen.inventory.test.js)
- AC-4: A product detail page receiving a positive `inventoryCount` renders an enabled Add to Cart control with the existing `Add to Cart` label and dispatches `addToCart` when pressed (how to see it: test: __tests__/ProductDetailScreen.inventory.test.js)
- AC-5: Existing product detail, catalog, cart, navigation, and checkout behavior has no new test failures after the stock messaging and sold-out state are added (how to see it: test: the full suite)

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
